import { prisma } from '@/config/db';
import { Prisma } from '@prisma/client';
import { CreateUserInput, UpdateUserInput, UserFilters } from '@/features/user/types/user.types';
import { Role, Provider } from '@prisma/client';

export class UserRepository {
  async findById(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.findUnique({ where: { id } });
  }

  async findByEmail(email: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.findUnique({ where: { email: email.toLowerCase() } });
  }

  async findByIdWithTokenVersion(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        role: true,
        tokenVersion: true,
        isPremium: true,
        avatarUrl: true,
      },
    });
  }

  async create(data: CreateUserInput, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.create({
      data: { ...data, email: data.email.toLowerCase() },
    });
  }

  async update(id: string, data: UpdateUserInput, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({ where: { id }, data });
  }

  async incrementTokenVersion(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
    });
  }

  async updatePassword(id: string, passwordHash: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data: { passwordHash, tokenVersion: { increment: 1 } },
    });
  }

  async verifyEmail(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({ where: { id }, data: { isEmailVerified: true } });
  }

  async enableTwoFactor(id: string, secret: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data: { twoFactorEnabled: true, twoFactorSecret: secret },
    });
  }

  async disableTwoFactor(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({
      where: { id },
      data: { twoFactorEnabled: false, twoFactorSecret: null },
    });
  }

  async updateLastLogin(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({ where: { id }, data: { lastLoginAt: new Date() } });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.delete({ where: { id } });
  }

  async findMany(filters: UserFilters, page = 1, limit = 10) {
    const where: any = {};

    if (filters.role) where.role = filters.role;
    if (filters.isEmailVerified !== undefined) where.isEmailVerified = filters.isEmailVerified;
    if (filters.provider) where.provider = filters.provider;
    if (filters.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: (page - 1) * limit, take: limit, orderBy: { createdAt: 'desc' } }),
      prisma.user.count({ where }),
    ]);

    return { users, total, page, limit };
  }

  async count(filters?: UserFilters) {
    const where: any = {};

    if (filters?.role) where.role = filters.role;
    if (filters?.isEmailVerified !== undefined) where.isEmailVerified = filters.isEmailVerified;
    if (filters?.provider) where.provider = filters.provider;
    if (filters?.search) {
      where.OR = [
        { email: { contains: filters.search, mode: 'insensitive' } },
        { firstName: { contains: filters.search, mode: 'insensitive' } },
        { lastName: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    return prisma.user.count({ where });
  }

  async emailExists(email: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true },
    });
    return !!user;
  }
}

export const userRepository = new UserRepository();
