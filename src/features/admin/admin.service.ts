/**
 * Admin Service
 * Business logic for Admin operations
 */

import { adminRepository } from './admin.repository';
import { UserFilters } from '@/features/user/user.types';
import { Role } from '@prisma/client';

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
    return adminRepository.updateUserRole(id, role);
  }

  /**
   * Delete user
   */
  async deleteUser(id: string) {
    return adminRepository.deleteUser(id);
  }

  /**
   * Get system statistics
   */
  async getStats() {
    return adminRepository.getStats();
  }
}

export const adminService = new AdminService();