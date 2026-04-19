import { Router } from 'express';
import { ContentController } from './content.controller';
import { ContentService } from './content.service';
import { ContentRepository } from './content.repository';
import { authMiddleware } from '@/shared/middleware/auth-middleware';
import { requirePremium } from '@/shared/middleware/premium-middleware';

const router = Router();
const repository = new ContentRepository();
const service = new ContentService(repository);
const controller = new ContentController(service);

// Premium-only endpoint
router.get(
  '/exclusive',
  authMiddleware,
  requirePremium,
  controller.getExclusiveContent
);

export default router;