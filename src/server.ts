import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, connectDatabase, disconnectDatabase } from '@/config';
import { logger } from '@/shared/utils/logger';
import { errorHandler, requestIdMiddleware, loggerMiddleware, responseHandlerMiddleware } from '@/shared/middleware';
import { globalLimiter } from '@/shared/middleware/rate-limit';
import { authRouter } from '@/features/auth/index';
import { userRouter } from '@/features/user/index';
import { adminRouter } from '@/features/admin/index';
import { paymentRouter } from '@/features/payment/index';
import { contentRouter } from '@/features/content/index';

const app = express();
const PORT = env.PORT;

app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(responseHandlerMiddleware);

// Global rate limiting for all API routes
app.use('/api/v1', globalLimiter);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/payment', paymentRouter);
app.use('/api/v1/content', contentRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

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

export default app;