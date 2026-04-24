import { OAuth2Client } from 'google-auth-library';
import { userRepository } from '@/features/user/repositories/user.repository';
import { generateStateToken, verifyStateToken } from '@/lib/jwt';
import { env } from '@/config/env';
import { BadRequestError } from '@/shared/middleware/error-handler';
import { AuthResponse } from '@/features/auth/types/auth.types';
import { coreAuthService } from './core-auth.service';

export class OAuthService {
  private googleClient = new OAuth2Client(
    env.GOOGLE_CLIENT_ID,
    env.GOOGLE_CLIENT_SECRET,
    env.GOOGLE_CALLBACK_URL
  );

  getGoogleAuthUrl(): string {
    const state = generateStateToken();
    const authorizeUrl = this.googleClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['https://www.googleapis.com/auth/userinfo.email', 'https://www.googleapis.com/auth/userinfo.profile'],
      state,
    });
    return authorizeUrl;
  }

  async processGoogleCallback(code: string, state: string): Promise<AuthResponse> {
    if (!verifyStateToken(state)) {
      throw new BadRequestError('Invalid state parameter');
    }

    try {
      const { tokens: googleTokens } = await this.googleClient.getToken(code);
      this.googleClient.setCredentials(googleTokens);

      const ticket = await this.googleClient.verifyIdToken({
        idToken: googleTokens.id_token!,
        audience: env.GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        throw new BadRequestError('Invalid Google token');
      }

      const { email, given_name: firstName, family_name: lastName, picture: avatarUrl } = payload;

      let user = await userRepository.findByEmail(email);

      if (!user) {
        user = await userRepository.create({
          email: email.toLowerCase(),
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          avatarUrl: avatarUrl || undefined,
          provider: 'GOOGLE',
          isEmailVerified: true,
        });
      } else {
        // Update avatar if changed
        if (user.avatarUrl !== avatarUrl) {
          await userRepository.update(user.id, { avatarUrl });
        }
        
        if (!user.isEmailVerified) {
          await userRepository.verifyEmail(user.id);
        }
      }

      if (user.provider !== 'GOOGLE') {
        throw new BadRequestError('This email is already registered with a different provider');
      }

      await userRepository.updateLastLogin(user.id);
      const updatedUser = await userRepository.findById(user.id);

      if (!updatedUser) {
        throw new BadRequestError('User not found after update');
      }

      const tokens = await coreAuthService.generateTokens(updatedUser.id, updatedUser.email, updatedUser.role);

      return {
        user: {
          id: updatedUser.id,
          email: updatedUser.email,
          firstName: updatedUser.firstName,
          lastName: updatedUser.lastName,
          role: updatedUser.role,
          provider: updatedUser.provider,
          isEmailVerified: updatedUser.isEmailVerified,
          twoFactorEnabled: updatedUser.twoFactorEnabled,
          avatarUrl: updatedUser.avatarUrl,
          isPremium: updatedUser.isPremium,
          premiumUntil: updatedUser.premiumUntil,
          lastLoginAt: updatedUser.lastLoginAt,
          tokenVersion: updatedUser.tokenVersion,
          createdAt: updatedUser.createdAt,
          updatedAt: updatedUser.updatedAt,
        },
        tokens,
      };
    } catch (error) {
      console.error('Google OAuth Error:', error);
      throw new BadRequestError('Failed to process Google OAuth callback');
    }
  }
}

export const oauthService = new OAuthService();
