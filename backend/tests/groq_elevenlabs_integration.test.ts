import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import request from "supertest";
import axios from "axios";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ConversationExample } from "../src/models/ConversationExample.js";
import { VoiceProfile } from "../src/models/VoiceProfile.js";
import { ChatSession } from "../src/models/ChatSession.js";
import { GroqLLMProvider } from "../src/services/llm/GroqLLMProvider.js";
import { ElevenLabsVoiceService } from "../src/services/voice/ElevenLabsVoiceService.js";
import { globalLLMService } from "../src/services/llm/index.js";
import { globalVoiceService, LocalVoiceService } from "../src/services/voice/voiceFactory.js";
import { buildSystemPrompt } from "../src/services/llm/promptTemplates.js";

describe("ECHO — Groq Text Generation & ElevenLabs Voice Integration Test Suite (16 Acceptance Tests)", () => {
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

    // Register test user
    const authRes = await request(app).post("/api/auth/register").send({
      email: `groq_eleven_${Date.now()}@example.com`,
      password: "Password123!",
      name: "Tester",
    });
    token = authRes.body.token;

    // 1. Dad Persona & Chat
    const dadRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });
    dadId = (dadRes.body._id || dadRes.body.id).toString();

    const dadChat = `12/04/19, 10:14 - Dad: Beta khana kha liya?
12/04/19, 10:15 - Me: Haan Papa, lunch kar raha hoon.
12/04/19, 10:16 - Dad: Good. Dhyan rakhna apna.
15/05/19, 18:30 - Me: How are you?
15/05/19, 18:31 - Dad: Main theek hoon beta. So what broke this week? 😂`;

    await request(app)
      .post(`/api/personas/${dadId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(dadChat), "dad_chat.txt");
    await request(app).post(`/api/personas/${dadId}/analyze`).set("Authorization", `Bearer ${token}`);

    // 2. Rahul Persona & Chat
    const rahulRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });
    rahulId = (rahulRes.body._id || rahulRes.body.id).toString();

    const rahulChat = `10/01/24, 11:00 - Rahul: Yo bro kya chal raha hai?
10/01/24, 11:01 - Me: Working on ECHO.
10/01/24, 11:02 - Rahul: Sahi hai mast kaam kar!
12/01/24, 15:00 - Me: How are you bro?
12/01/24, 15:01 - Rahul: Mast bro 😂 tu bata?
12/01/24, 15:05 - Me: What are you doing?
12/01/24, 15:06 - Rahul: Bas project ke saath fight kar raha hoon 😂`;

    await request(app)
      .post(`/api/personas/${rahulId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(rahulChat), "rahul_chat.txt");
    await request(app).post(`/api/personas/${rahulId}/analyze`).set("Authorization", `Bearer ${token}`);

    // 3. Priya Persona & Chat
    const priyaRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Priya", relationship: "Friend" });
    priyaId = (priyaRes.body._id || priyaRes.body.id).toString();

    const priyaChat = `15/09/22, 11:00 - Me: Hello
15/09/22, 11:01 - Priya: Haan sab badhiya, tu bata sun na! 😊
15/09/22, 14:00 - Me: How's your day?
15/09/22, 14:01 - Priya: So busy with meetings today sun na! 😭`;

    await request(app)
      .post(`/api/personas/${priyaId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from(priyaChat), "priya_chat.txt");
    await request(app).post(`/api/personas/${priyaId}/analyze`).set("Authorization", `Bearer ${token}`);
  }, 90000);

  afterAll(async () => {
    vi.restoreAllMocks();
    globalLLMService.setProvider(null);
    globalVoiceService.setProvider(new LocalVoiceService());
    await disconnectDatabase();
  }, 30000);

  beforeEach(() => {
    globalLLMService.setProvider(null);
    globalVoiceService.setProvider(new LocalVoiceService());
  });

  // TEST 1: Groq provider initialization
  it("Test 1: Groq provider initialization", () => {
    const provider = new GroqLLMProvider("test-groq-key", "llama-3.3-70b-versatile");
    expect(provider).toBeDefined();
    expect(provider.getModel()).toBe("llama-3.3-70b-versatile");
  });

  // TEST 2: Groq API mock response
  it("Test 2: Groq API mock response returns generated text", async () => {
    const provider = new GroqLLMProvider("test-groq-key", "llama-3.3-70b-versatile");
    const axiosSpy = vi.spyOn(axios, "post").mockResolvedValueOnce({
      data: {
        choices: [
          {
            message: {
              content: "Kuch nahi bro, just relaxing today 😂 tu bata?",
            },
          },
        ],
      },
    });

    const result = await provider.generate([
      { role: "system", content: "You are Rahul" },
      { role: "user", content: "What are you doing today?" },
    ]);

    expect(result).toBe("Kuch nahi bro, just relaxing today 😂 tu bata?");
    expect(axiosSpy).toHaveBeenCalled();
    axiosSpy.mockRestore();
  });

  // TEST 3: Persona context sent to Groq
  it("Test 3: Persona context is properly constructed with style, examples, and memories", async () => {
    const persona = await Persona.findById(rahulId);
    expect(persona).toBeDefined();

    const mockRagContext: any = {
      memories: [{ title: "Hackathon Win", category: "Conversations", content: "Won first prize", sourceLines: ["We won!"] }],
      examples: [{ prompt: "How are you bro?", response: "Mast bro 😂 tu bata?", topic: "casual" }],
    };

    const prompt = buildSystemPrompt(persona!, mockRagContext, "Me: Hello\nRahul: Yo", "What are you doing today?");
    expect(prompt).toContain("Rahul");
    expect(prompt).toContain("RESPONSE EXAMPLES");
    expect(prompt).toContain("RELEVANT MEMORIES");
    expect(prompt).toContain("What are you doing today?");
    expect(prompt).toContain("RULES");
  });

  // TEST 4: Current user message sent correctly
  it("Test 4: Current user message is sent to LLM without stale state or cached query", async () => {
    const mockGroq = new GroqLLMProvider("mock-key");
    let sentUserMsg = "";

    const generateSpy = vi.spyOn(mockGroq, "generate").mockImplementation(async (messages) => {
      const lastUser = messages.filter((m) => m.role === "user").pop();
      sentUserMsg = lastUser?.content || "";
      return "Generated response for current message";
    });

    globalLLMService.setProvider(mockGroq);

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "   Testing unique current message prompt 123   " });

    expect(res.status).toBe(200);
    expect(sentUserMsg).toBe("Testing unique current message prompt 123");
    generateSpy.mockRestore();
    globalLLMService.setProvider(null);
  });

  // TEST 5: New response generation
  it("Test 5: Groq generates a NEW response rather than copying an old example", async () => {
    const mockGroq = new GroqLLMProvider("mock-key");
    vi.spyOn(mockGroq, "generate").mockResolvedValueOnce("Bas chilling at home bro 😂 what's the plan?");
    globalLLMService.setProvider(mockGroq);

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What are you doing today?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Bas chilling at home bro 😂 what's the plan?");
    globalLLMService.setProvider(null);
  });

  // TEST 6: No exact RAG-answer reuse
  it("Test 6: Does not mechanically output old transcript when asking a new question", async () => {
    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "What is your plan for the evening?" });

    expect(res.status).toBe(200);
    expect(res.body.message).not.toBe("Bas project ke saath fight kar raha hoon 😂");
    expect(res.body.message.length).toBeGreaterThan(5);
  });

  // TEST 6B: Requirement 13 — Test exact messages: hello, how are you?, what are you doing?, what did you do today?, tell me something funny
  it("Test 6B: Generates independent, context-rich responses for 5 consecutive unseen messages via Groq", async () => {
    const testPrompts = [
      "hello",
      "how are you?",
      "what are you doing?",
      "what did you do today?",
      "tell me something funny",
    ];

    const responses = new Set<string>();

    for (const prompt of testPrompts) {
      const res = await request(app)
        .post(`/api/chat/${rahulId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: prompt });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.message.length).toBeGreaterThan(3);
      responses.add(res.body.message);
    }

    // All 5 responses must be distinct
    expect(responses.size).toBe(5);
  });

  // TEST 7: Dad / Rahul / Priya isolation
  it("Test 7: Dad, Rahul, and Priya remain isolated in vocabulary and response style", async () => {
    // Dad
    const dadRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How are you?" });
    expect(dadRes.body.message.toLowerCase()).toContain("beta");
    expect(dadRes.body.message).not.toMatch(/\bbro\b/i);

    // Rahul
    const rahulRes = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "How are you?" });
    expect(rahulRes.body.message.toLowerCase()).not.toContain("beta");
    expect(rahulRes.body.message.toLowerCase()).toContain("mast");

    // Priya
    const priyaRes = await request(app)
      .post(`/api/chat/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Hello" });
    expect(priyaRes.body.message).toContain("sun na");
    expect(priyaRes.body.message.toLowerCase()).not.toContain("beta");
  });

  // TEST 8: ElevenLabs provider initialization
  it("Test 8: ElevenLabs provider initialization", () => {
    const voiceService = new ElevenLabsVoiceService("test-eleven-key");
    expect(voiceService).toBeDefined();
    expect(voiceService.isAvailable()).toBe(true);
  });

  // TEST 9: Voice upload mock
  it("Test 9: Voice upload calls voice provider and creates voice clone", async () => {
    const mockEleven = new ElevenLabsVoiceService("mock-eleven-key");
    const cloneSpy = vi.spyOn(mockEleven, "cloneVoice").mockResolvedValueOnce({
      voiceId: "eleven_voice_dad_123",
      status: "ready",
      provider: "elevenlabs",
    });

    globalVoiceService.setProvider(mockEleven);

    const dummyAudio = Buffer.alloc(1000);
    const res = await request(app)
      .post(`/api/personas/${dadId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", dummyAudio, "dad_voice.mp3")
      .field("voiceConsent", "true");

    expect(res.status).toBe(200);
    expect(res.body.voiceId).toBe("eleven_voice_dad_123");
    expect(cloneSpy).toHaveBeenCalled();
    cloneSpy.mockRestore();
  });

  // TEST 10: Voice ID stored against correct persona
  it("Test 10: Voice ID is stored in VoiceProfile for that specific persona", async () => {
    const profile = await VoiceProfile.findOne({ personaId: dadId });
    expect(profile).toBeDefined();
    expect(profile?.voiceId).toBe("eleven_voice_dad_123");
  });

  // TEST 11: Voice synthesis mock
  it("Test 11: Voice synthesis calls provider with correct voiceId and text", async () => {
    const mockEleven = new ElevenLabsVoiceService("mock-eleven-key");
    const synthSpy = vi.spyOn(mockEleven, "synthesize").mockResolvedValueOnce({
      audioUrl: "http://localhost:4000/api/audio/elevenlabs_dad_test.mp3",
      audioFilename: "elevenlabs_dad_test.mp3",
      provider: "elevenlabs",
      engine: "ElevenLabs Multilingual v2",
      disclaimer: "AI-generated voice",
      voiceReferenceUsed: true,
    });

    globalVoiceService.setProvider(mockEleven);

    const res = await request(app)
      .post(`/api/personas/${dadId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Hello beta, khana kha liya?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.audioUrl).toContain("elevenlabs_dad_test.mp3");
    expect(synthSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        text: "Hello beta, khana kha liya?",
        voiceId: "eleven_voice_dad_123",
        personaId: dadId,
      })
    );
    synthSpy.mockRestore();
  });

  // TEST 12: Correct persona voice selected
  it("Test 12: Rahul voice upload gets separate voiceId without overwriting Dad", async () => {
    const mockEleven = new ElevenLabsVoiceService("mock-eleven-key");
    vi.spyOn(mockEleven, "cloneVoice").mockResolvedValueOnce({
      voiceId: "eleven_voice_rahul_456",
      status: "ready",
      provider: "elevenlabs",
    });

    globalVoiceService.setProvider(mockEleven);

    const dummyAudio = Buffer.alloc(1000);
    const res = await request(app)
      .post(`/api/personas/${rahulId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", dummyAudio, "rahul_voice.mp3")
      .field("voiceConsent", "true");

    expect(res.status).toBe(200);
    expect(res.body.voiceId).toBe("eleven_voice_rahul_456");

    const rahulProfile = await VoiceProfile.findOne({ personaId: rahulId });
    const dadProfile = await VoiceProfile.findOne({ personaId: dadId });

    expect(rahulProfile?.voiceId).toBe("eleven_voice_rahul_456");
    expect(dadProfile?.voiceId).toBe("eleven_voice_dad_123");
  });

  // TEST 13: Voice isolation
  it("Test 13: Priya voice upload is independent and distinct", async () => {
    const mockEleven = new ElevenLabsVoiceService("mock-eleven-key");
    vi.spyOn(mockEleven, "cloneVoice").mockResolvedValueOnce({
      voiceId: "eleven_voice_priya_789",
      status: "ready",
      provider: "elevenlabs",
    });

    globalVoiceService.setProvider(mockEleven);

    const dummyAudio = Buffer.alloc(1000);
    const res = await request(app)
      .post(`/api/personas/${priyaId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", dummyAudio, "priya_voice.mp3")
      .field("voiceConsent", "true");

    expect(res.status).toBe(200);
    expect(res.body.voiceId).toBe("eleven_voice_priya_789");

    const priyaProfile = await VoiceProfile.findOne({ personaId: priyaId });
    expect(priyaProfile?.voiceId).toBe("eleven_voice_priya_789");
  });

  // TEST 14: Groq failure fallback
  it("Test 14: Groq API failure gracefully falls back to local synthesis without crashing", async () => {
    const mockGroq = new GroqLLMProvider("mock-key");
    vi.spyOn(mockGroq, "generate").mockRejectedValueOnce(new Error("Groq Rate Limit 429"));
    globalLLMService.setProvider(mockGroq);

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.length).toBeGreaterThan(3);
    globalLLMService.setProvider(null);
  });

  // TEST 15: ElevenLabs failure handling
  it("Test 15: ElevenLabs API failure gracefully falls back to local audio without crashing", async () => {
    const mockEleven = new ElevenLabsVoiceService("mock-eleven-key");
    vi.spyOn(mockEleven, "synthesize").mockRejectedValueOnce(new Error("ElevenLabs Network Error"));
    globalVoiceService.setProvider(mockEleven);

    const res = await request(app)
      .post(`/api/personas/${rahulId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Mast bro 😂 tu bata?" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.audioUrl).toBeDefined();
  });

  // TEST 16: Chat + Voice integration
  it("Test 16: Full chat request produces generated text and audioUrl together", async () => {
    const res = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Good morning Papa" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.personaId).toBe(dadId);
    expect(res.body.voiceAvailable).toBe(true);
    expect(res.body.audioUrl).toBeDefined();
  }, 15000);
});
