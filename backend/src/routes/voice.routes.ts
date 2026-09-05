import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import mongoose from "mongoose";
import { Persona } from "../models/Persona.js";
import { VoiceProfile } from "../models/VoiceProfile.js";
import { optionalAuth, AuthRequest } from "../middleware/auth.js";
import { globalVoiceClient } from "../services/voiceClientService.js";
import { globalVoiceService } from "../services/voice/voiceFactory.js";
import { config } from "../config/env.js";

const DEMO_NAMES: Record<string, string> = {
  demo_dad: "Dad",
  demo_rahul: "Rahul",
  demo_priya: "Priya",
  demo: "Dad",
  mock_demo_persona: "Dad",
};

const router = Router();

const audioStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(config.uploadDir, "audio");
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, unique + "-" + file.originalname.replace(/[^a-zA-Z0-9\.\-_]/g, "_"));
  },
});

const audioUpload = multer({
  storage: audioStorage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB
});

// GET /api/personas/:id/voice/audio/:filename (Audio stream/playback route - public or auth)
router.get("/:id/voice/audio/:filename", async (req, res): Promise<void> => {
  try {
    const { filename } = req.params;
    const voiceEngineOutputs = path.join(process.cwd(), "..", "voice-engine", "outputs", filename);
    const localOutputs = path.join(config.uploadDir, "audio", filename);

    let filePath = "";
    if (fs.existsSync(voiceEngineOutputs)) {
      filePath = voiceEngineOutputs;
    } else if (fs.existsSync(localOutputs)) {
      filePath = localOutputs;
    }

    if (filePath) {
      const isMp3 = filename.toLowerCase().endsWith(".mp3");
      res.setHeader("Content-Type", isMp3 ? "audio/mpeg" : "audio/wav");
      res.setHeader("Accept-Ranges", "bytes");
      fs.createReadStream(filePath).pipe(res);
      return;
    }

    res.status(404).json({ error: "Audio file not found" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to stream audio" });
  }
});

router.use(optionalAuth);

// POST /api/personas/:id/voice/upload
router.post(
  "/:id/voice/upload",
  audioUpload.single("file"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { id: personaId } = req.params;
      let personaName = DEMO_NAMES[personaId] || "Echo";

      if (mongoose.Types.ObjectId.isValid(personaId)) {
        const persona = await Persona.findOne({ _id: personaId, ...(req.user ? { userId: req.user.id } : {}) });
        if (persona) {
          personaName = persona.name;
        }
      }

      // Check voice consent (Part 10 requirement)
      const consentBody = req.body.voiceConsent ?? req.body.consent;
      if (consentBody === false || consentBody === "false") {
        res.status(400).json({ error: "Voice consent is required for voice cloning" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "Audio file is required" });
        return;
      }

      console.log(`[VOICE] Voice reference uploaded for persona ${personaName} (${personaId}), file size: ${req.file.size} bytes`);

      // Clone voice with ElevenLabs / VoiceProvider
      const cloneResult = await globalVoiceService.cloneVoice({
        filePath: req.file.path,
        personaId,
        personaName,
        description: `ECHO remembrance voice for ${personaName}`,
      });

      const voiceId = cloneResult.voiceId || `voice_${personaId}`;
      const status = cloneResult.status || "ready";

      console.log(`[VOICE] Voice clone created with provider ${cloneResult.provider}: ${voiceId}`);

      // Upsert VoiceProfile for this specific persona if valid MongoDB ID
      let profile: any = null;
      if (mongoose.Types.ObjectId.isValid(personaId)) {
        profile = await VoiceProfile.findOne({ personaId: new mongoose.Types.ObjectId(personaId) });
        if (profile) {
          profile.samplePath = req.file.path;
          profile.originalFileName = req.file.originalname;
          profile.voiceId = voiceId;
          profile.status = status;
          profile.consentedAt = new Date();
          profile.metadata = cloneResult.metadata || {};
        } else {
          profile = new VoiceProfile({
            personaId: new mongoose.Types.ObjectId(personaId),
            samplePath: req.file.path,
            originalFileName: req.file.originalname,
            voiceId,
            status,
            consentedAt: new Date(),
            metadata: cloneResult.metadata || {},
          });
        }
        await profile.save();

        await Persona.updateOne({ _id: personaId }, { voiceProfileId: profile._id });
      }

      res.status(200).json({
        message: "Voice sample uploaded and processed successfully",
        fileName: req.file.originalname,
        voiceId,
        provider: cloneResult.provider,
        voiceProfile: profile,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to upload voice sample" });
    }
  }
);

// POST /api/personas/:id/voice/synthesize
router.post("/:id/voice/synthesize", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: personaId } = req.params;
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: "Text is required for voice synthesis" });
      return;
    }

    let personaName = DEMO_NAMES[personaId] || "Echo";
    let voiceId = `voice_${personaId}`;

    if (mongoose.Types.ObjectId.isValid(personaId)) {
      const persona = await Persona.findOne({ _id: personaId, ...(req.user ? { userId: req.user.id } : {}) });
      if (persona) {
        personaName = persona.name;
        const voiceProfile = await VoiceProfile.findOne({ personaId: persona._id });
        if (voiceProfile?.voiceId) {
          voiceId = voiceProfile.voiceId;
        }
      }
    }

    console.log(`[TTS] Persona ID: ${personaId} (${personaName})`);
    console.log(`[TTS] Voice ID: ${voiceId}`);
    console.log(`[TTS] Synthesis started for text: "${text.slice(0, 50)}..."`);

    const synthResult = await globalVoiceService.synthesize({
      text,
      voiceId,
      personaId,
      personaName,
    });

    console.log(`[TTS] Audio generated: ${synthResult.audioUrl}`);

    res.status(200).json({
      success: true,
      audioUrl: synthResult.audioUrl,
      voiceId,
      engine: synthResult.engine,
      model: synthResult.model || "V3",
      disclaimer: synthResult.disclaimer,
      voice_reference_used: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to synthesize voice" });
  }
});

// POST /api/personas/:id/voice/transcribe
router.post(
  "/:id/voice/transcribe",
  audioUpload.single("file"),
  async (req: AuthRequest, res: Response): Promise<void> => {
    let tempPath: string | null = null;
    try {
      console.log(`[VOICE] request received: /api/personas/${req.params.id}/voice/transcribe`);
      if (!req.file) {
        console.warn(`[VOICE] No audio file uploaded in request`);
        res.status(400).json({ success: false, error: "Audio file required for transcription" });
        return;
      }

      tempPath = req.file.path;
      console.log(`[VOICE] filename: ${req.file.originalname}`);
      console.log(`[VOICE] content type: ${req.file.mimetype}`);
      console.log(`[VOICE] file size: ${req.file.size} bytes`);

      const result = await globalVoiceClient.transcribe(req.file.path);
      console.log(`[VOICE] transcript: "${result.text}"`);

      res.status(200).json({
        success: true,
        text: result.text,
        status: result.status,
        confidence: result.confidence,
        device: result.device,
        provider: result.provider,
      });
    } catch (err: any) {
      console.error("[VOICE] Speech transcription failed:", err.message);
      res.status(500).json({
        success: false,
        error: "Speech transcription failed. Please try speaking again.",
      });
    } finally {
      if (tempPath && fs.existsSync(tempPath)) {
        try {
          fs.unlinkSync(tempPath);
        } catch (_) {}
      }
    }
  }
);

// POST /api/personas/:id/voice/session
router.post("/:id/voice/session", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id: personaId } = req.params;
    const persona = await Persona.findOne({ _id: personaId, userId: req.user!.id });
    if (!persona) {
      res.status(404).json({ error: "Persona not found" });
      return;
    }

    res.status(200).json({
      sessionId: `vsession_${Date.now()}`,
      personaName: persona.name,
      status: "ready",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to start voice session" });
  }
});

export default router;
