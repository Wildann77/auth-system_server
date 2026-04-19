/**
 * JWT Library
 * Handles token generation and validation
 */

import jwt, { SignOptions, JwtPayload } from 'jsonwebtoken';
import { env } from '@/config/env';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  tokenVersion: number;
  isPremium: boolean;
}

export interface AccessTokenPayload extends TokenPayload, JwtPayload {
  type: 'access';
}

export interface RefreshTokenPayload extends TokenPayload, JwtPayload {
  type: 'refresh';
  deviceInfo?: string;
}

export interface VerificationTokenPayload extends JwtPayload {
  userId: string;
  email: string;
  type: 'verification';
}

/**
 * Generate Access Token (short-lived)
 */
export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(
    { ...payload, type: 'access' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRY as SignOptions['expiresIn'] }
  );
};

/**
 * Generate Refresh Token (long-lived)
 */
export const generateRefreshToken = (payload: Omit<RefreshTokenPayload, 'type'>): string => {
  return jwt.sign(
    { ...payload, type: 'refresh' },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRY as SignOptions['expiresIn'] }
  );
};

/**
 * Verify Access Token
 */
export const verifyAccessToken = (token: string): AccessTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
};

/**
 * Verify Refresh Token
 */
export const verifyRefreshToken = (token: string): RefreshTokenPayload => {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
};

/**
 * Generate Email Verification Token
 */
export const generateVerificationToken = (userId: string, email: string): string => {
  return jwt.sign(
    { userId, email, type: 'verification' },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '24h' }
  );
};

/**
 * Verify Email Verification Token
 */
export const verifyVerificationToken = (token: string): VerificationTokenPayload => {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as VerificationTokenPayload;
};

/**
 * Decode Token (without verification)
 */
export const decodeToken = (token: string): TokenPayload | null => {
  const decoded = jwt.decode(token);
  return decoded as TokenPayload | null;
};

/**
 * Generate OAuth State Token
 */
export const generateStateToken = (): string => {
  return jwt.sign(
    { type: 'oauth_state', random: Math.random().toString(36) },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '10m' } // 10 minutes should be enough for OAuth flow
  );
};

/**
 * Verify OAuth State Token
 */
export const verifyStateToken = (token: string): boolean => {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as any;
    return payload.type === 'oauth_state';
  } catch {
    return false;
  }
};