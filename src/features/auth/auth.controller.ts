import { Request, Response } from 'express';
import { authService } from './auth.service';
import { RegisterInput, LoginInput, VerifyEmailInput, ForgotPasswordInput, ResetPasswordInput, RefreshTokenInput, LogoutInput, Enable2FAInput, Verify2FAInput, ChangePasswordInput, Disable2FAInput } from './auth.schema';

export class AuthController {
  /**
   * Register new user
   */
  async register(req: Request<{}, {}, RegisterInput>, res: Response): Promise<void> {
    const { email, password, firstName, lastName } = req.body;
    const result = await authService.register(email, password, firstName, lastName);
    res.status(201).json(result);
  }

  /**
   * Login user
   */
  async login(req: Request<{}, {}, LoginInput>, res: Response): Promise<void> {
    const { email, password, otp } = req.body;
    const result = await authService.login(email, password, otp);
    
    if (result.tokens) {
      // 1. Set Refresh Token in Cookie (Secure & Invisible to JS)
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    // KIRIM Access Token di JSON Body (Agar bisa dibaca Frontend State)
    // Refresh Token TIDAK dikirim di sini karena sudah ada di Cookie
    res.json({
      user: result.user,
      accessToken: result.tokens?.accessToken,
    });
  }

  /**
   * Verify email
   */
  async verifyEmail(req: Request<{}, {}, VerifyEmailInput>, res: Response): Promise<void> {
    const { token } = req.body;
    await authService.verifyEmail(token);
    res.json({ message: 'Email verified successfully' });
  }

  /**
   * Resend verification email
   */
  async resendVerification(req: Request<{}, {}, ForgotPasswordInput>, res: Response): Promise<void> {
    const { email } = req.body;
    await authService.resendVerificationEmail(email);
    res.json({ message: 'Verification email sent if account exists' });
  }

  /**
   * Forgot password
   */
  async forgotPassword(req: Request<{}, {}, ForgotPasswordInput>, res: Response): Promise<void> {
    const { email } = req.body;
    await authService.forgotPassword(email);
    res.json({ message: 'Password reset email sent if account exists' });
  }

  /**
   * Reset password
   */
  async resetPassword(req: Request<{}, {}, ResetPasswordInput>, res: Response): Promise<void> {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);
    res.json({ message: 'Password reset successfully' });
  }

  /**
   * Refresh token
   */
  async refreshToken(req: Request<{}, {}, RefreshTokenInput>, res: Response): Promise<void> {
    // Ambil Refresh Token dari Cookie
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const result = await authService.refreshAccessToken(refreshToken || '');
    
    // Update Refresh Token baru di Cookie (Rotation strategy)
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Kirim Access Token BARU di JSON Body
    res.json({ 
      accessToken: result.accessToken 
    });
  }

  /**
   * Logout
   */
  async logout(req: Request<{}, {}, LogoutInput>, res: Response): Promise<void> {
    const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;
    const allDevices = req.body?.allDevices;
    
    await authService.logout(refreshToken || '', allDevices);
    
    // Clear both cookies
    const cookieOptions = {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
    };

    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    res.json({ message: 'Logged out successfully' });
  }

  /**
   * Enable 2FA
   */
  async enable2FA(req: Request<{}, {}, Enable2FAInput>, res: Response): Promise<void> {
    const { password } = req.body;
    const result = await authService.enable2FA(req.user!.id, password);
    res.json(result);
  }

  /**
   * Confirm 2FA
   */
  async confirm2FA(req: Request<{}, {}, Verify2FAInput>, res: Response): Promise<void> {
    const { code } = req.body;
    await authService.confirm2FA(req.user!.id, code);
    res.json({ message: '2FA enabled successfully' });
  }

  /**
   * Disable 2FA
   */
  async disable2FA(req: Request<{}, {}, Disable2FAInput>, res: Response): Promise<void> {
    const { code, password } = req.body;
    await authService.disable2FA(req.user!.id, password, code);
    res.json({ message: '2FA disabled successfully' });
  }

  /**
   * Change password
   */
  async changePassword(req: Request<{}, {}, ChangePasswordInput>, res: Response): Promise<void> {
    const { currentPassword, newPassword } = req.body;
    await authService.changePassword(req.user!.id, currentPassword, newPassword);
    res.json({ message: 'Password changed successfully' });
  }

  /**
   * Get me
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const user = await authService.getCurrentUser(req.user!.id);
    res.json(user);
  }

  /**
   * Start Google OAuth flow
   */
  async googleStart(req: Request, res: Response): Promise<void> {
    const authUrl = authService.getGoogleAuthUrl();
    res.redirect(authUrl);
  }

  /**
   * Handle Google OAuth callback
   */
  async googleCallback(req: Request<{}, {}, {}, GoogleCallbackInput>, res: Response): Promise<void> {
    const { code, state } = req.query;
    const result = await authService.processGoogleCallback(code, state);

    if (result.tokens) {
      // Set refresh token in HTTP-only cookie
      res.cookie('refreshToken', result.tokens.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });
    }

    // Return access token in JSON response
    res.json({
      user: result.user,
      accessToken: result.tokens?.accessToken,
    });
  }
}

export const authController = new AuthController();