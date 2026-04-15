import { Router } from 'express';
import { userController } from './user.controller';
import {
  createUserSchema,
  updateUserWithIdSchema,
  userIdSchema,
  querySchema,
} from './user.schema';
import { validateRequest } from '@/shared/middleware/validate-request';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { authMiddleware } from '@/shared/middleware/auth-middleware';

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get(
  '/',
  validateRequest(querySchema),
  asyncHandler(userController.getUsers)
);

userRouter.get(
  '/:id',
  validateRequest(userIdSchema),
  asyncHandler(userController.getUserById)
);

userRouter.post(
  '/',
  validateRequest(createUserSchema),
  asyncHandler(userController.createUser)
);

userRouter.patch(
  '/:id',
  validateRequest(updateUserWithIdSchema),
  asyncHandler(userController.updateUser)
);

userRouter.delete(
  '/:id',
  validateRequest(userIdSchema),
  asyncHandler(userController.deleteUser)
);
