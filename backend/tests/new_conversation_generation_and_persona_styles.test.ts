import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ConversationExample } from "../src/models/ConversationExample.js";
import { ChatSession } from "../src/models/ChatSession.js";

describe("ECHO — New Conversation Generation, Hybrid Retrieve+Generate & Persona Styles (TEST A - TEST J)", () => {
  let token: string;
  let dadId: string;
  let rahulId: string;
  let priyaId: string;

  beforeAll(async () => {
    await connectDatabase();
    await Persona.deleteMany({});
    await Memory.deleteMany({});
    await ConversationMessage.deleteMany({});
    await ConversationExample.deleteMany({});
    await ChatSession.deleteMany({});

    // Register test user
    const authRes = await request(app).post("/api/auth/register").send({
      email: `hybrid_gen_${Date.now()}@example.com`,
      password: "Password123!",
      name: "Tester",
    });
    token = authRes.body.token;

    // 1. Setup Dad Persona
    const dadRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });
    dadId = dadRes.body.id;

    const dadChat = `12/04/19, 10:14 - Dad: Beta khana kha liya?
12/04/19, 10:15 - Me: Haan Papa, lunch kar raha hoon.
12/04/19, 10:16 - Dad: Good. Dhyan rakhna apna.
15/05/19, 18:30 - Me: How are you?
15/05/19, 18:31 - Dad: Main theek hoon beta. So what broke this week? 😂
18/06/19, 14:00 - Me: Do you remember the Goa trip and the rain?
18/06/19, 14:01 - Dad: How can I forget that rain in Goa? You literally fell into the water bro 😂`;

    await request(app)
      .post(`/api/personas/${dadId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(dadChat), "dad_chat.txt");

    await request(app)
      .post(`/api/personas/${dadId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    // 2. Setup Rahul Persona
    const rahulRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });
    rahulId = rahulRes.body.id;

    const rahulChat = `10/01/24, 11:00 - Rahul: Yo bro kya chal raha hai?
10/01/24, 11:01 - Me: Working on ECHO.
10/01/24, 11:02 - Rahul: Sahi hai mast kaam kar!
12/01/24, 15:00 - Me: How are you?
12/01/24, 15:01 - Rahul: All good bro mast chal raha hai 😂
14/01/24, 19:00 - Me: Do you remember our AI Hackathon victory?
14/01/24, 19:01 - Rahul: That hackathon was crazy! We coded for 36 hours and won first prize! 🏆`;

    await request(app)
      .post(`/api/personas/${rahulId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(rahulChat), "rahul_chat.txt");

    await request(app)
      .post(`/api/personas/${rahulId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    // 3. Setup Priya Persona
    const priyaRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Priya", relationship: "Friend" });
    priyaId = priyaRes.body.id;

    const priyaChat = `15/09/22, 11:00 - Me: Hello
15/09/22, 11:01 - Priya: Haan sab badhiya, tu bata sun na! 😊
15/09/22, 14:00 - Me: Do you remember our art workshop?
15/09/22, 14:01 - Priya: Arrey yes! That art workshop was so creative and fun! 🎨`;

    await request(app)
      .post(`/api/personas/${priyaId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(priyaChat), "priya_chat.txt");

    await request(app)
      .post(`/api/personas/${priyaId}/analyze`)
      .set("Authorization", `Bearer ${token}`);
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("TEST A: Persona = Dad, User = 'How are you?' -> Dad-style generated response", async () => {
    const res = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How are you?" });

    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toContain("beta");
    expect(res.body.message).not.toMatch(/\bbro\b/i);
  });

  it("TEST B: Persona = Rahul, User = 'How are you?' -> Rahul-style generated response", async () => {
    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How are you?" });

    expect(res.status).toBe(200);
    expect(res.body.message.toLowerCase()).toMatch(/bro|badhiya|mast|sahi|yaar|all good|good/i);
    expect(res.body.message.toLowerCase()).not.toContain("beta");
    expect(res.body.message).not.toContain("So what broke this week?");
  });

  it("TEST C: Persona = Priya, User = 'Hello' -> Priya-style generated response", async () => {
    const res = await request(app)
      .post(`/api/chat/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Hello" });

    expect(res.status).toBe(200);
    expect(res.body.message.length).toBeGreaterThan(4);
    expect(res.body.message.toLowerCase()).not.toContain("beta");
    expect(res.body.message).not.toContain("So what broke this week?");
  });

  it("TEST D: New unseen casual message ('What are you doing today?') -> Natural generated persona-style response (NOT grounded fallback)", async () => {
    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What are you doing today?" });

    expect(res.status).toBe(200);
    expect(res.body.message).not.toContain("I don't have enough information");
    expect(res.body.message.length).toBeGreaterThan(5);
    expect(res.body.message.toLowerCase()).toMatch(/chill|chilling|resting|bata|mast|coffee|bro|bhai|work|kaam|aaram|tumhare/i);
  });

  it("TEST E: No response example retrieved ('Nintendo') -> Generation still happens naturally", async () => {
    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Nintendo" });

    expect(res.status).toBe(200);
    expect(res.body.message).not.toContain("I don't have enough information");
    expect(res.body.message.length).toBeGreaterThan(3);
  });

  it("TEST F: Memory query with known memory -> Relevant memory retrieved and naturally incorporated", async () => {
    const res = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(res.status).toBe(200);
    expect(res.body.grounded).toBeDefined();
    expect(res.body.message.toLowerCase()).toMatch(/rain|baarish|barish|paani|water|soaked|downpour/i);
  });

  it("TEST G: Unknown factual question ('What was your exact university rank in 1982?') -> Grounded fallback", async () => {
    const res = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What was your exact university rank in 1982?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("I don't have enough information from the memories you've shared to know that.");
  });

  it("TEST H: Switch Dad -> Rahul -> Rahul style immediately with NO Dad vocabulary leakage", async () => {
    // 1. Dad
    const dadRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisi hai tu" });
    expect(dadRes.body.message.toLowerCase()).toContain("beta");

    // 2. Rahul
    const rahulRes = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisi hai tu" });
    expect(rahulRes.body.message.toLowerCase()).not.toContain("beta");
    expect(rahulRes.body.message.toLowerCase()).toMatch(/mast|bro|theek|bhai|chal|good/i);
  });

  it("TEST I: Switch Rahul -> Priya -> Priya style immediately with NO Rahul/Dad leakage", async () => {
    const priyaRes = await request(app)
      .post(`/api/chat/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(priyaRes.status).toBe(200);
    expect(priyaRes.body.message.length).toBeGreaterThan(5);
    expect(priyaRes.body.message.toLowerCase()).not.toContain("beta");
    expect(priyaRes.body.message.toLowerCase()).not.toContain("mast chal");
  });

  it("TEST J: Two/Three personas simultaneously -> Both remain stored and independently usable", async () => {
    const listRes = await request(app)
      .get("/api/personas")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.status).toBe(200);
    expect(listRes.body.length).toBe(3);
    const names = listRes.body.map((p: any) => p.name);
    expect(names).toContain("Dad");
    expect(names).toContain("Rahul");
    expect(names).toContain("Priya");
  });
});
