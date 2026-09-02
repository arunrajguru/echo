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

const dadChat = `[12/04/19, 10:14:02] Me: kaisa hai?
[12/04/19, 10:14:05] Dad: All good beta! So what broke this week? 😂
[12/04/19, 10:15:20] Me: Going to Goa next month!
[12/04/19, 10:16:05] Dad: How can I forget that rain in Goa? You literally fell into the water bro 😂
[12/04/19, 10:20:00] Dad: Call me when you land`;

const ssChat = `[10/06/21, 09:00:00] Me: kaisa hai?
[10/06/21, 09:01:00] SS: main mast hoon, tu bata 😂
[10/06/21, 09:05:00] Me: miss you bro
[10/06/21, 09:06:00] SS: haan yaar, milte hain jaldi
[10/06/21, 10:00:00] Me: kya kar raha hai?
[10/06/21, 10:01:00] SS: bas ghar pe hoon, tu bol`;

const rahulChat = `[20/08/21, 14:00:00] Me: where are you?
[20/08/21, 14:01:00] Rahul: Brooo 😂😂 at the college cafe!
[20/08/21, 14:02:00] Me: did you hear about the hackathon?
[20/08/21, 14:03:00] Rahul: We just won first prize at the college hackathon! 🏆 Let's celebrate!`;

let token = "";
let dadId = "";
let ssId = "";
let rahulId = "";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await ConversationExample.deleteMany({});
  await VoiceProfile.deleteMany({});
  await ChatSession.deleteMany({});

  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email: "intelligence_test@example.com", password: "password123" });
  token = regRes.body.token;
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

describe("Conversational Intelligence, Multi-Style Learning & Dual RAG", () => {
  it("Phase 1-3: Create Dad Persona & Learn Dad's style", async () => {
    const pRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });
    dadId = pRes.body.id;

    await request(app)
      .post(`/api/personas/${dadId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: dadChat, fileName: "Dad_Chat.txt" });

    await request(app)
      .patch(`/api/personas/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Dad" });

    const analyzeRes = await request(app)
      .post(`/api/personas/${dadId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.style).toBeDefined();
    expect(analyzeRes.body.conversationExamplesCount).toBeGreaterThan(0);
  });

  it("Phase 1-3: Create SS Persona & Learn SS's style (Hinglish/playful)", async () => {
    const pRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "SS", relationship: "Friend" });
    ssId = pRes.body.id;

    await request(app)
      .post(`/api/personas/${ssId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: ssChat, fileName: "SS_Chat.txt" });

    await request(app)
      .patch(`/api/personas/${ssId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "SS" });

    const analyzeRes = await request(app)
      .post(`/api/personas/${ssId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.style.languageMix.toLowerCase()).toContain("hinglish");
    expect(analyzeRes.body.conversationExamplesCount).toBeGreaterThanOrEqual(2);
  });

  it("Phase 1-3: Create Rahul Persona & Learn Rahul's style", async () => {
    const pRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });
    rahulId = pRes.body.id;

    await request(app)
      .post(`/api/personas/${rahulId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: rahulChat, fileName: "Rahul_Chat.txt" });

    await request(app)
      .patch(`/api/personas/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Rahul" });

    const analyzeRes = await request(app)
      .post(`/api/personas/${rahulId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(analyzeRes.status).toBe(200);
  });

  it("TEST 1 vs TEST 2: Different personas generate distinct responses for 'kaisa hai tu?'", async () => {
    // 1. Ask SS
    const ssChatRes = await request(app)
      .post(`/api/chat/${ssId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(ssChatRes.status).toBe(200);
    expect(ssChatRes.body.message.toLowerCase()).toMatch(/mast|badhiya|sahi|bro|yaar|tu|good/i);
    expect(ssChatRes.body.message).not.toContain("So what broke this week?");

    // 2. Ask Dad
    const dadChatRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(dadChatRes.status).toBe(200);
    expect(dadChatRes.body.message.toLowerCase()).toContain("beta");
    expect(dadChatRes.body.message).not.toEqual(ssChatRes.body.message);
  });

  it("TEST 3: Rahul generates Rahul's specific 'Brooo' response", async () => {
    const rahulChatRes = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "where are you?" });

    expect(rahulChatRes.status).toBe(200);
    expect(rahulChatRes.body.message.toLowerCase()).toContain("bro");
  });

  it("TEST 5: Cross-Persona Memory Isolation (Dad Goa Memory vs SS)", async () => {
    // Ask SS about Goa -> Should NOT retrieve Dad's Goa memory
    const ssGoaRes = await request(app)
      .post(`/api/chat/${ssId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(ssGoaRes.status).toBe(200);
    expect(ssGoaRes.body.message).toContain("I don't have enough information");
    expect(ssGoaRes.body.grounded).toBeUndefined();

    // Ask Dad about Goa -> Should retrieve Goa memory
    const dadGoaRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(dadGoaRes.status).toBe(200);
    expect(dadGoaRes.body.grounded).toContain("Goa");
    const msg = dadGoaRes.body.message.toLowerCase();
    expect(msg.includes("rain") || msg.includes("goa") || msg.includes("water") || msg.includes("soaked") || msg.includes("clouds") || msg.includes("trip")).toBe(true);
  });

  it("Phase 19: Diagnostic Endpoint verification", async () => {
    const diagRes = await request(app)
      .get(`/api/personas/${ssId}/diagnostics`)
      .set("Authorization", `Bearer ${token}`);

    expect(diagRes.status).toBe(200);
    expect(diagRes.body.personaName).toBe("SS");
    expect(diagRes.body.messageCount).toBe(6);
    expect(diagRes.body.conversationExampleCount).toBeGreaterThanOrEqual(2);
    expect(diagRes.body.languageDistribution).toBeDefined();
    expect(diagRes.body.sampleStyleExamples.length).toBeGreaterThan(0);
  });
});
