/**
 * Auth Constants
 */

export const USER_ROLE = {
  USER: 'USER',
  ADMIN: 'ADMIN',
} as const;

export const AUTH_PROVIDER = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
} as const;

export type UserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export type AuthProvider = typeof AUTH_PROVIDER[keyof typeof AUTH_PROVIDER];
