import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { JwtAuthGuard, RolesGuard, Roles, ResponseUtil } from '@shared/common';
import { UserRole, UserStatus, ApiResponse } from '@shared/types';

@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER, UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT)
  async create(@Body() createUserDto: CreateUserDto, @Request() req): Promise<ApiResponse> {
    const user = await this.usersService.create(createUserDto, req.user.role);
    return ResponseUtil.success(user, 'User created successfully');
  }

  @Get()
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async findAll(@Query() queryDto: QueryUserDto, @Request() req): Promise<ApiResponse> {
    const result = await this.usersService.findAll(queryDto, req.user.role);
    return ResponseUtil.paginated(result.users, result.meta, 'Users retrieved successfully');
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getStats(@Query('role') role?: UserRole): Promise<ApiResponse> {
    const stats = await this.usersService.getUserStats(role);
    return ResponseUtil.success(stats, 'User statistics retrieved successfully');
  }

  @Get('me')
  async getProfile(@Request() req): Promise<ApiResponse> {
    const user = await this.usersService.findOne(req.user.id, req.user.role, req.user.id);
    return ResponseUtil.success(user, 'Profile retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    const user = await this.usersService.findOne(id, req.user.role, req.user.id);
    return ResponseUtil.success(user, 'User retrieved successfully');
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto,
    @Request() req
  ): Promise<ApiResponse> {
    const user = await this.usersService.update(id, updateUserDto, req.user.role, req.user.id);
    return ResponseUtil.success(user, 'User updated successfully');
  }

  @Patch(':id/status')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @Request() req
  ): Promise<ApiResponse> {
    const user = await this.usersService.updateStatus(id, status, req.user.role);
    return ResponseUtil.success(user, 'User status updated successfully');
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string, @Request() req): Promise<void> {
    await this.usersService.remove(id, req.user.role, req.user.id);
  }
}
