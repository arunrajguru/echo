import { describe, it, expect, beforeAll, afterAll } from "vitest";
import mongoose from "mongoose";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { Memory } from "../src/models/Memory.js";
import { LocalEmbeddingProvider } from "../src/services/embeddings/LocalEmbeddingProvider.js";
import { LocalVectorStore } from "../src/services/vectorStore/LocalVectorStore.js";
import { RAGService } from "../src/services/ragService.js";

let personaId: string;
let ragService: RAGService;
let vectorStore: LocalVectorStore;

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await ConversationMessage.deleteMany({});
  await Memory.deleteMany({});

  vectorStore = new LocalVectorStore("./data/test_vectors");
  ragService = new RAGService(new LocalEmbeddingProvider(), vectorStore);

  const user = new User({ email: "rag_test@example.com", password: "password123" });
  await user.save();

  const persona = new Persona({
    userId: user._id,
    name: "Dad",
    relationship: "Father",
    targetParticipant: "Dad",
  });
  await persona.save();
  personaId = (persona._id as any).toString();

  // Create memories
  const mem1 = new Memory({
    personaId: persona._id,
    title: "The Goa Trip",
    category: "Trips",
    confidence: 0.94,
    date: "2019",
    content: "The family trip to Goa — remembered mostly for the sudden rainstorm and someone ending up in the water.",
    sourceLines: ["Obviously 😂", "How can I forget that rain?", "You literally fell into the water bro 😂"],
    isApproved: true,
  });
  await mem1.save();

  const mem2 = new Memory({
    personaId: persona._id,
    title: "The Terrible Puns",
    category: "Favorites",
    confidence: 0.97,
    date: "Ongoing",
    content: "A running bit of unapologetically bad puns, usually delivered completely deadpan.",
    sourceLines: ["I'm reading a book on anti-gravity. It's impossible to put down."],
    isApproved: true,
  });
  await mem2.save();

  // Create messages
  const msg1 = new ConversationMessage({
    personaId: persona._id,
    sender: "Dad",
    text: "How can I forget that rain? You literally fell into the water bro 😂",
    rawIndex: 0,
    isPersona: true,
  });
  await msg1.save();

  const msg2 = new ConversationMessage({
    personaId: persona._id,
    sender: "Dad",
    text: "I'm reading a book on anti-gravity. It's impossible to put down.",
    rawIndex: 1,
    isPersona: true,
  });
  await msg2.save();

  await ragService.indexPersona(personaId);
});

afterAll(async () => {
  await vectorStore.deleteByPersonaId(personaId);
  await User.deleteMany({});
  await Persona.deleteMany({});
  await ConversationMessage.deleteMany({});
  await Memory.deleteMany({});
  await disconnectDatabase();
});

describe("RAG & Vector Retrieval", () => {
  it("should embed text into normalized vectors with consistent dimensions", async () => {
    const embedder = new LocalEmbeddingProvider();
    const vec1 = await embedder.embedQuery("Tell me about Goa and the rain");
    const vec2 = await embedder.embedQuery("Tell me about Goa and the rain");

    expect(vec1.length).toBe(384);
    expect(vec1).toEqual(vec2);
  });

  it("should retrieve the Goa memory for a Goa-related query", async () => {
    const retrieved = await ragService.retrieve({
      personaId,
      query: "Do you remember the Goa trip and the rain?",
    });

    expect(retrieved.isGrounded).toBe(true);
    expect(retrieved.memories.length).toBeGreaterThan(0);
    expect(retrieved.memories[0].title).toBe("The Goa Trip");
    expect(retrieved.topMemoryTitle).toBe("The Goa Trip");
  });

  it("should retrieve the anti-gravity pun memory for a pun query", async () => {
    const retrieved = await ragService.retrieve({
      personaId,
      query: "Tell me a joke about anti-gravity",
    });

    expect(retrieved.isGrounded).toBe(true);
    expect(retrieved.memories.length).toBeGreaterThan(0);
    expect(retrieved.memories[0].title).toBe("The Terrible Puns");
  });

  it("should return isGrounded: false and empty results for an unknown topic", async () => {
    const retrieved = await ragService.retrieve({
      personaId,
      query: "What is quantum chromatography of subatomic hadrons in particle physics laboratories?",
      threshold: 0.6,
    });

    expect(retrieved.isGrounded).toBe(false);
    expect(retrieved.memories.length).toBe(0);
  });
});
