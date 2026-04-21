import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';
import { generateToken, hashToken } from '@/shared/utils/token';
import { addDays, addMinutes } from '@/shared/utils/date';

export class AuthRepository {
  async createPasswordResetToken(userId: string, tx?: Prisma.TransactionClient): Promise<string> {
    const db = tx || prisma;
    await db.passwordResetToken.deleteMany({ where: { userId } });

    const rawToken = generateToken(32);
    const hashedToken = hashToken(rawToken);
    const expiresAt = addMinutes(15);

    await db.passwordResetToken.create({
      data: { token: hashedToken, userId, expiresAt },
    });

    return rawToken;
  }

  async findPasswordResetToken(token: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    const hashedToken = hashToken(token);
    return db.passwordResetToken.findUnique({
      where: { token: hashedToken },
      include: { user: true },
    });
  }

  async deletePasswordResetToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    const hashedToken = hashToken(token);
    await db.passwordResetToken.delete({ where: { token: hashedToken } });
  }

  async createRefreshToken(
    userId: string,
    token: string,
    deviceInfo?: string,
    ipAddress?: string,
    tx?: Prisma.TransactionClient
  ) {
    const db = tx || prisma;
    const expiresAt = addDays(7);

    return db.refreshToken.create({
      data: { token, userId, deviceInfo, ipAddress, expiresAt },
    });
  }

  async findRefreshToken(token: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
  }

  async deleteRefreshToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.delete({ where: { token } });
  }

  async revokeRefreshToken(token: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.update({
      where: { token },
      data: { isRevoked: true },
    });
  }

  async revokeAllUserRefreshTokens(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.updateMany({
      where: { userId },
      data: { isRevoked: true },
    });
  }

  async deleteAllUserRefreshTokens(userId: string, tx?: Prisma.TransactionClient): Promise<void> {
    const db = tx || prisma;
    await db.refreshToken.deleteMany({ where: { userId } });
  }

  async deleteExpiredRefreshTokens(): Promise<void> {
    await prisma.refreshToken.deleteMany({
      where: {
        OR: [{ isRevoked: true }, { expiresAt: { lt: new Date() } }],
      },
    });
  }

  async deleteExpiredPasswordResetTokens(): Promise<void> {
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lt: new Date() } },
    });
  }
}

export const authRepository = new AuthRepository();
