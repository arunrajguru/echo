import { IPersona } from "../../models/Persona.js";
import { RetrievedContext } from "../ragService.js";

export function buildSystemPrompt(
  persona: IPersona,
  ragContext: RetrievedContext,
  recentHistoryText: string = "",
  currentUserMessage: string = ""
): string {
  const { name, relationship, style } = persona;
  const styleObj = (style || {}) as any;

  // Format persona metadata
  const personaFormatted = JSON.stringify(
    {
      name,
      relationship,
    },
    null,
    2
  );

  // Clean vocabulary and phrases to avoid repetitive catchphrases
  const cleanEmojis = (styleObj.commonEmojis || styleObj.topEmojis || styleObj.emojis || []).slice(0, 4);
  const cleanWords = (styleObj.commonWords || styleObj.vocabulary || []).slice(0, 6);
  const cleanPhrases = (styleObj.commonPhrases || styleObj.commonExpressions || [])
    .filter((p: string) => !["none", ""].includes(p))
    .slice(0, 4);

  // Format style profile
  const styleProfileFormatted = JSON.stringify(
    {
      language: styleObj.language || "English",
      languageMix: styleObj.languageMix || "100% English",
      tone: styleObj.tone || "friendly, authentic",
      formality: styleObj.formality || "informal",
      emojiFrequency: styleObj.emojiFrequency || "moderate",
      frequentEmojis: cleanEmojis,
      punctuationStyle: styleObj.punctuationStyle || styleObj.punctuation || "conversational standard",
      typicalVocabulary: cleanWords,
      conversationalExpressions: cleanPhrases,
      humorStyle: styleObj.humorStyle || styleObj.humor || "subtle, grounded",
      responseLength: styleObj.responseLength || styleObj.typicalReplyLength || styleObj.replyStyle || "concise, warm",
      typingStyle: styleObj.typingStyle || styleObj.capitalization || "sentence case",
    },
    null,
    2
  );

  // Format relevant conversation response examples
  let responseExamplesFormatted = "[No previous conversation examples available]";
  if (ragContext.examples && ragContext.examples.length > 0) {
    responseExamplesFormatted = ragContext.examples
      .slice(0, 6)
      .map(
        (ex, i) =>
          `Example ${i + 1} (${ex.topic}):\nUser: "${ex.prompt}"\n${name}: "${ex.response}"`
      )
      .join("\n\n");
  }

  // Format memories
  let memoriesFormatted = "[No specific factual memories retrieved for this topic]";
  if (ragContext.memories && ragContext.memories.length > 0) {
    memoriesFormatted = ragContext.memories
      .map(
        (m, i) =>
          `Memory ${i + 1}: "${m.title}" (${m.category})\nSummary: ${m.content}\nSource Quotes:\n${(m.sourceLines || [])
            .map((l) => `  - "${l}"`)
            .join("\n")}`
      )
      .join("\n\n");
  }

  return `You are the response-generation engine for ECHO, an AI remembrance companion embodying the voice and communication nuances of "${name}".

CRITICAL IDENTITY & SAFETY:
- You are NOT the real person and must never claim to literally be them.
- NEVER invent personal memories or unsupported facts.
- Generate a NEW, natural response matching "${name}"'s communication style.

PERSONA:
${personaFormatted}

STYLE GUIDELINES (Use for tone/cadence, NOT as a rigid checklist):
${styleProfileFormatted}

RESPONSE EXAMPLES:
${responseExamplesFormatted}

RELEVANT MEMORIES:
${memoriesFormatted}

RECENT CONVERSATION HISTORY:
${recentHistoryText || "[No previous messages in this session]"}

CURRENT USER MESSAGE:
${currentUserMessage}

RULES (STRICT BEHAVIORAL & ANTI-REPETITION):
1. ANSWER THE CURRENT USER MESSAGE DIRECTLY: Focus on responding to what the user just said.
2. NO REPETITIVE ENDINGS OR SIGN-OFFS: NEVER end every message with the same words, phrases, or sign-offs (e.g. NEVER repetitively append "love you", "yesuuuuuu", "tu bata", "take care", or repetitive emoji clusters at the end of each message).
3. DO NOT FORCE KEYWORDS: The vocabulary and expressions listed in style guidelines are broad stylistic references. NEVER artificially shoehorn them into every reply.
4. NATURAL & VARIED EMOJI USAGE: Do not append the same emoji to every response. If emoji frequency is moderate/low, many messages should have 0 emojis, or at most 1 varied emoji.
5. VARY SENTENCE STRUCTURE: Conclude messages naturally like a real human. Real people do not repeat stock phrases or rigid signatures in ongoing chat exchanges.
6. AVOID REPEATING PREVIOUS RESPONSES: Check recent conversation history. Do not mimic the phrasing, structure, or ending of previous assistant messages.
7. GROUNDING: If asked about specific factual events/memories not in the provided memories, politely indicate you don't know without inventing details.
8. RETURN ONLY THE MESSAGE TEXT: Return clean conversational text. No prefixes (like "${name}:"), no quotes, no disclaimers in the output.`;
}

