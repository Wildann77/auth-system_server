import { prisma } from '@/config/db';
import { userRepository } from '@/features/user/repositories/user.repository';
import { verifyToken, generateSecret, generateOtpAuthUrl, generateQRCodeDataUrl, generateBackupCodes } from '@/lib/otp';
import { UnauthorizedError, BadRequestError, NotFoundError } from '@/shared/middleware/error-handler';
import { verifyPassword } from '@/lib/password';

export class TwoFactorService {
  async enable2FA(userId: string, password: string): Promise<{ qrCode: string; backupCodes: string[] }> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    const secret = generateSecret();
    const otpAuthUrl = generateOtpAuthUrl(secret, user.email);
    const qrCode = await generateQRCodeDataUrl(otpAuthUrl);
    const backupCodes = generateBackupCodes();

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: secret },
    });

    return { qrCode, backupCodes };
  }

  async confirm2FA(userId: string, code: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user || !user.twoFactorSecret) {
      throw new NotFoundError('User or 2FA not found');
    }

    const isValid = verifyToken(code, user.twoFactorSecret);
    if (!isValid) {
      throw new UnauthorizedError('Invalid 2FA code');
    }

    await userRepository.enableTwoFactor(userId, user.twoFactorSecret);
  }

  async disable2FA(userId: string, password: string, code: string): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValidPassword = await verifyPassword(password, user.passwordHash || '');
    if (!isValidPassword) {
      throw new UnauthorizedError('Invalid password');
    }

    if (user.twoFactorEnabled && user.twoFactorSecret) {
      const isValidOTP = verifyToken(code, user.twoFactorSecret);
      if (!isValidOTP) {
        throw new UnauthorizedError('Invalid 2FA code');
      }
    }

    await userRepository.disableTwoFactor(userId);
  }
}

export const twoFactorService = new TwoFactorService();
