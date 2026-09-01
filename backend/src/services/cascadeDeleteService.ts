import fs from "fs";
import mongoose from "mongoose";
import { Persona } from "../models/Persona.js";
import { ConversationMessage } from "../models/ConversationMessage.js";
import { Memory } from "../models/Memory.js";
import { ConversationExample } from "../models/ConversationExample.js";
import { VoiceProfile } from "../models/VoiceProfile.js";
import { ChatSession } from "../models/ChatSession.js";
import { globalVectorStore } from "./vectorStore/LocalVectorStore.js";

export async function cascadeDeletePersona(
  personaId: string,
  userId: string
): Promise<{ success: boolean; deletedCounts: Record<string, number> }> {
  const pId = new mongoose.Types.ObjectId(personaId);
  const uId = new mongoose.Types.ObjectId(userId);

  const persona = await Persona.findOne({ _id: pId, userId: uId });
  if (!persona) {
    throw new Error("Persona not found or unauthorized");
  }

  // 1. Delete associated VoiceProfile files on disk
  const voiceProfiles = await VoiceProfile.find({ personaId: pId });
  for (const vp of voiceProfiles) {
    if (vp.samplePath && fs.existsSync(vp.samplePath)) {
      try {
        fs.unlinkSync(vp.samplePath);
      } catch (e) {
        console.warn("[cascade-delete] Could not delete audio sample:", e);
      }
    }
  }

  // 2. Cascade delete from MongoDB collections
  const msgResult = await ConversationMessage.deleteMany({ personaId: pId });
  const memResult = await Memory.deleteMany({ personaId: pId });
  const exResult = await ConversationExample.deleteMany({ personaId: pId });
  const vpResult = await VoiceProfile.deleteMany({ personaId: pId });
  const chatResult = await ChatSession.deleteMany({ personaId: pId });

  // 3. Delete from vector store
  const vectorCount = await globalVectorStore.deleteByPersonaId(personaId);

  // 4. Delete the Persona document itself
  await Persona.deleteOne({ _id: pId });

  return {
    success: true,
    deletedCounts: {
      messages: msgResult.deletedCount || 0,
      memories: memResult.deletedCount || 0,
      examples: exResult.deletedCount || 0,
      voiceProfiles: vpResult.deletedCount || 0,
      chatSessions: chatResult.deletedCount || 0,
      vectors: vectorCount,
    },
  };
}
