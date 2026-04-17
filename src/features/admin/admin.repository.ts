/**
 * Admin Repository
 * Database operations for Admin features
 */

import { prisma } from '@/config/db';
import { userRepository } from '@/features/user/user.repository';
import { Role } from '@prisma/client';

export class AdminRepository {
  /**
   * Get all users with pagination and filters
   */
  async getUsers(filters: any, page = 1, limit = 10) {
    return userRepository.findMany(filters, page, limit);
  }

  /**
   * Update user role
   */
  async updateUserRole(id: string, role: Role) {
    return prisma.user.update({
      where: { id },
      data: { role },
    });
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    return userRepository.delete(id);
  }

  /**
   * Get system statistics
   */
  async getStats() {
    const [totalUsers, adminUsers, userUsers, verifiedUsers, activeUsers] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.user.count({ where: { role: 'USER' } }),
      prisma.user.count({ where: { isEmailVerified: true } }),
      prisma.user.count({
        where: {
          lastLoginAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
          },
        },
      }),
    ]);

    return {
      totalUsers,
      adminUsers,
      userUsers,
      verifiedUsers,
      activeUsers,
    };
  }
}

export const adminRepository = new AdminRepository();