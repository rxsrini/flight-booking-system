import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Booking, Payment, User, Flight, Airline, Airport } from '@shared/database';
import { UserRole, BookingStatus, PaymentStatus } from '@shared/types';
import { DateRangeQueryDto, TimeGrouping } from './dto/date-range-query.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Flight)
    private flightRepository: Repository<Flight>,
    @InjectRepository(Airline)
    private airlineRepository: Repository<Airline>,
    @InjectRepository(Airport)
    private airportRepository: Repository<Airport>,
  ) {}

  /**
   * Check if user has access to analytics
   */
  private checkAnalyticsAccess(userRole: UserRole): void {
    const allowedRoles = [
      UserRole.ADMIN,
      UserRole.BUSINESS_OWNER,
      UserRole.AIRLINE_AGENT,
    ];

    if (!allowedRoles.includes(userRole)) {
      throw new ForbiddenException('You do not have access to analytics');
    }
  }

  /**
   * Get date range for queries
   */
  private getDateRange(queryDto: DateRangeQueryDto): { startDate: Date; endDate: Date } {
    const endDate = queryDto.endDate ? new Date(queryDto.endDate) : new Date();
    const startDate = queryDto.startDate
      ? new Date(queryDto.startDate)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // Default 30 days

    return { startDate, endDate };
  }

  /**
   * Dashboard Overview - Key metrics at a glance
   */
  async getDashboardOverview(userRole: UserRole, queryDto: DateRangeQueryDto) {
    this.checkAnalyticsAccess(userRole);

    const { startDate, endDate } = this.getDateRange(queryDto);

    const [
      totalBookings,
      confirmedBookings,
      totalRevenue,
      totalUsers,
      activeUsers,
      averageBookingValue,
    ] = await Promise.all([
      // Total bookings in period
      this.bookingRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
        },
      }),

      // Confirmed bookings
      this.bookingRepository.count({
        where: {
          createdAt: Between(startDate, endDate),
          status: BookingStatus.CONFIRMED,
        },
      }),

      // Total revenue
      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('payment.status IN (:...statuses)', {
          statuses: [PaymentStatus.SUCCEEDED],
        })
        .getRawOne()
        .then((result) => parseFloat(result.total)),

      // Total users (all time)
      this.userRepository.count(),

      // Active users (users who made bookings in period)
      this.bookingRepository
        .createQueryBuilder('booking')
        .select('COUNT(DISTINCT booking.userId)', 'count')
        .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .getRawOne()
        .then((result) => parseInt(result.count)),

      // Average booking value
      this.bookingRepository
        .createQueryBuilder('booking')
        .select('COALESCE(AVG(booking.totalPrice), 0)', 'average')
        .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
        .andWhere('booking.status IN (:...statuses)', {
          statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED],
        })
        .getRawOne()
        .then((result) => parseFloat(result.average)),
    ]);

    // Calculate growth rates (compare to previous period)
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStartDate = new Date(startDate.getTime() - periodLength);
    const previousEndDate = startDate;

    const [previousBookings, previousRevenue] = await Promise.all([
      this.bookingRepository.count({
        where: {
          createdAt: Between(previousStartDate, previousEndDate),
        },
      }),

      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .where('payment.createdAt BETWEEN :startDate AND :endDate', {
          startDate: previousStartDate,
          endDate: previousEndDate,
        })
        .andWhere('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
        .getRawOne()
        .then((result) => parseFloat(result.total)),
    ]);

    const bookingGrowth = previousBookings > 0
      ? ((totalBookings - previousBookings) / previousBookings) * 100
      : 0;

    const revenueGrowth = previousRevenue > 0
      ? ((totalRevenue - previousRevenue) / previousRevenue) * 100
      : 0;

    return {
      period: {
        startDate,
        endDate,
        days: Math.ceil(periodLength / (24 * 60 * 60 * 1000)),
      },
      metrics: {
        totalBookings,
        confirmedBookings,
        bookingConfirmationRate: totalBookings > 0
          ? (confirmedBookings / totalBookings) * 100
          : 0,
        totalRevenue,
        averageBookingValue,
        totalUsers,
        activeUsers,
        userEngagementRate: totalUsers > 0
          ? (activeUsers / totalUsers) * 100
          : 0,
      },
      growth: {
        bookings: bookingGrowth,
        revenue: revenueGrowth,
      },
    };
  }

  /**
   * Booking Analytics - Detailed booking metrics
   */
  async getBookingAnalytics(userRole: UserRole, queryDto: DateRangeQueryDto) {
    this.checkAnalyticsAccess(userRole);

    const { startDate, endDate } = this.getDateRange(queryDto);

    // Bookings by status
    const bookingsByStatus = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('booking.status')
      .getRawMany();

    // Bookings over time
    const bookingsTrend = await this.getBookingsTrend(startDate, endDate, queryDto.groupBy);

    // Bookings by cabin class
    const bookingsByCabinClass = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('booking.cabinClass', 'cabinClass')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('booking.cabinClass')
      .getRawMany();

    // Top booking creators (agents)
    const topAgents = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.creator', 'creator')
      .select('creator.id', 'userId')
      .addSelect('creator.firstName', 'firstName')
      .addSelect('creator.lastName', 'lastName')
      .addSelect('creator.role', 'role')
      .addSelect('COUNT(*)', 'bookingCount')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'totalRevenue')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('creator.role IN (:...roles)', {
        roles: [UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT],
      })
      .groupBy('creator.id')
      .addGroupBy('creator.firstName')
      .addGroupBy('creator.lastName')
      .addGroupBy('creator.role')
      .orderBy('COUNT(*)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      period: { startDate, endDate },
      byStatus: bookingsByStatus,
      trend: bookingsTrend,
      byCabinClass: bookingsByCabinClass,
      topAgents,
    };
  }

  /**
   * Revenue Analytics - Financial metrics
   */
  async getRevenueAnalytics(userRole: UserRole, queryDto: DateRangeQueryDto) {
    this.checkAnalyticsAccess(userRole);

    const { startDate, endDate } = this.getDateRange(queryDto);

    // Total revenue breakdown
    const revenueBreakdown = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'totalAmount')
      .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('payment.status')
      .getRawMany();

    // Revenue trend over time
    const revenueTrend = await this.getRevenueTrend(startDate, endDate, queryDto.groupBy);

    // Revenue by payment method
    const revenueByMethod = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('payment.method', 'method')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'totalAmount')
      .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .groupBy('payment.method')
      .getRawMany();

    // Daily revenue statistics
    const dailyStats = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('DATE(payment.createdAt)', 'date')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .addSelect('COALESCE(AVG(payment.amount), 0)', 'averageTransaction')
      .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .groupBy('DATE(payment.createdAt)')
      .orderBy('DATE(payment.createdAt)', 'DESC')
      .limit(30)
      .getRawMany();

    // Calculate metrics
    const totalRevenue = revenueBreakdown
      .filter((r) => r.status === PaymentStatus.SUCCEEDED)
      .reduce((sum, r) => sum + parseFloat(r.totalAmount), 0);

    const totalTransactions = revenueBreakdown
      .filter((r) => r.status === PaymentStatus.SUCCEEDED)
      .reduce((sum, r) => sum + parseInt(r.count), 0);

    const averageTransactionValue = totalTransactions > 0
      ? totalRevenue / totalTransactions
      : 0;

    return {
      period: { startDate, endDate },
      summary: {
        totalRevenue,
        totalTransactions,
        averageTransactionValue,
      },
      breakdown: revenueBreakdown,
      trend: revenueTrend,
      byPaymentMethod: revenueByMethod,
      daily: dailyStats,
    };
  }

  /**
   * User Analytics - User behavior and engagement
   */
  async getUserAnalytics(userRole: UserRole, queryDto: DateRangeQueryDto) {
    this.checkAnalyticsAccess(userRole);

    const { startDate, endDate } = this.getDateRange(queryDto);

    // Users by role
    const usersByRole = await this.userRepository
      .createQueryBuilder('user')
      .select('user.role', 'role')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.role')
      .getRawMany();

    // Users by status
    const usersByStatus = await this.userRepository
      .createQueryBuilder('user')
      .select('user.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('user.status')
      .getRawMany();

    // New users over time
    const newUsersTrend = await this.userRepository
      .createQueryBuilder('user')
      .select('DATE(user.createdAt)', 'date')
      .addSelect('COUNT(*)', 'count')
      .where('user.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('DATE(user.createdAt)')
      .orderBy('DATE(user.createdAt)', 'ASC')
      .getRawMany();

    // Active users (users who made bookings)
    const activeUsers = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.user', 'user')
      .select('user.id', 'userId')
      .addSelect('user.email', 'email')
      .addSelect('user.firstName', 'firstName')
      .addSelect('user.lastName', 'lastName')
      .addSelect('COUNT(booking.id)', 'bookingCount')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'totalSpent')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('user.id')
      .addGroupBy('user.email')
      .addGroupBy('user.firstName')
      .addGroupBy('user.lastName')
      .orderBy('COUNT(booking.id)', 'DESC')
      .limit(20)
      .getRawMany();

    return {
      period: { startDate, endDate },
      byRole: usersByRole,
      byStatus: usersByStatus,
      newUsersTrend,
      topCustomers: activeUsers,
    };
  }

  /**
   * Flight Analytics - Popular routes and airlines
   */
  async getFlightAnalytics(userRole: UserRole, queryDto: DateRangeQueryDto) {
    this.checkAnalyticsAccess(userRole);

    const { startDate, endDate } = this.getDateRange(queryDto);

    // Popular routes (most booked)
    const popularRoutes = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.flight', 'flight')
      .leftJoin('flight.originAirport', 'origin')
      .leftJoin('flight.destinationAirport', 'destination')
      .select('origin.code', 'originCode')
      .addSelect('origin.city', 'originCity')
      .addSelect('destination.code', 'destinationCode')
      .addSelect('destination.city', 'destinationCity')
      .addSelect('COUNT(booking.id)', 'bookingCount')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'totalRevenue')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('origin.code')
      .addGroupBy('origin.city')
      .addGroupBy('destination.code')
      .addGroupBy('destination.city')
      .orderBy('COUNT(booking.id)', 'DESC')
      .limit(10)
      .getRawMany();

    // Top airlines by bookings
    const topAirlines = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.flight', 'flight')
      .leftJoin('flight.airline', 'airline')
      .select('airline.code', 'airlineCode')
      .addSelect('airline.name', 'airlineName')
      .addSelect('COUNT(booking.id)', 'bookingCount')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'totalRevenue')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('airline.code')
      .addGroupBy('airline.name')
      .orderBy('COUNT(booking.id)', 'DESC')
      .limit(10)
      .getRawMany();

    // Busiest airports (origin)
    const busiestOrigins = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.flight', 'flight')
      .leftJoin('flight.originAirport', 'airport')
      .select('airport.code', 'code')
      .addSelect('airport.name', 'name')
      .addSelect('airport.city', 'city')
      .addSelect('COUNT(booking.id)', 'departureCount')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('airport.code')
      .addGroupBy('airport.name')
      .addGroupBy('airport.city')
      .orderBy('COUNT(booking.id)', 'DESC')
      .limit(10)
      .getRawMany();

    // Busiest airports (destination)
    const busiestDestinations = await this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoin('booking.flight', 'flight')
      .leftJoin('flight.destinationAirport', 'airport')
      .select('airport.code', 'code')
      .addSelect('airport.name', 'name')
      .addSelect('airport.city', 'city')
      .addSelect('COUNT(booking.id)', 'arrivalCount')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('airport.code')
      .addGroupBy('airport.name')
      .addGroupBy('airport.city')
      .orderBy('COUNT(booking.id)', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      period: { startDate, endDate },
      popularRoutes,
      topAirlines,
      busiestOrigins,
      busiestDestinations,
    };
  }

  /**
   * Real-time metrics - Current system state
   */
  async getRealTimeMetrics(userRole: UserRole) {
    this.checkAnalyticsAccess(userRole);

    const now = new Date();
    const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last1Hour = new Date(now.getTime() - 60 * 60 * 1000);

    const [
      bookingsLast24h,
      bookingsLast1h,
      revenueLast24h,
      pendingPayments,
      activeUsers24h,
    ] = await Promise.all([
      this.bookingRepository.count({
        where: { createdAt: Between(last24Hours, now) },
      }),

      this.bookingRepository.count({
        where: { createdAt: Between(last1Hour, now) },
      }),

      this.paymentRepository
        .createQueryBuilder('payment')
        .select('COALESCE(SUM(payment.amount), 0)', 'total')
        .where('payment.createdAt BETWEEN :start AND :end', { start: last24Hours, end: now })
        .andWhere('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
        .getRawOne()
        .then((result) => parseFloat(result.total)),

      this.paymentRepository.count({
        where: { status: PaymentStatus.PENDING },
      }),

      this.bookingRepository
        .createQueryBuilder('booking')
        .select('COUNT(DISTINCT booking.userId)', 'count')
        .where('booking.createdAt BETWEEN :start AND :end', { start: last24Hours, end: now })
        .getRawOne()
        .then((result) => parseInt(result.count)),
    ]);

    return {
      timestamp: now,
      last24Hours: {
        bookings: bookingsLast24h,
        revenue: revenueLast24h,
        activeUsers: activeUsers24h,
      },
      last1Hour: {
        bookings: bookingsLast1h,
      },
      current: {
        pendingPayments,
      },
    };
  }

  /**
   * Helper: Get bookings trend over time
   */
  private async getBookingsTrend(startDate: Date, endDate: Date, groupBy?: TimeGrouping) {
    const dateFormat = this.getDateFormat(groupBy || TimeGrouping.DAY);

    return await this.bookingRepository
      .createQueryBuilder('booking')
      .select(`DATE_TRUNC('${groupBy || 'day'}', booking.createdAt)`, 'period')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(booking.totalPrice), 0)', 'revenue')
      .where('booking.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();
  }

  /**
   * Helper: Get revenue trend over time
   */
  private async getRevenueTrend(startDate: Date, endDate: Date, groupBy?: TimeGrouping) {
    return await this.paymentRepository
      .createQueryBuilder('payment')
      .select(`DATE_TRUNC('${groupBy || 'day'}', payment.createdAt)`, 'period')
      .addSelect('COUNT(*)', 'transactionCount')
      .addSelect('COALESCE(SUM(payment.amount), 0)', 'revenue')
      .where('payment.createdAt BETWEEN :startDate AND :endDate', { startDate, endDate })
      .andWhere('payment.status = :status', { status: PaymentStatus.SUCCEEDED })
      .groupBy('period')
      .orderBy('period', 'ASC')
      .getRawMany();
  }

  /**
   * Helper: Get date format for grouping
   */
  private getDateFormat(groupBy: TimeGrouping): string {
    switch (groupBy) {
      case TimeGrouping.HOUR:
        return 'YYYY-MM-DD HH24:00:00';
      case TimeGrouping.DAY:
        return 'YYYY-MM-DD';
      case TimeGrouping.WEEK:
        return 'IYYY-IW';
      case TimeGrouping.MONTH:
        return 'YYYY-MM';
      case TimeGrouping.YEAR:
        return 'YYYY';
      default:
        return 'YYYY-MM-DD';
    }
  }
}
