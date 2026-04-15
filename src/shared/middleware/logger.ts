/**
 * Logger Middleware
 * Structured logging for all HTTP requests
 */

import { Request, Response, NextFunction } from 'express';
import { isDevelopment } from '@/config/env';

/**
 * Format log entry as JSON
 */
const formatLogEntry = (req: Request, res: Response, duration: number) => ({
  timestamp: new Date().toISOString(),
  requestId: req.requestId,
  method: req.method,
  path: req.path,
  statusCode: res.statusCode,
  duration: `${duration}ms`,
  ip: req.ip || req.connection.remoteAddress,
  userAgent: req.get('user-agent'),
  userId: req.user?.userId,
});

/**
 * Logger middleware
 */
export const loggerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const startTime = Date.now();

  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const logEntry = formatLogEntry(req, res, duration);

    if (res.statusCode >= 500) {
      console.error('[ERROR]', JSON.stringify(logEntry));
    } else if (res.statusCode >= 400) {
      console.warn('[WARN]', JSON.stringify(logEntry));
    } else {
      if (isDevelopment) {
        console.log('[INFO]', JSON.stringify(logEntry));
      }
    }
  });

  next();
};
