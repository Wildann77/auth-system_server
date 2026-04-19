/**
 * Auth Service
 * Business logic for Authentication
 */

import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';
import { authRepository } from './auth.repository';
import { userRepository } from '@/features/user/user.repository';
import { OAuth2Client } from 'google-auth-library';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  generateVerificationToken,
  verifyVerificationToken,
  generateStateToken,
  verifyStateToken,
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
  private googleClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );
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
    return prisma.$transaction(async (tx) => {
      const tokenRecord = await authRepository.findPasswordResetToken(token, tx);

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
      await userRepository.updatePassword(tokenRecord.user.id, passwordHash, tx);

      // Delete used token and all refresh tokens
      await authRepository.deletePasswordResetToken(token, tx);
      await authRepository.revokeAllUserRefreshTokens(tokenRecord.user.id, tx);
    });
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    // 1. Verify JWT signature
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    // 2. Check if token exists in Database and is not revoked
    const tokenRecord = await authRepository.findRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.isRevoked || isExpired(tokenRecord.expiresAt)) {
      if (tokenRecord?.isRevoked) {
        // Security: if revoked token is used, compromise detected, logout all sessions
        await prisma.$transaction(async (tx) => {
          await authRepository.revokeAllUserRefreshTokens(payload.userId, tx);
          await userRepository.incrementTokenVersion(payload.userId, tx);
        });
      }
      throw new UnauthorizedError('Session expired or invalidated');
    }

    // 3. Check token version (Centralized session invalidation)
    const user = await userRepository.findByIdWithTokenVersion(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has been globally invalidated');
    }

    // 4. Hapus token lama dan generate token baru atomically (Rotation strategy)
    return prisma.$transaction(async (tx) => {
      await authRepository.deleteRefreshToken(refreshToken, tx);
      const userWithRole = await userRepository.findByIdWithTokenVersion(user.id, tx);
      const tokens = await this.generateTokens(user.id, user.email, (userWithRole?.role as any).name || userWithRole?.role, tx);
      return tokens;
    });
  }

  /**
   * Logout - revoke tokens
   */
  async logout(refreshToken: string, allDevices = false): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);
      
      if (allDevices) {
        await prisma.$transaction(async (tx) => {
          await authRepository.revokeAllUserRefreshTokens(payload.userId, tx);
          await userRepository.incrementTokenVersion(payload.userId, tx);
        });
      } else {
        // Logout only this specific session
        await authRepository.deleteRefreshToken(refreshToken);
      }
    } catch (error) {
       // Ignore error if token is already invalid
    }
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
   * Generate access and refresh tokens (Database-backed)
   */
  private async generateTokens(
    userId: string,
    email: string,
    role: string,
    tx?: Prisma.TransactionClient
  ): Promise<TokenResponse> {
    const user = await userRepository.findByIdWithTokenVersion(userId, tx);
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const payload = {
      userId: user.id,
      email: user.email,
      role: (user.role as any).name || user.role,
      tokenVersion: user.tokenVersion,
      isPremium: user.isPremium,
    };

    const accessToken = generateAccessToken(payload);
    const refreshToken = generateRefreshToken(payload);

    // BIND TO DATABASE
    await authRepository.createRefreshToken(userId, refreshToken, undefined, undefined, tx);

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
    return prisma.$transaction(async (tx) => {
      const user = await userRepository.findById(userId, tx);

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
      await userRepository.updatePassword(userId, passwordHash, tx);

      // Revoke all refresh tokens
      await authRepository.revokeAllUserRefreshTokens(userId, tx);
    });
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

  /**
   * Get Google OAuth authorization URL
   */
  getGoogleAuthUrl(): string {
    const state = generateStateToken(); // Generate JWT state token for CSRF protection
    const authorizeUrl = this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      state,
    });
    return authorizeUrl;
  }

  /**
   * Process Google OAuth callback
   */
  async processGoogleCallback(code: string, state: string): Promise<AuthResponse> {
    // Verify state parameter for CSRF protection
    if (!verifyStateToken(state)) {
      throw new BadRequestError('Invalid state parameter');
    }

    try {
      // Exchange authorization code for tokens
      const { tokens: googleTokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(googleTokens);

      // Get user info from Google
      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleTokens.id_token!,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new BadRequestError('Invalid Google token');
      }

      const { email, given_name: firstName, family_name: lastName, picture } = payload;

      // Find or create user
      let user = await userRepository.findByEmail(email);

      if (!user) {
        // Auto-register new Google user
        user = await userRepository.create({
          email: email.toLowerCase(),
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          provider: 'GOOGLE',
        });
      } else {
        // Update existing user to ensure email is verified for Google accounts
        if (!user.isEmailVerified) {
          await userRepository.verifyEmail(user.id);
        }
      }

      // Check if user is trying to use Google OAuth on a local account
      if (user.provider !== 'GOOGLE') {
        throw new BadRequestError('This email is already registered with a different provider');
      }

      // Generate tokens
      const tokens = await this.generateTokens(user.id, user.email, user.role);

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role,
        },
        tokens,
      };
    } catch (error) {
      throw new BadRequestError('Failed to process Google OAuth callback');
    }
  }
}

export const authService = new AuthService();
