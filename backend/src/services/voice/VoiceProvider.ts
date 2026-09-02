export interface VoiceCloneResult {
  voiceId: string;
  status: "ready" | "unprocessed" | "cloning" | "failed";
  provider: "elevenlabs" | "chatterbox" | "local" | "edge-neural" | "neural-local";
  metadata?: Record<string, any>;
}

export interface VoiceSynthesisResult {
  audioUrl: string;
  audioFilename?: string;
  audioBuffer?: Buffer;
  provider: "elevenlabs" | "chatterbox" | "local" | "edge-neural" | "neural-local";
  engine: string;
  model?: string;
  disclaimer: string;
  voiceReferenceUsed: boolean;
}

export interface IVoiceProvider {
  cloneVoice(params: {
    filePath: string;
    personaId: string;
    personaName: string;
    description?: string;
  }): Promise<VoiceCloneResult>;

  synthesize(params: {
    text: string;
    voiceId: string;
    personaId: string;
    personaName?: string;
  }): Promise<VoiceSynthesisResult>;

  isAvailable(): boolean;
}
