import axios from "axios";
import { IEmbeddingProvider } from "./EmbeddingProvider.js";
import { config } from "../../config/env.js";

export class OpenAIEmbeddingProvider implements IEmbeddingProvider {
  public readonly dimension: number = 1536;

  public async embedQuery(text: string): Promise<number[]> {
    const vectors = await this.embedDocuments([text]);
    return vectors[0] || new Array(this.dimension).fill(0);
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    if (!config.openaiApiKey) {
      throw new Error("OPENAI_API_KEY is not configured");
    }

    const response = await axios.post(
      "https://api.openai.com/v1/embeddings",
      {
        input: texts,
        model: "text-embedding-3-small",
      },
      {
        headers: {
          Authorization: `Bearer ${config.openaiApiKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    return response.data.data.map((item: any) => item.embedding);
  }
}
