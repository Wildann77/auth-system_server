import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, AccessTokenPayload } from '@/lib/jwt';
import { UnauthorizedError } from './error-handler';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        email: string;
        role: string;
        tokenVersion: number;
      };
    }
  }
}

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      email: payload.email,
      role: payload.role,
      tokenVersion: payload.tokenVersion,
    };

    next();
  } catch {
    throw new UnauthorizedError('Invalid or expired access token');
  }
};