/**
 * Password Utility Library
 * Handles password hashing and validation
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

/**
 * Hash a password
 */
export const hashPassword = async (password: string): Promise<string> => {
  return bcrypt.hash(password, SALT_ROUNDS);
};

/**
 * Verify password against hash
 */
export const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

/**
 * Validate password strength
 */
export const validatePasswordStrength = (password: string): { valid: boolean; message?: string } => {
  const minLength = 8;
  const maxLength = 128;

  if (password.length < minLength) {
    return { valid: false, message: `Password must be at least ${minLength} characters long` };
  }

  if (password.length > maxLength) {
    return { valid: false, message: `Password must not exceed ${maxLength} characters` };
  }

  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

  if (!hasUpperCase) {
    return { valid: false, message: 'Password must contain at least one uppercase letter' };
  }

  if (!hasLowerCase) {
    return { valid: false, message: 'Password must contain at least one lowercase letter' };
  }

  if (!hasNumber) {
    return { valid: false, message: 'Password must contain at least one number' };
  }

  if (!hasSpecialChar) {
    return { valid: false, message: 'Password must contain at least one special character' };
  }

  return { valid: true };
};
