import { Router, Request, Response } from "express";
import { z } from "zod";
import { User } from "../models/User.js";
import { generateToken, requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";

const router = Router();

const AuthSchema = z.object({
  email: z.string().email("Please provide a valid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

// POST /api/auth/register
router.post("/register", validateBody(AuthSchema), async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password } = req.body;

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      res.status(409).json({ error: "An account with this email already exists" });
      return;
    }

    const user = new User({ email: email.toLowerCase(), password });
    await user.save();

    const token = generateToken({ id: (user._id as any).toString(), email: user.email });

    res.status(201).json({
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
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

    const token = generateToken({ id: (user._id as any).toString(), email: user.email });

    res.status(200).json({
      user: {
        id: (user._id as any).toString(),
        email: user.email,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to login" });
  }
});

// POST /api/auth/logout
router.post("/logout", (req: Request, res: Response): void => {
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
        createdAt: user.createdAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch user profile" });
  }
});

export default router;
