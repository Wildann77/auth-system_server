import { Request, Response } from 'express';
import { userService } from './user.service';
import {
  CreateUserInput,
  UpdateUserInput,
  UserIdParams,
  QueryParams,
} from './user.schema';

export class UserController {
  /**
   * Get all users
   */
  async getUsers(req: Request<{}, {}, {}, QueryParams>, res: Response): Promise<void> {
    const page = parseInt(req.query.page || '1') || 1;
    const limit = parseInt(req.query.limit || '10') || 10;
    const filters = {
      role: req.query.role,
      isEmailVerified: req.query.isEmailVerified === 'true' ? true : req.query.isEmailVerified === 'false' ? false : undefined,
      provider: req.query.provider,
    };
    const result = await userService.getUsers(filters, page, limit);
    res.json(result);
  }

  /**
   * Get user by ID
   */
  async getUserById(req: Request<UserIdParams>, res: Response): Promise<void> {
    const user = await userService.getUserById(req.params.id);
    res.json(user);
  }

  /**
   * Create user
   */
  async createUser(req: Request<{}, {}, CreateUserInput>, res: Response): Promise<void> {
    const user = await userService.createUser(req.body);
    res.status(201).json(user);
  }

  /**
   * Update user
   */
  async updateUser(req: Request<UserIdParams, {}, UpdateUserInput>, res: Response): Promise<void> {
    const user = await userService.updateUser(req.params.id, req.body);
    res.json(user);
  }

  /**
   * Delete user
   */
  async deleteUser(req: Request<UserIdParams>, res: Response): Promise<void> {
    await userService.deleteUser(req.params.id);
    res.json({ message: 'User deleted successfully' });
  }
}

export const userController = new UserController();