export interface ChatMessagePayload {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMGenerateOptions {
  temperature?: number;
  maxTokens?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
}

export interface ILLMProvider {
  generate(
    messages: ChatMessagePayload[],
    options?: LLMGenerateOptions
  ): Promise<string>;
}

