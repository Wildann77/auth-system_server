/**
 * User Repository
 * Database operations for User model
 */

import { prisma } from '@/config/db';
import { CreateUserInput, UpdateUserInput, UserFilters } from './user.types';
import { Role, Provider } from '@prisma/client';

export class UserRepository {
  /**
   * Find user by ID
   */
  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
    });
  }

  /**
   * Find user by email
   */
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  /**
   * Find user by ID with token version
   */
  async findByIdWithTokenVersion(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true,
        isPremium: true,
      },
    });
  }

  /**
   * Create new user
   */
  async create(data: CreateUserInput) {
    return prisma.user.create({
      data: {
        ...data,
        email: data.email.toLowerCase(),
      },
    });
  }

  /**
   * Update user
   */
  async update(id: string, data: UpdateUserInput) {
    return prisma.user.update({
      where: { id },
      data,
    });
  }

  /**
   * Update user token version (for logout)
   */
  async incrementTokenVersion(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        tokenVersion: { increment: 1 },
      },
    });
  }

  /**
   * Update user password
   */
  async updatePassword(id: string, passwordHash: string) {
    return prisma.user.update({
      where: { id },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
      },
    });
  }

  /**
   * Verify user email
   */
  async verifyEmail(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        isEmailVerified: true,
      },
    });
  }

  /**
   * Enable 2FA
   */
  async enableTwoFactor(id: string, secret: string) {
    return prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: true,
        twoFactorSecret: secret,
      },
    });
  }

  /**
   * Disable 2FA
   */
  async disableTwoFactor(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        twoFactorEnabled: false,
        twoFactorSecret: null,
      },
    });
  }

  /**
   * Update last login
   */
  async updateLastLogin(id: string) {
    return prisma.user.update({
      where: { id },
      data: {
        lastLoginAt: new Date(),
      },
    });
  }

  /**
   * Delete user
   */
  async delete(id: string) {
    return prisma.user.delete({
      where: { id },
    });
  }

  /**
   * Find users with pagination
   */
  async findMany(filters: UserFilters, page = 1, limit = 10) {
    const where: {
      role?: Role;
      isEmailVerified?: boolean;
      provider?: Provider;
    } = {};

    if (filters.role) where.role = filters.role;
    if (filters.isEmailVerified !== undefined) where.isEmailVerified = filters.isEmailVerified;
    if (filters.provider) where.provider = filters.provider;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  /**
   * Count users
   */
  async count(filters?: UserFilters) {
    const where: {
      role?: Role;
      isEmailVerified?: boolean;
      provider?: Provider;
    } = {};

    if (filters?.role) where.role = filters.role;
    if (filters?.isEmailVerified !== undefined) where.isEmailVerified = filters.isEmailVerified;
    if (filters?.provider) where.provider = filters.provider;

    return prisma.user.count({ where });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return !!user;
  }
}

export const userRepository = new UserRepository();
