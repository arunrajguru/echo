import { Router, Response } from "express";
import { z } from "zod";
import mongoose from "mongoose";
import { Persona } from "../models/Persona.js";
import { Memory } from "../models/Memory.js";
import { ConversationMessage } from "../models/ConversationMessage.js";
import { ConversationExample } from "../models/ConversationExample.js";
import { requireAuth, AuthRequest } from "../middleware/auth.js";
import { validateBody } from "../middleware/validate.js";
import { analyzePersonaStyle } from "../services/personaAnalysisService.js";
import { extractMemoriesFromMessages } from "../services/memoryExtractionService.js";
import { globalRAGService } from "../services/ragService.js";

const router = Router();

const UpdateMemorySchema = z.object({
  title: z.string().optional(),
  category: z.enum(["Trips", "Conversations", "Favorites", "Places", "People", "General"]).optional(),
  content: z.string().optional(),
  isApproved: z.boolean().optional(),
});

router.use(requireAuth);

// POST /api/personas/:id/analyze
router.post("/:id/analyze", async (req: AuthRequest, res: Response): Promise<void> => {
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

    const allMessages = await ConversationMessage.find({ personaId: persona._id }).sort({ rawIndex: 1 });
    if (allMessages.length === 0) {
      res.status(400).json({ error: "No messages uploaded for this persona yet" });
      return;
    }

    // Identify target participant messages
    const target = persona.targetParticipant || persona.name;
    const personaMessages = allMessages.filter(
      (m) => m.isPersona || m.sender.toLowerCase() === target.toLowerCase()
    );

    // 1. Analyze style & extract conversation response patterns
    const { style, examples, stats: styleStats } = analyzePersonaStyle(personaMessages, allMessages);

    // 2. Extract discrete memories from actual conversation
    const extractedMemoryData = extractMemoriesFromMessages(persona._id as mongoose.Types.ObjectId, allMessages);

    // Remove old memories & examples to re-analyze cleanly
    await Memory.deleteMany({ personaId: persona._id });
    await ConversationExample.deleteMany({ personaId: persona._id });

    // Save memories
    const memoryDocs = extractedMemoryData.map((m) => ({
      personaId: persona._id,
      title: m.title,
      category: m.category,
      confidence: m.confidence,
      date: m.date,
      content: m.content,
      sourceLines: m.sourceLines,
      sourceMessageIds: m.sourceMessageIds,
      isApproved: true,
    }));

    const savedMemories = await Memory.insertMany(memoryDocs);

    // 3. Save extracted conversational examples (ResponseExample layer)
    const exampleDocs = examples.map((ex) => ({
      personaId: persona._id,
      prompt: ex.prompt,
      response: ex.response,
      userMessage: ex.userMessage || ex.prompt,
      personaResponse: ex.personaResponse || ex.response,
      language: ex.language || "English",
      topic: ex.topic || "casual",
      sourceMessageId: ex.sourceMessageIds?.[0],
      sourceMessageIds: ex.sourceMessageIds,
    }));

    if (exampleDocs.length > 0) {
      await ConversationExample.insertMany(exampleDocs);
    }

    // 4. Update persona stats and style
    persona.targetParticipant = target;
    persona.style = style;
    persona.stats = {
      messagesAnalyzed: allMessages.length,
      personaMessages: personaMessages.length,
      memoriesExtracted: savedMemories.length,
      conversationExamples: exampleDocs.length,
      confidence: styleStats.confidence || 0.91,
    };
    persona.status = "analyzed";
    await persona.save();

    // 5. Automatically index in RAG vector store
    await globalRAGService.indexPersona(persona._id.toString());

    // Diagnostic console output for Persona Learning (Requirement #18)
    console.log(`\n[PERSONA LEARNING]`);
    console.log(`Persona: ${persona.name}`);
    console.log(`Messages analyzed: ${allMessages.length}`);
    console.log(`Persona messages: ${personaMessages.length}`);
    console.log(`Response examples: ${exampleDocs.length}`);
    console.log(`Memories: ${savedMemories.length}`);
    console.log(`Style profile: Generated`);
    console.log(`Language: ${style.language}`);
    console.log(`Average response length: ${style.averageWordsPerMessage} words (${style.typicalReplyLength})`);
    console.log(`Common emojis: ${style.commonEmojis?.join(" ") || "none"}`);
    console.log(`Common phrases: ${style.commonPhrases?.slice(0, 5).join(", ") || "none"}\n`);

    res.status(200).json({
      persona,
      stats: persona.stats,
      style: persona.style,
      memories: savedMemories,
      conversationExamplesCount: exampleDocs.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to analyze persona" });
  }
});

// POST /api/personas/:id/reindex
router.post("/:id/reindex", async (req: AuthRequest, res: Response): Promise<void> => {
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

    const result = await globalRAGService.indexPersona(persona._id.toString());
    res.status(200).json({ message: "Persona successfully reindexed", ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to reindex persona" });
  }
});

// GET /api/personas/:id/memories
router.get("/:id/memories", async (req: AuthRequest, res: Response): Promise<void> => {
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

    const memories = await Memory.find({ personaId: persona._id }).sort({ confidence: -1 });
    res.status(200).json(memories);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch memories" });
  }
});

// GET /api/personas/:id/memory-map
router.get("/:id/memory-map", async (req: AuthRequest, res: Response): Promise<void> => {
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

    const memories = await Memory.find({ personaId: persona._id });
    const categories = ["Trips", "Conversations", "Favorites", "Places", "People", "General"];

    const nodes = memories.map((m, idx) => ({
      id: (m._id as any).toString(),
      title: m.title,
      category: m.category,
      confidence: m.confidence,
      content: m.content,
      sourceLines: m.sourceLines,
      date: m.date,
      clusterIndex: categories.indexOf(m.category),
    }));

    res.status(200).json({
      personaId: persona._id,
      personaName: persona.name,
      totalMemories: memories.length,
      categories,
      nodes,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch memory map" });
  }
});

// GET /api/personas/:id/memories/:memoryId
router.get("/:id/memories/:memoryId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findOne({
      _id: req.params.memoryId,
      personaId: req.params.id,
    });
    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.status(200).json(memory);
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch memory" });
  }
});

// PATCH /api/personas/:id/memories/:memoryId
router.patch(
  "/:id/memories/:memoryId",
  validateBody(UpdateMemorySchema),
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const memory = await Memory.findOne({
        _id: req.params.memoryId,
        personaId: req.params.id,
      });
      if (!memory) {
        res.status(404).json({ error: "Memory not found" });
        return;
      }

      if (req.body.title !== undefined) memory.title = req.body.title;
      if (req.body.category !== undefined) memory.category = req.body.category;
      if (req.body.content !== undefined) memory.content = req.body.content;
      if (req.body.isApproved !== undefined) memory.isApproved = req.body.isApproved;

      await memory.save();
      res.status(200).json(memory);
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Failed to update memory" });
    }
  }
);

// DELETE /api/personas/:id/memories/:memoryId
router.delete("/:id/memories/:memoryId", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const memory = await Memory.findOneAndDelete({
      _id: req.params.memoryId,
      personaId: req.params.id,
    });
    if (!memory) {
      res.status(404).json({ error: "Memory not found" });
      return;
    }
    res.status(200).json({ message: "Memory removed successfully" });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete memory" });
  }
});

export default router;
