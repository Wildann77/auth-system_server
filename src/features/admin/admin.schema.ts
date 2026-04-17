/**
 * Admin Schema
 * Zod validation schemas for Admin feature
 */

import { z } from 'zod';

/**
 * User ID schema
 */
export const userIdSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid user ID format'),
  }),
});

/**
 * Query schema for user listing
 */
export const adminUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    isEmailVerified: z.string().optional(),
    provider: z.enum(['LOCAL', 'GOOGLE']).optional(),
  }),
});

/**
 * Update user role schema
 */
export const updateUserRoleSchema = z.object({
  params: userIdSchema.shape.params,
  body: z.object({
    role: z.enum(['USER', 'ADMIN'], { required_error: 'Role is required' }),
  }),
});

// Type exports
export type AdminUsersQueryParams = z.infer<typeof adminUsersQuerySchema>['query'];
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UserIdParams = z.infer<typeof userIdSchema>['params'];