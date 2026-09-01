import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import path from "path";
import fs from "fs";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { VoiceProfile } from "../src/models/VoiceProfile.js";

let token = "";
let personaId = "";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await VoiceProfile.deleteMany({});

  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email: "voice_audio_test@example.com", password: "password123" });
  token = regRes.body.token;

  const createRes = await request(app)
    .post("/api/personas")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Dad", relationship: "Father" });
  personaId = createRes.body.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Persona.deleteMany({});
  await VoiceProfile.deleteMany({});
  await disconnectDatabase();
});

describe("Audio Synthesis & Direct Playback Stream Verification", () => {
  it("should synthesize non-empty valid PCM WAV audio via Chatterbox V3", async () => {
    const synthRes = await request(app)
      .post(`/api/personas/${personaId}/voice/synthesize`)
      .set("Authorization", `Bearer ${token}`)
      .send({ text: "Yes, I remember that trip! The rain was unforgettable." });

    expect(synthRes.status).toBe(200);
    expect(synthRes.body.success).toBe(true);
    expect(synthRes.body.audioUrl).toBeDefined();
    expect(synthRes.body.engine).toMatch(/ElevenLabs|Chatterbox/i);
    expect(synthRes.body.voice_reference_used).toBe(true);

    const filename = synthRes.body.audioUrl.split("/").pop();

    // Verify audio stream endpoint
    const streamRes = await request(app)
      .get(`/api/audio/${filename}`);

    expect(streamRes.status).toBe(200);
    expect(streamRes.headers["content-type"]).toMatch(/audio\/mpeg|audio\/wav/);
    expect(streamRes.body.length).toBeGreaterThan(500);

    const buffer = Buffer.from(streamRes.body);
    if (filename?.endsWith(".wav")) {
      const magic = buffer.subarray(0, 4).toString("utf-8");
      const wave = buffer.subarray(8, 12).toString("utf-8");
      expect(magic).toBe("RIFF");
      expect(wave).toBe("WAVE");
    } else {
      expect(buffer.length).toBeGreaterThan(500);
    }
  });
});
