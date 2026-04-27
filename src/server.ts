import { app } from './app';
import { env, connectDatabase, disconnectDatabase } from '@/config';
import { logger } from '@/shared/utils/logger';

const PORT = env.PORT;

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: (error as Error).message });
    process.exit(1);
  }
};

const shutdown = async () => {
  logger.info('Shutting down server...');
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();