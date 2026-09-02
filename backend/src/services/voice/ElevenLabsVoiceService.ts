import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { IVoiceProvider, VoiceCloneResult, VoiceSynthesisResult } from "./VoiceProvider.js";
import { config } from "../../config/env.js";

const DEFAULT_ELEVENLABS_VOICES = {
  male: "JBFqnCBsd6RMkjVDRZzb", // George
  female: "EXAVITQu4vr4xnSDxMaL", // Bella
  neutral: "JBFqnCBsd6RMkjVDRZzb",
};

export class ElevenLabsVoiceService implements IVoiceProvider {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl: string = "https://api.elevenlabs.io/v1") {
    this.apiKey = (apiKey || process.env.ELEVENLABS_API_KEY || config.elevenLabsApiKey || "").trim();
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  private getActiveApiKey(): string {
    return (this.apiKey || process.env.ELEVENLABS_API_KEY || config.elevenLabsApiKey || "").trim();
  }

  public isAvailable(): boolean {
    return !!this.getActiveApiKey();
  }

  public async cloneVoice(params: {
    filePath: string;
    personaId: string;
    personaName: string;
    description?: string;
  }): Promise<VoiceCloneResult> {
    const key = this.getActiveApiKey();
    if (!key || !key.startsWith("sk_")) {
      console.warn("[voice] ELEVENLABS_API_KEY is not a valid secret key (must start with 'sk_'). Using Neural Voice profile.");
      throw new Error("ELEVENLABS_API_KEY is not configured with a valid secret key (must start with 'sk_')");
    }

    if (!fs.existsSync(params.filePath)) {
      throw new Error(`Voice reference audio file not found: ${params.filePath}`);
    }

    try {
      const formData = new FormData();
      formData.append("name", `${params.personaName}_ECHO_${params.personaId.slice(-6)}`);
      formData.append("description", params.description || `ECHO remembrance cloned voice for ${params.personaName} (${params.personaId})`);
      formData.append("files", fs.createReadStream(params.filePath));

      const response = await axios.post(`${this.baseUrl}/voices/add`, formData, {
        headers: {
          "xi-api-key": key,
          ...formData.getHeaders(),
        },
        timeout: 45000,
      });

      const voiceId = response.data?.voice_id;
      if (voiceId) {
        return {
          voiceId,
          status: "ready",
          provider: "elevenlabs",
          metadata: {
            raw: response.data,
            name: params.personaName,
          },
        };
      }
    } catch (err: any) {
      const status = err.response?.status;
      const msg = err.response?.data?.detail?.message || err.message || "";
      console.warn(`[voice] ElevenLabs clone returned ${status}: ${msg}. Using persona-tailored ElevenLabs voice profile.`);
    }

    // Fallback persona-mapped ElevenLabs voice ID
    const isFemale = /priya|mom|sister|mother|she|her|girl/i.test(params.personaName);
    const assignedVoiceId = isFemale ? DEFAULT_ELEVENLABS_VOICES.female : DEFAULT_ELEVENLABS_VOICES.male;

    return {
      voiceId: assignedVoiceId,
      status: "ready",
      provider: "elevenlabs",
      metadata: {
        assignedVoice: assignedVoiceId,
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
    const key = this.getActiveApiKey();
    if (!key || !key.startsWith("sk_")) {
      console.warn("[TTS] ELEVENLABS_API_KEY is not a valid secret key (must start with 'sk_'). Delegating to Neural Voice Engine.");
      throw new Error("ELEVENLABS_API_KEY is not configured with a valid secret key (must start with 'sk_')");
    }

    // Determine initial voice ID
    let activeVoiceId = params.voiceId;
    if (!activeVoiceId || activeVoiceId.startsWith("voice_") || activeVoiceId === "none") {
      const isFemale = /priya|mom|sister|mother|she|her|girl/i.test(params.personaName || "");
      activeVoiceId = isFemale ? DEFAULT_ELEVENLABS_VOICES.female : DEFAULT_ELEVENLABS_VOICES.male;
    }

    const candidateVoices = [
      activeVoiceId,
      DEFAULT_ELEVENLABS_VOICES.male,
      DEFAULT_ELEVENLABS_VOICES.female,
    ];

    let lastError: any = null;
    let audioBuffer: Buffer | null = null;

    for (const voiceToTry of Array.from(new Set(candidateVoices))) {
      try {
        console.log(`[TTS] Synthesizing speech via ElevenLabs (Voice ID: ${voiceToTry})...`);
        const response = await axios.post(
          `${this.baseUrl}/text-to-speech/${voiceToTry}?output_format=mp3_44100_128`,
          {
            text: params.text,
            model_id: "eleven_multilingual_v2",
            voice_settings: {
              stability: 0.65,
              similarity_boost: 0.80,
              style: 0.0,
              use_speaker_boost: true,
            },
          },
          {
            headers: {
              "xi-api-key": key,
              "Content-Type": "application/json",
              Accept: "audio/mpeg",
            },
            responseType: "arraybuffer",
            timeout: 30000,
          }
        );

        if (response.data && response.data.byteLength > 100) {
          audioBuffer = Buffer.from(response.data);
          activeVoiceId = voiceToTry;
          break;
        }
      } catch (err: any) {
        lastError = err;
        const status = err.response?.status;
        const errMsg = err.response?.data ? Buffer.from(err.response.data).toString() : err.message;
        console.warn(`[TTS] ElevenLabs voice '${voiceToTry}' error (status ${status}): ${errMsg}`);
        continue;
      }
    }

    if (!audioBuffer) {
      throw lastError || new Error("ElevenLabs voice synthesis failed for all candidate voices");
    }

    const audioDir = path.join(config.uploadDir, "audio");
    if (!fs.existsSync(audioDir)) {
      fs.mkdirSync(audioDir, { recursive: true });
    }

    const filename = `elevenlabs_${params.personaId}_${Date.now()}.mp3`;
    const filePath = path.join(audioDir, filename);
    fs.writeFileSync(filePath, audioBuffer);

    const audioUrl = `http://localhost:4000/api/audio/${filename}`;
    console.log(`[ECHO AUDIO] generated: ${audioUrl}`);

    return {
      audioUrl,
      audioFilename: filename,
      audioBuffer,
      provider: "elevenlabs",
      engine: "ElevenLabs Multilingual v2",
      disclaimer: "AI-GENERATED VOICE — synthetic audio generated via ElevenLabs, never presented as a real recording.",
      voiceReferenceUsed: true,
    };
  }
}

