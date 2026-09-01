import mongoose, { Document, Schema } from "mongoose";

export interface IChatMessage {
  role: "user" | "echo" | "system";
  text: string;
  grounded?: string;
  sources?: string[];
  memories?: string[];
  audioUrl?: string;
  createdAt: Date;
}

export interface IChatSession extends Document {
  personaId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title?: string;
  messages: IChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

const ChatMessageSchema = new Schema<IChatMessage>(
  {
    role: {
      type: String,
      enum: ["user", "echo", "system"],
      required: true,
    },
    text: {
      type: String,
      required: true,
    },
    grounded: {
      type: String,
    },
    sources: {
      type: [String],
      default: [],
    },
    memories: {
      type: [String],
      default: [],
    },
    audioUrl: {
      type: String,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const ChatSessionSchema = new Schema<IChatSession>(
  {
    personaId: {
      type: Schema.Types.ObjectId,
      ref: "Persona",
      required: true,
      index: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
    },
    messages: {
      type: [ChatMessageSchema],
      default: [],
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

export const ChatSession = mongoose.model<IChatSession>("ChatSession", ChatSessionSchema);
