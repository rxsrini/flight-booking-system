import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { PaymentService } from '../payment.service';
import { Payment, Booking, User } from '@flight-booking/database';
import { Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { StripeService } from '../stripe.service';
import { EncryptionService } from '../../encryption/encryption.service';
import { EventService } from '@flight-booking/common';

describe('PaymentService', () => {
  let service: PaymentService;
  let paymentRepository: Repository<Payment>;
  let bookingRepository: Repository<Booking>;
  let stripeService: StripeService;
  let encryptionService: EncryptionService;
  let eventService: EventService;

  const mockUser: User = {
    id: '1',
    email: 'customer@example.com',
    role: 'CUSTOMER',
  } as User;

  const mockBooking: Booking = {
    id: '1',
    bookingReference: 'BK123456',
    userId: '1',
    status: 'PENDING',
    totalAmount: 500,
    currency: 'USD',
  } as Booking;

  const mockPayment: Payment = {
    id: '1',
    bookingId: '1',
    amount: 500,
    currency: 'USD',
    status: 'SUCCEEDED',
    paymentMethod: 'card',
    stripePaymentIntentId: 'pi_123456',
    encryptedCardNumber: 'encrypted_card',
    cardLast4: '4242',
    cardBrand: 'visa',
    createdAt: new Date(),
    updatedAt: new Date(),
  } as Payment;

  const mockPaymentRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockBookingRepository = {
    findOne: jest.fn(),
    save: jest.fn(),
  };

  const mockStripeService = {
    createPaymentIntent: jest.fn(),
    confirmPayment: jest.fn(),
    refundPayment: jest.fn(),
  };

  const mockEncryptionService = {
    encrypt: jest.fn(),
    decrypt: jest.fn(),
  };

  const mockEventService = {
    publish: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentService,
        {
          provide: getRepositoryToken(Payment),
          useValue: mockPaymentRepository,
        },
        {
          provide: getRepositoryToken(Booking),
          useValue: mockBookingRepository,
        },
        {
          provide: StripeService,
          useValue: mockStripeService,
        },
        {
          provide: EncryptionService,
          useValue: mockEncryptionService,
        },
        {
          provide: EventService,
          useValue: mockEventService,
        },
      ],
    }).compile();

    service = module.get<PaymentService>(PaymentService);
    paymentRepository = module.get<Repository<Payment>>(
      getRepositoryToken(Payment),
    );
    bookingRepository = module.get<Repository<Booking>>(
      getRepositoryToken(Booking),
    );
    stripeService = module.get<StripeService>(StripeService);
    encryptionService = module.get<EncryptionService>(EncryptionService);
    eventService = module.get<EventService>(EventService);

    jest.clearAllMocks();
  });

  describe('createPayment', () => {
    it('should successfully create a payment', async () => {
      const createPaymentDto = {
        bookingId: '1',
        paymentMethodId: 'pm_123456',
        cardNumber: '4242424242424242',
        cardExpMonth: 12,
        cardExpYear: 2025,
        cardCvc: '123',
      };

      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockStripeService.createPaymentIntent.mockResolvedValue({
        id: 'pi_123456',
        status: 'succeeded',
        amount: 50000,
        currency: 'usd',
      });
      mockEncryptionService.encrypt.mockReturnValue('encrypted_card_number');
      mockPaymentRepository.create.mockReturnValue(mockPayment);
      mockPaymentRepository.save.mockResolvedValue(mockPayment);

      const result = await service.createPayment(createPaymentDto, mockUser);

      expect(result).toHaveProperty('id');
      expect(result.status).toBe('SUCCEEDED');
      expect(mockStripeService.createPaymentIntent).toHaveBeenCalled();
      expect(mockEncryptionService.encrypt).toHaveBeenCalledWith(
        createPaymentDto.cardNumber,
      );
      expect(mockEventService.publish).toHaveBeenCalledWith(
        'payment.succeeded',
        expect.objectContaining({
          paymentId: result.id,
          bookingId: createPaymentDto.bookingId,
        }),
      );
    });

    it('should throw NotFoundException if booking not found', async () => {
      const createPaymentDto = {
        bookingId: '999',
        paymentMethodId: 'pm_123456',
        cardNumber: '4242424242424242',
        cardExpMonth: 12,
        cardExpYear: 2025,
        cardCvc: '123',
      };

      mockBookingRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createPayment(createPaymentDto, mockUser),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if booking already paid', async () => {
      const paidBooking = { ...mockBooking, status: 'CONFIRMED' };
      const createPaymentDto = {
        bookingId: '1',
        paymentMethodId: 'pm_123456',
        cardNumber: '4242424242424242',
        cardExpMonth: 12,
        cardExpYear: 2025,
        cardCvc: '123',
      };

      mockBookingRepository.findOne.mockResolvedValue(paidBooking);
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      await expect(
        service.createPayment(createPaymentDto, mockUser),
      ).rejects.toThrow(BadRequestException);
    });

    it('should handle Stripe payment failure', async () => {
      const createPaymentDto = {
        bookingId: '1',
        paymentMethodId: 'pm_123456',
        cardNumber: '4242424242424242',
        cardExpMonth: 12,
        cardExpYear: 2025,
        cardCvc: '123',
      };

      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockStripeService.createPaymentIntent.mockRejectedValue(
        new Error('Payment declined'),
      );

      await expect(
        service.createPayment(createPaymentDto, mockUser),
      ).rejects.toThrow();
    });
  });

  describe('getPaymentById', () => {
    it('should return a payment by id', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);

      const result = await service.getPaymentById('1', mockUser);

      expect(result).toEqual(mockPayment);
      expect(mockPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['booking'],
      });
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.getPaymentById('999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('refundPayment', () => {
    it('should successfully refund a payment', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(mockPayment);
      mockBookingRepository.findOne.mockResolvedValue(mockBooking);
      mockStripeService.refundPayment.mockResolvedValue({
        id: 're_123456',
        status: 'succeeded',
        amount: 50000,
      });

      const refundedPayment = { ...mockPayment, status: 'REFUNDED' };
      mockPaymentRepository.save.mockResolvedValue(refundedPayment);

      const result = await service.refundPayment('1', mockUser);

      expect(result.status).toBe('REFUNDED');
      expect(mockStripeService.refundPayment).toHaveBeenCalledWith(
        mockPayment.stripePaymentIntentId,
      );
      expect(mockEventService.publish).toHaveBeenCalledWith(
        'payment.refunded',
        expect.objectContaining({
          paymentId: '1',
        }),
      );
    });

    it('should throw NotFoundException if payment not found', async () => {
      mockPaymentRepository.findOne.mockResolvedValue(null);

      await expect(service.refundPayment('999', mockUser)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if payment already refunded', async () => {
      const refundedPayment = { ...mockPayment, status: 'REFUNDED' };
      mockPaymentRepository.findOne.mockResolvedValue(refundedPayment);

      await expect(service.refundPayment('1', mockUser)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
