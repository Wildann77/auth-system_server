/**
 * Error Handler Middleware
 * Centralized error handling for the application
 */

import { Request, Response, NextFunction } from 'express';
import { createErrorResponse } from '@/shared/types/api-response';
import { isProduction } from '@/config/env';

/**
 * Custom application error class
 */
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number, code = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Common HTTP errors
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad Request') {
    super(message, 400, 'BAD_REQUEST');
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super(message, 401, 'UNAUTHORIZED');
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super(message, 403, 'FORBIDDEN');
  }
}

export class NotFoundError extends AppError {
  constructor(message = 'Not Found') {
    super(message, 404, 'NOT_FOUND');
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(message, 409, 'CONFLICT');
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too Many Requests') {
    super(message, 429, 'TOO_MANY_REQUESTS');
  }
}

import { logger } from '@/shared/utils/logger';

/**
 * Global error handler middleware
 */
export const errorHandler = (
  err: Error | AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction
): void => {
  // Log error
  logger.error(err.message, {
    requestId: req.requestId,
    stack: isProduction ? undefined : err.stack,
  });

  // Handle AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json(
      createErrorResponse(
        isProduction && err.statusCode >= 500 ? 'Internal Server Error' : err.message,
        err.code
      )
    );
    return;
  }

  // Handle Prisma errors
  if (err.name === 'PrismaClientKnownRequestError') {
    const prismaError = err as unknown as { code: string };

    if (prismaError.code === 'P2002') {
      res.status(409).json(
        createErrorResponse('A resource with this identifier already exists', 'DUPLICATE_ENTRY')
      );
      return;
    }

    if (prismaError.code === 'P2025') {
      res.status(404).json(
        createErrorResponse('Resource not found', 'NOT_FOUND')
      );
      return;
    }
  }

  // Handle unknown errors
  res.status(500).json(
    createErrorResponse(
      isProduction ? 'Internal Server Error' : err.message,
      'INTERNAL_ERROR'
    )
  );
};

/**
 * Not found handler for undefined routes
 */
export const notFoundHandler = (req: Request, res: Response): void => {
  res.status(404).json(
    createErrorResponse(`Route ${req.method} ${req.path} not found`, 'ROUTE_NOT_FOUND')
  );
};
