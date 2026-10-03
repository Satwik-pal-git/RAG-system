import express, { Express } from 'express';
import cors from 'cors';
import passport from 'passport';
import { config } from './config';
import { configurePassport } from './config/passport';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { connectDatabase } from './config/db';
import apiRouter from './routes/api.routes';

export const createApp = (): Express => {
  const app = express();

  // Initialize passport strategies
  configurePassport();
  app.use(passport.initialize());

  // Basic CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, curl, postman) or matching list
        if (!origin || config.corsOrigins.includes(origin) || !config.isProduction) {
          callback(null, true);
        } else {
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
    })
  );

  // Body parsers
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Ensure DB connection for serverless invocations
  app.use(async (_req, _res, next) => {
    try {
      await connectDatabase();
    } catch {
      // Non-blocking fallback
    }
    next();
  });

  // Logging middleware
  app.use(requestLogger);


  // Health check at root
  app.get('/', (req, res) => {
    res.json({
      name: 'Full-Stack React + Node.js Starter API',
      status: 'active',
      documentation: '/api/info',
      health: '/api/health',
      timestamp: new Date().toISOString(),
    });
  });

  // Mount API Router
  app.use('/api', apiRouter);

  // 404 handler for unknown routes
  app.use(notFoundHandler);

  // Global error handler
  app.use(errorHandler);

  return app;
};
