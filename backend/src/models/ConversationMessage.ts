import mongoose, { Document, Schema } from "mongoose";

export interface IConversationMessage extends Document {
  personaId: mongoose.Types.ObjectId;
  sender: string;
  text: string;
  timestamp: Date;
  rawIndex: number;
  isPersona: boolean;
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationMessageSchema = new Schema<IConversationMessage>(
  {
    personaId: {
      type: Schema.Types.ObjectId,
      ref: "Persona",
      required: true,
      index: true,
    },
    sender: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    text: {
      type: String,
      required: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    rawIndex: {
      type: Number,
      required: true,
    },
    isPersona: {
      type: Boolean,
      default: false,
      index: true,
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

ConversationMessageSchema.index({ personaId: 1, isPersona: 1 });
ConversationMessageSchema.index({ personaId: 1, rawIndex: 1 });

export const ConversationMessage = mongoose.model<IConversationMessage>(
  "ConversationMessage",
  ConversationMessageSchema
);
