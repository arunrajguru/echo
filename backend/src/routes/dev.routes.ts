import { Router, Request, Response } from "express";
import { globalVectorStore } from "../services/vectorStore/LocalVectorStore.js";
import { config } from "../config/env.js";

const router = Router();

// Development-only RAG inspection endpoint
router.get("/rag-inspect/:personaId", async (req: Request, res: Response): Promise<void> => {
  if (config.nodeEnv === "production") {
    res.status(403).json({ error: "Debug panel is disabled in production mode" });
    return;
  }

  const { personaId } = req.params;

  try {
    // Perform simulated retrieval across common test queries
    const testQueries = ["Goa trip", "anti-gravity pun", "Sunday calls", "fishing boat", "Diwali"];
    const inspectResults: any[] = [];

    res.status(200).json({
      environment: config.nodeEnv,
      personaId,
      status: "dev_panel_active",
      message: "Development RAG Inspection Endpoint Active",
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
