import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpService } from '@nestjs/axios';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Payment, Booking, User } from '@shared/database';
import { PaymentStatus, PaymentMethod, UserRole, PaginationMeta } from '@shared/types';
import { CryptoUtil } from '@shared/common';
import { StripeService } from '../stripe/stripe.service';
import { EncryptionService } from '../encryption/encryption.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly bookingServiceUrl: string;

  constructor(
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private stripeService: StripeService,
    private encryptionService: EncryptionService,
    private httpService: HttpService,
    private eventEmitter: EventEmitter2,
    private configService: ConfigService,
  ) {
    this.bookingServiceUrl = `http://localhost:${this.configService.get('BOOKING_SERVICE_PORT') || 3004}/api/v1`;
  }

  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(dto: CreatePaymentIntentDto, userId: string, userRole: UserRole) {
    // Get booking details
    const booking = await this.bookingRepository.findOne({
      where: { id: dto.bookingId },
      relations: ['user'],
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }

    // Check permissions
    if (userRole === UserRole.CUSTOMER && booking.userId !== userId) {
      throw new ForbiddenException('You can only pay for your own bookings');
    }

    // Check if booking is already paid
    if (booking.status === 'CONFIRMED' || booking.status === 'COMPLETED') {
      throw new BadRequestException('Booking is already paid');
    }

    if (booking.status === 'CANCELLED') {
      throw new BadRequestException('Cannot pay for cancelled booking');
    }

    // Create Stripe payment intent
    const paymentIntent = await this.stripeService.createPaymentIntent(
      booking.totalPrice,
      booking.currency,
      booking.id,
      booking.userId,
      booking.contactEmail,
    );

    // Create payment record
    const payment = this.paymentRepository.create({
      bookingId: booking.id,
      userId: booking.userId,
      amount: booking.totalPrice,
      currency: booking.currency,
      method: PaymentMethod.CREDIT_CARD,
      status: PaymentStatus.PENDING,
      transactionId: paymentIntent.id,
      gatewayResponse: this.encryptionService.encrypt(JSON.stringify({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        status: paymentIntent.status,
      })),
    });

    await this.paymentRepository.save(payment);

    this.logger.log(`Payment intent created: ${paymentIntent.id} for booking ${booking.id}`);

    // Return client secret for frontend
    return {
      paymentId: payment.id,
      clientSecret: paymentIntent.client_secret,
      publishableKey: this.stripeService.getPublishableKey(),
      amount: booking.totalPrice,
      currency: booking.currency,
    };
  }

  /**
   * Process successful payment (called by webhook)
   */
  async processSuccessfulPayment(paymentIntentId: string) {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: paymentIntentId },
      relations: ['booking', 'user'],
    });

    if (!payment) {
      this.logger.error(`Payment not found for payment intent: ${paymentIntentId}`);
      throw new NotFoundException('Payment not found');
    }

    if (payment.status === PaymentStatus.SUCCEEDED) {
      this.logger.warn(`Payment ${payment.id} already processed`);
      return payment;
    }

    // Update payment status
    payment.status = PaymentStatus.SUCCEEDED;
    payment.processedAt = new Date();

    await this.paymentRepository.save(payment);

    // Confirm booking via booking service
    try {
      const bookingServiceToken = await this.getServiceToken();

      await firstValueFrom(
        this.httpService.post(
          `${this.bookingServiceUrl}/bookings/${payment.bookingId}/confirm`,
          { paymentId: payment.id },
          {
            headers: { Authorization: `Bearer ${bookingServiceToken}` }
          }
        )
      );

      this.logger.log(`Booking ${payment.bookingId} confirmed after payment`);
    } catch (error) {
      this.logger.error('Failed to confirm booking:', error.message);
      // Don't throw - payment is successful, booking confirmation can be retried
    }

    // Emit event for notifications
    this.eventEmitter.emit('payment.completed', {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      userId: payment.userId,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
    });

    this.logger.log(`Payment processed successfully: ${payment.id}`);

    return payment;
  }

  /**
   * Process failed payment (called by webhook)
   */
  async processFailedPayment(paymentIntentId: string, errorMessage?: string) {
    const payment = await this.paymentRepository.findOne({
      where: { transactionId: paymentIntentId },
    });

    if (!payment) {
      this.logger.error(`Payment not found for payment intent: ${paymentIntentId}`);
      return;
    }

    payment.status = PaymentStatus.FAILED;
    payment.gatewayResponse = this.encryptionService.encrypt(JSON.stringify({
      error: errorMessage || 'Payment failed',
      failedAt: new Date(),
    }));

    await this.paymentRepository.save(payment);

    this.logger.log(`Payment failed: ${payment.id}`);

    // Emit event for notifications
    this.eventEmitter.emit('payment.failed', {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      userId: payment.userId,
      error: errorMessage,
    });
  }

  /**
   * Create a refund
   */
  async createRefund(paymentId: string, dto: RefundPaymentDto, userId: string, userRole: UserRole) {
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
      relations: ['booking', 'user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check permissions
    if (![UserRole.ADMIN, UserRole.BUSINESS_OWNER].includes(userRole)) {
      throw new ForbiddenException('Only admins and business owners can create refunds');
    }

    if (payment.status !== PaymentStatus.SUCCEEDED) {
      throw new BadRequestException('Can only refund successful payments');
    }

    // Create Stripe refund
    const refund = await this.stripeService.createRefund(
      payment.transactionId,
      dto.amount,
      dto.reason,
    );

    // Update payment status
    if (dto.amount && dto.amount < payment.amount) {
      payment.status = PaymentStatus.PARTIALLY_REFUNDED;
    } else {
      payment.status = PaymentStatus.REFUNDED;
    }

    // Store refund info in gateway response
    const currentResponse = payment.gatewayResponse
      ? JSON.parse(this.encryptionService.decrypt(payment.gatewayResponse))
      : {};

    currentResponse.refunds = currentResponse.refunds || [];
    currentResponse.refunds.push({
      refundId: refund.id,
      amount: refund.amount / 100, // Convert from cents
      reason: dto.reason,
      createdAt: new Date(),
    });

    payment.gatewayResponse = this.encryptionService.encrypt(JSON.stringify(currentResponse));

    await this.paymentRepository.save(payment);

    this.logger.log(`Refund created: ${refund.id} for payment ${payment.id}`);

    // Emit event
    this.eventEmitter.emit('payment.refunded', {
      paymentId: payment.id,
      bookingId: payment.bookingId,
      userId: payment.userId,
      refundAmount: refund.amount / 100,
      refundId: refund.id,
    });

    return {
      refundId: refund.id,
      amount: refund.amount / 100,
      status: refund.status,
      payment,
    };
  }

  /**
   * Get payment by ID
   */
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Payment> {
    const payment = await this.paymentRepository.findOne({
      where: { id },
      relations: ['booking', 'user'],
    });

    if (!payment) {
      throw new NotFoundException('Payment not found');
    }

    // Check permissions
    if (userRole === UserRole.CUSTOMER && payment.userId !== userId) {
      throw new ForbiddenException('You can only view your own payments');
    }

    // Decrypt gateway response for admins only
    if ([UserRole.ADMIN, UserRole.BUSINESS_OWNER].includes(userRole) && payment.gatewayResponse) {
      try {
        const decrypted = this.encryptionService.decrypt(payment.gatewayResponse);
        (payment as any).gatewayResponseDecrypted = JSON.parse(decrypted);
      } catch (error) {
        this.logger.error('Failed to decrypt gateway response:', error);
      }
    }

    return payment;
  }

  /**
   * List payments with filters
   */
  async findAll(queryDto: QueryPaymentDto, userId: string, userRole: UserRole) {
    const { page = 1, limit = 10, status, bookingId, sortBy = 'createdAt', sortOrder = 'DESC' } = queryDto;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.booking', 'booking')
      .leftJoinAndSelect('payment.user', 'user');

    // Apply role-based filters
    if (userRole === UserRole.CUSTOMER) {
      queryBuilder.where('payment.userId = :userId', { userId });
    } else if (queryDto.userId && [UserRole.ADMIN, UserRole.BUSINESS_OWNER].includes(userRole)) {
      queryBuilder.where('payment.userId = :userId', { userId: queryDto.userId });
    }

    // Apply additional filters
    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    if (bookingId) {
      queryBuilder.andWhere('payment.bookingId = :bookingId', { bookingId });
    }

    // Pagination
    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    // Sorting
    queryBuilder.orderBy(`payment.${sortBy}`, sortOrder);

    const [payments, total] = await queryBuilder.getManyAndCount();

    const meta: PaginationMeta = {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };

    return { payments, meta };
  }

  /**
   * Get payment statistics
   */
  async getPaymentStats(userId?: string) {
    const where = userId ? { userId } : {};

    const [
      total,
      pending,
      succeeded,
      failed,
      refunded,
      partiallyRefunded
    ] = await Promise.all([
      this.paymentRepository.count({ where }),
      this.paymentRepository.count({ where: { ...where, status: PaymentStatus.PENDING } }),
      this.paymentRepository.count({ where: { ...where, status: PaymentStatus.SUCCEEDED } }),
      this.paymentRepository.count({ where: { ...where, status: PaymentStatus.FAILED } }),
      this.paymentRepository.count({ where: { ...where, status: PaymentStatus.REFUNDED } }),
      this.paymentRepository.count({ where: { ...where, status: PaymentStatus.PARTIALLY_REFUNDED } }),
    ]);

    const revenueResult = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total')
      .where(userId ? 'payment.userId = :userId' : '1=1', { userId })
      .andWhere('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED]
      })
      .getRawOne();

    return {
      total,
      pending,
      succeeded,
      failed,
      refunded,
      partiallyRefunded,
      totalRevenue: parseFloat(revenueResult?.total || 0),
    };
  }

  /**
   * Get service-to-service authentication token (internal use)
   */
  private async getServiceToken(): string {
    // In production, implement proper service-to-service authentication
    // For now, return a placeholder
    return 'service-token';
  }
}
