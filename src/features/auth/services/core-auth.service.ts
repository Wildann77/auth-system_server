import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';
import { authRepository } from '@/features/auth/repositories/auth.repository';
import { userRepository } from '@/features/user/repositories/user.repository';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken, generateVerificationToken } from '@/lib/jwt';
import { hashPassword, verifyPassword } from '@/lib/password';
import { verifyToken } from '@/lib/otp';
import { sendVerificationEmail } from '@/lib/mail';
import { env } from '@/config/env';
import { isExpired } from '@/shared/utils/date';
import { UnauthorizedError, BadRequestError, NotFoundError, ConflictError } from '@/shared/middleware/error-handler';
import { AuthResponse, TokenResponse } from '@/features/auth/types/auth.types';
import { AUTH_PROVIDER } from '@/shared/constants';

export class CoreAuthService {
  async register(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
  ): Promise<AuthResponse> {
    const existingUser = await userRepository.findByEmail(email);
    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    const passwordHash = await hashPassword(password);

    const user = await userRepository.create({
      email: email.toLowerCase(),
      passwordHash,
      firstName,
      lastName,
      provider: AUTH_PROVIDER.LOCAL,
    });

    const verificationToken = generateVerificationToken(user.id, user.email);
    await sendVerificationEmail(user.email, verificationToken, env.FRONTEND_URL);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        twoFactorEnabled: user.twoFactorEnabled,
        avatarUrl: user.avatarUrl,
        isPremium: user.isPremium,
        autoRenew: user.autoRenew,
        premiumUntil: user.premiumUntil,
        lastLoginAt: user.lastLoginAt,
        tokenVersion: user.tokenVersion,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };
  }

  async login(email: string, password: string, otp?: string): Promise<AuthResponse> {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (user.provider !== AUTH_PROVIDER.LOCAL) {
      throw new UnauthorizedError('Please use OAuth login for this account');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid credentials');
    }

    if (!user.isEmailVerified) {
      throw new BadRequestError('Please verify your email first');
    }

    if (user.twoFactorEnabled) {
      if (!otp) {
        throw new BadRequestError('2FA code required');
      }

      const isValidOTP = verifyToken(otp, user.twoFactorSecret || '');
      if (!isValidOTP) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    await userRepository.updateLastLogin(user.id);
    const updatedUser = await userRepository.findById(user.id);

    if (!updatedUser) {
      throw new NotFoundError('User not found after update');
    }

    if (updatedUser.isPremium && updatedUser.premiumUntil && isExpired(updatedUser.premiumUntil)) {
      await userRepository.update(updatedUser.id, {
        isPremium: false,
        autoRenew: false,
      });
      (updatedUser as any).isPremium = false;
      (updatedUser as any).autoRenew = false;
    }

    const tokens = await this.generateTokens(user.id, user.email, user.role as string);

    return {
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        role: updatedUser.role as string,
        provider: updatedUser.provider,
        isEmailVerified: updatedUser.isEmailVerified,
        twoFactorEnabled: updatedUser.twoFactorEnabled,
        avatarUrl: updatedUser.avatarUrl,
        isPremium: updatedUser.isPremium,
        autoRenew: updatedUser.autoRenew,
        premiumUntil: updatedUser.premiumUntil,
        lastLoginAt: updatedUser.lastLoginAt,
        tokenVersion: updatedUser.tokenVersion,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
      tokens,
    };
  }

  async refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
    let payload;
    try {
      payload = verifyRefreshToken(refreshToken);
    } catch {
      throw new UnauthorizedError('Invalid refresh token');
    }

    const tokenRecord = await authRepository.findRefreshToken(refreshToken);
    if (!tokenRecord || tokenRecord.isRevoked || isExpired(tokenRecord.expiresAt)) {
      if (tokenRecord?.isRevoked) {
        await prisma.$transaction(async (tx) => {
          await authRepository.revokeAllUserRefreshTokens(payload.userId, tx);
          await userRepository.incrementTokenVersion(payload.userId, tx);
        });
      }
      throw new UnauthorizedError('Session expired or invalidated');
    }

    const user = await userRepository.findByIdWithTokenVersion(payload.userId);
    if (!user || user.tokenVersion !== payload.tokenVersion) {
      throw new UnauthorizedError('Session has been globally invalidated');
    }

    return prisma.$transaction(async (tx) => {
      await authRepository.deleteRefreshToken(refreshToken, tx);
      const userWithRole = await userRepository.findByIdWithTokenVersion(user.id, tx);
      const tokens = await this.generateTokens(user.id, user.email, (userWithRole?.role as any).name || userWithRole?.role, tx);
      return tokens;
    });
  }

  async logout(refreshToken: string, allDevices = false): Promise<void> {
    try {
      const payload = verifyRefreshToken(refreshToken);

      if (allDevices) {
        await prisma.$transaction(async (tx) => {
          await authRepository.revokeAllUserRefreshTokens(payload.userId, tx);
          await userRepository.incrementTokenVersion(payload.userId, tx);
        });
      } else {
        await authRepository.deleteRefreshToken(refreshToken);
      }
    } catch {
      // Ignore error if token is already invalid
    }
  }

  async getCurrentUser(userId: string): Promise<AuthResponse['user']> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    if (user.isPremium && user.premiumUntil && isExpired(user.premiumUntil)) {
      await userRepository.update(user.id, {
        isPremium: false,
        autoRenew: false,
      });
      user.isPremium = false;
      user.autoRenew = false;
    }

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      provider: user.provider,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      avatarUrl: user.avatarUrl,
      isPremium: user.isPremium,
      autoRenew: user.autoRenew,
      premiumUntil: user.premiumUntil,
      lastLoginAt: user.lastLoginAt,
      tokenVersion: user.tokenVersion,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async generateTokens(
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

    await authRepository.createRefreshToken(userId, refreshToken, undefined, undefined, tx);

    return {
      accessToken,
      refreshToken,
      expiresIn: 900,
    };
  }
}

export const coreAuthService = new CoreAuthService();
