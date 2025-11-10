import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { BookingService } from '../booking.service';
import { Booking, User } from '@flight-booking/database';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { EventService } from '@flight-booking/common';

describe('BookingService', () => {
  let service: BookingService;
  let bookingRepository: Repository<Booking>;
  let eventService: EventService;

  const mockUser: User = {
    id: '1',
    email: 'customer@example.com',
    role: 'CUSTOMER',
    firstName: 'John',
    lastName: 'Doe',
  } as User;

  const mockBooking: Booking = {
    id: '1',
    bookingReference: 'BK123456',
    userId: '1',
    flightId: 'FL001',
    status: 'PENDING',
    passengers: [
      {
        firstName: 'John',
        lastName: 'Doe',
        dateOfBirth: '1990-01-01',
        passportNumber: 'P12345678',
        nationality: 'US',
      },
    ],
    totalAmount: 500,
    currency: 'USD',
    contactEmail: 'customer@example.com',
    contactPhone: '+1234567890',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Booking;

  const mockBookingRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    update: jest.fn(),
  };

  const mockEventService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookingService,
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
      ],
    }).compile();

    service = module.get<BookingService>(BookingService);
    bookingRepository = module.get<Repository<Booking>>(
      getRepositoryToken(Booking),
    );
    eventService = module.get<EventService>(EventService);

    jest.clearAllMocks();
  });

  describe('createBooking', () => {
    it('should successfully create a new booking', async () => {
      const createBookingDto = {
        flightId: 'FL001',
        passengers: [
          {
            firstName: 'John',
            lastName: 'Doe',
            dateOfBirth: '1990-01-01',
            passportNumber: 'P12345678',
            nationality: 'US',
          },
        ],
        contactEmail: 'customer@example.com',
        contactPhone: '+1234567890',
        totalAmount: 500,
        currency: 'USD',
      };

      mockBookingRepository.create.mockReturnValue({
        ...createBookingDto,
        userId: mockUser.id,
        bookingReference: 'BK123456',
        status: 'PENDING',
      });

      mockBookingRepository.save.mockResolvedValue({
        ...mockBooking,
        id: '1',
      });

      const result = await service.createBooking(createBookingDto, mockUser);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('PENDING');
      expect(result.bookingReference).toMatch(/^BK[A-Z0-9]{6}$/);
      expect(mockBookingRepository.save).toHaveBeenCalled();
      expect(mockEventService.publish).toHaveBeenCalledWith(
        'booking.created',
        expect.objectContaining({
          bookingId: result.id,
          userId: mockUser.id,
        }),
      );
    });

    it('should throw BadRequestException for invalid passenger data', async () => {
      const createBookingDto = {
        flightId: 'FL001',
        passengers: [], // Empty passengers array
        contactEmail: 'customer@example.com',
        contactPhone: '+1234567890',
        totalAmount: 500,
        currency: 'USD',
      };

      await expect(
        service.createBooking(createBookingDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getBookingById', () => {
    it('should return a booking by id', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);

      const result = await service.getBookingById('1', mockUser);

      expect(result).toEqual(mockBooking);
      expect(mockBookingRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1', userId: mockUser.id },
        relations: ['flight', 'user'],
      });
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockBookingRepository.findOne.mockResolvedValue(null);

      await expect(service.getBookingById('999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should allow admin to view any booking', async () => {
      const adminUser = { ...mockUser, role: 'ADMIN' };
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);

      const result = await service.getBookingById('1', adminUser);

      expect(result).toEqual(mockBooking);
      expect(mockBookingRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['flight', 'user'],
      });
    });
  });

  describe('getUserBookings', () => {
    it('should return all bookings for a user', async () => {
      const bookings = [mockBooking, { ...mockBooking, id: '2' }];
      mockBookingRepository.find.mockResolvedValue(bookings);

      const result = await service.getUserBookings(mockUser);

      expect(result).toEqual(bookings);
      expect(result).toHaveLength(2);
      expect(mockBookingRepository.find).toHaveBeenCalledWith({
        where: { userId: mockUser.id },
        relations: ['flight'],
        order: { createdAt: 'DESC' },
      });
    });

    it('should return empty array if no bookings found', async () => {
      mockBookingRepository.find.mockResolvedValue([]);

      const result = await service.getUserBookings(mockUser);

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });
  });

  describe('updateBookingStatus', () => {
    it('should successfully update booking status', async () => {
      const updateStatusDto = { status: 'CONFIRMED' };
      const updatedBooking = { ...mockBooking, status: 'CONFIRMED' };

      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockBookingRepository.save.mockResolvedValue(updatedBooking);

      const result = await service.updateBookingStatus(
        '1',
        updateStatusDto,
        mockUser,
      );

      expect(result.status).toBe('CONFIRMED');
      expect(mockBookingRepository.save).toHaveBeenCalled();
      expect(mockEventService.publish).toHaveBeenCalledWith(
        'booking.status_updated',
        expect.objectContaining({
          bookingId: '1',
          status: 'CONFIRMED',
        }),
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockBookingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateBookingStatus('999', { status: 'CONFIRMED' }, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException for invalid status transition', async () => {
      const cancelledBooking = { ...mockBooking, status: 'CANCELLED' };
      mockBookingRepository.findOne.mockResolvedValue(cancelledBooking);

      await expect(
        service.updateBookingStatus('1', { status: 'CONFIRMED' }, mockUser),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancelBooking', () => {
    it('should successfully cancel a booking', async () => {
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      const cancelledBooking = { ...mockBooking, status: 'CANCELLED' };
      mockBookingRepository.save.mockResolvedValue(cancelledBooking);

      const result = await service.cancelBooking('1', mockUser);

      expect(result.status).toBe('CANCELLED');
      expect(mockEventService.publish).toHaveBeenCalledWith(
        'booking.cancelled',
        expect.objectContaining({
          bookingId: '1',
        }),
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      mockBookingRepository.findOne.mockResolvedValue(null);

      await expect(service.cancelBooking('999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if already cancelled', async () => {
      const cancelledBooking = { ...mockBooking, status: 'CANCELLED' };
      mockBookingRepository.findOne.mockResolvedValue(cancelledBooking);

      await expect(service.cancelBooking('1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
