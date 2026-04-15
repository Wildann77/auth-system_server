/**
 * Auth Repository
 * Database operations for Authentication
 */

import { prisma } from '@/config/db';
import { generateToken } from '@/shared/utils/token';
import { addDays, addHours } from '@/shared/utils/date';

export class AuthRepository {
  /**
   * Create email verification token
   */
  async createEmailVerificationToken(userId: string): Promise<string> {
    // Delete any existing tokens
    await prisma.emailVerificationToken.deleteMany({
      where: { userId },
    });

    // Generate new token
    const token = generateToken(32);
    const expiresAt = addDays(1); // 24 hours

    await prisma.emailVerificationToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Find email verification token
   */
  async findEmailVerificationToken(token: string) {
    return prisma.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete email verification token
   */
  async deleteEmailVerificationToken(token: string): Promise<void> {
    await prisma.emailVerificationToken.delete({
      where: { token },
    });
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: string): Promise<string> {
    // Delete any existing tokens
    await prisma.passwordResetToken.deleteMany({
      where: { userId },
    });

    // Generate new token
    const token = generateToken(32);
    const expiresAt = addHours(1); // 1 hour

    await prisma.passwordResetToken.create({
      data: {
        token,
        userId,
        expiresAt,
      },
    });

    return token;
  }

  /**
   * Find password reset token
   */
  async findPasswordResetToken(token: string) {
    return prisma.passwordResetToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete password reset token
   */
  async deletePasswordResetToken(token: string): Promise<void> {
    await prisma.passwordResetToken.delete({
      where: { token },
    });
  }

  /**
   * Create refresh token record
   */
  async createRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string
  ) {
    const expiresAt = addDays(7); // 7 days

    return prisma.refreshToken.create({
      data: {
        token,
        userId,
        deviceInfo,
        ipAddress,
        expiresAt,
      },
    });
  }

  /**
   * Find refresh token
   */
  async findRefreshToken(token: string) {
    return prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete refresh token (for rotation)
   */
  async deleteRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.delete({
      where: { token },
    });
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string): Promise<void> {
    await prisma.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string): Promise<void> {
    await prisma.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Delete expired refresh tokens
   */
  async deleteExpiredRefreshTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [
          { isRevoked: true },
          { expiresAt: { lt: new Date() } },
        ],
      },
    });
  }

  /**
   * Delete expired email verification tokens
   */
  async deleteExpiredEmailVerificationTokens(): Promise<void> {
    await prisma.emailVerificationToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }

  /**
   * Delete expired password reset tokens
   */
  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: {
        expiresAt: { lt: new Date() },
      },
    });
  }
}

export const authRepository = new AuthRepository();
