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

      const { email, given_name: firstName, family_name: lastName } = payload;

      let user = await userRepository.findByEmail(email);

      if (!user) {
        user = await userRepository.create({
          email: email.toLowerCase(),
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          provider: 'GOOGLE',
        });
      } else {
        if (!user.isEmailVerified) {
          await userRepository.verifyEmail(user.id);
        }
      }

      if (user.provider !== 'GOOGLE') {
        throw new BadRequestError('This email is already registered with a different provider');
      }

      const tokens = await coreAuthService.generateTokens(user.id, user.email, user.role);

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

export const oauthService = new OAuthService();
