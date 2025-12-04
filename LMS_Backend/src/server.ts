import http from 'http';
import { createApp } from './app';
import { config, validateEnv } from './config/env';
import { testConnection } from './config/database';
import { logger } from './utils/logger';

// Validate environment variables
try {
  validateEnv();
} catch (error: any) {
  logger.error('Environment validation failed:', error.message);
  process.exit(1);
}

// Create Express app
const app = createApp();

// Create HTTP server
const server = http.createServer(app);

// Test database connection
testConnection().then((connected) => {
  if (!connected) {
    logger.error('Failed to connect to database');
    process.exit(1);
  }
});

// Start server
const PORT = config.port;

server.listen(PORT, () => {
  logger.info(`🚀 Server running on port ${PORT}`);
  logger.info(`📝 Environment: ${config.nodeEnv}`);
  logger.info(`🔗 API Base URL: http://localhost:${PORT}/api/${config.apiVersion}`);
});

// Graceful shutdown
const gracefulShutdown = (signal: string) => {
  logger.info(`${signal} received. Starting graceful shutdown...`);

  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });

  // Force shutdown after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason: any) => {
  logger.error('Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

// Handle uncaught exceptions
process.on('uncaughtException', (error: Error) => {
  logger.error('Uncaught Exception:', error);
  gracefulShutdown('uncaughtException');
});

export default server;
