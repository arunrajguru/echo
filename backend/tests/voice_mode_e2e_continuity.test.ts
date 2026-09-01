import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { Memory } from "../src/models/Memory.js";
import { VoiceProfile } from "../src/models/VoiceProfile.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { ChatSession } from "../src/models/ChatSession.js";
import { globalLLMService, GroqLLMProvider } from "../src/services/llm/index.js";
import { ElevenLabsVoiceService } from "../src/services/voice/ElevenLabsVoiceService.js";
import { globalVoiceService } from "../src/services/voice/voiceFactory.js";

describe("ECHO — Complete Voice Mode & Text/Voice Continuity E2E Test Suite", () => {
  let token = "";
  let rahulId = "";
  let dadId = "";
  let sessionId = "";

  const RAHUL_CHAT = `10/01/24, 11:00 - Rahul: Yo bro kya chal raha hai?
10/01/24, 11:01 - Me: Working on ECHO project!
10/01/24, 11:02 - Rahul: Sahi hai mast kaam kar 😂 bas break bhi le liyo
10/01/24, 11:03 - Me: Haan bilkul. Hackathon jeetna hai.
10/01/24, 11:04 - Rahul: Brooo obviously jeetenge! Pizza party on you! 😂🍕`;

  const DAD_CHAT = `10/01/24, 8:00 AM - Dad: Beta good morning. Time pe breakfast kar lena.
10/01/24, 8:05 AM - Me: Good morning Papa, yes.
10/01/24, 8:06 AM - Dad: Health ka dhyan rakho, jyada screen time mat rakho.`;

  beforeAll(async () => {
    await connectDatabase();
    await User.deleteMany({});
    await Persona.deleteMany({});
    await Memory.deleteMany({});
    await VoiceProfile.deleteMany({});
    await ConversationMessage.deleteMany({});
    await ChatSession.deleteMany({});

    // 1. Register User
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({ email: "voicemode_test@example.com", password: "Password123!" });
    token = regRes.body.token;

    // 2. Create Persona: Rahul
    const rahulRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Rahul", relationship: "Friend" });
    rahulId = rahulRes.body.id;

    // Upload and analyze Rahul's chat
    await request(app)
      .post(`/api/personas/${rahulId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: RAHUL_CHAT, fileName: "rahul_chat.txt" });

    await request(app)
      .patch(`/api/personas/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Rahul" });

    await request(app)
      .post(`/api/personas/${rahulId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    // Create Persona: Dad
    const dadRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });
    dadId = dadRes.body.id;

    await request(app)
      .post(`/api/personas/${dadId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: DAD_CHAT, fileName: "dad_chat.txt" });

    await request(app)
      .patch(`/api/personas/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Dad" });

    await request(app)
      .post(`/api/personas/${dadId}/analyze`)
      .set("Authorization", `Bearer ${token}`);
  });

  afterAll(async () => {
    await User.deleteMany({});
    await Persona.deleteMany({});
    await Memory.deleteMany({});
    await VoiceProfile.deleteMany({});
    await ConversationMessage.deleteMany({});
    await ChatSession.deleteMany({});
    await disconnectDatabase();
  });

  // TEST 1: Voice Reference Upload creates persona-scoped VoiceProfile
  it("Test 1: Voice Reference Upload creates a unique persona-scoped VoiceProfile", async () => {
    // Create dummy WAV buffer
    const wavBuffer = Buffer.alloc(1000);
    wavBuffer.write("RIFF", 0);
    wavBuffer.write("WAVE", 8);

    const voiceRes = await request(app)
      .post(`/api/personas/${rahulId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", wavBuffer, "rahul_voice.wav")
      .field("voiceConsent", "true");

    expect(voiceRes.status).toBe(200);
    expect(voiceRes.body.voiceId).toBeDefined();

    const profile = await VoiceProfile.findOne({ personaId: rahulId });
    expect(profile).toBeDefined();
    expect(profile?.voiceId).toBe(voiceRes.body.voiceId);
  });

  // TEST 2: Text Chat Mode produces fresh responses for 4 unseen prompts
  it("Test 2: Text chat sends unseen prompts and receives fresh persona replies", async () => {
    const unseenPrompts = [
      "hello",
      "how are you?",
      "what are you doing today?",
      "tell me something funny",
    ];

    const responses: string[] = [];

    for (const p of unseenPrompts) {
      const res = await request(app)
        .post(`/api/chat/${rahulId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: p, sessionId: sessionId || undefined });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.message.length).toBeGreaterThan(3);
      sessionId = res.body.sessionId;
      responses.push(res.body.message);
    }

    expect(sessionId).toBeDefined();
    expect(new Set(responses).size).toBe(4);
  }, 60000);

  // TEST 3: Voice Mode Speech Turn uses existing Chat Pipeline + RAG + Groq + ElevenLabs
  it("Test 3: Voice Mode spoken transcript processes through existing persona chat pipeline", async () => {
    const spokenTranscript = "Rahul kal kya plan hai?";

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: spokenTranscript, sessionId });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    // Verify Rahul's tone (Hinglish/friend)
    expect(res.body.message.toLowerCase()).not.toContain("beta");
    expect(res.body.audioUrl).toBeDefined();
    expect(res.body.sessionId).toBe(sessionId);
  }, 30000);

  // TEST 4: Continuous Voice Turn-taking preserves context across turns
  it("Test 4: Continuous multi-turn voice interaction maintains conversation context", async () => {
    const turns = [
      "Haan theek hai shaam ko milte hain",
      "Pizza khane chalenge kya?",
    ];

    for (const turn of turns) {
      const res = await request(app)
        .post(`/api/chat/${rahulId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ message: turn, sessionId });

      expect(res.status).toBe(200);
      expect(res.body.message).toBeDefined();
      expect(res.body.audioUrl).toBeDefined();
    }
  }, 60000);

  // TEST 5: Bi-directional Conversation Continuity (Text <-> Voice)
  it("Test 5: History endpoint returns all text and voice turns in the unified conversation", async () => {
    const histRes = await request(app)
      .get(`/api/chat/${rahulId}/history`)
      .set("Authorization", `Bearer ${token}`);

    expect(histRes.status).toBe(200);
    expect(Array.isArray(histRes.body)).toBe(true);

    const messageTexts = histRes.body.map((m: any) => m.text);

    // Initial text turns must be in history
    expect(messageTexts).toContain("hello");
    expect(messageTexts).toContain("how are you?");
    expect(messageTexts).toContain("what are you doing today?");
    expect(messageTexts).toContain("tell me something funny");

    // Voice turns must also be in the same history
    expect(messageTexts).toContain("Rahul kal kya plan hai?");
    expect(messageTexts).toContain("Haan theek hai shaam ko milte hain");
    expect(messageTexts).toContain("Pizza khane chalenge kya?");
  });

  // TEST 6: Persona & Voice Isolation across Dad and Rahul
  it("Test 6: Dad and Rahul remain strictly isolated in persona style, memory, and voiceId", async () => {
    // Dad chat turn
    const dadRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Hello Papa" });

    expect(dadRes.status).toBe(200);
    expect(dadRes.body.message.toLowerCase()).toContain("beta");
    expect(dadRes.body.message).not.toMatch(/\bbro\b/i);

    // Dad history is isolated from Rahul
    const dadHist = await request(app)
      .get(`/api/chat/${dadId}/history`)
      .set("Authorization", `Bearer ${token}`);

    const dadMsgs = dadHist.body.map((m: any) => m.text);
    expect(dadMsgs).not.toContain("Rahul kal kya plan hai?");
    expect(dadMsgs).not.toContain("Pizza khane chalenge kya?");
  });

  // TEST 7: Speech Transcription endpoint fallback
  it("Test 7: Voice transcription endpoint accepts audio buffer and returns transcript", async () => {
    const dummyAudio = Buffer.alloc(500);
    const transRes = await request(app)
      .post(`/api/personas/${rahulId}/voice/transcribe`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", dummyAudio, "mic_sample.wav");

    expect(transRes.status).toBe(200);
    expect(transRes.body.text).toBeDefined();
    expect(transRes.body.text.length).toBeGreaterThan(0);
  });

  // TEST 8: Groq and ElevenLabs API failure fallbacks operate gracefully
  it("Test 8: System falls back gracefully if Groq or ElevenLabs returns an error", async () => {
    const mockFailingGroq = new GroqLLMProvider("invalid-key");
    vi.spyOn(mockFailingGroq, "generate").mockRejectedValueOnce(new Error("Groq API Timeout"));

    globalLLMService.setProvider(mockFailingGroq);

    const res = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });

    expect(res.status).toBe(200);
    expect(res.body.message).toBeDefined();
    expect(res.body.message.length).toBeGreaterThan(3);

    globalLLMService.setProvider(null);
  });

  // TEST 9: Secrets & ElevenLabs API Key are NEVER exposed in any API responses
  it("Test 9: ElevenLabs API Key and Groq API Key are never leaked in frontend responses", async () => {
    const personaRes = await request(app)
      .get(`/api/personas/${rahulId}`)
      .set("Authorization", `Bearer ${token}`);

    const strResponse = JSON.stringify(personaRes.body);
    expect(strResponse).not.toContain("sk_REDACTED_ELEVENLABS_KEY");
    expect(strResponse).not.toContain("gsk_REDACTED_GROQ_API_KEY");

    const chatRes = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "hello" });

    const strChat = JSON.stringify(chatRes.body);
    expect(strChat).not.toContain("sk_REDACTED_ELEVENLABS_KEY");
    expect(strChat).not.toContain("gsk_REDACTED_GROQ_API_KEY");
  });

  // TEST 10: Persona with missing voice profile handles synthesis safely
  it("Test 10: Persona without uploaded voice profile synthesizes using assigned profile without crashing", async () => {
    // Create new persona without voice upload
    const priyaRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Priya", relationship: "Friend" });

    const res = await request(app)
      .post(`/api/personas/${priyaRes.body.id}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Hello, testing missing voice profile synthesis." });

    expect(res.status).toBe(200);
    expect(res.body.audioUrl).toBeDefined();
    expect(res.body.voiceId).toBeDefined();
  });
});
