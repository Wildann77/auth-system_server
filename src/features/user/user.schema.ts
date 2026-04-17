/**
 * User Schema
 * Zod validation schemas for User feature
 */

import { z } from 'zod';

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

// Type exports
export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];