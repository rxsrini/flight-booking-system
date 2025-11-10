import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, Like } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Booking, Flight, Passenger, User } from '@shared/database';
import { BookingStatus, UserRole, PaginationMeta } from '@shared/types';
import { CryptoUtil } from '@shared/common';
import { CreateBookingDto } from './dto/create-booking.dto';
import { QueryBookingDto } from './dto/query-booking.dto';

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(Flight)
    private flightRepository: Repository<Flight>,
    @InjectRepository(Passenger)
    private passengerRepository: Repository<Passenger>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private eventEmitter: EventEmitter2,
  ) {}

  async create(createBookingDto: CreateBookingDto, requestorId: string, requestorRole: UserRole): Promise<Booking> {
    // Determine the actual user for the booking
    const userId = createBookingDto.userId || requestorId;

    // Validate permissions
    if (createBookingDto.userId && createBookingDto.userId !== requestorId) {
      // Agent creating booking for customer
      if (![UserRole.ADMIN, UserRole.BUSINESS_OWNER, UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT].includes(requestorRole)) {
        throw new ForbiddenException('You do not have permission to create bookings for other users');
      }
    }

    // Validate flight exists and has availability
    const flight = await this.flightRepository.findOne({
      where: { id: createBookingDto.flightId },
      relations: ['airline', 'originAirport', 'destinationAirport', 'prices'],
    });

    if (!flight) {
      throw new NotFoundException('Flight not found');
    }

    if (flight.status !== 'SCHEDULED') {
      throw new BadRequestException('Flight is not available for booking');
    }

    // Check availability
    const price = flight.prices?.find(p => p.cabinClass === createBookingDto.cabinClass);
    const totalPassengers = createBookingDto.passengers.length;

    if (!price || price.availableSeats < totalPassengers) {
      throw new BadRequestException('Not enough seats available for the selected cabin class');
    }

    // Generate PNR
    const pnr = CryptoUtil.generatePNR();

    // Calculate total price
    const totalPrice = price.price * totalPassengers;

    // Create booking
    const booking = this.bookingRepository.create({
      userId,
      pnr,
      flightId: createBookingDto.flightId,
      cabinClass: createBookingDto.cabinClass,
      totalPrice,
      currency: flight.currency,
      status: BookingStatus.PENDING,
      contactEmail: createBookingDto.contactInfo.email,
      contactPhone: createBookingDto.contactInfo.phone,
      createdBy: requestorId,
    });

    const savedBooking = await this.bookingRepository.save(booking);

    // Create passengers
    const passengers = createBookingDto.passengers.map(p =>
      this.passengerRepository.create({
        ...p,
        bookingId: savedBooking.id,
        dateOfBirth: new Date(p.dateOfBirth),
        passportExpiry: p.passportExpiry ? new Date(p.passportExpiry) : undefined,
      })
    );

    await this.passengerRepository.save(passengers);

    // Update flight availability
    await this.flightRepository
      .createQueryBuilder()
      .update(Flight)
      .set({ availableSeats: () => `available_seats - ${totalPassengers}` })
      .where('id = :id', { id: flight.id })
      .execute();

    // Emit event for WebSocket notification
    this.eventEmitter.emit('booking.created', {
      booking: savedBooking,
      passengers,
      flight,
      userId,
    });

    this.logger.log(`Booking created: ${pnr} for user ${userId}`);

    // Return booking with relations
    return this.findOne(savedBooking.id, requestorId, requestorRole);
  }

  async findAll(queryDto: QueryBookingDto, requestorId: string, requestorRole: UserRole) {
    const {
      page = 1,
      limit = 10,
      status,
      userId,
      startDate,
      endDate,
      search,
      sortBy = 'createdAt',
      sortOrder = 'DESC'
    } = queryDto;

    const queryBuilder = this.bookingRepository
      .createQueryBuilder('booking')
      .leftJoinAndSelect('booking.flight', 'flight')
      .leftJoinAndSelect('flight.airline', 'airline')
      .leftJoinAndSelect('flight.originAirport', 'originAirport')
      .leftJoinAndSelect('flight.destinationAirport', 'destinationAirport')
      .leftJoinAndSelect('booking.passengers', 'passengers')
      .leftJoinAndSelect('booking.user', 'user');

    // Apply filters based on role
    if (requestorRole === UserRole.CUSTOMER) {
      // Customers can only see their own bookings
      queryBuilder.where('booking.userId = :requestorId', { requestorId });
    } else if ([UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT].includes(requestorRole)) {
      // Agents can see bookings they created
      queryBuilder.where('booking.createdBy = :requestorId', { requestorId });
    }
    // Admins and Business Owners can see all bookings

    // Apply additional filters
    if (status) {
      queryBuilder.andWhere('booking.status = :status', { status });
    }

    if (userId && [UserRole.ADMIN, UserRole.BUSINESS_OWNER].includes(requestorRole)) {
      queryBuilder.andWhere('booking.userId = :userId', { userId });
    }

    if (startDate) {
      queryBuilder.andWhere('booking.createdAt >= :startDate', { startDate: new Date(startDate) });
    }

    if (endDate) {
      queryBuilder.andWhere('booking.createdAt <= :endDate', { endDate: new Date(endDate) });
    }

    if (search) {
      queryBuilder.andWhere(
        '(booking.pnr ILIKE :search OR passengers.firstName ILIKE :search OR passengers.lastName ILIKE :search)',
        { search: `%${search}%` }
      );
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Sorting
    queryBuilder.orderBy(`booking.${sortBy}`, sortOrder);

    const [bookings, total] = await queryBuilder.getManyAndCount();

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { bookings, meta };
  }

  async findOne(id: string, requestorId: string, requestorRole: UserRole): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['flight', 'flight.airline', 'flight.originAirport', 'flight.destinationAirport', 'passengers', 'user', 'creator'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    this.validateBookingAccess(booking, requestorId, requestorRole);

    return booking;
  }

  async findByPNR(pnr: string, requestorId: string, requestorRole: UserRole): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { pnr },
      relations: ['flight', 'flight.airline', 'flight.originAirport', 'flight.destinationAirport', 'passengers', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    this.validateBookingAccess(booking, requestorId, requestorRole);

    return booking;
  }

  async cancel(id: string, requestorId: string, requestorRole: UserRole): Promise<Booking> {
    const booking = await this.findOne(id, requestorId, requestorRole);

    if (booking.status === BookingStatus.CANCELLED) {
      throw new BadRequestException('Booking is already cancelled');
    }

    if (booking.status === BookingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed booking');
    }

    // Update booking status
    booking.status = BookingStatus.CANCELLED;
    booking.cancelledAt = new Date();

    await this.bookingRepository.save(booking);

    // Restore flight availability
    const passengerCount = booking.passengers.length;
    await this.flightRepository
      .createQueryBuilder()
      .update(Flight)
      .set({ availableSeats: () => `available_seats + ${passengerCount}` })
      .where('id = :id', { id: booking.flightId })
      .execute();

    // Emit event for WebSocket notification
    this.eventEmitter.emit('booking.cancelled', {
      booking,
      userId: booking.userId,
    });

    this.logger.log(`Booking cancelled: ${booking.pnr}`);

    return booking;
  }

  async confirm(id: string, paymentId: string): Promise<Booking> {
    const booking = await this.bookingRepository.findOne({
      where: { id },
      relations: ['flight', 'passengers', 'user'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    if (booking.status !== BookingStatus.PENDING) {
      throw new BadRequestException('Only pending bookings can be confirmed');
    }

    // Update booking
    booking.status = BookingStatus.CONFIRMED;
    booking.paymentId = paymentId;
    booking.confirmedAt = new Date();

    await this.bookingRepository.save(booking);

    // Emit event for WebSocket notification
    this.eventEmitter.emit('booking.confirmed', {
      booking,
      userId: booking.userId,
    });

    this.logger.log(`Booking confirmed: ${booking.pnr}`);

    return booking;
  }

  async getBookingStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [total, pending, confirmed, cancelled, completed] = await Promise.all([
      this.bookingRepository.count({ where }),
      this.bookingRepository.count({ where: { ...where, status: BookingStatus.PENDING } }),
      this.bookingRepository.count({ where: { ...where, status: BookingStatus.CONFIRMED } }),
      this.bookingRepository.count({ where: { ...where, status: BookingStatus.CANCELLED } }),
      this.bookingRepository.count({ where: { ...where, status: BookingStatus.COMPLETED } }),
    ]);

    const revenue = await this.bookingRepository
      .createQueryBuilder('booking')
      .select('SUM(booking.totalPrice)', 'total')
      .where(userId ? 'booking.userId = :userId' : '1=1', { userId })
      .andWhere('booking.status IN (:...statuses)', {
        statuses: [BookingStatus.CONFIRMED, BookingStatus.COMPLETED]
      })
      .getRawOne();

    return {
      total,
      pending,
      confirmed,
      cancelled,
      completed,
      revenue: parseFloat(revenue?.total || 0),
    };
  }

  private validateBookingAccess(booking: Booking, requestorId: string, requestorRole: UserRole): void {
    // Admins and Business Owners can access all bookings
    if ([UserRole.ADMIN, UserRole.BUSINESS_OWNER].includes(requestorRole)) {
      return;
    }

    // Customers can only access their own bookings
    if (requestorRole === UserRole.CUSTOMER && booking.userId !== requestorId) {
      throw new ForbiddenException('You can only access your own bookings');
    }

    // Agents can access bookings they created
    if ([UserRole.AIRLINE_AGENT, UserRole.TRAVEL_AGENT].includes(requestorRole)) {
      if (booking.createdBy !== requestorId) {
        throw new ForbiddenException('You can only access bookings you created');
      }
    }
  }
}
