import { z } from 'zod';

export const getExclusiveContentSchema = z.object({});

export const createContentSchema = z.object({
  body: z.object({
    title: z.string().min(1, 'Title is required'),
    description: z.string().optional(),
    content: z.string().min(1, 'Content is required'),
    contentType: z.enum(['text', 'url', 'html']).default('text'),
    isPremium: z.boolean().default(true),
    tags: z.array(z.string()).optional(),
  }),
});

export const updateContentSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid content ID') }),
  body: z.object({
    title: z.string().min(1, 'Title is required').optional(),
    description: z.string().optional(),
    content: z.string().min(1, 'Content is required').optional(),
    contentType: z.enum(['text', 'url', 'html']).optional(),
    isPremium: z.boolean().optional(),
    tags: z.array(z.string()).optional(),
  }),
});

export const deleteContentSchema = z.object({
  params: z.object({ id: z.string().uuid('Invalid content ID') }),
});
