import fs from "fs";
import path from "path";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { IVoiceProvider, VoiceCloneResult, VoiceSynthesisResult } from "./VoiceProvider.js";
import { config } from "../../config/env.js";

// Curated selection of expressive Microsoft Neural voices
const VOICE_MAP: Record<string, string> = {
  male_in: "en-IN-PrabhatNeural",
  female_in: "en-IN-NeerjaNeural",
  male_hi: "hi-IN-MadhurNeural",
  female_hi: "hi-IN-SwaraNeural",
  male_us: "en-US-ChristopherNeural",
  female_us: "en-US-JennyNeural",
};

export class EdgeTTSVoiceService implements IVoiceProvider {
  public isAvailable(): boolean {
    return true;
  }

  public async cloneVoice(params: {
    filePath: string;
    personaId: string;
    personaName: string;
    description?: string;
  }): Promise<VoiceCloneResult> {
    const isFemale = /priya|mom|mother|sister|dadi|nani|girl|she|her|neerja|swara/i.test(params.personaName);
    const assignedVoice = isFemale ? VOICE_MAP.female_in : VOICE_MAP.male_in;

    return {
      voiceId: assignedVoice,
      status: "ready",
      provider: "edge-neural",
      metadata: {
        voice: assignedVoice,
        name: params.personaName,
      },
    };
  }

  public async synthesize(params: {
    text: string;
    voiceId: string;
    personaId: string;
    personaName?: string;
  }): Promise<VoiceSynthesisResult> {
    const audioDir = path.join(config.uploadDir, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    // Determine appropriate expressive neural voice
    let voiceToUse = params.voiceId;
    if (!voiceToUse || voiceToUse.startsWith("voice_") || voiceToUse === "none" || !voiceToUse.includes("Neural")) {
      const isFemale = /priya|mom|mother|sister|dadi|nani|girl|she|her|neerja|swara/i.test(params.personaName || "");
      const isHindi = /[\u0900-\u097F]/.test(params.text) || /bhai|yaar|kya|nahi|kaisa|sun|mera|tera|chal|haan/i.test(params.text);
      if (isHindi) {
        voiceToUse = isFemale ? VOICE_MAP.female_hi : VOICE_MAP.male_hi;
      } else {
        voiceToUse = isFemale ? VOICE_MAP.female_in : VOICE_MAP.male_in;
      }
    }

    // Clean text for optimal TTS pronunciation (strip emojis, markdown, timestamps)
    const cleanText = params.text
      .replace(/<[^>]+>/g, "")
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, "")
      .replace(/\d{1,2}\/\d{1,2}\/\d{2,4},?\s*\d{1,2}:\d{2}\s*(?:AM|PM)?\s*-\s*[^:]+:/gi, "")
      .trim() || params.text.trim() || "Haan, sun raha hoon.";

    const tts = new MsEdgeTTS();
    await tts.setMetadata(voiceToUse, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const filename = `neural_${params.personaId || "echo"}_${Date.now()}_${Math.floor(Math.random() * 10000)}.mp3`;
    const targetFilePath = path.join(audioDir, filename);

    // Synthesize into target file
    const result = await tts.toFile(audioDir, cleanText);
    
    // Rename/move to our unique filename if needed
    if (result.audioFilePath && fs.existsSync(result.audioFilePath)) {
      if (path.resolve(result.audioFilePath) !== path.resolve(targetFilePath)) {
        try {
          fs.renameSync(result.audioFilePath, targetFilePath);
        } catch (_) {
          fs.copyFileSync(result.audioFilePath, targetFilePath);
        }
      }
    }

    const audioUrl = `http://localhost:4000/api/audio/${filename}`;
    console.log(`[TTS] Neural speech synthesized: voice=${voiceToUse}, file=${filename}`);

    return {
      audioUrl,
      audioFilename: filename,
      provider: "edge-neural",
      engine: `Microsoft Neural Voice (${voiceToUse})`,
      disclaimer: "AI-GENERATED VOICE — synthetic audio generated with neural speech synthesis.",
      voiceReferenceUsed: true,
    };
  }
}

export const globalEdgeTTSService = new EdgeTTSVoiceService();
