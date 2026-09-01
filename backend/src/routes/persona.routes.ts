import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { z } from "zod";
import mongoose from "mongoose";
import { Persona } from "../models/Persona.js";
import { ConversationMessage } from "../models/ConversationMessage.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { parseChatFile } from "../services/chatParser/index.js";
import { cascadeDeletePersona } from "../services/cascadeDeleteService.js";
import { config } from "../config/env.js";

const router = Router();

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = config.uploadDir;
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + "-" + file.originalname.replace(/[^a-zA-Z0-9\.\-_]/g, "_"));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 250 * 1024 * 1024 }, // 250MB for large WhatsApp ZIP exports
});

const CreatePersonaSchema = z.object({
  name: z.string().min(1, "Name is required"),
  relationship: z.string().min(1, "Relationship is required"),
});

const UpdatePersonaSchema = z.object({
  name: z.string().optional(),
  relationship: z.string().optional(),
  targetParticipant: z.string().optional(),
  status: z.enum(["draft", "uploaded", "analyzed", "active"]).optional(),
  style: z.record(z.any()).optional(),
});

// All persona routes require authentication
router.use(requireAuth);

// POST /api/personas
router.post("/", validateBody(CreatePersonaSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { name, relationship } = req.body;
    const persona = new Persona({
      userId: new mongoose.Types.ObjectId(req.user!.id),
      name,
      relationship,
    });
    await persona.save();
    res.status(201).json(persona);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to create persona" });
  }
});

// GET /api/personas
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const personas = await Persona.find({ userId: req.user!.id }).sort({ createdAt: -1 });
    res.status(200).json(personas);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch personas" });
  }
});

// GET /api/personas/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid persona ID" });
      return;
    }
    const persona = await Persona.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!persona) {
      res.status(404).json({ error: "Persona not found" });
      return;
    }
    res.status(200).json(persona);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch persona" });
  }
});

// PATCH /api/personas/:id
router.patch("/:id", validateBody(UpdatePersonaSchema), async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid persona ID" });
      return;
    }
    const persona = await Persona.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!persona) {
      res.status(404).json({ error: "Persona not found" });
      return;
    }

    if (req.body.name) persona.name = req.body.name;
    if (req.body.relationship) persona.relationship = req.body.relationship;
    if (req.body.targetParticipant) {
      persona.targetParticipant = req.body.targetParticipant;
      // Update isPersona flags on messages
      await ConversationMessage.updateMany(
        { personaId: persona._id },
        { $set: { isPersona: false } }
      );
      await ConversationMessage.updateMany(
        { personaId: persona._id, sender: req.body.targetParticipant },
        { $set: { isPersona: true } }
      );
    }
    if (req.body.status) persona.status = req.body.status;
    if (req.body.style) {
      persona.style = { ...persona.style, ...req.body.style };
    }

    await persona.save();
    res.status(200).json(persona);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update persona" });
  }
});

// DELETE /api/personas/:id (Cascades across all collections, vectors, and disk files)
router.delete("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid persona ID" });
      return;
    }

    const result = await cascadeDeletePersona(req.params.id, req.user!.id);
    res.status(200).json({
      message: "Persona and all associated memories, messages, files, and vectors deleted successfully",
      ...result,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete persona" });
  }
});

// POST /api/personas/:id/upload
router.post(
  "/:id/upload",
  upload.single("file"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        res.status(400).json({ error: "Invalid persona ID" });
        return;
      }

      const persona = await Persona.findOne({ _id: req.params.id, userId: req.user!.id });
      if (!persona) {
        res.status(404).json({ error: "Persona not found" });
        return;
      }

      let contentOrBuffer: string | Buffer = "";
      let originalName = "uploaded_chat.txt";

      if (req.file) {
        contentOrBuffer = fs.readFileSync(req.file.path);
        originalName = req.file.originalname;
      } else if (req.body && req.body.content) {
        contentOrBuffer = req.body.content;
        if (req.body.fileName) originalName = req.body.fileName;
      } else {
        res.status(400).json({ error: "No file or chat content provided" });
        return;
      }

      const parsed = parseChatFile(contentOrBuffer, originalName);

      if (parsed.messages.length === 0) {
        res.status(400).json({ error: "No valid messages found in uploaded file" });
        return;
      }

      // Delete existing messages for this persona to allow re-upload
      await ConversationMessage.deleteMany({ personaId: persona._id });

      const targetSender = persona.targetParticipant || persona.name;

      const messageDocs = parsed.messages.map((m) => ({
        personaId: persona._id,
        sender: m.sender,
        text: m.text,
        timestamp: m.timestamp,
        rawIndex: m.rawIndex,
        isPersona: m.sender.toLowerCase() === targetSender.toLowerCase(),
        metadata: {
          messageType: m.messageType || "text",
          attachmentFilename: m.attachmentFilename,
        },
      }));

      await ConversationMessage.insertMany(messageDocs);

      persona.participants = parsed.participants;
      persona.stats.messagesAnalyzed = parsed.messages.length;
      persona.stats.personaMessages = messageDocs.filter((m) => m.isPersona).length;
      persona.status = "uploaded";
      await persona.save();

      res.status(200).json({
        message: "Chat uploaded and parsed successfully",
        fileName: originalName,
        format: parsed.format,
        messageCount: parsed.messages.length,
        participants: parsed.participants,
        persona,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to upload and parse chat" });
    }
  }
);

// GET /api/personas/:id/diagnostics (Phase 19 Diagnostic API)
router.get("/:id/diagnostics", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      res.status(400).json({ error: "Invalid persona ID" });
      return;
    }

    const persona = await Persona.findOne({ _id: req.params.id, userId: req.user!.id });
    if (!persona) {
      res.status(404).json({ error: "Persona not found" });
      return;
    }

    const { Memory } = await import("../models/Memory.js");
    const { ConversationExample } = await import("../models/ConversationExample.js");
    const { VoiceProfile } = await import("../models/VoiceProfile.js");

    const messageCount = await ConversationMessage.countDocuments({ personaId: persona._id });
    const memoryCount = await Memory.countDocuments({ personaId: persona._id });
    const examples = await ConversationExample.find({ personaId: persona._id }).limit(5);
    const voiceProfile = await VoiceProfile.findOne({ personaId: persona._id });

    const styleObj = (persona.style || {}) as any;

    res.status(200).json({
      personaId: persona._id,
      personaName: persona.name,
      relationship: persona.relationship,
      selectedParticipant: persona.targetParticipant || persona.name,
      messageCount,
      memoryCount,
      conversationExampleCount: examples.length,
      styleProfileAvailable: !!persona.style,
      embeddingCount: messageCount + memoryCount + examples.length,
      voiceProfileAvailable: !!voiceProfile,
      voiceEngine: "Chatterbox Multilingual V3",
      sampleStyleExamples: examples.map((ex) => ({
        topic: ex.topic,
        prompt: ex.prompt,
        response: ex.response,
      })),
      languageDistribution: styleObj.languageMix || "English",
      averageResponseLength: styleObj.typicalReplyLength || styleObj.replyStyle || "Concise",
      tone: styleObj.tone || "Authentic",
      emojis: styleObj.topEmojis || styleObj.emojis || [],
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch diagnostics" });
  }
});

export default router;
