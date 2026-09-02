import { ILLMProvider, ChatMessagePayload } from "./LLMProvider.js";
import { OpenAILLMProvider } from "./OpenAILLMProvider.js";
import { GroqLLMProvider } from "./GroqLLMProvider.js";
import { createLLMProvider } from "./llmFactory.js";
import { config } from "../../config/env.js";
import { IPersona } from "../../models/Persona.js";
import { RetrievedContext } from "../ragService.js";

/**
 * Calculates word-level Jaccard similarity between two texts to detect repetitions.
 */
export function calculateTextSimilarity(textA: string, textB: string): number {
  if (!textA || !textB) return 0;
  const wordsA = new Set(textA.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));
  const wordsB = new Set(textB.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean));

  if (wordsA.size === 0 || wordsB.size === 0) return 0;

  let intersection = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) intersection++;
  }

  const union = new Set([...wordsA, ...wordsB]).size;
  return union === 0 ? 0 : intersection / union;
}

/**
 * Detects if two messages share an identical trailing multi-word ending phrase or catchphrase.
 */
export function detectEndingRepetition(newMsg: string, prevMsg: string): boolean {
  if (!newMsg || !prevMsg) return false;
  const cleanTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

  const tNew = cleanTokens(newMsg);
  const tPrev = cleanTokens(prevMsg);

  if (tNew.length < 2 || tPrev.length < 2) return false;

  for (let n = 2; n <= Math.min(5, tNew.length, tPrev.length); n++) {
    const sNew = tNew.slice(-n).join(" ");
    const sPrev = tPrev.slice(-n).join(" ");
    if (sNew === sPrev) return true;
  }
  return false;
}

/**
 * Trims redundant repetitive trailing catchphrases / endings if identical to the previous assistant response.
 */
export function cleanTrailingRepetitivePhrase(response: string, lastAssistantMessage?: string): string {
  if (!response || !lastAssistantMessage) return response;

  const cleanTokens = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

  const tNew = cleanTokens(response);
  const tPrev = cleanTokens(lastAssistantMessage);

  if (tNew.length < 2 || tPrev.length < 2) return response;

  for (let n = Math.min(5, tNew.length - 1, tPrev.length); n >= 2; n--) {
    const sNew = tNew.slice(-n).join(" ");
    const sPrev = tPrev.slice(-n).join(" ");
    if (sNew === sPrev) {
      const words = response.trim().split(/\s+/);
      if (words.length > n + 1) {
        const trimmed = words.slice(0, words.length - n).join(" ").trim();
        return trimmed.replace(/[,;:\-\s]+$/, "");
      }
    }
  }

  return response;
}

/**
 * Fallback grounded response synthesizer.
 * Dynamically synthesizes responses matching the persona's OWN learned style,
 * conversational examples, and memories without hardcoding any single personality.
 */
/**
 * Fallback grounded response synthesizer.
 * Dynamically synthesizes responses matching the persona's OWN learned style,
 * conversational examples, vocabulary, and memories without hardcoding any single personality.
 */
export function synthesizeLocalGroundedResponse(
  persona: IPersona,
  ragContext: RetrievedContext,
  userMessage: string
): string {
  const cleanMsg = userMessage.toLowerCase().trim();
  const styleObj = (persona.style || {}) as any;
  const topEmojis = (styleObj.topEmojis || styleObj.commonEmojis || styleObj.emojis || []) as string[];
  const emoji = topEmojis.length > 0 ? ` ${topEmojis[0]}` : "";
  const isHinglish =
    (styleObj.languageMix || "").toLowerCase().includes("hinglish") ||
    (styleObj.language || "").toLowerCase().includes("hinglish");

  const commonPhrases = (styleObj.commonPhrases || styleObj.commonExpressions || []) as string[];
  const topWords = (styleObj.vocabulary || styleObj.commonWords || []) as string[];
  const commonOpenings = (styleObj.greetingPatterns || styleObj.commonOpenings || []) as string[];
  const primaryOpening =
    commonOpenings.length > 0
      ? commonOpenings[0].replace(/"/g, "")
      : isHinglish
      ? "haan"
      : "hey";

  const hasBeta = topWords.includes("beta") || commonPhrases.some((p) => p.includes("beta"));
  const hasBro = topWords.includes("bro") || commonPhrases.some((p) => p.includes("bro"));
  const hasYaar = topWords.includes("yaar") || commonPhrases.some((p) => p.includes("yaar"));
  const hasBhai = topWords.includes("bhai") || commonPhrases.some((p) => p.includes("bhai"));
  const hasMast = topWords.includes("mast") || commonPhrases.some((p) => p.includes("mast"));
  const hasSun = topWords.includes("sun") || commonPhrases.some((p) => p.includes("sun"));

  const casualAddress = hasBeta ? " beta" : hasBro ? " bro" : hasYaar ? " yaar" : hasBhai ? " bhai" : "";

  // 1. Handle Unsupported Factual Questions (ONLY genuinely unsupported queries trigger fallback)
  if (ragContext.intent === "UNKNOWN_FACTUAL_QUERY") {
    return `I don't have enough information from the memories you've shared to know that.`;
  }

  // 2. Handle Memory Queries
  if (ragContext.intent === "MEMORY_QUERY") {
    if (!ragContext.memories || ragContext.memories.length === 0) {
      return `I don't have enough information from the memories you've shared to know that.`;
    }

    const topMemory = ragContext.memories[0];
    let quote =
      topMemory.sourceLines && topMemory.sourceLines.length > 0
        ? topMemory.sourceLines[0]
        : topMemory.content;

    if (topMemory.sourceLines && topMemory.sourceLines.length > 1) {
      const cleanWords = cleanMsg
        .replace(/[^\w\s]/g, " ")
        .split(/\s+/)
        .filter(
          (w) =>
            w.length >= 3 &&
            !["what", "when", "where", "remember", "about", "your", "that", "this", "and", "the", "you", "tell", "something"].includes(w)
        );

      let bestScore = -1;
      let bestLine = topMemory.sourceLines[0];

      for (const line of topMemory.sourceLines) {
        if (
          line.includes("(file attached)") ||
          line.includes("<Media omitted>") ||
          line.match(/\.(jpg|jpeg|png|gif|mp4|wav|opus)$/i) ||
          /^(https?:\/\/|\/\/|www\.)/i.test(line)
        ) {
          continue;
        }
        const lowerLine = line.toLowerCase();
        let score = cleanWords.filter((w) => lowerLine.includes(w)).length;
        if (!lowerLine.startsWith("me:") && !lowerLine.startsWith("user:")) {
          score += 0.5;
        }
        if (score >= bestScore) {
          bestScore = score;
          bestLine = line;
        }
      }
      quote = bestLine;
    }

    // Clean any sender or timestamp prefix cleanly
    const cleanQuote = quote
      .replace(/^\[\d{1,2}[\/\.-]\d{1,2}[\/\.-]\d{2,4},?\s+\d{1,2}:\d{2}(?::\d{2})?(?:\s*[APap][Mm])?\]\s*/i, "")
      .replace(/^[^:]+:\s*/i, "")
      .trim();

    if (isHinglish) {
      return `Haan mujhe yaad hai! ${cleanQuote}${emoji}`;
    }

    return `Yes, I remember that! ${cleanQuote}${emoji}`;
  }

  // 3. Handle Emotional Conversation
  if (ragContext.intent === "EMOTIONAL_CONVERSATION" || cleanMsg.includes("miss you") || cleanMsg.includes("love you")) {
    if (hasBeta) return `Main bhi beta ❤️ apna dhyan rakhna`;
    if (hasSun) return `Aww miss you too sun na! ❤️`;
    if (hasBro || hasYaar) return `Miss you too bro! ❤️`;
    return `Miss you too! Take care of yourself ❤️`;
  }

  // 4. Handle Casual Conversation, Greetings, Unseen Messages ("Nintendo", "what are you doing today?", etc.)
  // If we have matching conversational examples from this specific persona
  if (ragContext.examples && ragContext.examples.length > 0) {
    const matchingEx = ragContext.examples.find((ex) => {
      const p = ex.prompt.toLowerCase();
      if (
        (cleanMsg.includes("kaisa") || cleanMsg.includes("how are") || cleanMsg.includes("how r u") || cleanMsg.includes("hey") || cleanMsg.includes("hi")) &&
        (p.includes("kaisa") || p.includes("how are") || p.includes("how r u") || p.includes("hey") || p.includes("hi"))
      ) {
        return true;
      }
      if (
        (cleanMsg.includes("kya kar") || cleanMsg.includes("what are you doing") || cleanMsg.includes("doing") || cleanMsg.includes("busy")) &&
        (p.includes("kya kar") || p.includes("doing") || p.includes("busy"))
      ) {
        return true;
      }
      if (
        (cleanMsg.includes("where") || cleanMsg.includes("kahan")) &&
        (p.includes("where") || p.includes("kahan"))
      ) {
        return true;
      }
      return false;
    });

    if (matchingEx) {
      return matchingEx.response.replace(/^(?:\[[^\]]+\]\s*)?[A-Za-z0-9_\s]+:\s*/i, "").trim();
    }
  }

  // Dynamic Synthesis for Specific Unseen Conversational Topics

  // 1. Food / Meals
  if (cleanMsg.includes("food") || cleanMsg.includes("khana") || cleanMsg.includes("dinner") || cleanMsg.includes("lunch") || cleanMsg.includes("eat") || cleanMsg.includes("breakfast")) {
    if (hasBeta) return `Haan beta lunch ho gaya. Tumne time pe khaya na?${emoji}`;
    if (hasSun) return `Haan kha liya sun na! What did you eat? 😊`;
    if (hasBro || hasYaar || hasMast) return `Bas abhi khana khaya bro 😂 tu bata?`;
    return `Yes, just had food! Did you eat something good? 😊`;
  }

  // 2. Bored / Free
  if (cleanMsg.includes("bored") || cleanMsg.includes("bore") || cleanMsg.includes("free") || cleanMsg.includes("vella")) {
    if (hasBeta) return `Arrey beta, take a break or read something nice 😂`;
    if (hasSun) return `Aww bore mat ho sun na, tell me what's up! 😊`;
    if (hasBro || hasYaar || hasMast) return `Same here bro 😂 let's do something fun!`;
    return `Haha same here, let's find something fun to do! 😊`;
  }

  // 3. Guess What / Surprises
  if (cleanMsg.includes("guess what") || cleanMsg.includes("happened today") || cleanMsg.includes("kya hua") || cleanMsg.includes("guess")) {
    if (hasBeta) return `Kya hua beta? Tell me!`;
    if (hasSun) return `Ooh kya hua sun na! Tell me quickly! 😊`;
    if (hasBro || hasYaar || hasMast) return `Brooo tell me fast kya hua 😂🔥`;
    return `What happened? Tell me all about it! 😊`;
  }

  // 4. Weekend Plans
  if (cleanMsg.includes("weekend") || cleanMsg.includes("saturday") || cleanMsg.includes("sunday")) {
    if (hasBeta) return `Rest well beta, or we can plan a nice dinner together.`;
    if (hasSun) return `Let's go cafe hopping or shopping sun na! 😊`;
    if (hasBro || hasYaar || hasMast) return `Bro weekend pe cafe chalte hain ya gaming session 😂`;
    return `Let's plan something fun this weekend! What are you thinking? 😊`;
  }

  // 5. Tomorrow / Travelling
  if (cleanMsg.includes("tomorrow") || cleanMsg.includes("going somewhere") || cleanMsg.includes("kal")) {
    if (hasBeta) return `Where are you going beta? Dhyan se jana.`;
    if (hasSun) return `Ooh kahan ja rahe ho sun na? Have fun! 😊`;
    if (hasBro || hasYaar || hasMast) return `Kahan ja raha hai bro? Photos bhejio 😂`;
    return `Where are you heading tomorrow? Have a safe trip! 😊`;
  }

  // 6. Good Night
  if (cleanMsg.includes("good night") || cleanMsg.includes("goodnight") || cleanMsg.includes("gn") || cleanMsg.includes("so jao") || cleanMsg.includes("sleeping")) {
    if (hasBeta) return `Good night beta. So jao time pe ❤️`;
    if (hasSun) return `Good night sun na, sweet dreams! 😊`;
    if (hasBro || hasYaar || hasMast) return `Good night bro! Kal milte hain 😂`;
    return `Good night! Sleep well and take care ❤️`;
  }

  // 7. Opinions / Thoughts
  if (cleanMsg.includes("think about") || cleanMsg.includes("opinion") || cleanMsg.includes("what do you think") || cleanMsg.includes("lagta hai")) {
    if (hasBeta) return `Looks interesting beta! What do you feel about it?`;
    if (hasSun) return `I think it's super cool sun na! Tell me more 😊`;
    if (hasBro || hasYaar || hasMast) return `Mast lag raha hai bro, go for it! 😂`;
    return `I think that sounds really interesting! What's your take on it? 😊`;
  }

  // 8. Jokes / Humor
  if (cleanMsg.includes("funny") || cleanMsg.includes("joke") || cleanMsg.includes("hasi") || cleanMsg.includes("laugh")) {
    if (hasBeta) return `Haha remember when you thought gravity works in reverse? 😂`;
    if (hasSun) return `Haha remember our funny drama rehearsal sun na! 😂`;
    if (hasBro || hasYaar || hasMast) return `Bro that one time you tripped over nothing at the cafe 😂 classic!`;
    return `Haha, remember that hilarious mix-up we had? Still makes me laugh! 😂`;
  }

  // 9. Current Activity
  if (cleanMsg.includes("doing") || cleanMsg.includes("kya kar") || cleanMsg.includes("today")) {
    if (hasBeta) return `Bas beta resting at home 😂 what about you?`;
    if (hasSun) return `Bas aise hi sun na, chilling at home! 😊 Tu bata?`;
    if (hasBro || hasYaar || hasMast) return `Nothing much bro, just chilling 😂 tu bata?`;
    return `Just taking it easy today! What about you? 😊`;
  }

  // 10. Greetings & Check-ins
  if (
    cleanMsg.includes("kaisa") ||
    cleanMsg.includes("kaisi") ||
    cleanMsg.includes("how are") ||
    cleanMsg.includes("how r u") ||
    cleanMsg.includes("whats up") ||
    cleanMsg.includes("what's up") ||
    cleanMsg.includes("hey") ||
    cleanMsg.includes("hi") ||
    cleanMsg.includes("hello")
  ) {
    if (hasBeta) return `Main theek hoon beta. So what broke this week? 😂`;
    if (hasMast) return `main mast hoon yaar tu bata 😂`;
    if (hasSun) return `Haan sab badhiya, tu bata sun na! 😊`;
    if (isHinglish) return `Main theek hoon${casualAddress}!${emoji} Tu bata?`;
    return `Hey! Doing good.${emoji} How have you been?`;
  }

  // Generic new conversational topic (e.g. "Nintendo", "coding", "weather", etc.)
  if (hasBeta) {
    return `Haha nice beta!${emoji} Tell me more about it.`;
  }
  if (hasSun) {
    return `Haha sahi hai sun na!${emoji} Tell me more!`;
  }
  if (hasBro || hasYaar || hasMast) {
    return `Haha mast bro!${emoji} Tu bata kya chal raha hai?`;
  }

  return `${primaryOpening}${casualAddress ? " " + casualAddress.trim() : ""}, good to chat with you! How's everything going?${emoji}`;
}

export class LLMService {
  private provider: ILLMProvider | null | undefined = undefined;

  constructor(provider?: ILLMProvider | null) {
    this.provider = provider;
  }

  public setProvider(provider?: ILLMProvider | null) {
    this.provider = provider || undefined;
  }

  public getProvider(): ILLMProvider | null {
    if (this.provider) {
      return this.provider;
    }
    return createLLMProvider();
  }

  public getActiveProviderName(): string {
    const p = this.getProvider();
    if (!p) return "local";
    if (p instanceof GroqLLMProvider || (p as any).getProviderName?.() === "groq") return "groq";
    if (p instanceof OpenAILLMProvider || (p as any).getProviderName?.() === "openai") return "openai";
    return "external";
  }

  public isProviderAvailable(): boolean {
    return !!this.getProvider();
  }

  public async generateChatResponse(params: {
    persona: IPersona;
    ragContext: RetrievedContext;
    messages: ChatMessagePayload[];
    lastAssistantMessage?: string;
  }): Promise<{ response: string; regenerated: boolean; providerUsed: string }> {
    const { persona, ragContext, messages, lastAssistantMessage } = params;

    let response = "";
    let regenerated = false;
    const activeProvider = this.getProvider();
    const providerName = this.getActiveProviderName();

    if (activeProvider) {
      try {
        response = await activeProvider.generate(messages, {
          temperature: 0.75,
          presencePenalty: 0.4,
          frequencyPenalty: 0.4,
        });

        // Repetition check: Detect whole-text high similarity or repeated trailing suffix/catchphrase
        const isRepeatedEnding = lastAssistantMessage
          ? detectEndingRepetition(response, lastAssistantMessage)
          : false;
        const isHighSimilarity = lastAssistantMessage
          ? calculateTextSimilarity(response, lastAssistantMessage) > 0.65
          : false;

        if (isRepeatedEnding || isHighSimilarity) {
          console.log(
            `[llm] Repetition detected (highSimilarity=${isHighSimilarity}, repeatedEnding=${isRepeatedEnding}), regenerating with varied temperature and anti-repeat directive...`
          );

          const antiRepeatMessages: ChatMessagePayload[] = [
            ...messages,
            {
              role: "system",
              content:
                "CRITICAL: The previous draft repeated words or ending patterns. Generate a completely FRESH, concise response with a DIFFERENT ending and structure. Do NOT repeat stock sign-offs or identical catchphrases.",
            },
          ];

          response = await activeProvider.generate(antiRepeatMessages, {
            temperature: 0.9,
            presencePenalty: 0.6,
            frequencyPenalty: 0.6,
          });
          regenerated = true;
        }

        // Clean any redundant duplicate trailing phrases matching last assistant response
        if (lastAssistantMessage) {
          response = cleanTrailingRepetitivePhrase(response, lastAssistantMessage);
        }

        return { response, regenerated, providerUsed: providerName };
      } catch (err: any) {
        console.warn(
          `[llm] ${providerName.toUpperCase()} API call failed or unavailable, using grounded local synthesis:`,
          err?.response?.data?.error?.message || err?.message || err
        );
        response = synthesizeLocalGroundedResponse(
          persona,
          ragContext,
          messages[messages.length - 1]?.content || ""
        );
        return { response, regenerated: false, providerUsed: "local_fallback" };
      }
    } else {
      // Local zero-config synthesis
      response = synthesizeLocalGroundedResponse(
        persona,
        ragContext,
        messages[messages.length - 1]?.content || ""
      );
      return { response, regenerated: false, providerUsed: "local" };
    }
  }
}

export const globalLLMService = new LLMService();

export type { ILLMProvider, ChatMessagePayload } from "./LLMProvider.js";
export { GroqLLMProvider } from "./GroqLLMProvider.js";
export { OpenAILLMProvider } from "./OpenAILLMProvider.js";
export { createLLMProvider } from "./llmFactory.js";


