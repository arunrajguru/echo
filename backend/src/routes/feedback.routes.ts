import { Router, Request, Response } from "express";
import fs from "fs";
import path from "path";
import { Feedback } from "../models/Feedback.js";

const router = Router();
const DATASET_FILE_PATH = path.join(process.cwd(), "data", "feedback_dataset.json");

// Helper to safely append to local JSON dataset store
function appendToLocalDataset(entry: any) {
  try {
    const dir = path.dirname(DATASET_FILE_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    let dataset: any[] = [];
    if (fs.existsSync(DATASET_FILE_PATH)) {
      const raw = fs.readFileSync(DATASET_FILE_PATH, "utf-8");
      dataset = JSON.parse(raw);
    }

    dataset.push(entry);
    fs.writeFileSync(DATASET_FILE_PATH, JSON.stringify(dataset, null, 2), "utf-8");
    console.log(`[FEEDBACK] Appended to local dataset store: ${entry.id || entry._id}`);
  } catch (err: any) {
    console.warn("[FEEDBACK] Failed to write to feedback_dataset.json:", err.message);
  }
}

// POST /api/feedback — Submit new feedback & persist to dataset store
router.post("/", async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, rating, review, suggestions, source = "web_app" } = req.body;

    const numericRating = Number(rating);
    if (!numericRating || numericRating < 1 || numericRating > 5) {
      res.status(400).json({ error: "Rating must be a valid number between 1 and 5." });
      return;
    }

    if (!review || typeof review !== "string" || review.trim().length === 0) {
      res.status(400).json({ error: "Review text is required." });
      return;
    }

    // 1. Save to MongoDB
    const feedbackDoc = new Feedback({
      name: name?.trim() || "Anonymous User",
      email: email?.trim() || "",
      rating: numericRating,
      review: review.trim(),
      suggestions: suggestions?.trim() || "",
      source,
    });

    const saved = await feedbackDoc.save().catch((dbErr) => {
      console.warn("[FEEDBACK] MongoDB save failed, continuing to file store:", dbErr.message);
      return null;
    });

    // 2. Append to persistent JSON dataset file
    const datasetEntry = {
      id: saved ? saved._id.toString() : `fb_${Date.now()}`,
      name: name?.trim() || "Anonymous User",
      email: email?.trim() || "",
      rating: numericRating,
      review: review.trim(),
      suggestions: suggestions?.trim() || "",
      source,
      timestamp: new Date().toISOString(),
    };

    appendToLocalDataset(datasetEntry);

    res.status(201).json({
      success: true,
      message: "Thank you! Your feedback has been successfully recorded in the dataset.",
      data: datasetEntry,
    });
  } catch (err: any) {
    console.error("[FEEDBACK] Error saving feedback:", err);
    res.status(500).json({ error: err.message || "Failed to record feedback." });
  }
});

// GET /api/feedback — Retrieve all feedback dataset entries
router.get("/", async (_req: Request, res: Response): Promise<void> => {
  try {
    // Try reading from MongoDB first
    const dbEntries = await Feedback.find().sort({ createdAt: -1 }).lean().catch(() => []);

    if (dbEntries && dbEntries.length > 0) {
      res.status(200).json({ success: true, count: dbEntries.length, data: dbEntries });
      return;
    }

    // Fallback to JSON dataset file
    if (fs.existsSync(DATASET_FILE_PATH)) {
      const raw = fs.readFileSync(DATASET_FILE_PATH, "utf-8");
      const fileData = JSON.parse(raw);
      res.status(200).json({ success: true, count: fileData.length, data: fileData });
      return;
    }

    res.status(200).json({ success: true, count: 0, data: [] });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch feedback dataset." });
  }
});

// GET /api/feedback/stats — Compute rating analytics
router.get("/stats", async (_req: Request, res: Response): Promise<void> => {
  try {
    let entries: any[] = [];
    const dbEntries = await Feedback.find().lean().catch(() => []);

    if (dbEntries && dbEntries.length > 0) {
      entries = dbEntries;
    } else if (fs.existsSync(DATASET_FILE_PATH)) {
      entries = JSON.parse(fs.readFileSync(DATASET_FILE_PATH, "utf-8"));
    }

    const total = entries.length;
    if (total === 0) {
      res.status(200).json({ total: 0, averageRating: 0, distribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 } });
      return;
    }

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let sum = 0;

    for (const e of entries) {
      const r = Math.round(e.rating || 5);
      if (distribution[r] !== undefined) distribution[r]++;
      sum += e.rating || 5;
    }

    res.status(200).json({
      total,
      averageRating: parseFloat((sum / total).toFixed(2)),
      distribution,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to calculate stats." });
  }
});

export default router;
