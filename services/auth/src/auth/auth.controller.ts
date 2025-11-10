import { Controller, Post, Body, UseGuards, Get, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { ResponseUtil, JwtAuthGuard } from '@shared/common';
import { ApiResponse } from '@shared/types';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterDto): Promise<ApiResponse> {
    const tokens = await this.authService.register(
      registerDto.email,
      registerDto.password,
      registerDto.firstName,
      registerDto.lastName,
      registerDto.role
    );

    return ResponseUtil.success(tokens, 'User registered successfully');
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto): Promise<ApiResponse> {
    const user = await this.authService.validateUser(
      loginDto.email,
      loginDto.password
    );

    if (!user) {
      return ResponseUtil.error('Invalid credentials');
    }

    const tokens = await this.authService.login(user);

    return ResponseUtil.success(tokens, 'Login successful');
  }

  @Post('refresh')
  async refreshToken(@Body('refreshToken') refreshToken: string): Promise<ApiResponse> {
    const tokens = await this.authService.refreshToken(refreshToken);

    return ResponseUtil.success(tokens, 'Token refreshed successfully');
  }

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req): Promise<ApiResponse> {
    return ResponseUtil.success(req.user, 'Profile fetched successfully');
  }

  @Post('verify')
  async verifyToken(@Body('token') token: string): Promise<ApiResponse> {
    const payload = await this.authService.verifyToken(token);

    return ResponseUtil.success(payload, 'Token is valid');
  }
}
