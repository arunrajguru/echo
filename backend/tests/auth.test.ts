import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import request from "supertest";
import bcrypt from "bcryptjs";
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

  it("should register a new user successfully without issuing token or cookie", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send(testUser);

    expect(res.status).toBe(201);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    expect(res.body.user.isVerified).toBe(false);
    expect(res.body.token).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
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

  it("should block login for unverified user with HTTP 403", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send(testUser);

    expect(res.status).toBe(403);
    expect(res.body.error).toContain("verify your email");
    expect(res.body.token).toBeUndefined();
    expect(res.headers["set-cookie"]).toBeUndefined();
  });

  it("should reject invalid login credentials", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: testUser.email, password: "wrongpassword" });

    expect(res.status).toBe(401);
  });

  it("should access /api/auth/me with valid Bearer token after verification", async () => {
    // Set a known OTP hash for the test user to test actual /verify-otp endpoint flow
    const testOtp = "123456";
    const userInDb = await User.findOne({ email: testUser.email });
    if (userInDb) {
      userInDb.otpHash = await bcrypt.hash(testOtp, 10);
      userInDb.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
      await userInDb.save();
    }

    // Verify OTP through /api/auth/verify-otp endpoint
    const verifyRes = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: testUser.email, otp: testOtp });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.token).toBeDefined();

    const token = verifyRes.body.token;

    // Verify authenticated access to /api/auth/me
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.email).toBe(testUser.email);

    // Verify verified user can now also log in successfully
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send(testUser);

    expect(loginRes.status).toBe(200);
    expect(loginRes.body.token).toBeDefined();
  });

  it("should reject /api/auth/me without token", async () => {
    const res = await request(app).get("/api/auth/me");
    expect(res.status).toBe(401);
  });
});

describe("Google OAuth API", () => {
  const originalClientId = process.env.GOOGLE_CLIENT_ID;
  let verifySpy: any;

  beforeAll(async () => {
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
    const { OAuth2Client } = await import("google-auth-library");
    verifySpy = vi.spyOn(OAuth2Client.prototype, "verifyIdToken").mockImplementation(async (options: any) => {
      const { idToken } = options;
      if (idToken === "valid-new-token" || idToken === "valid-existing-token") {
        return {
          getPayload: () => ({
            sub: "google-sub-12345",
            email: "newgoogleuser@example.com",
            name: "New Google User",
          }),
        } as any;
      }
      if (idToken === "conflict-local-token") {
        return {
          getPayload: () => ({
            sub: "google-sub-99999",
            email: "testuser@example.com",
            name: "Conflict User",
          }),
        } as any;
      }
      throw new Error("Invalid token signature");
    });
  });

  afterAll(() => {
    if (verifySpy) verifySpy.mockRestore();
    if (originalClientId) {
      process.env.GOOGLE_CLIENT_ID = originalClientId;
    } else {
      delete process.env.GOOGLE_CLIENT_ID;
    }
  });

  it("1. should reject missing id_token with 400", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({});

    expect(res.status).toBe(400);
  });

  it("2. should reject invalid Google token with 401", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "invalid-token" });

    expect(res.status).toBe(401);
    expect(res.body.error).toContain("Invalid Google token");
  });

  it("3. should create new Google user on valid Google token", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "valid-new-token" });

    expect(res.status).toBe(200);
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe("newgoogleuser@example.com");

    const userInDb = await User.findOne({ email: "newgoogleuser@example.com" });
    expect(userInDb).toBeDefined();
  });

  it("4. new Google user should have isVerified: true", async () => {
    const userInDb = await User.findOne({ email: "newgoogleuser@example.com" });
    expect(userInDb?.isVerified).toBe(true);
  });

  it("5. new Google user should have authProvider: 'google'", async () => {
    const userInDb = await User.findOne({ email: "newgoogleuser@example.com" });
    expect(userInDb?.authProvider).toBe("google");
    expect(userInDb?.googleId).toBe("google-sub-12345");
  });

  it("6. successful Google login should return JWT", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "valid-new-token" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
  });

  it("7. successful Google login should set auth cookie", async () => {
    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "valid-new-token" });

    expect(res.headers["set-cookie"]).toBeDefined();
    expect(res.headers["set-cookie"][0]).toContain("token=");
    expect(res.headers["set-cookie"][0]).toContain("HttpOnly");
  });

  it("8. existing Google user can log in without duplicating user", async () => {
    const countBefore = await User.countDocuments({ email: "newgoogleuser@example.com" });
    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "valid-existing-token" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    const countAfter = await User.countDocuments({ email: "newgoogleuser@example.com" });
    expect(countAfter).toBe(countBefore);
  });

  it("9. existing local account with same email should not be silently overwritten", async () => {
    const localUserBefore = await User.findOne({ email: "testuser@example.com" });
    expect(localUserBefore?.authProvider).toBe("local");

    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "conflict-local-token" });

    expect(res.status).toBe(409);
    expect(res.body.error).toContain("already exists using password authentication");

    const localUserAfter = await User.findOne({ email: "testuser@example.com" });
    expect(localUserAfter?.authProvider).toBe("local");
    expect(localUserAfter?.googleId).toBeUndefined();
  });

  it("10. missing GOOGLE_CLIENT_ID should fail safely with 500", async () => {
    delete process.env.GOOGLE_CLIENT_ID;
    const res = await request(app)
      .post("/api/auth/google")
      .send({ id_token: "valid-new-token" });

    expect(res.status).toBe(500);
    expect(res.body.error).toContain("Google authentication is not configured");
    process.env.GOOGLE_CLIENT_ID = "test-google-client-id.apps.googleusercontent.com";
  });
});

