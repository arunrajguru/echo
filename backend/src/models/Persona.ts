import mongoose, { Document, Schema } from "mongoose";

export interface IPersonaStats {
  messagesAnalyzed: number;
  personaMessages: number;
  memoriesExtracted: number;
  conversationExamples: number;
  confidence: number;
}

export interface IPersonaStyle {
  language?: string;
  languageMix?: string;
  sentenceLength?: string;
  averageWordsPerMessage?: number;
  replyStyle?: string;
  tone?: string;
  humor?: string;
  emojiUsage?: string;
  topEmojis?: string[];
  emojis?: string[];
  punctuation?: string;
  capitalization?: string;
  commonOpenings?: string[];
  commonExpressions?: string[];
  typicalReplyLength?: string;
  emotionalPatterns?: string;
  signOff?: string;
  vocabulary?: string[];
  [key: string]: any;
}

export interface IPersona extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  relationship: string;
  targetParticipant?: string;
  participants: string[];
  stats: IPersonaStats;
  style: IPersonaStyle;
  status: "draft" | "uploaded" | "analyzed" | "active";
  voiceProfileId?: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PersonaSchema = new Schema<IPersona>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
    targetParticipant: {
      type: String,
      trim: true,
    },
    participants: {
      type: [String],
      default: [],
    },
    stats: {
      messagesAnalyzed: { type: Number, default: 0 },
      personaMessages: { type: Number, default: 0 },
      memoriesExtracted: { type: Number, default: 0 },
      conversationExamples: { type: Number, default: 0 },
      confidence: { type: Number, default: 0 },
    },
    style: {
      type: Schema.Types.Mixed,
      default: {},
    },
    status: {
      type: String,
      enum: ["draft", "uploaded", "analyzed", "active"],
      default: "draft",
    },
    voiceProfileId: {
      type: Schema.Types.ObjectId,
      ref: "VoiceProfile",
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret: Record<string, any>) {
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Persona = mongoose.model<IPersona>("Persona", PersonaSchema);
