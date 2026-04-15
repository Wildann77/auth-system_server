/**
 * Auth Types
 * Type definitions for Auth feature
 */

export interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginInput {
  email: string;
  password: string;
  otp?: string; // For 2FA
}

export interface GoogleAuthInput {
  code: string;
  redirectUri: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface VerifyEmailInput {
  token: string;
}

export interface Enable2FAInput {
  password: string;
}

export interface Verify2FAInput {
  code: string;
}

export interface RefreshTokenInput {
  refreshToken: string;
}

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
  };
  tokens?: TokenResponse;
}

export interface TwoFAResponse {
  success: boolean;
  requires2FA?: boolean;
  qrCode?: string; // Base64 QR code image
  backupCodes?: string[];
}
