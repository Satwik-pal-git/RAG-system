import { createApp } from './app';
import { config } from './config';
import { connectDatabase, disconnectDatabase } from './config/db';

const app = createApp();

if (process.env.VERCEL !== '1' && process.env.NODE_ENV !== 'test') {
  // Connect to MongoDB
  connectDatabase();

  const server = app.listen(config.port, () => {
    console.log(`
🚀 Server is running!
🔊 Environment: ${config.nodeEnv}
📡 API Base URL: http://localhost:${config.port}/api
🩺 Health Check: http://localhost:${config.port}/api/health
📖 API Info:     http://localhost:${config.port}/api/info
    `);
  });

  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`\nReceived ${signal}. Shutting down gracefully...`);
    await disconnectDatabase();
    server.close(() => {
      console.log('Server closed successfully.');
      process.exit(0);
    });

    // Force close after 10s if hung
    setTimeout(() => {
      console.error('Could not close connections in time, forcefully shutting down');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
}

export default app;


