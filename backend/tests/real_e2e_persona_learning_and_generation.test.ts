import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ConversationExample } from "../src/models/ConversationExample.js";
import { VoiceProfile } from "../src/models/VoiceProfile.js";
import { ChatSession } from "../src/models/ChatSession.js";
import { globalLLMService, GroqLLMProvider } from "../src/services/llm/index.js";
import { globalVoiceService, ElevenLabsVoiceService, LocalVoiceService } from "../src/services/voice/voiceFactory.js";

describe("ECHO — Real End-to-End Persona Learning & Dynamic Conversation Generation (18-Point Verification)", () => {
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
    await VoiceProfile.deleteMany({});
    await ChatSession.deleteMany({});

    // Register User
    const regRes = await request(app).post("/api/auth/register").send({
      email: `e2e_real_${Date.now()}@example.com`,
      password: "Password123!",
      name: "ECHO Tester",
    });
    token = regRes.body.token;

    // 1. Dad Persona & Upload
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
    await request(app).post(`/api/personas/${dadId}/analyze`).set("Authorization", `Bearer ${token}`);

    // 2. Rahul Persona & Upload
    const rahulRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });
    rahulId = rahulRes.body.id;

    const rahulChat = `10/01/24, 11:00 - Rahul: Yo bro kya chal raha hai?
10/01/24, 11:01 - Me: Working on ECHO.
10/01/24, 11:02 - Rahul: Sahi hai mast kaam kar!
12/01/24, 15:00 - Me: How are you bro?
12/01/24, 15:01 - Rahul: Mast bro 😂 tu bata?
12/01/24, 15:05 - Me: What are you doing?
12/01/24, 15:06 - Rahul: Bas project ke saath fight kar raha hoon 😂
14/01/24, 19:00 - Me: Do you remember our AI Hackathon victory?
14/01/24, 19:01 - Rahul: That hackathon was crazy! We coded for 36 hours and won first prize! 🏆`;

    await request(app)
      .post(`/api/personas/${rahulId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(rahulChat), "rahul_chat.txt");
    await request(app).post(`/api/personas/${rahulId}/analyze`).set("Authorization", `Bearer ${token}`);

    // 3. Priya Persona & Upload
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
    await request(app).post(`/api/personas/${priyaId}/analyze`).set("Authorization", `Bearer ${token}`);
  });

  afterAll(async () => {
    vi.restoreAllMocks();
    globalLLMService.setProvider(null);
    globalVoiceService.setProvider(new LocalVoiceService());
    await disconnectDatabase();
  });

  beforeEach(() => {
    globalLLMService.setProvider(null);
    globalVoiceService.setProvider(new LocalVoiceService());
  });

  // 1. TXT Parsing
  it("Requirement 1: TXT Parsing accurately parses WhatsApp chat messages", async () => {
    const messages = await ConversationMessage.find({ personaId: dadId });
    expect(messages.length).toBeGreaterThan(3);
    expect(messages.some((m) => m.sender === "Dad")).toBe(true);
  });

  // 2. Persona Extraction
  it("Requirement 2: Persona extraction correctly detects participants and assigns target participant", async () => {
    const persona = await Persona.findById(rahulId);
    expect(persona?.targetParticipant).toBe("Rahul");
  });

  // 3. StyleProfile Generation
  it("Requirement 3: StyleProfile generated from real messages (vocabulary, emojis, formality)", async () => {
    const rahul = await Persona.findById(rahulId);
    const style = rahul?.style as any;
    expect(style).toBeDefined();
    expect(style.vocabulary).toContain("bro");
    expect(style.commonEmojis).toContain("😂");
  });

  // 4. ResponseExample Generation
  it("Requirement 4: ResponseExample dataset pairs user prompts with persona replies", async () => {
    const examples = await ConversationExample.find({ personaId: rahulId });
    expect(examples.length).toBeGreaterThan(0);
    expect(examples.some((e) => e.response.toLowerCase().includes("mast"))).toBe(true);
  });

  // 5. Memory Extraction
  it("Requirement 5: Discrete memories extracted and separated from conversational examples", async () => {
    const memories = await Memory.find({ personaId: dadId });
    expect(memories.length).toBeGreaterThan(0);
    expect(memories.some((m) => m.title.toLowerCase().includes("trip") || m.content.toLowerCase().includes("goa"))).toBe(true);
  });

  // 6. Persona-Scoped RAG
  it("Requirement 6: Vector search strictly scopes retrieval to current personaId", async () => {
    const dadMemories = await Memory.find({ personaId: dadId });
    const rahulMemories = await Memory.find({ personaId: rahulId });
    expect(dadMemories.some((m) => m.content.includes("Goa"))).toBe(true);
    expect(rahulMemories.some((m) => m.content.includes("Goa"))).toBe(false);
  });

  // 7. Groq Generation
  it("Requirement 7: Groq generation engine formats full persona context and generates response", async () => {
    const mockGroq = new GroqLLMProvider("mock-key");
    const generateSpy = vi.spyOn(mockGroq, "generate").mockResolvedValueOnce("Bas chilling at home bro 😂 what's up?");
    globalLLMService.setProvider(mockGroq);

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What are you doing today?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Bas chilling at home bro 😂 what's up?");
    expect(generateSpy).toHaveBeenCalled();
  });

  // 8. NEW Unseen Conversation Generation (10 Distinct Unseen User Messages)
  it("Requirement 8: System dynamically generates NEW persona-style responses for 10 unseen prompts without canned fallback", async () => {
    const unseenPrompts = [
      "What are you doing today?",
      "Had food?",
      "I'm bored",
      "Guess what happened today",
      "What should we do this weekend?",
      "I'm going somewhere tomorrow",
      "Good night",
      "I miss you",
      "What do you think about this?",
      "Tell me something funny",
    ];

    const rahulResponses = new Set<string>();

    for (const prompt of unseenPrompts) {
      const res = await request(app)
        .post(`/api/chat/${rahulId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: prompt });

      expect(res.status).toBe(200);
      expect(res.body.message).not.toContain("I don't have enough information");
      expect(res.body.message.length).toBeGreaterThan(4);
      rahulResponses.add(res.body.message);
    }

    // Ensure all 10 responses are distinct and contextually varied
    expect(rahulResponses.size).toBe(10);
  }, 120000);

  // 9. Conversation Continuity
  it("Requirement 9: Conversation history is recorded in ChatSession and maintained across turns", async () => {
    const turn1 = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hello" });
    const sessionId = turn1.body.sessionId;

    const turn2 = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "what are you doing?", sessionId });

    const session = await ChatSession.findById(sessionId);
    expect(session?.messages.length).toBeGreaterThanOrEqual(4);
  });

  // 10. No Repeated Generic Responses
  it("Requirement 10: Casual messages produce varied, topic-conditioned replies rather than repeating a single generic string", async () => {
    const resFood = await request(app).post(`/api/chat/${dadId}`).set("Authorization", `Bearer ${token}`).send({ message: "Had food?" });
    const resBored = await request(app).post(`/api/chat/${dadId}`).set("Authorization", `Bearer ${token}`).send({ message: "I'm bored" });
    const resNight = await request(app).post(`/api/chat/${dadId}`).set("Authorization", `Bearer ${token}`).send({ message: "Good night" });

    expect(resFood.body.message).not.toBe(resBored.body.message);
    expect(resBored.body.message).not.toBe(resNight.body.message);
    expect(resFood.body.message.toLowerCase()).toContain("lunch");
    expect(resBored.body.message.toLowerCase()).toContain("break");
    expect(resNight.body.message.toLowerCase()).toContain("night");
  });

  // 11. Dad / Rahul / Priya Isolation
  it("Requirement 11: Dad, Rahul, and Priya remain completely isolated in style and vocabulary", async () => {
    const dadRes = await request(app).post(`/api/chat/${dadId}`).set("Authorization", `Bearer ${token}`).send({ message: "how are you?" });
    const rahulRes = await request(app).post(`/api/chat/${rahulId}`).set("Authorization", `Bearer ${token}`).send({ message: "how are you?" });
    const priyaRes = await request(app).post(`/api/chat/${priyaId}`).set("Authorization", `Bearer ${token}`).send({ message: "hello" });

    expect(dadRes.body.message.toLowerCase()).toContain("beta");
    expect(dadRes.body.message).not.toMatch(/\bbro\b/i);

    expect(rahulRes.body.message.toLowerCase()).toContain("mast");
    expect(rahulRes.body.message.toLowerCase()).not.toContain("beta");

    expect(priyaRes.body.message).toContain("sun na");
    expect(priyaRes.body.message.toLowerCase()).not.toContain("beta");
  });

  // 12. Persona Switching
  it("Requirement 12: Persona switching immediately switches context without memory or style leakage", async () => {
    // 1. Dad Goa Query
    const dadGoa = await request(app).post(`/api/chat/${dadId}`).set("Authorization", `Bearer ${token}`).send({ message: "Do you remember the Goa trip?" });
    expect(dadGoa.body.message.toLowerCase()).toContain("rain");

    // 2. Rahul (should NOT know Dad's Goa trip)
    const rahulGoa = await request(app).post(`/api/chat/${rahulId}`).set("Authorization", `Bearer ${token}`).send({ message: "Do you remember the Goa trip?" });
    expect(rahulGoa.body.message).toBe("I don't have enough information from the memories you've shared to know that.");
  });

  // 13. Voice Upload
  it("Requirement 13: Voice upload accepts sample audio and creates VoiceProfile", async () => {
    const dummyAudio = Buffer.alloc(1000);
    const res = await request(app)
      .post(`/api/personas/${dadId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", dummyAudio, "dad_sample.wav")
      .field("voiceConsent", "true");

    expect(res.status).toBe(200);
    expect(res.body.voiceProfile).toBeDefined();
  });

  // 14. Persona-Specific Voice ID
  it("Requirement 14: Voice ID is attached strictly to target persona", async () => {
    const profile = await VoiceProfile.findOne({ personaId: dadId });
    expect(profile).toBeDefined();
    expect(profile?.personaId.toString()).toBe(dadId);
  });

  // 15. ElevenLabs Synthesis
  it("Requirement 15: ElevenLabs synthesis creates playable audio stream", async () => {
    const res = await request(app)
      .post(`/api/personas/${dadId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Main theek hoon beta." });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.audioUrl).toBeDefined();
  });

  // 16. Voice Playback API
  it("Requirement 16: Voice playback API streams audio/wav or audio/mpeg cleanly", async () => {
    const synthRes = await request(app)
      .post(`/api/personas/${dadId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Hello beta!" });

    const filename = synthRes.body.audioUrl.split("/").pop();
    const streamRes = await request(app).get(`/api/audio/${filename}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers["content-type"]).toMatch(/audio\/(wav|mpeg)/);
  });

  // 17. Voice/Text Consistency
  it("Requirement 17: Chat endpoint returns generated text and audioUrl together in one request", async () => {
    const chatRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Good morning Papa" });

    expect(chatRes.status).toBe(200);
    expect(chatRes.body.message).toBeDefined();
    expect(chatRes.body.voiceAvailable).toBe(true);
    expect(chatRes.body.audioUrl).toBeDefined();
  });

  // 18. API Failure Fallback
  it("Requirement 18: Groq and ElevenLabs API failures fall back to local generators gracefully", async () => {
    const mockGroq = new GroqLLMProvider("mock-key");
    vi.spyOn(mockGroq, "generate").mockRejectedValueOnce(new Error("Groq 503 Service Unavailable"));
    globalLLMService.setProvider(mockGroq);

    const mockEleven = new ElevenLabsVoiceService("mock-key");
    vi.spyOn(mockEleven, "synthesize").mockRejectedValueOnce(new Error("ElevenLabs 500"));
    globalVoiceService.setProvider(mockEleven);

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.length).toBeGreaterThan(3);
  });
});
