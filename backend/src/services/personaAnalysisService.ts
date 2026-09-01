import mongoose from "mongoose";
import { IConversationMessage } from "../models/ConversationMessage.js";

export interface IPersistentStyleProfile {
  language: string;
  languageMix: string;
  sentenceLength: "short" | "medium" | "long";
  averageWordsPerMessage: number;
  averageSentenceLength: number;
  tone: string;
  formality: string;
  emojiFrequency: "none" | "low" | "moderate" | "high";
  commonEmojis: string[];
  topEmojis: string[];
  punctuationStyle: string;
  punctuation: string;
  commonWords: string[];
  commonPhrases: string[];
  greetingPatterns: string[];
  commonOpenings: string[];
  questionPatterns: string;
  humorStyle: string;
  humor: string;
  responseLength: string;
  typicalReplyLength: string;
  replyStyle: string;
  typingStyle: string;
  capitalization: string;
  abbreviationStyle: string;
  HinglishUsage: string;
  HindiUsage: string;
  EnglishUsage: string;
  emotionalPatterns: string;
  signOff: string;
  signOffStyle: string;
  vocabulary: string[];
  // Legacy / UI compat fields
  emojis: string[];
  emojiPatterns: string[];
  greetingStyle: string;
  warmth: string;
  conversationRhythm: string;
  frequentExpressions: string[];
  commonExpressions: string[];
}

export interface ExtractedConversationExample {
  prompt: string;
  response: string;
  userMessage?: string;
  personaResponse?: string;
  topic: string;
  language: string;
  sourceMessageIds: mongoose.Types.ObjectId[];
}

const EMOJI_REGEX = /(?:\p{Extended_Pictographic}|\p{Emoji_Presentation})/gu;

const HINDI_HINGLISH_WORDS = new Set([
  "kaisa", "kaise", "kaisi", "hai", "hain", "ho", "hu", "hoon", "tu", "tum",
  "aap", "bhai", "yaar", "achha", "achhi", "acha", "haan", "nahi", "na", "kya", "kyun",
  "kab", "kahan", "theek", "shukriya", "arre", "are", "beta", "daddy", "papa", "mummy",
  "mom", "dad", "bata", "batao", "sun", "suno", "dekho", "aao", "jao", "karo", "mast",
  "chal", "chalo", "bas", "kuch", "sab", "badhiya", "sahi", "diwali", "milte", "ghar",
  "khana", "paani", "kaam", "zaroor", "bolo", "khush", "pyaar", "dhyan", "rakhna", "shabbakhair",
  "bhaiya", "didi", "chalo", "ruk", "sahi", "thik", "badhiya"
]);

const GREETING_OPENINGS = [
  "haan", "acha", "achha", "arre", "are", "hey", "hi", "hello", "bro", "bhai", "yaar",
  "sun", "suno", "dekho", "listen", "yo", "kaisa", "kaise", "gm", "gn", "hie"
];

const CASUAL_ABBREVIATIONS = new Set(["bro", "bhai", "yaar", "gm", "gn", "tc", "thx", "plz", "pls", "lol", "lmao", "rofl", "k", "ok", "btw", "idk", "brb"]);

export function analyzePersonaStyle(
  personaMessages: IConversationMessage[],
  allMessages: IConversationMessage[]
): {
  style: IPersistentStyleProfile;
  examples: ExtractedConversationExample[];
  stats: {
    messagesAnalyzed: number;
    personaMessages: number;
    conversationExamples: number;
    confidence: number;
  };
} {
  if (!personaMessages || personaMessages.length === 0) {
    return {
      style: getFallbackStyle(),
      examples: [],
      stats: {
        messagesAnalyzed: allMessages?.length || 0,
        personaMessages: 0,
        conversationExamples: 0,
        confidence: 0.8,
      },
    };
  }

  let totalWords = 0;
  let totalHindiWords = 0;
  let totalSentences = 0;
  let exclamations = 0;
  let questionMarks = 0;
  let lowercaseCount = 0;
  let abbreviationCount = 0;
  const emojiCounts = new Map<string, number>();
  const wordCounts = new Map<string, number>();
  const phraseCounts = new Map<string, number>();
  const openingCounts = new Map<string, number>();

  const stopWords = new Set([
    "the", "a", "an", "and", "or", "but", "in", "on", "at", "to", "for", "of", "with",
    "is", "was", "are", "were", "it", "this", "that", "i", "you", "he", "she", "we",
    "they", "my", "your", "his", "her", "our", "their", "me", "him", "them", "so",
  ]);

  // 1. Analyze Persona Messages
  for (const msg of personaMessages) {
    const text = msg.text.trim();
    if (!text) continue;
    if (
      msg.metadata?.messageType === "attachment" ||
      text.includes("(file attached)") ||
      text.includes("<Media omitted>") ||
      /^(https?:\/\/|\/\/|www\.)/i.test(text)
    ) {
      continue;
    }

    // Check lowercase starting
    if (text[0] === text[0].toLowerCase() && text[0] !== text[0].toUpperCase()) {
      lowercaseCount++;
    }

    // Count sentences
    const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
    totalSentences += Math.max(1, sentences.length);

    // Emojis
    const emojis = text.match(EMOJI_REGEX) || [];
    for (const em of emojis) {
      emojiCounts.set(em, (emojiCounts.get(em) || 0) + 1);
    }

    if (text.includes("!")) exclamations++;
    if (text.includes("?")) questionMarks++;

    const lower = text.toLowerCase();
    const words = lower.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);
    totalWords += words.length;

    // Openings
    if (words.length > 0) {
      const firstWord = words[0];
      if (GREETING_OPENINGS.includes(firstWord)) {
        openingCounts.set(firstWord, (openingCounts.get(firstWord) || 0) + 1);
      }
    }

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      if (HINDI_HINGLISH_WORDS.has(w)) {
        totalHindiWords++;
      }
      if (CASUAL_ABBREVIATIONS.has(w)) {
        abbreviationCount++;
      }
      if (w.length > 2 && !stopWords.has(w)) {
        wordCounts.set(w, (wordCounts.get(w) || 0) + 1);
      }

      if (i < words.length - 1) {
        const p2 = `${w} ${words[i + 1]}`;
        phraseCounts.set(p2, (phraseCounts.get(p2) || 0) + 1);
      }
      if (i < words.length - 2) {
        const p3 = `${w} ${words[i + 1]} ${words[i + 2]}`;
        phraseCounts.set(p3, (phraseCounts.get(p3) || 0) + 1);
      }
    }
  }

  const avgWords = Math.max(1, Math.round((totalWords / personaMessages.length) * 10) / 10);
  const avgSentenceLen = Math.max(1, Math.round((totalWords / Math.max(1, totalSentences)) * 10) / 10);

  const sentenceLength: "short" | "medium" | "long" =
    avgWords <= 6 ? "short" : avgWords <= 14 ? "medium" : "long";

  // Language mix calculation strictly from actual data
  const hindiRatio = totalWords > 0 ? totalHindiWords / totalWords : 0;
  const englishRatio = 1 - hindiRatio;

  let language = "English";
  let languageMix = "100% English";

  if (hindiRatio > 0.40) {
    language = "Hinglish (Hindi dominant)";
    languageMix = `${Math.round(hindiRatio * 100)}% Hindi/Hinglish, ${Math.round(englishRatio * 100)}% English`;
  } else if (hindiRatio > 0.10) {
    language = "Hinglish (English dominant)";
    languageMix = `${Math.round(englishRatio * 100)}% English, ${Math.round(hindiRatio * 100)}% Hindi expressions`;
  } else {
    language = "English";
    languageMix = "100% English";
  }

  const HinglishUsage = `${Math.round(hindiRatio * 100)}%`;
  const HindiUsage = `${Math.round(hindiRatio * 100)}%`;
  const EnglishUsage = `${Math.round(englishRatio * 100)}%`;

  // Emojis
  const topEmojis = Array.from(emojiCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([em]) => em);

  const totalEmojiCount = Array.from(emojiCounts.values()).reduce((a, b) => a + b, 0);
  const emojiRate = personaMessages.length > 0 ? totalEmojiCount / personaMessages.length : 0;

  const emojiFrequency: "none" | "low" | "moderate" | "high" =
    topEmojis.length === 0
      ? "none"
      : emojiRate > 0.8
      ? "high"
      : emojiRate > 0.25
      ? "moderate"
      : "low";

  // Openings / Greetings
  const commonOpenings = Array.from(openingCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([w]) => `"${w}"`);

  // Common Phrases (deduplicated against overlapping substrings)
  const rawPhrases = Array.from(phraseCounts.entries())
    .filter(([phrase, count]) => {
      if (count < 2) return false;
      const parts = phrase.split(" ");
      const hasMeaningfulWord = parts.some((w) => !stopWords.has(w) && w.length >= 3);
      return hasMeaningfulWord;
    })
    .sort((a, b) => b[1] - a[1]);

  const uniquePhrases: string[] = [];
  for (const [p] of rawPhrases) {
    const isSub = uniquePhrases.some((existing) => existing.includes(p) || p.includes(existing));
    if (!isSub) {
      uniquePhrases.push(p);
    }
    if (uniquePhrases.length >= 6) break;
  }
  const commonPhrases = uniquePhrases;

  // Vocabulary
  const topWords = Array.from(wordCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([w]) => w);

  // Capitalization & Typing Style
  const isMostlyLowercase = lowercaseCount > personaMessages.length * 0.6;
  const typingStyle = isMostlyLowercase ? "mostly lowercase" : "sentence case";
  const capitalization = typingStyle;

  // Abbreviation style
  const abbreviationStyle =
    abbreviationCount > personaMessages.length * 0.3
      ? "frequently uses casual abbreviations (bro, yaar, lol, gm)"
      : "spells words out in standard conversational form";

  // Question patterns
  const questionRate = personaMessages.length > 0 ? questionMarks / personaMessages.length : 0;
  const questionPatterns =
    questionRate > 0.4
      ? "frequently asks follow-up questions and checks in"
      : "replies directly with concise answers";

  // Punctuation
  const punctuationStyle =
    exclamations > personaMessages.length * 0.3
      ? "expressive with exclamation marks"
      : avgWords <= 6
      ? "frequently omits punctuation"
      : "conversational standard punctuation";

  // Tone & Humor
  let humorStyle = "subtle, grounded, dry";
  if (topEmojis.includes("😂") || topEmojis.includes("🤣") || topWords.includes("lol") || topWords.includes("haha")) {
    humorStyle = "frequent witty banter, teasing, and playful banter";
  } else if (topEmojis.length > 0) {
    humorStyle = "warm, pleasant, affectionate";
  }

  let tone = "friendly, authentic, emotionally warm";
  if (hindiRatio > 0.2) tone = "warm, intimate, informal personal cadence";

  const formality = isMostlyLowercase || abbreviationCount > 0 || hindiRatio > 0.1 ? "informal" : "casual and personal";
  const replyStyle = sentenceLength === "short" ? "concise, punchy, informal" : "conversational, descriptive, warm";
  const typicalReplyLength = `${Math.max(2, Math.floor(avgWords - 2))}–${Math.ceil(avgWords + 4)} words`;
  const emotionalPatterns = "responds naturally with personal conversational rhythm";

  const signOff = commonPhrases.find((p) => p.includes("call") || p.includes("soon") || p.includes("bye") || p.includes("care") || p.includes("gn")) || "";

  // 2. Extract Real Response Examples (Dialogue turns)
  const examples = extractConversationalTurns(personaMessages, allMessages);

  const styleProfile: IPersistentStyleProfile = {
    language,
    languageMix,
    sentenceLength,
    averageWordsPerMessage: avgWords,
    averageSentenceLength: avgSentenceLen,
    tone,
    formality,
    emojiFrequency,
    commonEmojis: topEmojis,
    topEmojis,
    punctuationStyle,
    punctuation: punctuationStyle,
    commonWords: topWords,
    commonPhrases,
    greetingPatterns: commonOpenings,
    commonOpenings,
    questionPatterns,
    humorStyle,
    humor: humorStyle,
    responseLength: replyStyle,
    typicalReplyLength,
    replyStyle,
    typingStyle,
    capitalization,
    abbreviationStyle,
    HinglishUsage,
    HindiUsage,
    EnglishUsage,
    emotionalPatterns,
    signOff,
    signOffStyle: signOff,
    vocabulary: topWords,
    // Legacy mapping
    emojis: topEmojis,
    emojiPatterns: topEmojis,
    greetingStyle: commonOpenings[0]?.replace(/"/g, "") || (language.includes("Hinglish") ? "haan" : "hey"),
    warmth: "High warmth and natural presence",
    conversationRhythm: questionPatterns,
    frequentExpressions: commonPhrases.slice(0, 4),
    commonExpressions: commonPhrases,
  };

  const confidence = Math.min(0.98, Math.max(0.80, 0.80 + (personaMessages.length / 200) * 0.18));

  return {
    style: styleProfile,
    examples,
    stats: {
      messagesAnalyzed: allMessages.length,
      personaMessages: personaMessages.length,
      conversationExamples: examples.length,
      confidence: Math.round(confidence * 100) / 100,
    },
  };
}

/**
 * Extracts real dialogue turns where another participant spoke and the selected persona replied.
 * Combines consecutive messages from the selected persona into a single cohesive response.
 */
function extractConversationalTurns(
  personaMessages: IConversationMessage[],
  allMessages: IConversationMessage[]
): ExtractedConversationExample[] {
  if (!allMessages || allMessages.length < 2) return [];

  const examples: ExtractedConversationExample[] = [];
  const personaMsgSet = new Set(personaMessages.map((m) => (m._id as any).toString()));

  // Sort chronologically
  const sorted = [...allMessages].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  let i = 0;
  while (i < sorted.length - 1) {
    const current = sorted[i];
    const currentIsPersona = personaMsgSet.has((current._id as any).toString()) || current.isPersona;

    if (!currentIsPersona) {
      // Find the last non-persona prompt before persona replies
      let promptMsg = current;
      let promptIdx = i;
      while (promptIdx + 1 < sorted.length) {
        const next = sorted[promptIdx + 1];
        const nextIsPersona = personaMsgSet.has((next._id as any).toString()) || next.isPersona;
        if (!nextIsPersona) {
          promptMsg = next;
          promptIdx++;
        } else {
          break;
        }
      }

      // Check if persona replies immediately after
      if (promptIdx + 1 < sorted.length) {
        const firstReply = sorted[promptIdx + 1];
        const firstReplyIsPersona = personaMsgSet.has((firstReply._id as any).toString()) || firstReply.isPersona;

        if (firstReplyIsPersona) {
          // Collect all consecutive messages from the persona
          const personaReplies: IConversationMessage[] = [firstReply];
          let replyIdx = promptIdx + 1;

          while (replyIdx + 1 < sorted.length) {
            const following = sorted[replyIdx + 1];
            const followingIsPersona = personaMsgSet.has((following._id as any).toString()) || following.isPersona;
            if (followingIsPersona) {
              personaReplies.push(following);
              replyIdx++;
            } else {
              break;
            }
          }

          // Filter out attachments or URLs from prompt & response
          const cleanPrompt = promptMsg.text.trim();
          const cleanReplies = personaReplies
            .map((m) => m.text.trim())
            .filter(
              (t) =>
                t.length > 0 &&
                !t.includes("(file attached)") &&
                !t.includes("<Media omitted>") &&
                !/^(https?:\/\/|\/\/|www\.)/i.test(t) &&
                !/\.(jpg|jpeg|png|gif|mp4|wav|opus)$/i.test(t)
            );

          const combinedResponse = cleanReplies.slice(0, 2).join(" ");

          if (
            cleanPrompt.length > 1 &&
            combinedResponse.length > 1 &&
            !cleanPrompt.includes("(file attached)") &&
            !cleanPrompt.includes("<Media omitted>") &&
            !/^(https?:\/\/|\/\/|www\.)/i.test(cleanPrompt)
          ) {
            // Categorize topic
            const lowerPrompt = cleanPrompt.toLowerCase();
            let topic = "casual";

            if (lowerPrompt.includes("kaisa") || lowerPrompt.includes("how are") || lowerPrompt.includes("hey") || lowerPrompt.includes("hi") || lowerPrompt.includes("whats up")) {
              topic = "greeting";
            } else if (lowerPrompt.includes("miss") || lowerPrompt.includes("love") || lowerPrompt.includes("care")) {
              topic = "emotional";
            } else if (lowerPrompt.includes("morning") || lowerPrompt.includes("gm")) {
              topic = "good_morning";
            } else if (lowerPrompt.includes("night") || lowerPrompt.includes("gn")) {
              topic = "good_night";
            } else if (lowerPrompt.includes("doing") || lowerPrompt.includes("kya kar") || lowerPrompt.includes("busy")) {
              topic = "daily_activity";
            } else if (lowerPrompt.includes("trip") || lowerPrompt.includes("travel") || lowerPrompt.includes("goa") || lowerPrompt.includes("flight")) {
              topic = "travel";
            } else if (lowerPrompt.includes("food") || lowerPrompt.includes("eat") || lowerPrompt.includes("khana") || lowerPrompt.includes("dinner") || lowerPrompt.includes("lunch")) {
              topic = "food";
            } else if (lowerPrompt.includes("win") || lowerPrompt.includes("hackathon") || lowerPrompt.includes("congrats") || lowerPrompt.includes("prize")) {
              topic = "achievement";
            }

            const lowerResp = combinedResponse.toLowerCase();
            const respHindi = lowerResp.split(/\s+/).some((w) => HINDI_HINGLISH_WORDS.has(w));
            const language = respHindi ? "Hinglish" : "English";

            examples.push({
              prompt: cleanPrompt,
              response: combinedResponse,
              userMessage: cleanPrompt,
              personaResponse: combinedResponse,
              topic,
              language,
              sourceMessageIds: [
                promptMsg._id as mongoose.Types.ObjectId,
                ...personaReplies.map((m) => m._id as mongoose.Types.ObjectId),
              ],
            });
          }

          i = replyIdx + 1;
          continue;
        }
      }
    }
    i++;
  }

  // Return top distinct examples (up to 40)
  return examples.slice(0, 40);
}

function getFallbackStyle(): IPersistentStyleProfile {
  return {
    language: "English",
    languageMix: "English",
    sentenceLength: "short",
    averageWordsPerMessage: 6,
    averageSentenceLength: 6,
    tone: "friendly, authentic",
    formality: "informal",
    emojiFrequency: "low",
    commonEmojis: ["😊"],
    topEmojis: ["😊"],
    punctuationStyle: "conversational standard",
    punctuation: "conversational standard",
    commonWords: [],
    commonPhrases: [],
    greetingPatterns: ['"hey"'],
    commonOpenings: ['"hey"'],
    questionPatterns: "replies directly with concise answers",
    humorStyle: "subtle, grounded",
    humor: "subtle, grounded",
    responseLength: "concise, warm",
    typicalReplyLength: "3–10 words",
    replyStyle: "concise, warm",
    typingStyle: "sentence case",
    capitalization: "sentence case",
    abbreviationStyle: "spells words out in standard conversational form",
    HinglishUsage: "0%",
    HindiUsage: "0%",
    EnglishUsage: "100%",
    emotionalPatterns: "responds warmly with natural empathy",
    signOff: "take care",
    signOffStyle: "take care",
    vocabulary: [],
    emojis: ["😊"],
    emojiPatterns: ["😊"],
    greetingStyle: "hey",
    warmth: "High warmth",
    conversationRhythm: "natural",
    frequentExpressions: [],
    commonExpressions: [],
  };
}

