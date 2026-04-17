import { Request, Response, NextFunction } from 'express';
import { Role } from '@prisma/client';
import { ForbiddenError, UnauthorizedError } from './error-handler';

/**
 * Role-based access control middleware
 * @param allowedRoles List of roles allowed to access this route
 * @returns Middleware function
 */
export const roleMiddleware = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Ensure user is authenticated (attached by authMiddleware)
    if (!req.user) {
      throw new UnauthorizedError('Authentication required');
    }

    // 2. Compare user role with allowed roles
    const hasRole = allowedRoles.includes(req.user.role as Role);

    if (!hasRole) {
      throw new ForbiddenError(
        `Access denied. Requires one of these roles: ${allowedRoles.join(', ')}`
      );
    }

    // 3. User has permission, proceed to next middleware
    next();
  };
};
