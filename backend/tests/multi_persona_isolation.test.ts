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

const dadChat = `[12/04/19, 10:14:02] Dad: So what broke this week?
[12/04/19, 10:15:20] Me: Going to Goa next month.
[12/04/19, 10:16:05] Dad: How can I forget that rain in Goa? You literally fell into the water bro 😂
[12/04/19, 10:20:00] Dad: Call me when you land`;

const momChat = `[15/05/20, 11:30:00] Mom: Have you eaten beta?
[15/05/20, 11:31:00] Me: Not yet mom.
[15/05/20, 11:32:00] Mom: I found Grandma's secret recipe for Biryani and mango kheer!
[15/05/20, 11:35:00] Mom: The roses in the front garden are blooming so beautifully today. Take care beta ❤️`;

const rahulChat = `[20/08/21, 14:00:00] Rahul: Brooo 😂😂 where are you?
[20/08/21, 14:01:00] Me: At the library.
[20/08/21, 14:02:00] Rahul: We just won first prize at the college hackathon! 🏆
[20/08/21, 14:05:00] Rahul: Let's celebrate tonight!`;

let token = "";
let dadId = "";
let momId = "";
let rahulId = "";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await Memory.deleteMany({});
  await ConversationMessage.deleteMany({});
  await VoiceProfile.deleteMany({});
  await ChatSession.deleteMany({});

  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email: "multi_persona_user@example.com", password: "password123" });
  token = regRes.body.token;
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

describe("Multi-Persona Independent Storage & Isolation Test", () => {
  it("Step 1: Create and ingest Persona 1 (Dad)", async () => {
    const res = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });
    expect(res.status).toBe(201);
    dadId = res.body.id;

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
  });

  it("Step 2: Create and ingest Persona 2 (Mom) without overwriting Dad", async () => {
    const res = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Mom", relationship: "Mother" });
    expect(res.status).toBe(201);
    momId = res.body.id;
    expect(momId).not.toBe(dadId);

    await request(app)
      .post(`/api/personas/${momId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: momChat, fileName: "Mom_Chat.txt" });

    await request(app)
      .patch(`/api/personas/${momId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Mom" });

    const analyzeRes = await request(app)
      .post(`/api/personas/${momId}/analyze`)
      .set("Authorization", `Bearer ${token}`);
    expect(analyzeRes.status).toBe(200);
  });

  it("Step 3: Create and ingest Persona 3 (Rahul) without overwriting Dad or Mom", async () => {
    const res = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });
    expect(res.status).toBe(201);
    rahulId = res.body.id;

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

  it("Step 4: Verify GET /api/personas returns all 3 distinct personas", async () => {
    const res = await request(app)
      .get("/api/personas")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(3);
    const names = res.body.map((p: any) => p.name);
    expect(names).toContain("Dad");
    expect(names).toContain("Mom");
    expect(names).toContain("Rahul");
  });

  it("Step 5: Cross-Persona Memory Isolation Verification", async () => {
    // 1. Query Dad about Goa trip -> Should find Goa memory
    const dadGoaRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(dadGoaRes.status).toBe(200);
    expect(dadGoaRes.body.grounded).toBe("The Goa Trip");
    expect(dadGoaRes.body.message.length).toBeGreaterThan(5);

    // 2. Query Mom about Goa trip -> Should NOT find Goa memory (unsupported fallback)
    const momGoaRes = await request(app)
      .post(`/api/chat/${momId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(momGoaRes.status).toBe(200);
    expect(momGoaRes.body.message).toContain("I don't have enough information");
    expect(momGoaRes.body.grounded).toBeUndefined();

    // 3. Query Rahul about Goa trip -> Should NOT find Goa memory
    const rahulGoaRes = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(rahulGoaRes.status).toBe(200);
    expect(rahulGoaRes.body.message).toContain("I don't have enough information");
    expect(rahulGoaRes.body.grounded).toBeUndefined();
  });

  it("Step 6: Chat History Separation Verification", async () => {
    const dadHist = await request(app)
      .get(`/api/chat/${dadId}/history`)
      .set("Authorization", `Bearer ${token}`);

    const momHist = await request(app)
      .get(`/api/chat/${momId}/history`)
      .set("Authorization", `Bearer ${token}`);

    expect(dadHist.status).toBe(200);
    expect(momHist.status).toBe(200);
    // Messages must be distinct per persona
    expect(dadHist.body.length).toBeGreaterThan(0);
    expect(dadHist.body[0].text).toContain("Goa trip");
  });
});
