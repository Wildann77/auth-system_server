import { Router } from 'express';
import { adminController } from './admin.controller';
import { adminUsersQuerySchema, updateUserRoleSchema, userIdSchema } from './admin.schema';
import { validateRequest } from '@/shared/middleware/validate-request';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { authMiddleware } from '@/shared/middleware/auth-middleware';
import { requireRole } from '@/shared/middleware/role-middleware';

export const adminRouter = Router();

adminRouter.use(authMiddleware);
adminRouter.use(requireRole('ADMIN'));

adminRouter.get(
  '/users',
  validateRequest(adminUsersQuerySchema),
  asyncHandler(adminController.getUsers)
);

adminRouter.get('/stats', asyncHandler(adminController.getStats));

adminRouter.patch(
  '/users/:id/role',
  validateRequest(updateUserRoleSchema),
  asyncHandler(adminController.updateUserRole)
);

adminRouter.delete(
  '/users/:id',
  validateRequest(userIdSchema),
  asyncHandler(adminController.deleteUser)
);