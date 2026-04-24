import { Role, Provider } from '@prisma/client';

export interface CreateUserInput {
  email: string;
  password?: string;
  passwordHash?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role?: Role;
  provider?: Provider;
}

export interface UpdateUserInput {
  email?: string;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
  role: Role;
  provider: Provider;
  isEmailVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface PublicUserResponse {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

export interface UserWithTokens extends UserResponse {
  accessToken: string;
  refreshToken: string;
}

export interface UserFilters {
  role?: Role;
  isEmailVerified?: boolean;
  provider?: Provider;
}
