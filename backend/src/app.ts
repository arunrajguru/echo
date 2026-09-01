import express from "express";
import cors from "cors";
import helmet from "helmet";
import path from "path";
import fs from "fs";
import authRoutes from "./routes/auth.routes.js";
import personaRoutes from "./routes/persona.routes.js";
import memoryRoutes from "./routes/memory.routes.js";
import chatRoutes from "./routes/chat.routes.js";
import voiceRoutes from "./routes/voice.routes.js";
import devRoutes from "./routes/dev.routes.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { config } from "./config/env.js";

const app = express();

// Security headers
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

// CORS setup
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (origin.includes("localhost") || origin.includes("127.0.0.1") || origin === config.corsOrigin) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
  })
);

// Body parsing
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// Static uploads serving
app.use("/uploads", express.static(config.uploadDir));

// Direct audio streaming route for ElevenLabs / Chatterbox V3 generated voice audio
app.get("/api/audio/:filename", (req, res) => {
  const { filename } = req.params;
  const voiceEngineOutputs = path.join(process.cwd(), "..", "voice-engine", "outputs", filename);
  const localOutputs = path.join(config.uploadDir, "audio", filename);

  let filePath = "";
  if (fs.existsSync(localOutputs)) {
    filePath = localOutputs;
  } else if (fs.existsSync(voiceEngineOutputs)) {
    filePath = voiceEngineOutputs;
  }

  if (filePath) {
    try {
      const stat = fs.statSync(filePath);
      const isMp3 = filename.toLowerCase().endsWith(".mp3");
      const contentType = isMp3 ? "audio/mpeg" : "audio/wav";

      console.log(`[ECHO AUDIO] url: /api/audio/${filename} (${contentType}, ${stat.size} bytes)`);

      res.writeHead(200, {
        "Content-Type": contentType,
        "Content-Length": stat.size,
        "Accept-Ranges": "bytes",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        "Expires": "0",
      });

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);
      return;
    } catch (err: any) {
      console.error("[ECHO AUDIO] stream error:", err.message);
    }
  }

  res.status(404).json({ error: "Audio file not found" });
});

// Health check
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/personas", personaRoutes);
app.use("/api/personas", memoryRoutes);
app.use("/api/personas", voiceRoutes);
app.use("/api/chat", chatRoutes);
app.use("/api/dev", devRoutes);

// Error handler
app.use(errorHandler);

export default app;
