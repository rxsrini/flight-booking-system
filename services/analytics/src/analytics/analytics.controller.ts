import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { DateRangeQueryDto } from './dto/date-range-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@flight-booking/types';
import { CurrentUser } from '../decorators/current-user.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER, UserRole.AIRLINE_AGENT)
  async getDashboardOverview(
    @CurrentUser() user: any,
    @Query() queryDto: DateRangeQueryDto,
  ) {
    return this.analyticsService.getDashboardOverview(user.role, queryDto);
  }

  @Get('bookings')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER, UserRole.AIRLINE_AGENT)
  async getBookingAnalytics(
    @CurrentUser() user: any,
    @Query() queryDto: DateRangeQueryDto,
  ) {
    return this.analyticsService.getBookingAnalytics(user.role, queryDto);
  }

  @Get('revenue')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getRevenueAnalytics(
    @CurrentUser() user: any,
    @Query() queryDto: DateRangeQueryDto,
  ) {
    return this.analyticsService.getRevenueAnalytics(user.role, queryDto);
  }

  @Get('users')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getUserAnalytics(
    @CurrentUser() user: any,
    @Query() queryDto: DateRangeQueryDto,
  ) {
    return this.analyticsService.getUserAnalytics(user.role, queryDto);
  }

  @Get('flights')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER, UserRole.AIRLINE_AGENT)
  async getFlightAnalytics(
    @CurrentUser() user: any,
    @Query() queryDto: DateRangeQueryDto,
  ) {
    return this.analyticsService.getFlightAnalytics(user.role, queryDto);
  }

  @Get('realtime')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER, UserRole.AIRLINE_AGENT)
  async getRealTimeMetrics(@CurrentUser() user: any) {
    return this.analyticsService.getRealTimeMetrics(user.role);
  }
}
