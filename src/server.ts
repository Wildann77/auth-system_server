import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env, connectDatabase, disconnectDatabase } from '@/config';
import { errorHandler, requestIdMiddleware, loggerMiddleware, responseHandlerMiddleware } from '@/shared/middleware';
import { authRouter } from '@/features/auth/index';
import { userRouter } from '@/features/user/index';

const app = express();
const PORT = env.PORT;

app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use(responseHandlerMiddleware);

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user', userRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await connectDatabase();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

const shutdown = async () => {
  console.log('🛑 Shutting down server...');
  await disconnectDatabase();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

startServer();

export default app;