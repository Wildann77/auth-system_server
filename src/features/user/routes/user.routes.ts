import { Router } from 'express';
import { userController } from '@/features/user/controllers/user.controller';
import { updateUserSchema } from '@/features/user/schemas/user.schema';
import { validateRequest } from '@/shared/middleware/validate-request';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { authMiddleware } from '@/shared/middleware/auth-middleware';

export const userRouter = Router();

userRouter.use(authMiddleware);

userRouter.get('/me', asyncHandler(userController.getMe));
userRouter.patch('/me', validateRequest(updateUserSchema), asyncHandler(userController.updateMe));
