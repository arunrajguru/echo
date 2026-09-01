import mongoose from "mongoose";
import { Memory } from "../models/Memory.js";
import { ConversationMessage } from "../models/ConversationMessage.js";
import { ConversationExample } from "../models/ConversationExample.js";
import { LocalEmbeddingProvider } from "./embeddings/LocalEmbeddingProvider.js";
import { IEmbeddingProvider } from "./embeddings/EmbeddingProvider.js";
import { globalVectorStore, LocalVectorStore } from "./vectorStore/LocalVectorStore.js";
import { IVectorStore, VectorDocument, SearchResult } from "./vectorStore/VectorStore.js";

export type ConversationIntent =
  | "CASUAL_CONVERSATION"
  | "MEMORY_QUERY"
  | "PERSONAL_FACT_QUERY"
  | "UNKNOWN_FACTUAL_QUERY"
  | "GREETING"
  | "EMOTIONAL_CONVERSATION";

export interface RetrievedContext {
  memories: Array<{
    id: string;
    title: string;
    category: string;
    confidence: number;
    content: string;
    sourceLines: string[];
    score: number;
  }>;
  examples: Array<{
    id: string;
    prompt: string;
    response: string;
    topic: string;
    score: number;
  }>;
  messages: Array<{
    id: string;
    sender: string;
    text: string;
    score: number;
  }>;
  topMemoryTitle?: string;
  isGrounded: boolean;
  intent: ConversationIntent;
  topScores?: {
    examples?: number;
    memories?: number;
  };
}

const EXPLICIT_MEMORY_RECALL_REGEX =
  /\b(do you remember|remember (when|our|that|the)|that trip to|that day (at|in|when)|when we (went|visited|traveled|won)|the trip to (goa|paris|manali)|our (hackathon|wedding|vacation|tour))\b/i;

const GREETING_REGEX = /^\s*(hi|hello|hey|heyy|heyyy|hie|yo|sup|oye|namaste|good morning|good evening|good night|gm|gn|hola)\b/i;

const EMOTIONAL_REGEX = /\b(miss you|love you|care|proud of you|thinking of you|wish you were here|pyaar|dhyan|apna dhyan|yaad aa rahi|hugs|heart)\b/i;

const UNKNOWN_FACTUAL_REGEX =
  /\b(quantum|astrophysics|exact\s+[\w\s]{0,25}(rank|percentage|score|gpa|roll|grade|mark)|university rank|college rank|studied in|study in|studied at|professor in|published papers|which year was|who was the (president|minister|governor|dean)|how many kilometers|exact date of birth|what was your (exact|gpa|rank|salary|roll number))\b/i;

export class RAGService {
  private embedder: IEmbeddingProvider;
  private vectorStore: IVectorStore;

  constructor(
    embedder: IEmbeddingProvider = new LocalEmbeddingProvider(),
    vectorStore: IVectorStore = globalVectorStore
  ) {
    this.embedder = embedder;
    this.vectorStore = vectorStore;
  }

  /**
   * Indexes all memories, conversation examples, and messages for a given persona into the vector store.
   */
  public async indexPersona(personaId: string): Promise<{ indexedMemories: number; indexedExamples: number; indexedMessages: number }> {
    const pId = new mongoose.Types.ObjectId(personaId);

    const memories = await Memory.find({ personaId: pId, isApproved: true });
    const examples = await ConversationExample.find({ personaId: pId });
    const messages = await ConversationMessage.find({ personaId: pId });

    const docsToUpsert: VectorDocument[] = [];

    // 1. Index memories (factual layer)
    for (const mem of memories) {
      const textToEmbed = `${mem.title}. ${mem.category}. ${mem.content} ${(mem.sourceLines || []).join(" ")}`;
      const embedding = await this.embedder.embedQuery(textToEmbed);

      docsToUpsert.push({
        id: `mem_${(mem._id as any).toString()}`,
        personaId: personaId,
        type: "memory",
        text: textToEmbed,
        title: mem.title,
        category: mem.category,
        content: mem.content,
        sourceLines: mem.sourceLines,
        confidence: mem.confidence,
        embedding,
      });
    }

    // 2. Index conversation examples (style & reaction layer)
    for (const ex of examples) {
      const textToEmbed = `${ex.prompt} -> ${ex.response}`;
      const embedding = await this.embedder.embedQuery(textToEmbed);

      docsToUpsert.push({
        id: `ex_${(ex._id as any).toString()}`,
        personaId: personaId,
        type: "example",
        text: textToEmbed,
        metadata: {
          prompt: ex.prompt,
          response: ex.response,
          topic: ex.topic || "casual",
        },
        embedding,
      });
    }

    // 3. Index messages
    for (const msg of messages) {
      const textToEmbed = `${msg.sender}: ${msg.text}`;
      const embedding = await this.embedder.embedQuery(textToEmbed);

      docsToUpsert.push({
        id: `msg_${(msg._id as any).toString()}`,
        personaId: personaId,
        type: "message",
        text: textToEmbed,
        metadata: {
          sender: msg.sender,
          isPersona: msg.isPersona,
          rawIndex: msg.rawIndex,
        },
        embedding,
      });
    }

    if (docsToUpsert.length > 0) {
      await this.vectorStore.upsert(docsToUpsert);
    }

    console.log(`[rag] Successfully indexed persona ${personaId}: ${memories.length} memories, ${examples.length} style examples, ${messages.length} messages`);

    return {
      indexedMemories: memories.length,
      indexedExamples: examples.length,
      indexedMessages: messages.length,
    };
  }

  /**
   * Dual RAG Retrieval & Intent Classification:
   * Retrieves supporting memories and response examples WITHOUT treating retrieval as a blocker.
   */
  public async retrieve(params: {
    personaId: string;
    query: string;
    threshold?: number;
  }): Promise<RetrievedContext> {
    const { personaId, query, threshold = 0.20 } = params;
    const cleanQuery = query.toLowerCase().trim();

    const queryVector = await this.embedder.embedQuery(query);

    // 1. Search memories (Memory RAG)
    const memoryResults = await this.vectorStore.search({
      personaId,
      queryVector,
      type: "memory",
      topK: 3,
      threshold,
    });

    // 2. Search conversation examples (Style RAG)
    const exampleResults = await this.vectorStore.search({
      personaId,
      queryVector,
      type: "example",
      topK: 4,
      threshold: 0.10, // Lenient for style matching
    });

    // 3. Search messages
    const messageResults = await this.vectorStore.search({
      personaId,
      queryVector,
      type: "message",
      topK: 3,
      threshold,
    });

    const memories = memoryResults.map((r) => ({
      id: r.document.id.replace("mem_", ""),
      title: r.document.title || "Memory",
      category: r.document.category || "Conversations",
      confidence: r.document.confidence || 0.85,
      content: (r.document as any).content || r.document.text,
      sourceLines: r.document.sourceLines || [],
      score: r.score,
    }));

    const examples = exampleResults.map((r) => ({
      id: r.document.id.replace("ex_", ""),
      prompt: r.document.metadata?.prompt || "",
      response: r.document.metadata?.response || r.document.text,
      topic: r.document.metadata?.topic || "casual",
      score: r.score,
    }));

    const messages = messageResults.map((r) => ({
      id: r.document.id.replace("msg_", ""),
      sender: r.document.metadata?.sender || "Participant",
      text: r.document.text,
      score: r.score,
    }));

    // Intent Classification across the 6 core intents
    let intent: ConversationIntent = "CASUAL_CONVERSATION";
    let isGrounded = true;
    let topMemoryTitle: string | undefined = undefined;

    const isExplicitRecall = EXPLICIT_MEMORY_RECALL_REGEX.test(cleanQuery);
    const isUnknownFactual = UNKNOWN_FACTUAL_REGEX.test(cleanQuery) || cleanQuery.startsWith("what did you study in");
    const isGreeting = GREETING_REGEX.test(cleanQuery);
    const isEmotional = EMOTIONAL_REGEX.test(cleanQuery);

    if (isUnknownFactual) {
      if (memories.length > 0 && memories[0].score > 0.45) {
        intent = "PERSONAL_FACT_QUERY";
        isGrounded = true;
        topMemoryTitle = memories[0].title;
      } else {
        intent = "UNKNOWN_FACTUAL_QUERY";
        isGrounded = false;
      }
    } else if (isExplicitRecall) {
      if (memories.length > 0) {
        intent = "MEMORY_QUERY";
        isGrounded = true;
        topMemoryTitle = memories[0].title;
      } else {
        intent = "MEMORY_QUERY";
        isGrounded = false;
      }
    } else if (isGreeting) {
      intent = "GREETING";
      isGrounded = true;
    } else if (isEmotional) {
      intent = "EMOTIONAL_CONVERSATION";
      isGrounded = true;
    } else if (memories.length > 0 && memories[0].score > 0.48) {
      intent = "MEMORY_QUERY";
      isGrounded = true;
      topMemoryTitle = memories[0].title;
    } else {
      // Default for all normal, unseen, or casual messages ("Nintendo", "what are you doing today?", "Had food?", "I'm bored", etc.)
      intent = "CASUAL_CONVERSATION";
      isGrounded = true;
    }

    return {
      memories,
      examples,
      messages,
      topMemoryTitle,
      isGrounded,
      intent,
      topScores: {
        examples: examples[0]?.score,
        memories: memories[0]?.score,
      },
    };
  }
}

export const globalRAGService = new RAGService();

