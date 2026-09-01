import { IVoiceProvider } from "./VoiceProvider.js";
import { ElevenLabsVoiceService } from "./ElevenLabsVoiceService.js";
import { LocalVoiceService } from "./LocalVoiceService.js";
import { config } from "../../config/env.js";

export function createVoiceProvider(providerType?: string): IVoiceProvider {
  const chosenType = (providerType || config.voiceProvider || "elevenlabs").toLowerCase();

  if (chosenType === "elevenlabs" && config.elevenLabsApiKey) {
    return new ElevenLabsVoiceService(config.elevenLabsApiKey);
  }

  // Fallback to local voice service
  return new LocalVoiceService();
}

export class VoiceServiceManager {
  private provider: IVoiceProvider;

  constructor(provider?: IVoiceProvider) {
    this.provider = provider || createVoiceProvider();
  }

  public setProvider(provider: IVoiceProvider) {
    this.provider = provider;
  }

  public getProvider(): IVoiceProvider {
    return this.provider;
  }

  public async cloneVoice(params: {
    filePath: string;
    personaId: string;
    personaName: string;
    description?: string;
  }) {
    // Proactively register profile in local Chatterbox engine so local engine ALWAYS has the cloned audio characteristics ready
    try {
      const localService = new LocalVoiceService();
      await localService.cloneVoice(params);
    } catch (e) {
      console.warn("[voice] Local voice engine profile cache notice:", (e as any)?.message || e);
    }

    try {
      return await this.provider.cloneVoice(params);
    } catch (err) {
      // If primary (e.g. ElevenLabs) fails and wasn't local, fallback to local
      if (!(this.provider instanceof LocalVoiceService)) {
        console.warn("[voice] Primary voice clone failed, using local fallback:", (err as any)?.message || err);
        const fallback = new LocalVoiceService();
        return await fallback.cloneVoice(params);
      }
      throw err;
    }
  }

  public async synthesize(params: {
    text: string;
    voiceId: string;
    personaId: string;
    personaName?: string;
  }) {
    try {
      return await this.provider.synthesize(params);
    } catch (err) {
      if (!(this.provider instanceof LocalVoiceService)) {
        console.warn("[voice] Primary voice synthesis failed, using local fallback:", (err as any)?.message || err);
        const fallback = new LocalVoiceService();
        return await fallback.synthesize(params);
      }
      throw err;
    }
  }
}

export const globalVoiceService = new VoiceServiceManager();

export type { IVoiceProvider, VoiceCloneResult, VoiceSynthesisResult } from "./VoiceProvider.js";
export { ElevenLabsVoiceService } from "./ElevenLabsVoiceService.js";
export { LocalVoiceService } from "./LocalVoiceService.js";
