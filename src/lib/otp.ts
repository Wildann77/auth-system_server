/**
 * OTP Library
 * Handles Two-Factor Authentication using TOTP
 */

import { authenticator } from 'otplib';
import QRCode from 'qrcode';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

// Configure authenticator
authenticator.options = {
  step: 30, // 30-second window
  window: 1, // Allow 1 step before/after for clock drift
};

/**
 * Generate a new 2FA secret for a user
 */
export const generateSecret = (): string => {
  return authenticator.generateSecret();
};

/**
 * Generate QR Code URL for authenticator apps
 */
export const generateOtpAuthUrl = (secret: string, email: string): string => {
  return authenticator.keyuri(email, env.TWO_FACTOR_APP_NAME, secret);
};

/**
 * Generate QR Code as data URL (base64)
 */
export const generateQRCodeDataUrl = async (otpauthUrl: string): Promise<string> => {
  try {
    const dataUrl = await QRCode.toDataURL(otpauthUrl, {
      width: 256,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });
    return dataUrl;
  } catch (error) {
    logger.error('Failed to generate QR code', { error: (error as Error).message });
    throw new Error('Failed to generate QR code');
  }
};

/**
 * Verify OTP token
 */
export const verifyToken = (token: string, secret: string): boolean => {
  try {
    return authenticator.verify({ token, secret });
  } catch {
    return false;
  }
};

/**
 * Generate backup codes (one-time recovery codes)
 */
export const generateBackupCodes = (count = 8): string[] => {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    // Generate 10-character alphanumeric code
    const code = Math.random().toString(36).substring(2, 6).toUpperCase() +
      '-' +
      Math.random().toString(36).substring(2, 6).toUpperCase();
    codes.push(code);
  }
  return codes;
};
