import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ConversationExample } from "../src/models/ConversationExample.js";
import { VoiceProfile } from "../src/models/VoiceProfile.js";
import { ChatSession } from "../src/models/ChatSession.js";
import { globalVectorStore } from "../src/services/vectorStore/LocalVectorStore.js";

let userAToken = "";
let userBToken = "";
let personaAId = "";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await ConversationExample.deleteMany({});
  await VoiceProfile.deleteMany({});
  await ChatSession.deleteMany({});

  // Register User A
  const resA = await request(app)
    .post("/api/auth/register")
    .send({ email: "usera@example.com", password: "password123" });
  userAToken = resA.body.token;

  // Register User B
  const resB = await request(app)
    .post("/api/auth/register")
    .send({ email: "userb@example.com", password: "password123" });
  userBToken = resB.body.token;

  // Create persona for User A
  const createRes = await request(app)
    .post("/api/personas")
    .set("Authorization", `Bearer ${userAToken}`)
    .send({ name: "Dad", relationship: "Father" });
  personaAId = createRes.body.id;

  // Ingest message, memory, example, session for Persona A
  const msg = new ConversationMessage({
    personaId: personaAId,
    sender: "Dad",
    text: "How can I forget that rain?",
    rawIndex: 0,
    isPersona: true,
  });
  await msg.save();

  const mem = new Memory({
    personaId: personaAId,
    title: "The Goa Trip",
    category: "Trips",
    confidence: 0.94,
    content: "Family trip to Goa",
    sourceLines: ["How can I forget that rain?"],
  });
  await mem.save();

  const ex = new ConversationExample({
    personaId: personaAId,
    prompt: "Are we going?",
    response: "Obviously 😂",
    sourceMessageIds: [],
  });
  await ex.save();

  const cs = new ChatSession({
    personaId: personaAId,
    userId: resA.body.user.id,
    messages: [{ role: "user", text: "Hi Dad", createdAt: new Date() }],
  });
  await cs.save();
});

afterAll(async () => {
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await ConversationExample.deleteMany({});
  await VoiceProfile.deleteMany({});
  await ChatSession.deleteMany({});
  await disconnectDatabase();
});

describe("Security, Isolation & Cascade Deletion", () => {
  it("should prevent User B from accessing User A's persona", async () => {
    const res = await request(app)
      .get(`/api/personas/${personaAId}`)
      .set("Authorization", `Bearer ${userBToken}`);

    expect(res.status).toBe(404);
  });

  it("should prevent User B from deleting User A's persona", async () => {
    const res = await request(app)
      .delete(`/api/personas/${personaAId}`)
      .set("Authorization", `Bearer ${userBToken}`);

    expect(res.status).toBe(500);
  });

  it("should cascade-delete persona and all child records when deleted by owner", async () => {
    const res = await request(app)
      .delete(`/api/personas/${personaAId}`)
      .set("Authorization", `Bearer ${userAToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify 0 orphaned records in DB
    const personaCount = await Persona.countDocuments({ _id: personaAId });
    const msgCount = await ConversationMessage.countDocuments({ personaId: personaAId });
    const memCount = await Memory.countDocuments({ personaId: personaAId });
    const exCount = await ConversationExample.countDocuments({ personaId: personaAId });
    const csCount = await ChatSession.countDocuments({ personaId: personaAId });

    expect(personaCount).toBe(0);
    expect(msgCount).toBe(0);
    expect(memCount).toBe(0);
    expect(exCount).toBe(0);
    expect(csCount).toBe(0);
  });
});
