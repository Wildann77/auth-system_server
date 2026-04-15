/**
 * User Schema
 * Zod validation schemas for User feature
 */

import { z } from 'zod';

/**
 * Create user schema
 */
export const createUserSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email format'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .optional(),
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
 * Update user schema
 */
export const updateUserSchema = z.object({
  body: z.object({
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
 * User ID schema
 */
export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Update user with ID schema
 */
export const updateUserWithIdSchema = userIdSchema.merge(updateUserSchema);

/**
 * Query schema for user listing
 */
export const querySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    isEmailVerified: z.string().optional(),
    provider: z.enum(['LOCAL', 'GOOGLE']).optional(),
  }),
});

// Type exports
export type CreateUserInput = z.infer<typeof createUserSchema>['body'];
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
export type UserIdParams = z.infer<typeof userIdSchema>['params'];
export type QueryParams = z.infer<typeof querySchema>['query'];