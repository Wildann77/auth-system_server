import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '@/config';
import { errorHandler, requestIdMiddleware, loggerMiddleware, responseHandlerMiddleware } from '@/shared/middleware';
import { globalLimiter } from '@/shared/middleware/rate-limit';
import { authRouter } from '@/features/auth/index';
import { userRouter } from '@/features/user/index';
import { adminRouter } from '@/features/admin/index';
import { paymentRouter } from '@/features/payment/index';
import { contentRouter } from '@/features/content/index';

const app = express();

app.use(requestIdMiddleware);
app.use(loggerMiddleware);
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json({
  verify: (req: any, _res, buf) => {
    if (req.originalUrl.includes('/webhook-stripe')) {
      req.rawBody = buf;
    }
  }
}));
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

export { app };
