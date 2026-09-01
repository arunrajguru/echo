import app from "./app.js";
import { config } from "./config/env.js";
import { connectDatabase } from "./config/database.js";
import fs from "fs";
import path from "path";

async function startServer() {
  try {
    // Ensure upload and vector dirs exist
    if (!fs.existsSync(config.uploadDir)) {
      fs.mkdirSync(config.uploadDir, { recursive: true });
    }
    if (!fs.existsSync(config.vectorStoreDir)) {
      fs.mkdirSync(config.vectorStoreDir, { recursive: true });
    }

    await connectDatabase();

    app.listen(config.port, () => {
      console.log(`[server] ECHO Backend listening on port ${config.port} (${config.nodeEnv})`);
      console.log(`[server] API URL: http://localhost:${config.port}/api`);
    });
  } catch (err) {
    console.error("[server] Failed to start server:", err);
    process.exit(1);
  }
}

startServer();
