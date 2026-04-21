import { userRepository } from '@/features/user/repositories/user.repository';
import { CreateUserInput, UpdateUserInput, UserResponse, UserFilters } from '@/features/user/types/user.types';
import { hashPassword } from '@/lib/password';
import { NotFoundError, ConflictError } from '@/shared/middleware/error-handler';
import { Role, Provider } from '@prisma/client';

export class UserService {
  async createUser(data: CreateUserInput): Promise<UserResponse> {
    const emailExists = await userRepository.emailExists(data.email);
    if (emailExists) {
      throw new ConflictError('Email already registered');
    }

    let passwordHash: string | undefined;
    if (data.password) {
      passwordHash = await hashPassword(data.password);
    }

    const user = await userRepository.create({ ...data, passwordHash });
    return this.toUserResponse(user);
  }

  async getUserById(id: string): Promise<UserResponse> {
    const user = await userRepository.findById(id);
    if (!user) {
      throw new NotFoundError('User not found');
    }
    return this.toUserResponse(user);
  }

  async getUserByEmail(email: string): Promise<UserResponse | null> {
    const user = await userRepository.findByEmail(email);
    if (!user) return null;
    return this.toUserResponse(user);
  }

  async updateUser(id: string, data: UpdateUserInput): Promise<UserResponse> {
    const user = await userRepository.update(id, data);
    return this.toUserResponse(user);
  }

  async verifyEmail(id: string): Promise<void> {
    await userRepository.verifyEmail(id);
  }

  async getUsers(filters: UserFilters, page = 1, limit = 10) {
    const result = await userRepository.findMany(filters, page, limit);
    return {
      users: result.users.map((user) => this.toUserResponse(user)),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: Math.ceil(result.total / limit),
    };
  }

  async deleteUser(id: string): Promise<void> {
    await userRepository.delete(id);
  }

  private toUserResponse(user: any): UserResponse {
    const roleValue = typeof user.role === 'string' ? user.role : (user.role as { name: string }).name;
    const providerValue = typeof user.provider === 'string' ? user.provider : (user.provider as { name: string }).name;

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: roleValue as Role,
      provider: providerValue as Provider,
      isEmailVerified: user.isEmailVerified,
      twoFactorEnabled: user.twoFactorEnabled,
      lastLoginAt: user.lastLoginAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}

export const userService = new UserService();
