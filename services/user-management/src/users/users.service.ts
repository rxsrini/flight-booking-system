import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, FindOptionsWhere } from 'typeorm';
import { User } from '@shared/database';
import { UserRole, UserStatus, PaginationMeta } from '@shared/types';
import { CryptoUtil } from '@shared/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async create(createUserDto: CreateUserDto, creatorRole: UserRole): Promise<User> {
    // Role-based access control for user creation
    this.validateUserCreation(creatorRole, createUserDto.role);

    const existingUser = await this.usersRepository.findOne({
      where: { email: createUserDto.email }
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    const passwordHash = await CryptoUtil.hashPassword(createUserDto.password);

    const user = this.usersRepository.create({
      ...createUserDto,
      passwordHash,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.usersRepository.save(user);

    // Remove password hash from response
    delete savedUser.passwordHash;
    return savedUser;
  }

  async findAll(queryDto: QueryUserDto, requestorRole: UserRole) {
    const { page = 1, limit = 10, role, status, search, sortBy = 'createdAt', sortOrder = 'DESC' } = queryDto;

    const where: FindOptionsWhere<User> = {};

    if (role) {
      where.role = role;
    }

    if (status) {
      where.status = status;
    }

    // Search by name or email
    const searchConditions = [];
    if (search) {
      searchConditions.push(
        { firstName: Like(`%${search}%`) },
        { lastName: Like(`%${search}%`) },
        { email: Like(`%${search}%`) }
      );
    }

    const skip = (page - 1) * limit;

    const [users, total] = await this.usersRepository.findAndCount({
      where: search ? searchConditions : where,
      skip,
      take: limit,
      order: { [sortBy]: sortOrder },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'phoneNumber', 'avatar', 'createdAt', 'updatedAt', 'lastLogin'],
    });

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { users, meta };
  }

  async findOne(id: string, requestorRole: UserRole, requestorId: string): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id },
      select: ['id', 'email', 'firstName', 'lastName', 'role', 'status', 'phoneNumber', 'avatar', 'emailVerified', 'createdAt', 'updatedAt', 'lastLogin'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Users can only view their own profile unless they're admin or business owner
    if (requestorId !== id && !this.canManageUsers(requestorRole)) {
      throw new ForbiddenException('You can only view your own profile');
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, requestorRole: UserRole, requestorId: string): Promise<User> {
    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Validate permissions
    this.validateUserUpdate(requestorRole, requestorId, id, user.role, updateUserDto.role);

    // If updating email, check for conflicts
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.usersRepository.findOne({
        where: { email: updateUserDto.email }
      });
      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // If updating password, hash it
    if (updateUserDto.password) {
      user.passwordHash = await CryptoUtil.hashPassword(updateUserDto.password);
      delete updateUserDto.password;
    }

    Object.assign(user, updateUserDto);
    const updatedUser = await this.usersRepository.save(user);

    delete updatedUser.passwordHash;
    return updatedUser;
  }

  async remove(id: string, requestorRole: UserRole, requestorId: string): Promise<void> {
    // Only admins can delete users
    if (requestorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can delete users');
    }

    // Cannot delete yourself
    if (requestorId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    const result = await this.usersRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }
  }

  async updateStatus(id: string, status: UserStatus, requestorRole: UserRole): Promise<User> {
    if (!this.canManageUsers(requestorRole)) {
      throw new ForbiddenException('You do not have permission to update user status');
    }

    const user = await this.usersRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.status = status;
    const updatedUser = await this.usersRepository.save(user);

    delete updatedUser.passwordHash;
    return updatedUser;
  }

  async getUserStats(role?: UserRole) {
    const where = role ? { role } : {};

    const [total, active, inactive, suspended, pending] = await Promise.all([
      this.usersRepository.count({ where }),
      this.usersRepository.count({ where: { ...where, status: UserStatus.ACTIVE } }),
      this.usersRepository.count({ where: { ...where, status: UserStatus.INACTIVE } }),
      this.usersRepository.count({ where: { ...where, status: UserStatus.SUSPENDED } }),
      this.usersRepository.count({ where: { ...where, status: UserStatus.PENDING_VERIFICATION } }),
    ]);

    return {
      total,
      active,
      inactive,
      suspended,
      pending,
    };
  }

  private validateUserCreation(creatorRole: UserRole, targetRole: UserRole): void {
    // Only admins can create other admins
    if (targetRole === UserRole.ADMIN && creatorRole !== UserRole.ADMIN) {
      throw new ForbiddenException('Only administrators can create admin accounts');
    }

    // Business owners can create airline agents and travel agents
    if (creatorRole === UserRole.BUSINESS_OWNER) {
      if (![UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT, UserRole.CUSTOMER].includes(targetRole)) {
        throw new ForbiddenException('Business owners can only create airline agents, travel agents, and customers');
      }
    }

    // Airline/Travel agents can only create customers
    if ([UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT].includes(creatorRole)) {
      if (targetRole !== UserRole.CUSTOMER) {
        throw new ForbiddenException('You can only create customer accounts');
      }
    }
  }

  private validateUserUpdate(
    requestorRole: UserRole,
    requestorId: string,
    targetId: string,
    targetCurrentRole: UserRole,
    targetNewRole?: UserRole
  ): void {
    // Users can update their own profile (except role and status)
    if (requestorId === targetId) {
      if (targetNewRole && targetNewRole !== targetCurrentRole) {
        throw new ForbiddenException('You cannot change your own role');
      }
      return;
    }

    // Only admins and business owners can update other users
    if (!this.canManageUsers(requestorRole)) {
      throw new ForbiddenException('You do not have permission to update other users');
    }

    // Business owners cannot modify admins
    if (requestorRole === UserRole.BUSINESS_OWNER && targetCurrentRole === UserRole.ADMIN) {
      throw new ForbiddenException('Business owners cannot modify administrator accounts');
    }
  }

  private canManageUsers(role: UserRole): boolean {
    return [UserRole.ADMIN, UserRole.BUSINESS_OWNER].includes(role);
  }
}
