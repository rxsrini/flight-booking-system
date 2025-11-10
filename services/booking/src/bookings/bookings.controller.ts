import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  UseGuards,
  Request,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { BookingsService } from './bookings.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';
import { JwtAuthGuard, RolesGuard, Roles, ResponseUtil } from '@shared/common';
import { UserRole, ApiResponse } from '@shared/types';

@Controller('bookings')
@UseGuards(JwtAuthGuard, RolesGuard)
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  async create(@Body() createBookingDto: CreateBookingDto, @Request() req): Promise<ApiResponse> {
    const booking = await this.bookingsService.create(
      createBookingDto,
      req.user.id,
      req.user.role
    );
    return ResponseUtil.success(booking, 'Booking created successfully');
  }

  @Get()
  async findAll(@Query() queryDto: QueryBookingDto, @Request() req): Promise<ApiResponse> {
    const result = await this.bookingsService.findAll(queryDto, req.user.id, req.user.role);
    return ResponseUtil.paginated(result.bookings, result.meta, 'Bookings retrieved successfully');
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getStats(@Query('userId') userId?: string): Promise<ApiResponse> {
    const stats = await this.bookingsService.getBookingStats(userId);
    return ResponseUtil.success(stats, 'Booking statistics retrieved successfully');
  }

  @Get('my-bookings')
  async getMyBookings(@Query() queryDto: QueryBookingDto, @Request() req): Promise<ApiResponse> {
    // Force filter by current user
    queryDto.userId = req.user.id;
    const result = await this.bookingsService.findAll(queryDto, req.user.id, req.user.role);
    return ResponseUtil.paginated(result.bookings, result.meta, 'Your bookings retrieved successfully');
  }

  @Get('pnr/:pnr')
  async findByPNR(@Param('pnr') pnr: string, @Request() req): Promise<ApiResponse> {
    const booking = await this.bookingsService.findByPNR(pnr, req.user.id, req.user.role);
    return ResponseUtil.success(booking, 'Booking retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    const booking = await this.bookingsService.findOne(id, req.user.id, req.user.role);
    return ResponseUtil.success(booking, 'Booking retrieved successfully');
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async cancel(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    const booking = await this.bookingsService.cancel(id, req.user.id, req.user.role);
    return ResponseUtil.success(booking, 'Booking cancelled successfully');
  }
}
