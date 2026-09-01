import axios from "axios";
import { ILLMProvider, ChatMessagePayload, LLMGenerateOptions } from "./LLMProvider.js";
import { config } from "../../config/env.js";

export class OpenAILLMProvider implements ILLMProvider {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor(
    apiKey: string = config.openaiApiKey || config.groqApiKey,
    baseUrl: string = config.openaiBaseUrl,
    model: string = config.llmModel
  ) {
    this.apiKey = apiKey;
    this.baseUrl = baseUrl;
    this.model = model;
  }

  public async generate(
    messages: ChatMessagePayload[],
    options: LLMGenerateOptions = {}
  ): Promise<string> {
    if (!this.apiKey) {
      throw new Error("No LLM API key configured");
    }

    const {
      temperature = 0.75,
      maxTokens = 500,
      presencePenalty = 0.35,
      frequencyPenalty = 0.35,
    } = options;

    const res = await axios.post(
      `${this.baseUrl.replace(/\/+$/, "")}/chat/completions`,
      {
        model: this.model,
        messages,
        temperature,
        max_tokens: maxTokens,
        presence_penalty: presencePenalty,
        frequency_penalty: frequencyPenalty,
      },
      {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 30000,
      }
    );

    return res.data.choices[0]?.message?.content || "";
  }
}
