import dotenv from "dotenv";
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || "4000", 10),
  nodeEnv: process.env.NODE_ENV || "development",
  mongoUri: process.env.MONGODB_URI || "",
  jwtSecret: process.env.JWT_SECRET || "echo-super-secret-jwt-key-change-in-prod-2026",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "7d",
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",
  llmProvider: process.env.LLM_PROVIDER || "groq",
  groqApiKey: process.env.GROQ_API_KEY || "",
  groqModel: process.env.GROQ_MODEL || process.env.LLM_MODEL || "openai/gpt-oss-120b",
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  openaiBaseUrl: process.env.OPENAI_BASE_URL || "https://api.groq.com/openai/v1",
  llmModel: process.env.LLM_MODEL || process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  voiceProvider: process.env.VOICE_PROVIDER || "elevenlabs",
  elevenLabsApiKey: process.env.ELEVENLABS_API_KEY || "",
  voiceEngineUrl: process.env.VOICE_ENGINE_URL || "http://127.0.0.1:8000",
  uploadDir: process.env.UPLOAD_DIR || "./uploads",
  vectorStoreDir: process.env.VECTOR_STORE_DIR || "./data/vectors",
};
