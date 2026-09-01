import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";
import { Persona } from "../src/models/Persona.js";
import { ConversationMessage } from "../src/models/ConversationMessage.js";

let token = "";
let userId = "";

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

  const regRes = await request(app)
    .post("/api/auth/register")
    .send({ email: "persona_test@example.com", password: "password123" });

  token = regRes.body.token;
  userId = regRes.body.user.id;
});

afterAll(async () => {
  await User.deleteMany({});
  await Persona.deleteMany({});
  await ConversationMessage.deleteMany({});
  await disconnectDatabase();
});

describe("Persona & Ingestion API", () => {
  let createdPersonaId = "";

  it("should create a new persona in draft status", async () => {
    const res = await request(app)
      .post("/api/personas")
      .set("Authorization", `Bearer ${token}`)
      .send({ name: "Dad", relationship: "Father" });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe("Dad");
    expect(res.body.relationship).toBe("Father");
    expect(res.body.status).toBe("draft");
    createdPersonaId = res.body.id;
  });

  it("should list all personas belonging to the user", async () => {
    const res = await request(app)
      .get("/api/personas")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe("Dad");
  });

  it("should upload and parse a WhatsApp chat export", async () => {
    const res = await request(app)
      .post(`/api/personas/${createdPersonaId}/upload`)
      .set("Authorization", `Bearer ${token}`)
      .send({
        content: sampleWhatsAppChat,
        fileName: "family_chat_export.txt",
      });

    expect(res.status).toBe(200);
    expect(res.body.format).toBe("whatsapp");
    expect(res.body.participants).toContain("Dad");
    expect(res.body.participants).toContain("Me");
    expect(res.body.messageCount).toBe(7);

    // Verify messages saved in MongoDB
    const messages = await ConversationMessage.find({ personaId: createdPersonaId });
    expect(messages.length).toBe(7);
  });

  it("should update persona target participant and scoped messages", async () => {
    const res = await request(app)
      .patch(`/api/personas/${createdPersonaId}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ targetParticipant: "Dad" });

    expect(res.status).toBe(200);
    expect(res.body.targetParticipant).toBe("Dad");

    const personaMsgs = await ConversationMessage.find({
      personaId: createdPersonaId,
      isPersona: true,
    });
    expect(personaMsgs.length).toBe(6);
  });
});
