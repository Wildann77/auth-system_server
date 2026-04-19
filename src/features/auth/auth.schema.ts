/**
 * Auth Schema
 * Zod validation schemas for Auth feature
 */

import { z } from 'zod';

// Email validation regex
const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

/**
 * Register schema
 */
export const registerSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .max(255, 'Email must be at most 255 characters')
      .regex(emailRegex, 'Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
    firstName: z
      .string()
      .max(100, 'First name must be at most 100 characters')
      .optional(),
    lastName: z
      .string()
      .max(100, 'Last name must be at most 100 characters')
      .optional(),
  }),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .regex(emailRegex, 'Invalid email format'),
    password: z
      .string()
      .min(1, 'Password is required'),
    otp: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .optional(),
  }),
});

/**
 * Forgot password schema
 */
export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z
      .string()
      .min(1, 'Email is required')
      .regex(emailRegex, 'Invalid email format'),
  }),
});

/**
 * Reset password schema
 */
export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  }),
});

/**
 * Verify email schema
 */
export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Token is required'),
  }),
});

/**
 * Enable 2FA schema
 */
export const enable2FASchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Verify 2FA schema
 */
export const verify2FASchema = z.object({
  body: z.object({
    code: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d+$/, 'OTP must contain only numbers'),
  }),
});

/**
 * Refresh token schema
 */
export const refreshTokenSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
  }).optional(),
});

/**
 * Logout schema
 */
export const logoutSchema = z.object({
  body: z.object({
    refreshToken: z.string().optional(),
    allDevices: z.boolean().optional().default(false),
  }).optional(),
});

/**
 * Change password schema
 */
export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number')
      .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character'),
  }),
});

/**
 * Disable 2FA schema
 */
export const disable2FASchema = z.object({
  body: z.object({
    code: z
      .string()
      .length(6, 'OTP must be 6 digits')
      .regex(/^\d+$/, 'OTP must contain only numbers'),
    password: z.string().min(1, 'Password is required'),
  }),
});

/**
 * Google OAuth callback schema
 */
export const googleCallbackSchema = z.object({
  query: z.object({
    code: z.string().min(1, 'Authorization code is required'),
    state: z.string().min(1, 'State parameter is required'),
  }),
});

// Type exports
export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type Enable2FAInput = z.infer<typeof enable2FASchema>['body'];
export type Verify2FAInput = z.infer<typeof verify2FASchema>['body'];
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>['body'];
export type LogoutInput = z.infer<typeof logoutSchema>['body'];
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>['body'];
export type Disable2FAInput = z.infer<typeof disable2FASchema>['body'];
export type GoogleCallbackInput = z.infer<typeof googleCallbackSchema>['query'];
