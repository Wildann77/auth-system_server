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
    const [totalUsers, adminCount, verifiedUsers, premiumCount] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({ where: { isPremium: true } }),
    ]);

    // Mocking usersByDay for now or querying if needed. We'll return an empty array or simple mock.
    const usersByDay = [
      { date: new Date().toISOString().split('T')[0], count: totalUsers }
    ];

    return { totalUsers, adminCount, verifiedUsers, premiumCount, usersByDay };
  }
}

export const adminRepository = new AdminRepository();
