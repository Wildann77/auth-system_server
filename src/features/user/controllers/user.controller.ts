import { Request, Response } from 'express';
import { userService } from '@/features/user/services/user.service';
import { UpdateUserInput } from '@/features/user/schemas/user.schema';

export class UserController {
  async getMe(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserById(req.user!.id);
    res.apiSuccess(user, 'Profile retrieved successfully');
  }

  async updateMe(req: Request<{}, {}, UpdateUserInput>, res: Response): Promise<void> {
    const user = await userService.updateUser(req.user!.id, req.body);
    res.apiSuccess(user, 'Profile updated successfully');
  }
}

export const userController = new UserController();
