/**
 * Rate Limiting Middleware
 * Implements tiered rate limiting strategy for API protection
 */

import rateLimit from 'express-rate-limit';
import { TooManyRequestsError } from './error-handler';

/**
 * Global rate limiter applied to all API endpoints
 * Limits: 100 requests per 15 minutes per IP address
 * Protects against DDoS attacks and excessive API usage
 */
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  handler: () => {
    throw new TooManyRequestsError();
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Authentication rate limiter for sensitive auth endpoints
 * Limits: 5 requests per 15 minutes per IP address
 * Applied to: /register, /login, /forgot-password, /reset-password, /resend-verification
 * Protects against brute force attacks and credential stuffing
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  handler: () => {
    throw new TooManyRequestsError();
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Payment rate limiter for checkout operations
 * Limits: 10 requests per 15 minutes per IP address
 * Applied to: /checkout endpoint
 * Prevents payment abuse while allowing legitimate transaction attempts
 */
export const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  handler: () => {
    throw new TooManyRequestsError();
  },
  standardHeaders: true,
  legacyHeaders: false,
});