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
[12/04/19, 10:17:00] Dad: IMG-20260821-WA0009.jpg (file attached)
[12/04/19, 10:18:00] Dad: We didn't catch a single fish at the old fishing boat haha
[12/04/19, 10:20:00] Dad: Call me when you land`;

const rahulChat = `[10/06/21, 09:00:00] Me: kaisa hai?
[10/06/21, 09:01:00] Rahul: main mast hoon yaar tu bata 😂
[10/06/21, 09:05:00] Me: where are you?
[10/06/21, 09:06:00] Rahul: Brooo 😂😂 at the college cafe!
[10/06/21, 14:02:00] Me: did you hear about the hackathon?
[10/06/21, 14:03:00] Rahul: We just won first prize at the college hackathon! 🏆 Let's celebrate!`;

const priyaChat = `[15/09/22, 11:00:00] Me: kaisa hai?
[15/09/22, 11:01:00] Priya: Haan sab badhiya, tu bata sun na! 😊
[15/09/22, 11:05:00] Me: are you free this weekend?
[15/09/22, 11:06:00] Priya: Arrey yes! Let's go to the art workshop and paint together! 🎨
[15/09/22, 11:10:00] Priya: VID-20220915-WA0012.mp4 (file attached)
[15/09/22, 11:12:00] Priya: That coffee cafe near the gallery was so amazing`;

let token = "";
let dadId = "";
let rahulId = "";
let priyaId = "";

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
    .send({ email: "trio_test@example.com", password: "password123" });
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

describe("Dad, Rahul, and Priya Multi-Persona Independence & Voice Isolation", () => {
  it("Step 1: Create Dad Persona & Ingest Dad's data", async () => {
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
    expect(analyzeRes.body.memories.length).toBeGreaterThan(0);
  });

  it("Step 2: Create Rahul Persona & Ingest Rahul's data", async () => {
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
    expect(analyzeRes.body.style).toBeDefined();
  });

  it("Step 3: Create Priya Persona & Ingest Priya's data (Female)", async () => {
    const pRes = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Priya", relationship: "Friend" });
    priyaId = pRes.body.id;

    await request(app)
      .post(`/api/personas/${priyaId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({ content: priyaChat, fileName: "Priya_Chat.txt" });

    await request(app)
      .patch(`/api/personas/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Priya" });

    const analyzeRes = await request(app)
      .post(`/api/personas/${priyaId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(analyzeRes.status).toBe(200);
    expect(analyzeRes.body.style).toBeDefined();
  });

  it("Step 4: Verify all 3 personas persist simultaneously in GET /api/personas", async () => {
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

  it("Step 5: Verify distinct style replies for 'kaisa hai tu?'", async () => {
    // Dad
    const dadRes = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });
    expect(dadRes.body.message.toLowerCase()).toContain("beta");
    expect(dadRes.body.message).not.toMatch(/\bbro\b/i);

    // Rahul
    const rahulRes = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });
    expect(rahulRes.body.message.toLowerCase()).toMatch(/mast|chill|bro|bhai|tu/i);
    expect(rahulRes.body.message.toLowerCase()).not.toContain("beta");

    // Priya
    const priyaRes = await request(app)
      .post(`/api/chat/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai tu?" });
    expect(priyaRes.status).toBe(200);
    expect(priyaRes.body.message.length).toBeGreaterThan(4);
    expect(priyaRes.body.message.toLowerCase()).not.toContain("beta");
  });

  it("Step 6: Verify memory grounding and strict isolation across all 3 personas", async () => {
    // Dad: Ask about Goa -> Grounds in Dad's memory
    const dadGoa = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });
    expect(dadGoa.body.grounded).toContain("Goa");
    expect(dadGoa.body.message.toLowerCase()).toMatch(/rain|downpour|water|drenched|barish/i);

    // Priya: Ask about Goa -> Zero Goa memory, returns lack-of-info fallback
    const priyaGoa = await request(app)
      .post(`/api/chat/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the Goa trip and the rain?" });
    expect(priyaGoa.body.message).toContain("I don't have enough information");
    expect(priyaGoa.body.grounded).toBeUndefined();

    // Priya: Ask about Art Workshop -> Grounds in Priya's art memory
    const priyaArt = await request(app)
      .post(`/api/chat/${priyaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember our art workshop?" });
    expect(priyaArt.status).toBe(200);
    expect(priyaArt.body.message).toBeDefined();
    expect(priyaArt.body.message.toLowerCase()).toMatch(/art|workshop|creative|canvas|fun/i);

    // Rahul: Ask about Hackathon -> Grounds in Rahul's hackathon memory
    const rahulHack = await request(app)
      .post(`/api/chat/${rahulId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "Do you remember the hackathon win?" });
    expect(rahulHack.status).toBe(200);
    expect(rahulHack.body.message).toBeDefined();
    expect(rahulHack.body.message.toLowerCase()).toMatch(/hackathon|win|first|prize|coded|crazy/i);
  });

  it("Step 7: Verify attachment filenames are NOT treated as spoken responses", async () => {
    const dadMsg = await request(app)
      .post(`/api/chat/${dadId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ message: "kaisa hai?" });

    expect(dadMsg.body.message).not.toContain("IMG-20260821-WA0009.jpg");
    expect(dadMsg.body.message).not.toContain("(file attached)");
  });

  it("Step 8: Verify voice reference upload and synthesis isolation for Dad, Rahul, and Priya", async () => {
    // Upload voice sample for Dad
    const dadVoiceRes = await request(app)
      .post(`/api/personas/${dadId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("RIFF....WAVEfmt ....data...."), "dad_sample.wav");
    expect(dadVoiceRes.status).toBe(200);

    // Upload voice sample for Priya (Female)
    const priyaVoiceRes = await request(app)
      .post(`/api/personas/${priyaId}/voice/upload`)
      .set("Authorization", `Bearer ${token}`)
      .attach("file", Buffer.from("RIFF....WAVEfmt ....data...."), "priya_female_sample.wav");
    expect(priyaVoiceRes.status).toBe(200);

    // Synthesize Dad speech
    const dadSynth = await request(app)
      .post(`/api/personas/${dadId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Main theek hoon beta." });
    expect(dadSynth.status).toBe(200);
    expect(dadSynth.body.audioUrl).toBeDefined();

    // Synthesize Priya speech
    const priyaSynth = await request(app)
      .post(`/api/personas/${priyaId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Haan sab badhiya sun na!" });
    expect(priyaSynth.status).toBe(200);
    expect(priyaSynth.body.audioUrl).toBeDefined();
  }, 30000);

  it("Step 9: Verify cascade delete of Rahul leaves Dad and Priya intact", async () => {
    const delRes = await request(app)
      .delete(`/api/personas/${rahulId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(delRes.status).toBe(200);

    const listRes = await request(app)
      .get("/api/personas")
      .set("Authorization", `Bearer ${token}`);
    expect(listRes.body.length).toBe(2);
    const names = listRes.body.map((p: any) => p.name);
    expect(names).toContain("Dad");
    expect(names).toContain("Priya");
    expect(names).not.toContain("Rahul");
  });
});
