import { prisma } from '@/config/db';
import { authRepository } from '@/features/auth/repositories/auth.repository';
import { userRepository } from '@/features/user/repositories/user.repository';
import { generateVerificationToken, verifyVerificationToken } from '@/lib/jwt';
import { hashPassword, verifyPassword } from '@/lib/password';
import { sendVerificationEmail, sendPasswordResetEmail } from '@/lib/mail';
import { env } from '@/config/env';
import { isExpired } from '@/shared/utils/date';
import { UnauthorizedError, BadRequestError, NotFoundError } from '@/shared/middleware/error-handler';
import { TokenResponse } from '@/features/auth/types/auth.types';
import { coreAuthService } from '@/features/auth/services/core-auth.service';

export class AccountService {
  async verifyEmail(token: string): Promise<void> {
    let payload;
    try {
      payload = verifyVerificationToken(token);
    } catch {
      throw new BadRequestError('Invalid or expired verification token');
    }

    const { userId } = payload;
    await userRepository.verifyEmail(userId);
  }

  async resendVerificationEmail(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return;
    }

    if (user.isEmailVerified) {
      throw new BadRequestError('Email already verified');
    }

    const token = generateVerificationToken(user.id, user.email);
    await sendVerificationEmail(email, token, env.FRONTEND_URL);
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await userRepository.findByEmail(email);

    if (!user) {
      return;
    }

    if (user.provider !== 'LOCAL') {
      throw new BadRequestError('Password reset not available for OAuth accounts');
    }

    const token = await authRepository.createPasswordResetToken(user.id);
    await sendPasswordResetEmail(email, token, env.FRONTEND_URL);
  }

  async resetPassword(token: string, password: string): Promise<TokenResponse> {
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

      const passwordHash = await hashPassword(password);

      await userRepository.updatePassword(tokenRecord.user.id, passwordHash, tx);
      await authRepository.deletePasswordResetToken(token, tx);
      await authRepository.revokeAllUserRefreshTokens(tokenRecord.user.id, tx);

      const user = await userRepository.findByIdWithTokenVersion(tokenRecord.user.id, tx);
      if (!user) throw new NotFoundError('User not found after reset');
      return coreAuthService.generateTokens(user.id, user.email, (user.role as any).name || user.role, tx);
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<TokenResponse> {
    return prisma.$transaction(async (tx) => {
      const user = await userRepository.findById(userId, tx);

      if (!user) {
        throw new NotFoundError('User not found');
      }

      const isValidPassword = await verifyPassword(currentPassword, user.passwordHash || '');
      if (!isValidPassword) {
        throw new UnauthorizedError('Current password is incorrect');
      }

      const passwordHash = await hashPassword(newPassword);

      await userRepository.updatePassword(userId, passwordHash, tx);
      await authRepository.revokeAllUserRefreshTokens(userId, tx);

      const updatedUser = await userRepository.findByIdWithTokenVersion(userId, tx);
      if (!updatedUser) throw new NotFoundError('User not found after update');
      return coreAuthService.generateTokens(updatedUser.id, updatedUser.email, (updatedUser.role as any).name || updatedUser.role, tx);
    });
  }
}

export const accountService = new AccountService();
