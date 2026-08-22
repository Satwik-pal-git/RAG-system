import express, { Express } from 'express';
import cors from 'cors';
import { config } from './config';
import { requestLogger } from './middleware/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import apiRouter from './routes/api.routes';

export const createApp = (): Express => {
  const app = express();

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
