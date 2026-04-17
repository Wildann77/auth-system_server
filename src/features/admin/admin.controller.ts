import { Request, Response } from 'express';
import { adminService } from './admin.service';
import { AdminUsersQueryParams, UpdateUserRoleInput } from './admin.schema';

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
    res.json(result);
  }

  /**
   * Get system statistics
   */
  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await adminService.getStats();
    res.json(stats);
  }

  /**
   * Update user role
   */
  async updateUserRole(req: Request<UpdateUserRoleInput['params'], {}, UpdateUserRoleInput['body']>, res: Response): Promise<void> {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    res.json(user);
  }

  /**
   * Delete user
   */
  async deleteUser(req: Request<{ id: string }>, res: Response): Promise<void> {
    await adminService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  }
}

export const adminController = new AdminController();