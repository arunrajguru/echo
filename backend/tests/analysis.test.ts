import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";
import { Memory } from "../src/models/Memory.js";

let token = "";
let personaId = "";

const sampleWhatsAppChat = `[12/04/19, 10:14:02] Dad: So what broke this week?
[12/04/19, 10:15:20] Me: Nothing yet! Going to Goa next month.
[12/04/19, 10:16:05] Dad: Obviously 😂 How can I forget that rain? You literally fell into the water bro 😂
[12/04/19, 10:17:11] Dad: I'm reading a book on anti-gravity. It's impossible to put down.
[12/04/19, 10:18:00] Dad: We didn't catch a single thing again lol at the old fishing boat
[12/04/19, 10:19:30] Dad: Same time as always, don't be late this year for Diwali at Grandma's
[12/04/19, 10:20:00] Dad: Call me when you land`;

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
  await Persona.deleteMany({});
  await ConversationMessage.deleteMany({});
  await Memory.deleteMany({});

  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email: "analysis_test@example.com", password: "password123" });

  token = regRes.body.token;

  const createRes = await request(app)
    .post("/api/personas")
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Dad", relationship: "Father" });

  personaId = createRes.body.id;

  // Upload chat
  await request(app)
    .post(`/api/personas/${personaId}/upload`)
    .set("Authorization", `Bearer ${token}`)
    .send({
      content: sampleWhatsAppChat,
      fileName: "chat.txt",
    });

  // Select target participant
  await request(app)
    .patch(`/api/personas/${personaId}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ targetParticipant: "Dad" });
});

afterAll(async () => {
  await User.deleteMany({});
  await Persona.deleteMany({});
  await ConversationMessage.deleteMany({});
  await Memory.deleteMany({});
  await disconnectDatabase();
});

describe("Persona Analysis & Memory Extraction", () => {
  it("should analyze persona style, emojis, sign-offs, and extract discrete memories", async () => {
    const res = await request(app)
      .post(`/api/personas/${personaId}/analyze`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.stats.messagesAnalyzed).toBe(7);
    expect(res.body.stats.personaMessages).toBe(6);
    expect(res.body.style.emojis).toContain("😂");
    expect(res.body.memories.length).toBeGreaterThanOrEqual(4);

    // Verify all memories have verified source lines and confidence
    for (const mem of res.body.memories) {
      expect(mem.sourceLines.length).toBeGreaterThan(0);
      expect(mem.confidence).toBeGreaterThan(0.7);
      expect(["Trips", "Conversations", "Favorites", "Places", "People", "General"]).toContain(
        mem.category
      );
    }
  });

  it("should fetch memory map clustered by categories", async () => {
    const res = await request(app)
      .get(`/api/personas/${personaId}/memory-map`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.nodes.length).toBeGreaterThanOrEqual(4);
    expect(res.body.categories).toContain("Trips");
  });

  it("should update a memory", async () => {
    const memsRes = await request(app)
      .get(`/api/personas/${personaId}/memories`)
      .set("Authorization", `Bearer ${token}`);

    const memId = memsRes.body[0].id;
    const patchRes = await request(app)
      .patch(`/api/personas/${personaId}/memories/${memId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ title: "Updated Memory Title" });

    expect(patchRes.status).toBe(200);
    expect(patchRes.body.title).toBe("Updated Memory Title");
  });
});
