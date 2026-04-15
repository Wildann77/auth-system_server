/**
 * Response Handler Middleware
 * Provides consistent API response format
 */

import { Request, Response, NextFunction } from 'express';
import { createSuccessResponse, createErrorResponse } from '@/shared/types/api-response';

export const responseHandlerMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Success response helper
  res.apiSuccess = <T>(data: T, message = 'Success') => {
    const response = createSuccessResponse(data, message);
    res.json(response);
  };

  // Error response helper
  res.apiError = (message: string, code = 'INTERNAL_ERROR') => {
    const response = createErrorResponse(message, code);
    res.status(res.statusCode === 200 ? 500 : res.statusCode).json(response);
  };

  next();
};
