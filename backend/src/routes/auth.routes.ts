import crypto from "crypto";
import { Router, Request, Response } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import { OAuth2Client } from "google-auth-library";
import { User } from "../models/User.js";
import { generateToken, requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const AuthSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const VerifyOtpSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  otp: z.string().regex(/^\d{6}$/, "OTP must be exactly 6 numeric digits"),
});

const ResendOtpSchema = z.object({
  email: z.string().email("Please provide a valid email"),
});

const GoogleAuthSchema = z.object({
  id_token: z.string().min(1, "Google ID token is required"),
});

async function sendOtpEmail(email: string, otp: string): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL || "ECHO <onboarding@resend.dev>";

  const isConfigured = Boolean(apiKey && !apiKey.startsWith("your_") && !apiKey.includes("placeholder"));
  if (!isConfigured) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Email service is not configured on the server.");
    }
    return;
  }

  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: fromEmail,
    to: email,
    subject: "Your ECHO Verification Code",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; color: #333;">
        <h2 style="color: #111;">ECHO Verification Code</h2>
        <p>Thank you for registering with ECHO. Use the verification code below to verify your email address:</p>
        <div style="background: #f4f4f5; padding: 16px; border-radius: 8px; text-align: center; margin: 24px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #111;">${otp}</span>
        </div>
        <p>This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #666; font-size: 13px;">If you did not request this verification code, please ignore this email. Never share this code with anyone.</p>
      </div>
    `,
  });

  if (error) {
    throw new Error(error.message || "Failed to send verification email");
  }
}

// POST /api/auth/register
router.post("/register", validateBody(AuthSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    const otpHash = await bcrypt.hash(otp, salt);
    const otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);

    const user = new User({
      email: email.toLowerCase(),
      password,
      authProvider: "local",
      isVerified: false,
      otpHash,
      otpExpiresAt,
    });
    await user.save();

    try {
      await sendOtpEmail(user.email, otp);
    } catch (emailErr) {
      await User.deleteOne({ _id: user._id });
      throw emailErr;
    }

    res.status(201).json({
      message: "Registration successful. Please verify your email with the verification code sent to your inbox.",
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to register user" });
  }
});

// POST /api/auth/login
router.post("/login", validateBody(AuthSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.isVerified) {
      res.status(403).json({ error: "Please verify your email before logging in." });
      return;
    }

    const token = generateToken({ id: (user._id as any).toString(), email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to login" });
  }
});

// POST /api/auth/verify-otp
router.post("/verify-otp", validateBody(VerifyOtpSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    if (!user.otpHash || !user.otpExpiresAt) {
      res.status(400).json({ error: "No pending verification code found. Please request a new one." });
      return;
    }

    if (new Date() > user.otpExpiresAt) {
      res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      return;
    }

    const isOtpValid = await bcrypt.compare(otp, user.otpHash);
    if (!isOtpValid) {
      res.status(400).json({ error: "Invalid verification code" });
      return;
    }

    user.isVerified = true;
    user.otpHash = undefined;
    user.otpExpiresAt = undefined;
    await user.save();

    const token = generateToken({ id: (user._id as any).toString(), email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      message: "Email verified successfully",
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to verify OTP" });
  }
});

// POST /api/auth/resend-otp
router.post("/resend-otp", validateBody(ResendOtpSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.isVerified) {
      res.status(400).json({ error: "Email is already verified" });
      return;
    }

    const otp = crypto.randomInt(100000, 1000000).toString();
    const salt = await bcrypt.genSalt(10);
    user.otpHash = await bcrypt.hash(otp, salt);
    user.otpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.status(200).json({ message: "A new verification code has been sent to your email." });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to resend OTP" });
  }
});

// POST /api/auth/google
router.post("/google", validateBody(GoogleAuthSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id_token } = req.body;

    const googleClientId = process.env.GOOGLE_CLIENT_ID;
    if (!googleClientId) {
      res.status(500).json({ error: "Google authentication is not configured on the server." });
      return;
    }

    let payload: any;
    try {
      const client = new OAuth2Client(googleClientId);
      const ticket = await client.verifyIdToken({
        idToken: id_token,
        audience: googleClientId,
      });
      payload = ticket.getPayload();
    } catch (err: any) {
      res.status(401).json({ error: "Invalid Google token" });
      return;
    }

    if (!payload || !payload.sub || !payload.email) {
      res.status(401).json({ error: "Invalid Google token payload" });
      return;
    }

    const googleId = payload.sub;
    const email = payload.email.toLowerCase();
    const name = payload.name;

    // Check if an account already exists with this email or googleId
    let user = await User.findOne({
      $or: [{ googleId }, { email }],
    });

    if (user) {
      // If a local/password account exists with this email, do not silently overwrite
      if (user.authProvider !== "google") {
        res.status(409).json({
          error: "An account with this email already exists using password authentication. Account linking is not supported.",
        });
        return;
      }

      // Existing Google account - associate googleId if not already set
      if (!user.googleId) {
        user.googleId = googleId;
        await user.save();
      }
    } else {
      // New Google user
      user = new User({
        email,
        googleId,
        name: name || undefined,
        authProvider: "google",
        isVerified: true,
      });
      await user.save();
    }

    const token = generateToken({ id: (user._id as any).toString(), email: user.email });

    res.cookie("token", token, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.status(200).json({
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to authenticate with Google" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response): void => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.status(200).json({ message: "Successfully logged out" });
});

// GET /api/auth/me
router.get("/me", requireAuth, async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.status(200).json({
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        isVerified: user.isVerified,
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch user profile" });
  }
});

export default router;

