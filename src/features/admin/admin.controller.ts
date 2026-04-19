import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { AdminUsersQueryParams, UpdateUserRoleInput } from './admin.schema';
import { createPaginatedResponse } from '@/shared/types/api-response';

export class AdminController {
  /**
   * Get all users
   */
  async getUsers(req: Request<{}, {}, {}, AdminUsersQueryParams>, res: Response): Promise<void> {
    const page = parseInt(req.query.page || '1') || 1;
    const limit = parseInt(req.query.limit || '10') || 10;
    const filters = {
      role: req.query.role,
      isEmailVerified: req.query.isEmailVerified === 'true' ? true : req.query.isEmailVerified === 'false' ? false : undefined,
      provider: req.query.provider,
    };
    const result = await adminService.getUsers(filters, page, limit);
    res.apiSuccess(createPaginatedResponse(result.users, result.total, result.page, result.limit), 'Users retrieved successfully');
  }

  /**
   * Get system statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminService.getStats();
    res.apiSuccess(stats, 'Statistics retrieved successfully');
  }

  /**
   * Update user role
   */
  async updateUserRole(req: Request<UpdateUserRoleInput['params'], {}, UpdateUserRoleInput['body']>, res: Response): Promise<void> {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    res.apiSuccess(user, 'User role updated successfully');
  }

  /**
   * Delete user
   */
  async deleteUser(req: Request<{ id: string }>, res: Response): Promise<void> {
    await adminService.deleteUser(req.params.id);
    res.apiSuccess(null, 'User deleted successfully');
  }
}

export const adminController = new AdminController();