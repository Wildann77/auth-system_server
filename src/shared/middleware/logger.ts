/**
 * Logger Middleware
 * Structured logging for all HTTP requests using global logger utility
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '@/shared/utils/logger';

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
    const logContext = {
      requestId: req.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      userId: req.user?.id,
    };

    if (res.statusCode >= 500) {
      logger.error(`HTTP ${req.method} ${req.path}`, logContext);
    } else if (res.statusCode >= 400) {
      logger.warn(`HTTP ${req.method} ${req.path}`, logContext);
    } else {
      logger.info(`HTTP ${req.method} ${req.path}`, logContext);
    }
  });

  next();
};
