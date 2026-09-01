import { Router, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Persona } from "../models/Persona.js";
import { ChatSession } from "../models/ChatSession.js";
import { VoiceProfile } from "../models/VoiceProfile.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { globalRAGService } from "../services/ragService.js";
import { globalLLMService, synthesizeLocalGroundedResponse } from "../services/llm/index.js";
import { globalVoiceService } from "../services/voice/voiceFactory.js";
import { buildSystemPrompt } from "../services/llm/promptTemplates.js";
import { ChatMessagePayload } from "../services/llm/LLMProvider.js";

const router = Router();

const SendMessageSchema = z.object({
  message: z.string().min(1, "Message cannot be empty"),
  sessionId: z.string().optional(),
});

router.use(requireAuth);

// POST /api/chat/:personaId
router.post(
  "/:personaId",
  validateBody(SendMessageSchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { personaId } = req.params;
      const { message: rawMessage, sessionId } = req.body;
      const messageToSend = (rawMessage || "").trim();

      console.log(`\n[ECHO VOICE] chat request received: personaId=${personaId}, sessionId=${sessionId || "new"}`);
      console.log(`[ECHO VOICE] message: "${messageToSend}"`);

      if (!mongoose.Types.ObjectId.isValid(personaId)) {
        res.status(400).json({ error: "Invalid persona ID" });
        return;
      }

      const persona = await Persona.findOne({ _id: personaId, userId: req.user!.id });
      if (!persona) {
        res.status(404).json({ error: "Persona not found" });
        return;
      }

      console.log(`[ECHO VOICE] personaId: ${persona._id} (${persona.name})`);

      // 1. Find or create ChatSession
      let session;
      if (sessionId && mongoose.Types.ObjectId.isValid(sessionId)) {
        session = await ChatSession.findOne({ _id: sessionId, personaId: persona._id });
      }
      if (!session) {
        session = await ChatSession.findOne({ personaId: persona._id, userId: req.user!.id }).sort({
          updatedAt: -1,
        });
      }
      if (!session) {
        session = new ChatSession({
          personaId: persona._id,
          userId: req.user!.id,
          title: `Chat with ${persona.name}`,
          messages: [],
        });
      }

      console.log(`[ECHO VOICE] sessionId: ${session._id}`);

      // 2. RAG Retrieval
      const ragContext = await globalRAGService.retrieve({
        personaId: persona._id.toString(),
        query: messageToSend,
        threshold: 0.20,
      });

      const recentHistoryText = session.messages
        .slice(-6)
        .map((m) => `${m.role === "echo" ? persona.name : "User"}: ${m.text}`)
        .join("\n");

      // 3. Build Prompt & Messages History (Part 4 Prompt)
      const systemPrompt = buildSystemPrompt(persona, ragContext, recentHistoryText, messageToSend);

      const recentHistory: ChatMessagePayload[] = session.messages.slice(-6).map((m) => ({
        role: m.role === "echo" ? "assistant" : "user",
        content: m.text,
      }));

      const fullMessages: ChatMessagePayload[] = [
        { role: "system", content: systemPrompt },
        ...recentHistory,
        { role: "user", content: messageToSend },
      ];

      // Get last assistant message for repetition detection
      const lastAssistantMsg = [...session.messages]
        .reverse()
        .find((m) => m.role === "echo")?.text;

      // 4. Generate LLM response (Groq / Provider / Fallback)
      console.log(`[ECHO VOICE] Groq request started: persona=${persona.name}, historyCount=${recentHistory.length}`);

      let replyText = "";
      let providerUsed = globalLLMService.getActiveProviderName();

      if (
        (ragContext.intent === "UNKNOWN_FACTUAL_QUERY" || ragContext.intent === "MEMORY_QUERY") &&
        !ragContext.isGrounded
      ) {
        replyText = "I don't have enough information from the memories you've shared to know that.";
        providerUsed = "grounded_fallback";
      } else {
        const genResult = await globalLLMService.generateChatResponse({
          persona,
          ragContext,
          messages: fullMessages,
          lastAssistantMessage: lastAssistantMsg,
        });
        replyText = genResult.response;
        providerUsed = genResult.providerUsed;
      }

      if (!replyText || !replyText.trim()) {
        replyText = synthesizeLocalGroundedResponse(persona, ragContext, messageToSend);
        providerUsed = "local_fallback";
      }

      console.log(`[ECHO VOICE] Groq response received: provider=${providerUsed}`);
      console.log(`[ECHO VOICE] generated text: "${replyText}"`);

      // Extract sources
      const sources: string[] = [];
      for (const mem of ragContext.memories) {
        if (mem.sourceLines) {
          sources.push(...mem.sourceLines);
        }
      }

      // Check voice profile availability & synthesize speech with ElevenLabs / VoiceService
      const voiceProfile = await VoiceProfile.findOne({
        personaId: persona._id,
        status: { $in: ["ready", "unprocessed"] },
      });
      const voiceAvailable = !!voiceProfile || globalVoiceService.getProvider().isAvailable();
      let audioUrl = "";

      if (voiceAvailable) {
        try {
          console.log(`[ECHO VOICE] ElevenLabs request started: text length=${replyText.length}, persona=${persona.name}`);
          const synthResult = await globalVoiceService.synthesize({
            text: replyText,
            voiceId: voiceProfile?.voiceId || `voice_${personaId}`,
            personaId: personaId,
            personaName: persona.name,
          });
          if (synthResult && synthResult.audioUrl) {
            audioUrl = synthResult.audioUrl;
            console.log(`[ECHO VOICE] ElevenLabs response: success, engine=${synthResult.engine}`);
            console.log(`[ECHO VOICE] audio generated: ${audioUrl}`);
          }
        } catch (err: any) {
          console.warn("[ECHO VOICE] ElevenLabs synthesis error:", err.message);
        }
      }

      // 5. Append to ChatSession
      session.messages.push({
        role: "user",
        text: messageToSend,
        createdAt: new Date(),
      });

      session.messages.push({
        role: "echo",
        text: replyText,
        grounded: ragContext.topMemoryTitle,
        sources,
        audioUrl: audioUrl || undefined,
        createdAt: new Date(),
      });

      await session.save();

      res.status(200).json({
        message: replyText,
        personaId: persona._id,
        sessionId: session._id,
        grounded: ragContext.topMemoryTitle,
        sources,
        voiceAvailable,
        audioUrl: audioUrl || undefined,
        disclaimer: "AI-generated remembrance response, never presented as an authentic historical message.",
      });
    } catch (err: any) {
      console.error("[chat-route] Error:", err);
      res.status(500).json({ error: err.message || "Failed to process chat message" });
    }
  }
);

// GET /api/chat/:personaId/history
router.get("/:personaId/history", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { personaId } = req.params;
    const session = await ChatSession.findOne({ personaId, userId: req.user!.id }).sort({
      updatedAt: -1,
    });
    res.status(200).json(session ? session.messages : []);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch chat history" });
  }
});

export default router;
