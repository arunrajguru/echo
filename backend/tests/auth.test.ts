import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../src/app.js";
import { connectDatabase, disconnectDatabase } from "../src/config/database.js";
import { User } from "../src/models/User.js";

beforeAll(async () => {
  await connectDatabase();
  await User.deleteMany({});
});

afterAll(async () => {
  await User.deleteMany({});
  await disconnectDatabase();
});

describe("Auth API", () => {
  const testUser = {
    email: "testuser@example.com",
    password: "password123",
  };

  it("should register a new user successfully", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.token).toBeDefined();
  });

  it("should not allow duplicate registration with the same email", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists");
  });

  it("should reject invalid email or short password", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "invalid-email", password: "short" });

    expect(res.status).toBe(400);
  });

  it("should login with correct credentials and return token", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send(testUser);

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.token).toBeDefined();
  });

  it("should reject invalid login credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("should access /api/auth/me with valid Bearer token", async () => {
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send(testUser);

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUser.email);
  });

  it("should reject /api/auth/me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});
