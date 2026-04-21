import { adminRepository } from '@/features/admin/repositories/admin.repository';
import { userRepository } from '@/features/user/repositories/user.repository';
import { UserFilters } from '@/features/user/types/user.types';
import { Role } from '@prisma/client';
import { prisma } from '@/config/db';
import { NotFoundError } from '@/shared/middleware/error-handler';

export class UserAdminService {
  async getUsers(filters: UserFilters, page = 1, limit = 10) {
    return adminRepository.getUsers(filters, page, limit);
  }

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

  async deleteUser(id: string) {
    return prisma.$transaction(async (tx) => {
      const user = await userRepository.findById(id, tx);
      if (!user) throw new NotFoundError('User not found');
      return adminRepository.deleteUser(id, tx);
    });
  }

  async bulkUpdateUserRoles(updates: Array<{ id: string; role: Role }>) {
    return prisma.$transaction(async (tx) => {
      const results = [];
      for (const update of updates) {
        const result = await adminRepository.updateUserRole(update.id, update.role, tx);
        results.push(result);
      }
      return results;
    });
  }

  async getStats() {
    return adminRepository.getStats();
  }
}

export const userAdminService = new UserAdminService();
