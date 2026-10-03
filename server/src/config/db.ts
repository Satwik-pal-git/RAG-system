import mongoose from 'mongoose';
import { config } from './index';

let cachedPromise: Promise<typeof mongoose | null> | null = null;

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  if (cachedPromise) {
    return cachedPromise;
  }

  if (!config.mongodbUri) {
    console.warn('[Database] MONGODB_URI is not defined. Falling back to local/memory stores.');
    return null;
  }

  cachedPromise = (async () => {
    try {
      const conn = await mongoose.connect(config.mongodbUri, {
        serverSelectionTimeoutMS: 5000,
        bufferCommands: false,
      });
      console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
      return conn;
    } catch (error: any) {
      cachedPromise = null;
      console.error(`[Database] MongoDB connection failed: ${error.message}`);
      return null;
    }
  })();

  return cachedPromise;
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState === 0) return;
  try {
    await mongoose.disconnect();
    cachedPromise = null;
    console.log('[Database] MongoDB disconnected successfully.');
  } catch (error: any) {
    console.error(`[Database] Error disconnecting MongoDB: ${error.message}`);
  }
};

export const isDbConnected = (): boolean => mongoose.connection.readyState === 1;

