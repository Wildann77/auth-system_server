/**
 * Auth Service
 * Business logic for Authentication
 */

import { prisma } from '@/config/db';
import { authRepository } from './auth.repository';
import { userRepository } from '@/features/user/user.repository';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  verifyVerificationToken,
} from '@/lib/jwt';
import { hashPassword, verifyPassword } from '@/lib/password';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/mail';
import { verifyToken, generateSecret, generateOtpAuthUrl, generateQRCodeDataUrl, generateBackupCodes } from '@/lib/otp';
import { env } from '@/config/env';
import { isExpired } from '@/shared/utils/date';
import { generateToken } from '@/shared/utils/token';
import { AppError, UnauthorizedError, BadRequestError, NotFoundError, ConflictError } from '@/shared/middleware/error-handler';
import { AuthResponse, TokenResponse } from './auth.types';

export class AuthService {
  /**
   * Register new user
   */
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const user = await userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      provider: 'LOCAL',
    });

    // Generate email verification JWT
    const verificationToken = generateVerificationToken(user.id, user.email);

    // Send verification email
    await sendVerificationEmail(email, verificationToken, env.FRONTEND_URL);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }

  /**
   * Login user
   */
  async login(email: string, password: string, otp?: string): Promise<AuthResponse> {
    // Find user
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Use generic error message for security
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check if user uses OAuth provider
    if (user.provider !== 'LOCAL') {
      throw new UnauthorizedError('Please use OAuth login for this account');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    // Check email verification
    if (!user.isEmailVerified) {
      throw new BadRequestError('Please verify your email first');
    }

    // Check 2FA if enabled
    if (user.twoFactorEnabled) {
      if (!otp) {
        throw new BadRequestError('2FA code required');
      }

      const isValidOTP = verifyToken(otp, user.twoFactorSecret || '');
      if (!isValidOTP) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    // Update last login
    await userRepository.updateLastLogin(user.id);

    // Generate tokens
    const tokens = await this.generateTokens(user.id, user.email, user.role as string);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role as string,
      },
      tokens,
    };
  }

  /**
   * Verify email with token
   */
  async verifyEmail(token: string): Promise<void> {
    let payload;
    try {
      payload = verifyVerificationToken(token);
    } catch (error) {
      throw new BadRequestError('Invalid or expired verification token');
    }

    const { userId } = payload;

    // Verify email in database
    await userRepository.verifyEmail(userId);
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email already verified');
    }

    const token = generateVerificationToken(user.id, user.email);
    await sendVerificationEmail(email, token, env.FRONTEND_URL);
  }

  /**
   * Forgot password - send reset email
   */
  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      // Don't reveal if user exists
      return;
    }

    // Only allow for local accounts
    if (user.provider !== 'LOCAL') {
      throw new BadRequestError('Password reset not available for OAuth accounts');
    }

    const token = await authRepository.createPasswordResetToken(user.id);
    await sendPasswordResetEmail(email, token, env.FRONTEND_URL);
  }

  /**
   * Reset password with token
   */
  async resetPassword(token: string, password: string): Promise<void> {
    const tokenRecord = await authRepository.findPasswordResetToken(token);

    if (!tokenRecord) {
      throw new BadRequestError('Invalid reset token');
    }

    if (isExpired(tokenRecord.expiresAt)) {
      throw new BadRequestError('Reset token has expired');
    }

    if (!tokenRecord.user) {
      throw new NotFoundError('User not found');
    }

    // Hash new password
    const passwordHash = await hashPassword(password);

    // Update password and increment token version
    await userRepository.updatePassword(tokenRecord.user.id, passwordHash);

    // Delete used token and all refresh tokens
    await authRepository.deletePasswordResetToken(token);
    await authRepository.revokeAllUserRefreshTokens(tokenRecord.user.id);
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // Verify refresh token
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // Check token version (Centralized session invalidation)
    const user = await userRepository.findByIdWithTokenVersion(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has been invalidated');
    }

    // Generate new tokens
    return this.generateTokens(user.id, user.email, (user.role as any).name || user.role);
  }

  /**
   * Logout - revoke tokens
   */
  async logout(refreshToken: string, allDevices = false): Promise<void> {
    const payload = verifyRefreshToken(refreshToken);
    
    if (allDevices) {
      // Invalidate all tokens by incrementing version
      await userRepository.incrementTokenVersion(payload.userId);
    }
    // Single device logout will be handled by clearing cookie in controller
  }

  /**
   * Enable 2FA
   */
  async enable2FA(userId: string, password: string): Promise<{ qrCode: string; backupCodes: string[] }> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Generate secret
    const secret = generateSecret();
    const otpAuthUrl = generateOtpAuthUrl(secret, user.email);
    const qrCode = await generateQRCodeDataUrl(otpAuthUrl);
    const backupCodes = generateBackupCodes();

    // Save secret to user (temporary, will be confirmed on first verification)
    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { qrCode, backupCodes };
  }

  /**
   * Verify and confirm 2FA setup
   */
  async confirm2FA(userId: string, code: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user || !user.twoFactorSecret) {
      throw new NotFoundError('User or 2FA not found');
    }

    const isValid = verifyToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA code');
    }

    // Enable 2FA
    await userRepository.enableTwoFactor(userId, user.twoFactorSecret);
  }

  /**
   * Disable 2FA
   */
  async disable2FA(userId: string, password: string, code: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    // Verify 2FA code
    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const isValidOTP = verifyToken(code, user.twoFactorSecret);
      if (!isValidOTP) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    // Disable 2FA
    await userRepository.disableTwoFactor(userId);
  }

  /**
   * Generate access and refresh tokens (Stateless)
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string
  ): Promise<TokenResponse> {
    const user = await userRepository.findByIdWithTokenVersion(userId);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: (user.role as any).name || user.role,
      tokenVersion: user.tokenVersion,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900, // 15 minutes in seconds
    };
  }

  /**
   * Change password (authenticated)
   */
  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Verify current password
    const isValidPassword = await verifyPassword(currentPassword, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    // Hash new password
    const passwordHash = await hashPassword(newPassword);

    // Update password and increment token version
    await userRepository.updatePassword(userId, passwordHash);

    // Revoke all refresh tokens
    await authRepository.revokeAllUserRefreshTokens(userId);
  }

  /**
   * Get current user info
   */
  async getCurrentUser(userId: string): Promise<{
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    isEmailVerified: boolean;
    twoFactorEnabled: boolean;
  }> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
    };
  }
}

export const authService = new AuthService();
