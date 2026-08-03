/**
 * Standalone Worker Process Entry Point
 * Run: node dist/worker-entry.js
 *
 * This file boots ONLY the BullMQ workers — NOT the HTTP server.
 * Separate process isolation ensures campaign bursts don't starve API responses.
 */
import { logger } from './utils/logger.js';
import './workers/webhook.worker.js';

logger.info('🔧 Prowexa Worker Process started — Webhook & Media workers active.');

process.on('uncaughtException', (err) => {
  logger.fatal({ err }, 'Worker uncaught exception — shutting down');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.fatal({ reason }, 'Worker unhandled rejection — shutting down');
  process.exit(1);
});
