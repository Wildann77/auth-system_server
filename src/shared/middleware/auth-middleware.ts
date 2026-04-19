import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '@/lib/jwt';
import { UnauthorizedError } from './error-handler';
import { userRepository } from '@/features/user/user.repository';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : req.cookies?.accessToken;

    if (!token) {
      throw new UnauthorizedError('Access token required');
    }

    const payload = verifyAccessToken(token);

    // BATCH CHECK: Validasi tokenVersion ke Database
    const user = await userRepository.findByIdWithTokenVersion(payload.userId);
    
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session expired or invalidated. Please login again.');
    }

    req.user = {
      id: payload.userId,
      email: payload.email,
      role: (user.role as any).name || user.role, // Handle Prisma nested role
      tokenVersion: user.tokenVersion,
      isPremium: user.isPremium,
    };

    next();
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      next(error);
    } else {
      next(new UnauthorizedError('Invalid or expired access token'));
    }
  }
};