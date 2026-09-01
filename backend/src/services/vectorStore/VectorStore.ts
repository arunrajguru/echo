export interface VectorDocument {
  id: string;
  personaId: string;
  type: "memory" | "message" | "example";
  text: string;
  title?: string;
  category?: string;
  content?: string;
  sourceLines?: string[];
  confidence?: number;
  metadata?: Record<string, any>;
  embedding: number[];
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
}

export interface IVectorStore {
  upsert(documents: VectorDocument[]): Promise<void>;
  search(params: {
    personaId: string;
    queryVector: number[];
    type?: "memory" | "message" | "example";
    topK?: number;
    threshold?: number;
  }): Promise<SearchResult[]>;
  deleteByPersonaId(personaId: string): Promise<number>;
  deleteById(id: string): Promise<boolean>;
}
