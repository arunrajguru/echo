import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { VoiceProfile } from "../src/models/VoiceProfile.js";
import { ChatSession } from "../src/models/ChatSession.js";

const sampleWhatsAppChat = `[12/04/19, 10:14:02] Dad: So what broke this week?
[12/04/19, 10:15:20] Me: Nothing yet! Going to Goa next month.
[12/04/19, 10:16:05] Dad: Obviously 😂 How can I forget that rain? You literally fell into the water bro 😂
[12/04/19, 10:17:11] Dad: I'm reading a book on anti-gravity. It's impossible to put down.
[12/04/19, 10:18:00] Dad: We didn't catch a single thing again lol at the old fishing boat
[12/04/19, 10:19:30] Dad: Same time as always, don't be late this year for Diwali at Grandma's
[12/04/19, 10:20:00] Dad: Call me when you land`;

let token = "";
let userId = "";
let personaId = "";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await VoiceProfile.deleteMany({});
  await ChatSession.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await VoiceProfile.deleteMany({});
  await ChatSession.deleteMany({});
  await disconnectDatabase();
});

describe("Full 27-Step End-to-End Acceptance Pass", () => {
  it("Step 1-2: Register & Login", async () => {
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "acceptance_user@example.com", password: "password123" });

    expect(regRes.status).toBe(201);
    token = regRes.body.token;
    userId = regRes.body.user.id;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe("acceptance_user@example.com");
  });

  it("Step 3-5: Create Persona, Upload Chat & Select Participant", async () => {
    const createRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });

    expect(createRes.status).toBe(201);
    personaId = createRes.body.id;

    // Upload chat
    const uploadRes = await request(app)
      .post(`/api/personas/${personaId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: sampleWhatsAppChat,
        fileName: "WhatsApp Chat with Hey Daddy.txt",
      });

    expect(uploadRes.status).toBe(200);
    expect(uploadRes.body.participants).toContain("Dad");
    expect(uploadRes.body.messageCount).toBe(7);

    // Select target participant
    const patchRes = await request(app)
      .patch(`/api/personas/${personaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Dad" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.targetParticipant).toBe("Dad");
  });

  it("Step 6-8: Analyze Persona, Extract Memories & Style Profile", async () => {
    const analyzeRes = await request(app)
      .post(`/api/personas/${personaId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.stats.messagesAnalyzed).toBe(7);
    expect(analyzeRes.body.stats.personaMessages).toBe(6);
    expect(analyzeRes.body.memories.length).toBeGreaterThanOrEqual(4);
    expect(analyzeRes.body.style.emojis).toContain("😂");
    expect(analyzeRes.body.style.signOff).toBeDefined();

    // Verify all memories are grounded with source quotes
    for (const mem of analyzeRes.body.memories) {
      expect(mem.sourceLines.length).toBeGreaterThan(0);
      expect(mem.confidence).toBeGreaterThanOrEqual(0.8);
    }
  });

  it("Step 9-10: MemorySpace & Memory Map verification", async () => {
    const mapRes = await request(app)
      .get(`/api/personas/${personaId}/memory-map`)
      .set("Authorization", `Bearer ${token}`);

    expect(mapRes.status).toBe(200);
    expect(mapRes.body.nodes.length).toBeGreaterThanOrEqual(4);
    expect(mapRes.body.categories).toContain("Trips");
    expect(mapRes.body.categories).toContain("Favorites");
  });

  it("Step 11 (TEST A): Casual Conversation in learned style", async () => {
    const res = await request(app)
      .post(`/api/chat/${personaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hey daddy, kaisa hai tu?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    // Verify natural response (not raw transcript dump)
    expect(res.body.message.length).toBeGreaterThan(5);
    expect(res.body.message.length).toBeLessThan(400);
  });

  it("Step 12 (TEST B): Known Memory Query (Goa trip)", async () => {
    const res = await request(app)
      .post(`/api/chat/${personaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(res.status).toBe(200);
    expect(res.body.grounded).toBe("The Goa Trip");
    expect(res.body.sources.length).toBeGreaterThan(0);
    expect(res.body.message.toLowerCase()).toMatch(/rain|water|forget|fell|goa|baarish|barish/i);
  });

  it("Step 13 (TEST C): Unknown Query (Lack-of-information response)", async () => {
    const res = await request(app)
      .post(`/api/chat/${personaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What did you study in quantum computing astrophysics?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toContain("I don't have enough information");
    expect(res.body.grounded).toBeUndefined();
  });

  it("Step 14-16: Voice Synthesis & Cascade Deletion cleanup", async () => {
    // Voice synthesize
    const synthRes = await request(app)
      .post(`/api/personas/${personaId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Yes, I remember that trip! The rain was unforgettable." });

    expect(synthRes.status).toBe(200);
    expect(synthRes.body.disclaimer).toContain("AI-GENERATED VOICE");

    // Cascade delete
    const deleteRes = await request(app)
      .delete(`/api/personas/${personaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);

    // Verify 0 orphaned records
    const pCount = await Persona.countDocuments({ _id: personaId });
    const msgCount = await ConversationMessage.countDocuments({ personaId });
    const memCount = await Memory.countDocuments({ personaId });
    const csCount = await ChatSession.countDocuments({ personaId });

    expect(pCount).toBe(0);
    expect(msgCount).toBe(0);
    expect(memCount).toBe(0);
    expect(csCount).toBe(0);
  }, 15000);
});
