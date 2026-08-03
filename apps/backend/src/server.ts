import http from 'http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './utils/logger.js';
import { prisma } from './config/database.js';
import { redis } from './config/redis.js';

import { initSocketServer } from './socket/inbox.gateway.js';
import './workers/webhook.worker.js';
import './workers/campaign.worker.js';

const app = createApp();
const server = http.createServer(app);

// Initialize Realtime Socket.IO Gateway
initSocketServer(server);

server.listen(env.PORT, () => {
  logger.info(`🚀 Prowexa WhatsApp API & Socket.IO running on port ${env.PORT} [${env.NODE_ENV}]`);
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(signal: string) {
  logger.info(`📴 ${signal} received — gracefully shutting down...`);

  server.close(async () => {
    logger.info('HTTP server closed.');
    await prisma.$disconnect();
    logger.info('Database disconnected.');
    await redis.quit();
    logger.info('Redis disconnected.');
    process.exit(0);
  });

  // Force close after 10 seconds
  setTimeout(() => {
    logger.error('Forced shutdown due to timeout.');
    process.exit(1);
  }, 10_000);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Uncaught Exception — shutting down');
  process.exit(1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Unhandled Promise Rejection — shutting down');
  process.exit(1);
});

export { server };
