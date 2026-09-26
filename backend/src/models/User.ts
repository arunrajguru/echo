import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  email: string;
  password?: string;
  authProvider: "local" | "google";
  googleId?: string;
  name?: string;
  isVerified: boolean;
  otpHash?: string;
  otpExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    password: {
      type: String,
      required: function (this: any) {
        return this.authProvider !== "google";
      },
      minlength: 8,
    },
    authProvider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: {
      type: String,
      sparse: true,
      index: true,
    },
    name: {
      type: String,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    otpHash: {
      type: String,
    },
    otpExpiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret: Record<string, any>) {
        delete ret.password;
        delete ret.otpHash;
        delete ret.otpExpiresAt;
        ret.id = ret._id;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

UserSchema.pre("save", async function (next) {
  if (!this.password || !this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  if (!this.password) return false;
  return bcrypt.compare(candidate, this.password);
};

export const User = mongoose.model<IUser>("User", UserSchema);
