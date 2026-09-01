import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ChatSession } from "../src/models/ChatSession.js";
import { globalRAGService } from "../src/services/ragService.js";

let token = "";
let personaId = "";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await ChatSession.deleteMany({});

  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email: "chat_test@example.com", password: "password123" });

  token = regRes.body.token;

  const createRes = await request(app)
    .post("/api/personas")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Dad", relationship: "Father" });

  personaId = createRes.body.id;

  // Add memories
  const mem1 = new Memory({
    personaId,
    title: "The Goa Trip",
    category: "Trips",
    confidence: 0.94,
    date: "2019",
    content: "The family trip to Goa — remembered mostly for the sudden rainstorm and someone ending up in the water.",
    sourceLines: [
      "Obviously 😂",
      "How can I forget that rain?",
      "You literally fell into the water bro 😂",
    ],
    isApproved: true,
  });
  await mem1.save();

  // Index RAG
  await globalRAGService.indexPersona(personaId);
});

afterAll(async () => {
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await ChatSession.deleteMany({});
  await disconnectDatabase();
});

describe("Grounded Chat API", () => {
  it("should return a grounded response with sources when query matches a memory", async () => {
    const res = await request(app)
      .post(`/api/chat/${personaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.grounded).toBe("The Goa Trip");
    expect(res.body.sources.length).toBeGreaterThan(0);
    expect(res.body.sessionId).toBeDefined();
  });

  it("should return ungrounded fallback message when query has no matching memories", async () => {
    const res = await request(app)
      .post(`/api/chat/${personaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What did you study in quantum computing astrophysics in 1982?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("I don't have enough information");
    expect(res.body.grounded).toBeUndefined();
  });

  it("should fetch chat session message history", async () => {
    const res = await request(app)
      .get(`/api/chat/${personaId}/history`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(4); // 2 user messages + 2 echo replies
  });
});
