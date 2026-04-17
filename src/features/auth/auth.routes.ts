import { Router } from 'express';
import { authController } from './auth.controller';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  enable2FASchema,
  verify2FASchema,
  refreshTokenSchema,
  logoutSchema,
  changePasswordSchema,
  disable2FASchema,
  googleCallbackSchema,
} from './auth.schema';
import { validateRequest } from '@/shared/middleware/validate-request';
import { asyncHandler } from '@/shared/middleware/async-handler';
import { authMiddleware } from '@/shared/middleware/auth-middleware';

export const authRouter = Router();

// Public routes
authRouter.post(
  '/register',
  validateRequest(registerSchema),
  asyncHandler(authController.register)
);

authRouter.post(
  '/login',
  validateRequest(loginSchema),
  asyncHandler(authController.login)
);

authRouter.post(
  '/verify-email',
  validateRequest(verifyEmailSchema),
  asyncHandler(authController.verifyEmail)
);

authRouter.post(
  '/resend-verification',
  validateRequest(forgotPasswordSchema),
  asyncHandler(authController.resendVerification)
);

authRouter.post(
  '/forgot-password',
  validateRequest(forgotPasswordSchema),
  asyncHandler(authController.forgotPassword)
);

authRouter.post(
  '/reset-password',
  validateRequest(resetPasswordSchema),
  asyncHandler(authController.resetPassword)
);

authRouter.post(
  '/refresh-token',
  validateRequest(refreshTokenSchema),
  asyncHandler(authController.refreshToken)
);

// Google OAuth routes
authRouter.get(
  '/google',
  asyncHandler(authController.googleStart)
);

authRouter.get(
  '/google/callback',
  validateRequest(googleCallbackSchema),
  asyncHandler(authController.googleCallback)
);

// Protected routes
authRouter.get(
  '/me',
  authMiddleware,
  asyncHandler(authController.getMe)
);

authRouter.post(
  '/logout',
  authMiddleware,
  validateRequest(logoutSchema),
  asyncHandler(authController.logout)
);

authRouter.post(
  '/change-password',
  authMiddleware,
  validateRequest(changePasswordSchema),
  asyncHandler(authController.changePassword)
);

// 2FA routes
authRouter.post(
  '/2fa/enable',
  authMiddleware,
  validateRequest(enable2FASchema),
  asyncHandler(authController.enable2FA)
);

authRouter.post(
  '/2fa/verify',
  authMiddleware,
  validateRequest(verify2FASchema),
  asyncHandler(authController.confirm2FA)
);

authRouter.post(
  '/2fa/disable',
  authMiddleware,
  validateRequest(disable2FASchema),
  asyncHandler(authController.disable2FA)
);
