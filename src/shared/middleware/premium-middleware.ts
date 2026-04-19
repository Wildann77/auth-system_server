import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from './error-handler';

/**
 * Middleware to require premium status
 * @returns Express middleware function
 */
export const requirePremium = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    throw new ForbiddenError('Authentication required');
  }

  if (!req.user.isPremium) {
    throw new ForbiddenError('Premium subscription required');
  }

  next();
};