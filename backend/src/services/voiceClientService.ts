import axios from "axios";
import fs from "fs";
import path from "path";
import FormData from "form-data";
import { config } from "../config/env.js";

export class VoiceClientService {
  private baseUrl: string;

  constructor(baseUrl: string = config.voiceEngineUrl) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  public async cloneVoice(filePath: string, personaId: string): Promise<{ voice_id: string; status: string }> {
    const formData = new FormData();
    formData.append("persona_id", personaId);
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(`${this.baseUrl}/voice/clone`, formData, {
      headers: formData.getHeaders(),
      timeout: 120000,
    });

    return response.data;
  }

  public async synthesize(text: string, voiceId?: string, personaId?: string): Promise<{ audio_url: string; audio_filename?: string; disclaimer: string }> {
    const response = await axios.post(
      `${this.baseUrl}/voice/synthesize`,
      { text, voice_id: voiceId, persona_id: personaId },
      { timeout: 120000 }
    );

    return response.data;
  }

  public async transcribe(filePath: string): Promise<{ text: string; status: string; confidence?: number; device?: string; provider?: string }> {
    console.log(`[VOICE] STT request started: ${filePath}`);

    // Strategy 1: Try Groq Whisper API (Fastest, production/cloud ready)
    const groqKey = config.groqApiKey || config.openaiApiKey;
    if (groqKey) {
      try {
        const formData = new FormData();
        const baseName = path.basename(filePath);
        const fileName = baseName.includes(".") ? baseName : `${baseName}.wav`;
        const contentType = fileName.endsWith(".mp3") ? "audio/mpeg" : fileName.endsWith(".webm") ? "audio/webm" : "audio/wav";

        formData.append("file", fs.createReadStream(filePath), {
          filename: fileName,
          contentType: contentType,
        });
        formData.append("model", "whisper-large-v3");
        formData.append("temperature", "0");
        formData.append("response_format", "json");

        const response = await axios.post("https://api.groq.com/openai/v1/audio/transcriptions", formData, {
          headers: {
            ...formData.getHeaders(),
            Authorization: `Bearer ${groqKey}`,
          },
          timeout: 25000,
        });

        const transcript = (response.data?.text || "").trim();
        console.log(`[VOICE] STT response received: transcript="${transcript}" (provider: groq-whisper)`);
        return {
          text: transcript,
          status: "success",
          confidence: 0.98,
          provider: "groq-whisper",
        };
      } catch (groqErr: any) {
        const detail = groqErr.response?.data ? JSON.stringify(groqErr.response.data) : groqErr.message;
        console.warn(`[VOICE] Groq Whisper notice (${detail}), trying local fallback...`);
      }
    }

    // Strategy 2: Fallback to local Python FastAPI voice engine if running
    try {
      const formData = new FormData();
      formData.append("file", fs.createReadStream(filePath));

      const response = await axios.post(`${this.baseUrl}/voice/transcribe`, formData, {
        headers: formData.getHeaders(),
        timeout: 30000,
      });

      const transcript = (response.data?.text || "").trim();
      console.log(`[VOICE] STT response received: transcript="${transcript}" (provider: local-engine)`);
      return {
        text: transcript,
        status: response.data?.status || "success",
        confidence: response.data?.confidence || 0.9,
        device: response.data?.device,
        provider: "local-engine",
      };
    } catch (localErr: any) {
      console.error(`[VOICE] STT transcription failed across all providers:`, localErr.message);
      throw new Error(`Speech transcription failed: ${localErr.message}`);
    }
  }

  public async getHealth(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/voice/health`, { timeout: 5000 });
    return response.data;
  }
}

export const globalVoiceClient = new VoiceClientService();
