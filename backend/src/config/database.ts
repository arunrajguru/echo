import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import { config } from "./env.js";

let mongoMemoryServer: MongoMemoryServer | null = null;

export async function connectDatabase(): Promise<typeof mongoose> {
  let uri = config.mongoUri;

  if (!uri) {
    console.log("[database] No MONGODB_URI provided. Initializing standalone MongoDB memory server instance...");
    mongoMemoryServer = await MongoMemoryServer.create();
    uri = mongoMemoryServer.getUri();
    console.log(`[database] Standalone MongoDB running at ${uri}`);
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[database] MongoDB connected successfully to ${mongoose.connection.host}`);
    return conn;
  } catch (err) {
    if (!mongoMemoryServer) {
      console.warn("[database] Failed connecting to configured MONGODB_URI. Falling back to MongoDB Memory Server...");
      mongoMemoryServer = await MongoMemoryServer.create();
      const fallbackUri = mongoMemoryServer.getUri();
      const conn = await mongoose.connect(fallbackUri);
      console.log(`[database] Fallback MongoDB running at ${fallbackUri}`);
      return conn;
    }
    throw err;
  }
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
  if (mongoMemoryServer) {
    await mongoMemoryServer.stop();
  }
}
