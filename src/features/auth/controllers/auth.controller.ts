import { Request, Response } from 'express';
import { coreAuthService } from '@/features/auth/services/core-auth.service';
import { accountService } from '@/features/auth/services/account.service';
import { twoFactorService } from '@/features/auth/services/two-factor.service';
import { oauthService } from '@/features/auth/services/oauth.service';
import { env } from '@/config/env';
import {
  RegisterInput,
  LoginInput,
  VerifyEmailInput,
  ForgotPasswordInput,
  ResetPasswordInput,
  RefreshTokenInput,
  LogoutInput,
  Enable2FAInput,
  Verify2FAInput,
  ChangePasswordInput,
  Disable2FAInput,
  GoogleCallbackInput,
} from '@/features/auth/schemas/auth.schema';

export class AuthController {
  async register(req: Request<{}, {}, RegisterInput>, res: Response): Promise<void> {
    const { email, password, firstName, lastName } = req.body;
    const result = await coreAuthService.register(email, password, firstName, lastName);
    res.status(201).apiSuccess(result, 'User registered successfully');
  }

  async login(req: Request<{}, {}, LoginInput>, res: Response): Promise<void> {
    const { email, password, otp } = req.body;
    const result = await coreAuthService.login(email, password, otp);

    if (result.tokens) {
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.apiSuccess({ user: result.user, accessToken: result.tokens?.accessToken }, 'Login successful');
  }

  async verifyEmail(req: Request<{}, {}, VerifyEmailInput>, res: Response): Promise<void> {
    const { token } = req.body;
    await accountService.verifyEmail(token);
    res.apiSuccess(null, 'Email verified successfully');
  }

  async resendVerification(req: Request<{}, {}, ForgotPasswordInput>, res: Response): Promise<void> {
    const { email } = req.body;
    await accountService.resendVerificationEmail(email);
    res.apiSuccess(null, 'Verification email sent if account exists');
  }

  async forgotPassword(req: Request<{}, {}, ForgotPasswordInput>, res: Response): Promise<void> {
    const { email } = req.body;
    await accountService.forgotPassword(email);
    res.apiSuccess(null, 'Password reset email sent if account exists');
  }

  async resetPassword(req: Request<{}, {}, ResetPasswordInput>, res: Response): Promise<void> {
    const { token, password } = req.body;
    const tokens = await accountService.resetPassword(token, password);
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.apiSuccess({ tokens }, 'Password reset successfully');
  }

  async refreshToken(req: Request<{}, {}, RefreshTokenInput>, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await coreAuthService.refreshAccessToken(refreshToken || '');

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.apiSuccess({ accessToken: result.accessToken }, 'Token refreshed successfully');
  }

  async logout(req: Request<{}, {}, LogoutInput>, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const allDevices = req.body?.allDevices;

    await coreAuthService.logout(refreshToken || '', allDevices);

    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.apiSuccess(null, 'Logged out successfully');
  }

  async enable2FA(req: Request<{}, {}, Enable2FAInput>, res: Response): Promise<void> {
    const { password } = req.body;
    const result = await twoFactorService.enable2FA(req.user!.id, password);
    res.apiSuccess(result, '2FA setup initiated');
  }

  async confirm2FA(req: Request<{}, {}, Verify2FAInput>, res: Response): Promise<void> {
    const { code } = req.body;
    await twoFactorService.confirm2FA(req.user!.id, code);
    res.apiSuccess(null, '2FA enabled successfully');
  }

  async disable2FA(req: Request<{}, {}, Disable2FAInput>, res: Response): Promise<void> {
    const { code, password } = req.body;
    await twoFactorService.disable2FA(req.user!.id, password, code);
    res.apiSuccess(null, '2FA disabled successfully');
  }

  async changePassword(req: Request<{}, {}, ChangePasswordInput>, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    const tokens = await accountService.changePassword(req.user!.id, currentPassword, newPassword);
    
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.apiSuccess({ tokens }, 'Password changed successfully');
  }

  async getMe(req: Request, res: Response): Promise<void> {
    const user = await coreAuthService.getCurrentUser(req.user!.id);
    res.apiSuccess(user, 'User profile retrieved');
  }

  async googleStart(req: Request, res: Response): Promise<void> {
    const authUrl = oauthService.getGoogleAuthUrl();
    res.redirect(authUrl);
  }

  async googleCallback(req: Request<{}, {}, {}, GoogleCallbackInput>, res: Response): Promise<void> {
    const { code, state } = req.query;
    const result = await oauthService.processGoogleCallback(code, state);

    if (result.tokens) {
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
    }

    res.redirect(`${env.FRONTEND_URL}/auth-success?token=${result.tokens?.accessToken}`);
  }
}

export const authController = new AuthController();
