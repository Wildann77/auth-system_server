/**
 * Express Extended Types
 * Custom types for Express Request and Response
 */

import { Request } from 'express';
import { Role } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
      requestId: string;
    }

    interface Response {
      apiSuccess?: <T>(data: T, message?: string) => void;
      apiError?: (message: string, code?: string) => void;
    }
  }
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  role: Role;
  tokenVersion: number;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: Role;
  tokenVersion: number;
}
