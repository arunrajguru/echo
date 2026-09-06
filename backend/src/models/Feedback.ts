import mongoose, { Document, Schema } from "mongoose";

export interface IFeedback extends Document {
  name?: string;
  email?: string;
  rating: number;
  review: string;
  suggestions?: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
  {
    name: {
      type: String,
      trim: true,
      default: "Anonymous User",
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      default: "",
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    review: {
      type: String,
      required: true,
      trim: true,
    },
    suggestions: {
      type: String,
      trim: true,
      default: "",
    },
    source: {
      type: String,
      default: "web_app",
    },
  },
  {
    timestamps: true,
  }
);

export const Feedback = mongoose.model<IFeedback>("Feedback", FeedbackSchema);
export default Feedback;
