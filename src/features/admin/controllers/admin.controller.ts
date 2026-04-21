import { Request, Response } from 'express';
import { userAdminService } from '@/features/admin/services/user-admin.service';
import { AdminUsersQueryParams, UpdateUserRoleInput } from '@/features/admin/schemas/admin.schema';
import { createPaginatedResponse } from '@/shared/types/api-response';

export class AdminController {
  async getUsers(req: Request<{}, {}, {}, AdminUsersQueryParams>, res: Response): Promise<void> {
    const page = parseInt(req.query.page || '1') || 1;
    const limit = parseInt(req.query.limit || '10') || 10;
    const filters = {
      role: req.query.role,
      isEmailVerified:
        req.query.isEmailVerified === 'true'
          ? true
          : req.query.isEmailVerified === 'false'
          ? false
          : undefined,
      provider: req.query.provider,
    };
    const result = await userAdminService.getUsers(filters, page, limit);
    res.apiSuccess(createPaginatedResponse(result.users, result.total, result.page, result.limit), 'Users retrieved successfully');
  }

  async getStats(req: Request, res: Response): Promise<void> {
    const stats = await userAdminService.getStats();
    res.apiSuccess(stats, 'Statistics retrieved successfully');
  }

  async updateUserRole(
    req: Request<UpdateUserRoleInput['params'], {}, UpdateUserRoleInput['body']>,
    res: Response
  ): Promise<void> {
    const user = await userAdminService.updateUserRole(req.params.id, req.body.role);
    res.apiSuccess(user, 'User role updated successfully');
  }

  async deleteUser(req: Request<{ id: string }>, res: Response): Promise<void> {
    await userAdminService.deleteUser(req.params.id);
    res.apiSuccess(null, 'User deleted successfully');
  }
}

export const adminController = new AdminController();
