import fs from "fs";
import path from "path";
import { IVectorStore, VectorDocument, SearchResult } from "./VectorStore.js";
import { config } from "../../config/env.js";

export class LocalVectorStore implements IVectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private storageDir: string;

  constructor(storageDir: string = config.vectorStoreDir) {
    this.storageDir = storageDir;
    if (!fs.existsSync(this.storageDir)) {
      fs.mkdirSync(this.storageDir, { recursive: true });
    }
    this.loadFromDisk();
  }

  public async upsert(docs: VectorDocument[]): Promise<void> {
    for (const doc of docs) {
      this.documents.set(doc.id, doc);
    }
    this.saveToDisk();
  }

  public async search(params: {
    personaId: string;
    queryVector: number[];
    type?: "memory" | "message" | "example";
    topK?: number;
    threshold?: number;
  }): Promise<SearchResult[]> {
    const { personaId, queryVector, type, topK = 5, threshold = 0.55 } = params;

    const results: SearchResult[] = [];

    for (const doc of this.documents.values()) {
      if (doc.personaId !== personaId) continue;
      if (type && doc.type !== type) continue;

      const score = this.cosineSimilarity(queryVector, doc.embedding);
      if (score >= threshold) {
        results.push({ document: doc, score });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }

  public async deleteByPersonaId(personaId: string): Promise<number> {
    let deletedCount = 0;
    for (const [id, doc] of this.documents.entries()) {
      if (doc.personaId === personaId) {
        this.documents.delete(id);
        deletedCount++;
      }
    }
    this.saveToDisk();
    return deletedCount;
  }

  public async deleteById(id: string): Promise<boolean> {
    const deleted = this.documents.delete(id);
    if (deleted) this.saveToDisk();
    return deleted;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length || vecA.length === 0) return 0;

    let dot = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dot += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private saveToDisk(): void {
    try {
      const filePath = path.join(this.storageDir, "vectors.json");
      const tmpPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`;
      const docsArray = Array.from(this.documents.values());
      fs.writeFileSync(tmpPath, JSON.stringify(docsArray, null, 2), "utf-8");
      fs.renameSync(tmpPath, filePath);
    } catch (err) {
      // Fallback
    }
  }

  private loadFromDisk(): void {
    try {
      const filePath = path.join(this.storageDir, "vectors.json");
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        const docs: VectorDocument[] = JSON.parse(raw);
        for (const doc of docs) {
          this.documents.set(doc.id, doc);
        }
        console.log(`[vector-store] Loaded ${docs.length} vectors from disk.`);
      }
    } catch (err) {
      // Fallback if file was partially written
      this.documents.clear();
    }
  }
}

export const globalVectorStore = new LocalVectorStore();
