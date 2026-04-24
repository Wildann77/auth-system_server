export interface TokenResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    provider: string;
    isEmailVerified: boolean;
    twoFactorEnabled: boolean;
    avatarUrl: string | null;
    isPremium: boolean;
    premiumUntil: Date | null;
    lastLoginAt: Date | null;
    tokenVersion: number;
    createdAt: Date;
    updatedAt: Date;
  };
  tokens?: TokenResponse;
}

export interface TwoFAResponse {
  success: boolean;
  requires2FA?: boolean;
  qrCode?: string;
  backupCodes?: string[];
}
