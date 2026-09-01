import axios from "axios";
import { ILLMProvider, ChatMessagePayload, LLMGenerateOptions } from "./LLMProvider.js";
import { config } from "../../config/env.js";

const FALLBACK_MODELS = [
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "qwen/qwen3.8-27b",
  "llama-3.3-70b-versatile",
  "llama-3.1-8b-instant",
  "llama3-70b-8192",
  "llama3-8b-8192",
];

export class GroqLLMProvider implements ILLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    apiKey?: string,
    model?: string,
    baseUrl: string = "https://api.groq.com/openai/v1"
  ) {
    this.apiKey = (apiKey || process.env.GROQ_API_KEY || config.groqApiKey || process.env.OPENAI_API_KEY || "").trim();
    this.model = (model || process.env.GROQ_MODEL || config.groqModel || "openai/gpt-oss-120b").trim();
    this.baseUrl = (baseUrl || process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1").trim();
  }

  public getModel(): string {
    return this.model;
  }

  public getProviderName(): string {
    return "groq";
  }

  public async generate(
    messages: ChatMessagePayload[],
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    const activeKey = this.apiKey || process.env.GROQ_API_KEY || config.groqApiKey || process.env.OPENAI_API_KEY;
    if (!activeKey) {
      throw new Error("GROQ_API_KEY is not configured");
    }

    const {
      temperature = 0.75,
      maxTokens = 500,
      presencePenalty = 0.35,
      frequencyPenalty = 0.35,
    } = options;

    const candidateModels = [this.model, ...FALLBACK_MODELS.filter((m) => m !== this.model)];
    let lastError: any = null;

    for (const modelToTry of candidateModels) {
      try {
        console.log(`[ECHO LLM] provider: groq | model: ${modelToTry} | groqRequest: SENT`);

        const res = await axios.post(
          `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`,
          {
            model: modelToTry,
            messages,
            temperature,
            max_tokens: maxTokens,
            presence_penalty: presencePenalty,
            frequency_penalty: frequencyPenalty,
          },
          {
            headers: {
              Authorization: `Bearer ${activeKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          }
        );

        let content = res.data?.choices?.[0]?.message?.content?.trim() || "";

        // Strip any reasoning / scratchpad tags (e.g. <think>...</think>)
        content = content.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();

        console.log(`[ECHO LLM] provider: groq | model: ${modelToTry} | groqResponse: RECEIVED | characters: ${content.length}`);

        if (!content) {
          console.warn(`[ECHO LLM] Model '${modelToTry}' returned empty content, trying next candidate...`);
          continue;
        }

        // Update active model for subsequent requests
        this.model = modelToTry;

        return content;
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const safeErrorMessage = err.response?.data?.error?.message || err.message || "Unknown error";

        // If 404 model not found or 429 rate limit reached, try next candidate model
        if ((status === 404 && safeErrorMessage.includes("does not exist")) || status === 429) {
          console.warn(`[ECHO LLM] Model '${modelToTry}' unavailable/rate-limited (status ${status}), trying next candidate...`);
          continue;
        }

        console.error(`[ECHO LLM ERROR] Groq API returned status ${status || "network_error"}: ${safeErrorMessage}`);
        throw err;
      }
    }

    throw lastError || new Error("All Groq model candidates failed");
  }
}
