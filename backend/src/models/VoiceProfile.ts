import mongoose, { Document, Schema } from "mongoose";

export interface IVoiceProfile extends Document {
  personaId: mongoose.Types.ObjectId;
  samplePath: string;
  originalFileName: string;
  voiceId?: string;
  status: "unprocessed" | "cloning" | "ready" | "failed";
  consentedAt: Date;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const VoiceProfileSchema = new Schema<IVoiceProfile>(
  {
    personaId: {
      type: Schema.Types.ObjectId,
      ref: "Persona",
      required: true,
      index: true,
    },
    samplePath: {
      type: String,
      required: true,
    },
    originalFileName: {
      type: String,
      required: true,
    },
    voiceId: {
      type: String,
    },
    status: {
      type: String,
      enum: ["unprocessed", "cloning", "ready", "failed"],
      default: "unprocessed",
    },
    consentedAt: {
      type: Date,
      default: Date.now,
    },
    metadata: {
      type: Schema.Types.Mixed,
      default: {},
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

export const VoiceProfile = mongoose.model<IVoiceProfile>(
  "VoiceProfile",
  VoiceProfileSchema
);
