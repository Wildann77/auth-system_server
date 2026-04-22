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
    isPremium: boolean;
    premiumUntil: Date | null;
  };
  tokens?: TokenResponse;
}

export interface TwoFAResponse {
  success: boolean;
  requires2FA?: boolean;
  qrCode?: string;
  backupCodes?: string[];
}
