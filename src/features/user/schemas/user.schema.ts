import { z } from 'zod';

export const updateUserSchema = z.object({
  body: z.object({
    firstName: z.string().max(100, 'First name must be at most 100 characters').optional(),
    lastName: z.string().max(100, 'Last name must be at most 100 characters').optional(),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>['body'];
