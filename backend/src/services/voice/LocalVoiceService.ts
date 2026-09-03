import fs from "fs";
import path from "path";
import { IVoiceProvider, VoiceCloneResult, VoiceSynthesisResult } from "./VoiceProvider.js";
import { globalVoiceClient } from "../voiceClientService.js";
import { config } from "../../config/env.js";
import { VoiceProfile } from "../../models/VoiceProfile.js";

export class LocalVoiceService implements IVoiceProvider {
  public isAvailable(): boolean {
    return true;
  }

  public async cloneVoice(params: {
    filePath: string;
    personaId: string;
    personaName: string;
    description?: string;
  }): Promise<VoiceCloneResult> {
    const result = await globalVoiceClient.cloneVoice(params.filePath, params.personaId);
    return {
      voiceId: result.voice_id || `voice_${params.personaId}`,
      status: "ready",
      provider: "local",
      metadata: { engine: "Coqui XTTS-v2" },
    };
  }

  public async synthesize(params: {
    text: string;
    voiceId: string;
    personaId: string;
    personaName?: string;
  }): Promise<VoiceSynthesisResult> {
    // If voice engine was restarted, ensure profile is registered if audio sample exists
    if (params.personaId) {
      try {
        const profile = await VoiceProfile.findOne({ personaId: params.personaId });
        if (profile && profile.samplePath && fs.existsSync(profile.samplePath)) {
          await globalVoiceClient.cloneVoice(profile.samplePath, params.personaId).catch(() => {});
        }
      } catch (_) {}
    }

    const result = await globalVoiceClient.synthesize(params.text, params.voiceId, params.personaId);
    const audioFilename =
      (result as any).audio_filename ||
      result.audio_url?.split("/").pop() ||
      `voice_${Date.now()}.wav`;
    const audioUrl = `http://localhost:4000/api/audio/${audioFilename}`;

    // Ensure file is copied into backend audio dir
    const audioDir = path.join(config.uploadDir, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }
    const candidates = [
      path.join(process.cwd(), "..", "voice-engine", "outputs", audioFilename),
      path.join(process.cwd(), "voice-engine", "outputs", audioFilename),
    ];
    for (const cand of candidates) {
      if (fs.existsSync(cand)) {
        try {
          fs.copyFileSync(cand, path.join(audioDir, audioFilename));
        } catch (_) {}
        break;
      }
    }

    return {
      audioUrl,
      audioFilename,
      provider: "local",
      engine: "Coqui XTTS-v2",
      model: "v2.0.3",
      disclaimer: result.disclaimer || "AI-GENERATED VOICE — synthetic audio, clearly labeled, never presented as a real recording.",
      voiceReferenceUsed: true,
    };
  }
}
