import axios from "axios";
import fs from "fs";
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
      timeout: 30000,
    });

    return response.data;
  }

  public async synthesize(text: string, voiceId?: string, personaId?: string): Promise<{ audio_url: string; audio_filename?: string; disclaimer: string }> {
    const response = await axios.post(
      `${this.baseUrl}/voice/synthesize`,
      { text, voice_id: voiceId, persona_id: personaId },
      { timeout: 10000 }
    );

    return response.data;
  }

  public async transcribe(filePath: string): Promise<{ text: string; status: string; confidence?: number; device?: string }> {
    const formData = new FormData();
    formData.append("file", fs.createReadStream(filePath));

    const response = await axios.post(`${this.baseUrl}/voice/transcribe`, formData, {
      headers: formData.getHeaders(),
      timeout: 30000,
    });

    return response.data;
  }

  public async getHealth(): Promise<any> {
    const response = await axios.get(`${this.baseUrl}/voice/health`, { timeout: 5000 });
    return response.data;
  }
}

export const globalVoiceClient = new VoiceClientService();
