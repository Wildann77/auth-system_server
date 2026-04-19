import { adminRepository } from './admin.repository';
import { userRepository } from '@/features/user/user.repository';
import { UserFilters } from '@/features/user/user.types';
import { Role, Prisma } from '@prisma/client';
import { prisma } from '@/config/db';
import { NotFoundError } from '@/shared/middleware/error-handler';

export class AdminService {
  /**
   * Get users with pagination and filters
   */
  async getUsers(filters: UserFilters, page = 1, limit = 10) {
    return adminRepository.getUsers(filters, page, limit);
  }

  /**
   * Update user role
   */
  async updateUserRole(id: string, role: Role) {
    try {
      return await adminRepository.updateUserRole(id, role);
    } catch (error: any) {
      if (error.code === 'P2025') {
        throw new NotFoundError('User not found for role update');
      }
      throw error;
    }
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    return prisma.$transaction(async (tx) => {
      // Verify user exists
      const user = await userRepository.findById(id, tx);
      if (!user) throw new NotFoundError('User not found');

      // Delete user (cascade handles related data)
      return adminRepository.deleteUser(id, tx);
    });
  }

  /**
   * Bulk update user roles
   */
  async bulkUpdateUserRoles(updates: Array<{ id: string, role: Role }>) {
    return prisma.$transaction(async (tx) => {
      const results = [];

      for (const update of updates) {
        const result = await adminRepository.updateUserRole(update.id, update.role, tx);
        results.push(result);
      }

      return results;
    });
  }

  /**
   * Get system statistics
   */
  async getStats() {
    return adminRepository.getStats();
  }
}

export const adminService = new AdminService();