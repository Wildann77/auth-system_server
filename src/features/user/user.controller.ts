import { Request, Response } from 'express';
import { userService } from './user.service';
import { UpdateUserInput } from './user.schema';

export class UserController {
  /**
   * Get current user profile
   */
  async getMe(req: Request, res: Response): Promise<void> {
    const user = await userService.getUserById(req.user!.id);
    res.json(user);
  }

  /**
   * Update current user profile
   */
  async updateMe(req: Request<{}, {}, UpdateUserInput>, res: Response): Promise<void> {
    const user = await userService.updateUser(req.user!.id, req.body);
    res.json(user);
  }
}

export const userController = new UserController();