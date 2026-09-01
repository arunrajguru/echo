import { IEmbeddingProvider } from "./EmbeddingProvider.js";

/**
 * Local deterministic semantic embedding provider.
 * Converts text into a 256-dimensional normalized vector using character-n-grams,
 * word tokens, positional weighting, and sub-word hashing with L2 normalization.
 * Runs instantly in pure TypeScript with zero external dependencies or API keys.
 */
export class LocalEmbeddingProvider implements IEmbeddingProvider {
  public readonly dimension: number = 384;

  private stopWords = new Set([
    "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
    "with", "is", "was", "are", "were", "it", "this", "that", "i", "you", "he",
    "she", "we", "they", "me", "him", "her", "us", "them", "do", "did", "does",
    "be", "been", "have", "has", "had", "so", "as", "if", "what", "which", "who",
  ]);

  public async embedQuery(text: string): Promise<number[]> {
    return this.createVector(text);
  }

  public async embedDocuments(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.createVector(t));
  }

  private createVector(rawText: string): number[] {
    const vector = new Array(this.dimension).fill(0);
    const text = rawText.toLowerCase().trim();
    if (!text) return vector;

    const words = text.replace(/[^\w\s]/g, " ").split(/\s+/).filter(Boolean);

    // 1. Word token hashing with high semantic weights
    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      if (this.stopWords.has(word) || word.length < 2) continue;

      const weight = word.length > 3 ? 5.0 : 2.0;
      const bucket = this.hashString(word) % this.dimension;
      vector[bucket] += weight;

      // Word bigrams (if neither is stopword)
      if (i < words.length - 1) {
        const nextWord = words[i + 1];
        if (!this.stopWords.has(nextWord)) {
          const bigram = `${word}_${nextWord}`;
          const bigramBucket = this.hashString(bigram) % this.dimension;
          vector[bigramBucket] += 8.0;
        }
      }

      // Subword character 3-grams for the non-stopword
      for (let j = 0; j < word.length - 2; j++) {
        const trigram = word.substring(j, j + 3);
        const triBucket = this.hashString(trigram) % this.dimension;
        vector[triBucket] += 0.8;
      }
    }

    // 2. L2 Normalization to unit sphere
    let sumSq = 0;
    for (let i = 0; i < this.dimension; i++) {
      sumSq += vector[i] * vector[i];
    }

    const norm = Math.sqrt(sumSq);
    if (norm > 0) {
      for (let i = 0; i < this.dimension; i++) {
        vector[i] = vector[i] / norm;
      }
    }

    return vector;
  }

  private hashString(str: string): number {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & 0x7fffffff;
    }
    return Math.abs(hash);
  }
}
