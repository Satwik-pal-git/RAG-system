import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export interface Config {
  port: number;
  nodeEnv: string;
  corsOrigins: string[];
  isProduction: boolean;
}

const rawCors = process.env.CORS_ORIGIN || 'http://localhost:5173,http://localhost:3000';
const corsOrigins = rawCors.split(',').map((origin) => origin.trim());

export const config: Config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigins,
  isProduction: process.env.NODE_ENV === 'production',
};
