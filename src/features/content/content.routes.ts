import { Router } from 'express';
import { contentController } from './content.controller';
import { authMiddleware } from '@/shared/middleware/auth-middleware';
import { requirePremium } from '@/shared/middleware/premium-middleware';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { validateRequest } from '@/shared/middleware/validate-request';
import { getExclusiveContentSchema } from './content.schema';

export const contentRouter = Router();

// Premium-only endpoint
contentRouter.get(
  '/exclusive',
  authMiddleware,
  requirePremium,
  validateRequest(getExclusiveContentSchema),
  asyncHandler(contentController.getExclusiveContent)
);