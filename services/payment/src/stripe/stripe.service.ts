import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private readonly logger = new Logger(StripeService.name);
  private readonly stripe: Stripe;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('STRIPE_SECRET_KEY');

    if (!apiKey) {
      this.logger.warn('Stripe API key not configured. Payment processing will not work.');
      this.stripe = null as any;
    } else {
      this.stripe = new Stripe(apiKey, {
        apiVersion: '2023-10-16',
      });
      this.logger.log('Stripe client initialized successfully');
    }
  }

  /**
   * Create a payment intent for a booking
   */
  async createPaymentIntent(
    amount: number,
    currency: string,
    bookingId: string,
    userId: string,
    customerEmail: string,
  ): Promise<Stripe.PaymentIntent> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      // Convert amount to smallest currency unit (cents for USD)
      const amountInCents = Math.round(amount * 100);

      const paymentIntent = await this.stripe.paymentIntents.create({
        amount: amountInCents,
        currency: currency.toLowerCase(),
        metadata: {
          bookingId,
          userId,
          customerEmail,
        },
        description: `Flight booking ${bookingId}`,
        receipt_email: customerEmail,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      this.logger.log(`Payment intent created: ${paymentIntent.id} for booking ${bookingId}`);

      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to create payment intent:', error);
      throw new BadRequestException('Failed to create payment intent');
    }
  }

  /**
   * Confirm a payment intent
   */
  async confirmPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.confirm(paymentIntentId);

      this.logger.log(`Payment intent confirmed: ${paymentIntentId}`);

      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to confirm payment intent:', error);
      throw new BadRequestException('Failed to confirm payment');
    }
  }

  /**
   * Retrieve a payment intent
   */
  async retrievePaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      return await this.stripe.paymentIntents.retrieve(paymentIntentId);
    } catch (error) {
      this.logger.error('Failed to retrieve payment intent:', error);
      throw new BadRequestException('Failed to retrieve payment intent');
    }
  }

  /**
   * Cancel a payment intent
   */
  async cancelPaymentIntent(paymentIntentId: string): Promise<Stripe.PaymentIntent> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const paymentIntent = await this.stripe.paymentIntents.cancel(paymentIntentId);

      this.logger.log(`Payment intent cancelled: ${paymentIntentId}`);

      return paymentIntent;
    } catch (error) {
      this.logger.error('Failed to cancel payment intent:', error);
      throw new BadRequestException('Failed to cancel payment intent');
    }
  }

  /**
   * Create a refund
   */
  async createRefund(
    paymentIntentId: string,
    amount?: number,
    reason?: string,
  ): Promise<Stripe.Refund> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const refundData: Stripe.RefundCreateParams = {
        payment_intent: paymentIntentId,
      };

      if (amount) {
        // Convert to cents
        refundData.amount = Math.round(amount * 100);
      }

      if (reason) {
        refundData.reason = reason as Stripe.RefundCreateParams.Reason;
      }

      const refund = await this.stripe.refunds.create(refundData);

      this.logger.log(`Refund created: ${refund.id} for payment intent ${paymentIntentId}`);

      return refund;
    } catch (error) {
      this.logger.error('Failed to create refund:', error);
      throw new BadRequestException('Failed to create refund');
    }
  }

  /**
   * List all refunds for a payment intent
   */
  async listRefunds(paymentIntentId: string): Promise<Stripe.Refund[]> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const refunds = await this.stripe.refunds.list({
        payment_intent: paymentIntentId,
      });

      return refunds.data;
    } catch (error) {
      this.logger.error('Failed to list refunds:', error);
      throw new BadRequestException('Failed to list refunds');
    }
  }

  /**
   * Construct webhook event from raw body and signature
   */
  constructWebhookEvent(
    rawBody: Buffer,
    signature: string,
  ): Stripe.Event {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');

      if (!webhookSecret) {
        throw new BadRequestException('Stripe webhook secret not configured');
      }

      return this.stripe.webhooks.constructEvent(
        rawBody,
        signature,
        webhookSecret,
      );
    } catch (error) {
      this.logger.error('Failed to construct webhook event:', error);
      throw new BadRequestException('Invalid webhook signature');
    }
  }

  /**
   * Get Stripe publishable key (for frontend)
   */
  getPublishableKey(): string {
    return this.configService.get<string>('STRIPE_PUBLISHABLE_KEY') || '';
  }

  /**
   * Create a customer in Stripe
   */
  async createCustomer(email: string, name: string, userId: string): Promise<Stripe.Customer> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const customer = await this.stripe.customers.create({
        email,
        name,
        metadata: {
          userId,
        },
      });

      this.logger.log(`Stripe customer created: ${customer.id} for user ${userId}`);

      return customer;
    } catch (error) {
      this.logger.error('Failed to create customer:', error);
      throw new BadRequestException('Failed to create customer');
    }
  }

  /**
   * Retrieve customer payment methods
   */
  async listCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    try {
      if (!this.stripe) {
        throw new BadRequestException('Stripe is not configured');
      }

      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      return paymentMethods.data;
    } catch (error) {
      this.logger.error('Failed to list payment methods:', error);
      throw new BadRequestException('Failed to list payment methods');
    }
  }
}
