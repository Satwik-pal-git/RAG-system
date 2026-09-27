import mongoose from 'mongoose';
import { config } from './index';

let isConnected = false;

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  if (isConnected) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(config.mongodbUri, {
      serverSelectionTimeoutMS: 5000,
    });
    isConnected = true;
    console.log(`[Database] MongoDB Connected successfully to host: ${conn.connection.host}`);
    return conn;
  } catch (error: any) {
    console.error(`[Database] MongoDB connection failed: ${error.message}`);
    console.warn(`[Database] Please ensure MongoDB is running or configure MONGODB_URI in your .env file.`);
    return null;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (!isConnected) return;
  try {
    await mongoose.disconnect();
    isConnected = false;
    console.log('[Database] MongoDB disconnected successfully.');
  } catch (error: any) {
    console.error(`[Database] Error disconnecting MongoDB: ${error.message}`);
  }
};

export const isDbConnected = (): boolean => isConnected && mongoose.connection.readyState === 1;
