import { z } from 'zod';

export const userIdSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid user ID format') }),
});

export const adminUsersQuerySchema = z.object({
  query: z.object({
    page: z.string().optional(),
    limit: z.string().optional(),
    role: z.enum(['USER', 'ADMIN']).optional(),
    isEmailVerified: z.string().optional(),
    provider: z.enum(['LOCAL', 'GOOGLE']).optional(),
    search: z.string().optional(),
  }),
});

export const updateUserRoleSchema = z.object({
  params: userIdSchema.shape.params,
  body: z.object({
    role: z.enum(['USER', 'ADMIN'], { required_error: 'Role is required' }),
  }),
});

export type AdminUsersQueryParams = z.infer<typeof adminUsersQuerySchema>['query'];
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type UserIdParams = z.infer<typeof userIdSchema>['params'];
