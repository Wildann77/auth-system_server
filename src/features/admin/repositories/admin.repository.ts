import { prisma } from '@/config/db';
import { Prisma, Role } from '@prisma/client';
import { userRepository } from '@/features/user/repositories/user.repository';

export class AdminRepository {
  async getUsers(filters: any, page = 1, limit = 10) {
    return userRepository.findMany(filters, page, limit);
  }

  async updateUserRole(id: string, role: Role, tx?: Prisma.TransactionClient) {
    const db = tx || prisma;
    return db.user.update({ where: { id }, data: { role } });
  }

  async deleteUser(id: string, tx?: Prisma.TransactionClient) {
    return userRepository.delete(id, tx);
  }

  async getStats() {
    const [totalUsers, adminUsers, userUsers, verifiedUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({
        where: { lastLoginAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
      }),
    ]);

    return { totalUsers, adminUsers, userUsers, verifiedUsers, activeUsers };
  }
}

export const adminRepository = new AdminRepository();
