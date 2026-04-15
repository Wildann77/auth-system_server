/**
 * Request ID Middleware
 * Adds unique request ID to each request for tracing
 */

import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

export const requestIdMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  req.requestId = requestId;
  res.setHeader('X-Request-ID', requestId);

  next();
};
