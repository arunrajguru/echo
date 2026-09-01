import { ILLMProvider } from "./LLMProvider.js";
import { GroqLLMProvider } from "./GroqLLMProvider.js";
import { OpenAILLMProvider } from "./OpenAILLMProvider.js";
import { config } from "../../config/env.js";

export function createLLMProvider(providerType?: string): ILLMProvider | null {
  const chosenType = (providerType || process.env.LLM_PROVIDER || config.llmProvider || "groq").toLowerCase();
  const groqKey = (process.env.GROQ_API_KEY || config.groqApiKey || "").trim();
  const openaiKey = (process.env.OPENAI_API_KEY || config.openaiApiKey || "").trim();

  if (chosenType === "groq") {
    if (groqKey) {
      return new GroqLLMProvider(groqKey, config.groqModel);
    }
    if (openaiKey && openaiKey.startsWith("gsk_")) {
      return new GroqLLMProvider(openaiKey, config.groqModel);
    }
  }

  if (chosenType === "openai" && openaiKey) {
    return new OpenAILLMProvider(openaiKey, config.openaiBaseUrl, config.llmModel);
  }

  // Fallback to whichever key is available
  if (groqKey) {
    return new GroqLLMProvider(groqKey, config.groqModel);
  }

  if (openaiKey) {
    if (openaiKey.startsWith("gsk_")) {
      return new GroqLLMProvider(openaiKey, config.groqModel);
    }
    return new OpenAILLMProvider(openaiKey, config.openaiBaseUrl, config.llmModel);
  }

  return null;
}
