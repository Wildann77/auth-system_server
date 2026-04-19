/**
 * Auth Repository
 * Database operations for Authentication
 */

import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';
import { generateToken, hashToken } from '@/shared/utils/token';
import { addDays, addHours, addMinutes } from '@/shared/utils/date';

export class AuthRepository {
  /**
   * Create email verification token
   */
  async createEmailVerificationToken(userId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    // Delete any existing tokens
    await db.emailVerificationToken.deleteMany({
      where: { userId },
    });

    // Generate new token
    const token = generateToken(32);
    const expiresAt = addDays(1); // 24 hours

    await db.emailVerificationToken.create({
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
  async findEmailVerificationToken(token: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.emailVerificationToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete email verification token
   */
  async deleteEmailVerificationToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.emailVerificationToken.delete({
      where: { token },
    });
  }

  /**
   * Create password reset token
   */
  async createPasswordResetToken(userId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    // Delete any existing tokens
    await db.passwordResetToken.deleteMany({
      where: { userId },
    });

    // Generate new token
    const rawToken = generateToken(32);
    const hashedToken = hashToken(rawToken);
    const expiresAt = addMinutes(15); // 15 minutes

    await db.passwordResetToken.create({
      data: {
        token: hashedToken,
        userId,
        expiresAt,
      },
    });

    return rawToken;
  }

  /**
   * Find password reset token
   */
  async findPasswordResetToken(token: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    const hashedToken = hashToken(token);
    return db.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });
  }

  /**
   * Delete password reset token
   */
  async deletePasswordResetToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const hashedToken = hashToken(token);
    await db.passwordResetToken.delete({
      where: { token: hashedToken },
    });
  }

  /**
   * Create refresh token record
   */
  async createRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    const expiresAt = addDays(7); // 7 days

    return db.refreshToken.create({
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
  async findRefreshToken(token: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  /**
   * Delete refresh token (for rotation)
   */
  async deleteRefreshToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.delete({
      where: { token },
    });
  }

  /**
   * Revoke refresh token
   */
  async revokeRefreshToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  /**
   * Revoke all refresh tokens for a user
   */
  async revokeAllUserRefreshTokens(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  /**
   * Delete all refresh tokens for a user
   */
  async deleteAllUserRefreshTokens(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.deleteMany({
      where: { userId },
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
