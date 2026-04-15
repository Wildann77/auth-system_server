/**
 * Token Utility
 * Generate secure random tokens
 */

import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';

/**
 * Generate UUID v4
 */
export const generateUUID = (): string => {
  return uuidv4();
};

/**
 * Generate random token for email verification / password reset
 */
export const generateToken = (length = 32): string => {
  return crypto.randomBytes(length).toString('hex');
};

/**
 * Generate numeric OTP
 */
export const generateNumericToken = (length = 6): string => {
  const digits = '0123456789';
  let result = '';
  const bytes = crypto.randomBytes(length);
  for (let i = 0; i < length; i++) {
    result += digits[bytes[i] % 10];
  }
  return result;
};
