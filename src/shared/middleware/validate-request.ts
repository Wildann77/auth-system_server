/**
 * Validation Middleware
 * Validates request body, query, and params using Zod schemas
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';
import { createErrorResponse } from '@/shared/types/api-response';

export const validateRequest = (schema: any) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (schema.shape?.body) {
        (req as any).body = schema.shape.body.parse(req.body);
      } else if (!schema.shape?.query && !schema.shape?.params && schema.parse) {
        (req as any).body = schema.parse(req.body);
      }
      
      if (schema.shape?.query) {
        (req as any).query = schema.shape.query.parse(req.query);
      }
      
      if (schema.shape?.params) {
        (req as any).params = schema.shape.params.parse(req.params);
      }
      
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string[]> = {};

        error.errors.forEach((err) => {
          const path = err.path.join('.');
          if (!details[path]) {
            details[path] = [];
          }
          details[path].push(err.message);
        });

        res.status(400).json(
          createErrorResponse('Validation failed', 'VALIDATION_ERROR', details)
        );
        return;
      }
      next(error);
    }
  };
};

export const commonSchemas = {
  email: z.string().email('Invalid email format'),
  uuid: z.string().uuid('Invalid ID format'),
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
  }),
};