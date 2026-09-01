import mongoose, { Document, Schema } from "mongoose";

export interface IConversationExample extends Document {
  personaId: mongoose.Types.ObjectId;
  prompt: string;
  response: string;
  userMessage?: string;
  personaResponse?: string;
  topic?: string;
  language?: string;
  sourceMessageId?: mongoose.Types.ObjectId;
  sourceMessageIds: mongoose.Types.ObjectId[];
  timestamp?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const ConversationExampleSchema = new Schema<IConversationExample>(
  {
    personaId: {
      type: Schema.Types.ObjectId,
      ref: "Persona",
      required: true,
      index: true,
    },
    prompt: {
      type: String,
      required: true,
    },
    response: {
      type: String,
      required: true,
    },
    userMessage: {
      type: String,
    },
    personaResponse: {
      type: String,
    },
    topic: {
      type: String,
      default: "General",
    },
    language: {
      type: String,
      default: "English",
    },
    sourceMessageId: {
      type: Schema.Types.ObjectId,
      ref: "ConversationMessage",
    },
    sourceMessageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: "ConversationMessage",
      },
    ],
    timestamp: {
      type: Date,
      default: Date.now,
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

// Pre-save hook to ensure prompt/response and userMessage/personaResponse sync
ConversationExampleSchema.pre("save", function (next) {
  if (!this.userMessage && this.prompt) {
    this.userMessage = this.prompt;
  }
  if (!this.personaResponse && this.response) {
    this.personaResponse = this.response;
  }
  if (!this.prompt && this.userMessage) {
    this.prompt = this.userMessage;
  }
  if (!this.response && this.personaResponse) {
    this.response = this.personaResponse;
  }
  next();
});

export const ConversationExample = mongoose.model<IConversationExample>(
  "ConversationExample",
  ConversationExampleSchema
);

// Export alias for ResponseExample
export const ResponseExample = ConversationExample;

