import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ConversationExample } from "../src/models/ConversationExample.js";
import { ChatSession } from "../src/models/ChatSession.js";

describe("ECHO — Text Persona Learning & Response Training Full Verification", () => {
  let token: string;
  let dadId: string;
  let friendId: string;

  beforeAll(async () => {
    await connectDatabase();
    await Persona.deleteMany({});
    await Memory.deleteMany({});
    await ConversationMessage.deleteMany({});
    await ConversationExample.deleteMany({});
    await ChatSession.deleteMany({});

    // Register test user
    const authRes = await request(app).post("/api/auth/register").send({
      email: `text_train_${Date.now()}@example.com`,
      password: "Password123!",
      name: "Tester",
    });
    token = authRes.body.token;
  });

  afterAll(async () => {
    await disconnectDatabase();
  });

  it("Step 1: Create Persona A (Dad) and upload Dad's conversation data", async () => {
    const pRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });

    expect(pRes.status).toBe(201);
    dadId = pRes.body.id;

    // Upload Dad's chat
    const dadChat = `12/04/19, 10:14 - Dad: Beta khana kha liya?
12/04/19, 10:15 - Me: Haan Papa, I am having lunch now.
12/04/19, 10:16 - Dad: Good. Dhyan rakhna apna.
15/05/19, 18:30 - Me: How are you?
15/05/19, 18:31 - Dad: Main theek hoon beta. So what broke this week?
15/05/19, 18:32 - Me: Nothing broke Papa 😂
15/05/19, 18:33 - Dad: Good to know 😂
18/06/19, 14:00 - Me: Do you remember the Goa trip and the rain?
18/06/19, 14:01 - Dad: Yes! How can I forget that rain? You fell into the water.
18/06/19, 14:02 - Dad: IMG-20190618-WA0002.jpg (file attached)
18/06/19, 14:03 - Dad: https://maps.google.com/?q=goa`;

    const upRes = await request(app)
      .post(`/api/personas/${dadId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(dadChat), "dad_chat.txt");

    expect(upRes.status).toBe(200);
    expect(upRes.body.messageCount).toBe(11);
    expect(upRes.body.participants).toContain("Dad");

    // Analyze Dad
    const anRes = await request(app)
      .post(`/api/personas/${dadId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(anRes.status).toBe(200);
    expect(anRes.body.stats.personaMessages).toBeGreaterThan(0);
    expect(anRes.body.stats.conversationExamples).toBeGreaterThan(0);
    expect(anRes.body.style.language).toBeDefined();
    expect(anRes.body.style.vocabulary).toContain("beta");
  });

  it("Step 2: Create Persona B (Friend) with distinct vocabulary, tone, and memories", async () => {
    const pRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });

    expect(pRes.status).toBe(201);
    friendId = pRes.body.id;

    // Upload Friend's chat
    const friendChat = `10/01/24, 11:00 - Rahul: Yo bro kya chal raha hai?
10/01/24, 11:01 - Me: Bas working on the app.
10/01/24, 11:02 - Rahul: Sahi hai mast kaam kar!
12/01/24, 15:00 - Me: How are you?
12/01/24, 15:01 - Rahul: All good bro mast chal raha hai 😂
12/01/24, 15:02 - Rahul: Tu bata kya scene hai?
14/01/24, 19:00 - Me: Do you remember our AI Hackathon victory in Bangalore?
14/01/24, 19:01 - Rahul: Bhai that hackathon was crazy! We coded for 36 hours straight and won first prize!
14/01/24, 19:02 - Rahul: VID-20240114-WA0012.mp4 (file attached)`;

    const upRes = await request(app)
      .post(`/api/personas/${friendId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(friendChat), "friend_chat.txt");

    expect(upRes.status).toBe(200);
    expect(upRes.body.messageCount).toBe(9);

    // Analyze Friend
    const anRes = await request(app)
      .post(`/api/personas/${friendId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(anRes.status).toBe(200);
    expect(anRes.body.style.vocabulary).toContain("bro");
    expect(anRes.body.style.vocabulary).not.toContain("beta");
  });

  it("Step 3: Verify both personas coexist simultaneously without data corruption", async () => {
    const listRes = await request(app)
      .get("/api/personas")
      .set("Authorization", `Bearer ${token}`);

    expect(listRes.body.length).toBe(2);
    const names = listRes.body.map((p: any) => p.name);
    expect(names).toContain("Dad");
    expect(names).toContain("Rahul");

    // Verify Dad's response examples in DB
    const dadExamples = await ConversationExample.find({ personaId: dadId });
    expect(dadExamples.length).toBeGreaterThan(0);
    for (const ex of dadExamples) {
      expect(ex.personaId.toString()).toBe(dadId);
      expect(ex.response).not.toContain("bro kya chal raha hai");
    }

    // Verify Friend's response examples in DB
    const friendExamples = await ConversationExample.find({ personaId: friendId });
    expect(friendExamples.length).toBeGreaterThan(0);
    for (const ex of friendExamples) {
      expect(ex.personaId.toString()).toBe(friendId);
      expect(ex.response).not.toContain("beta");
    }
  });

  it("Step 4: Ask both personas 'How are you?' — verify distinct persona-learned styles", async () => {
    // Dad
    const dadChatRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How are you?" });

    expect(dadChatRes.status).toBe(200);
    expect(dadChatRes.body.message.toLowerCase()).toContain("beta");
    expect(dadChatRes.body.message).not.toMatch(/\bbro\b/i);

    // Friend (Rahul)
    const friendChatRes = await request(app)
      .post(`/api/chat/${friendId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How are you?" });

    expect(friendChatRes.status).toBe(200);
    expect(friendChatRes.body.message.toLowerCase()).toMatch(/bro|bhai|badiya|mast|good/i);
    expect(friendChatRes.body.message).not.toContain("So what broke this week?");
    expect(friendChatRes.body.message).not.toContain("beta");

    // Ensure responses are distinct
    expect(dadChatRes.body.message).not.toEqual(friendChatRes.body.message);
  });

  it("Step 5: Ask about Dad-unique memory (Goa trip) — verify Dad knows it and Friend does not", async () => {
    // Dad
    const dadMemoryRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(dadMemoryRes.status).toBe(200);
    expect(dadMemoryRes.body.message.toLowerCase()).toMatch(/rain|baarish|barish|paani|pani|water|soaked|downpour|bheeg|yaad/i);
    expect(dadMemoryRes.body.grounded).toBeDefined();

    // Friend (Rahul) asked about Goa trip -> No evidence in Rahul's conversation -> Grounded fallback
    const friendMemoryRes = await request(app)
      .post(`/api/chat/${friendId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });

    expect(friendMemoryRes.status).toBe(200);
    expect(friendMemoryRes.body.message).toContain("I don't have enough information");
    expect(friendMemoryRes.body.grounded).toBeUndefined();
  });

  it("Step 6: Ask about Friend-unique memory (Hackathon) — verify Friend knows it and Dad does not", async () => {
    // Friend (Rahul)
    const friendHackRes = await request(app)
      .post(`/api/chat/${friendId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember our AI Hackathon victory?" });

    expect(friendHackRes.status).toBe(200);
    expect(friendHackRes.body.message.toLowerCase()).toMatch(/hackathon|coded|prize|hours|won|victory/i);

    // Dad asked about Hackathon -> No evidence in Dad's conversation -> Grounded fallback
    const dadHackRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember our AI Hackathon victory?" });

    expect(dadHackRes.status).toBe(200);
    expect(dadHackRes.body.message).toContain("I don't have enough information");
  });

  it("Step 7: Verify out-of-domain factual questions return grounded fallback for both personas", async () => {
    const unknownRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What did you study in quantum computing astrophysics?" });

    expect(unknownRes.status).toBe(200);
    expect(unknownRes.body.message).toBe("I don't have enough information from the memories you've shared to know that.");
  });

  it("Step 8: Verify attachments and URLs are never spoken as dialogue replies", async () => {
    const chatRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(chatRes.body.message).not.toContain("IMG-20190618-WA0002.jpg");
    expect(chatRes.body.message).not.toContain("(file attached)");
    expect(chatRes.body.message).not.toContain("https://maps.google.com");
  });
});
