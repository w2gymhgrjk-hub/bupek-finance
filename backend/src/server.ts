import 'dotenv/config';
import app from './app';
import { env } from './config/env';
import { logger } from './utils/logger';
import { prisma } from './utils/prismaClient';
import { startOverdueDetectionJob } from './jobs/overdueDetection.job';
import { startSmsReminderJob } from './jobs/smsReminder.job';
import fs from 'fs';

async function main() {
  // Ensure upload directories exist
  ['uploads/documents', 'uploads/photos', 'logs'].forEach(dir => {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  });

  // Test DB connection
  await prisma.$connect();
  logger.info('Database connected');

  // Start cron jobs
  startOverdueDetectionJob();
  startSmsReminderJob();
  logger.info('Scheduled jobs started');

  const server = app.listen(env.PORT, () => {
    logger.info(`${env.APP_NAME} running on port ${env.PORT} [${env.NODE_ENV}]`);
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info(`${signal} received. Shutting down gracefully...`);
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Server closed');
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch(err => {
  logger.error('Server startup failed:', err);
  process.exit(1);
});