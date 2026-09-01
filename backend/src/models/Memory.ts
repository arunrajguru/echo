import mongoose, { Document, Schema } from "mongoose";

export interface IMemory extends Document {
  personaId: mongoose.Types.ObjectId;
  title: string;
  category: "Trips" | "Conversations" | "Favorites" | "Places" | "People" | "General";
  confidence: number;
  date: string;
  content: string;
  sourceLines: string[];
  sourceMessageIds: mongoose.Types.ObjectId[];
  isApproved: boolean;
  vectorId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MemorySchema = new Schema<IMemory>(
  {
    personaId: {
      type: Schema.Types.ObjectId,
      ref: "Persona",
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      enum: ["Trips", "Conversations", "Favorites", "Places", "People", "General"],
      default: "Conversations",
      index: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
      default: 0.85,
    },
    date: {
      type: String,
      default: "Ongoing",
    },
    content: {
      type: String,
      required: true,
    },
    sourceLines: {
      type: [String],
      required: true,
      validate: [(val: string[]) => val.length > 0, "Memory must have at least one source line"],
    },
    sourceMessageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "ConversationMessage",
      },
    ],
    isApproved: {
      type: Boolean,
      default: true,
    },
    vectorId: {
      type: String,
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

MemorySchema.index({ personaId: 1, category: 1 });
MemorySchema.index({ personaId: 1, isApproved: 1 });

export const Memory = mongoose.model<IMemory>("Memory", MemorySchema);
