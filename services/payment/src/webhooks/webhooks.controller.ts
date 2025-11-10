import { Controller, Post, Headers, RawBodyRequest, Req, Logger, BadRequestException } from '@nestjs/common';
import { Request } from 'express';
import { StripeService } from '../stripe/stripe.service';
import { PaymentsService } from '../payments/payments.service';
import Stripe from 'stripe';

@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  constructor(
    private stripeService: StripeService,
    private paymentsService: PaymentsService,
  ) {}

  @Post('stripe')
  async handleStripeWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() request: RawBodyRequest<Request>,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    if (!request.rawBody) {
      throw new BadRequestException('Missing raw body');
    }

    let event: Stripe.Event;

    try {
      // Verify webhook signature
      event = this.stripeService.constructWebhookEvent(
        request.rawBody,
        signature,
      );

      this.logger.log(`Received Stripe webhook: ${event.type}`);
    } catch (error) {
      this.logger.error('Webhook signature verification failed:', error);
      throw new BadRequestException('Invalid signature');
    }

    // Handle different event types
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentIntentSucceeded(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.payment_failed':
          await this.handlePaymentIntentFailed(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.canceled':
          await this.handlePaymentIntentCanceled(event.data.object as Stripe.PaymentIntent);
          break;

        case 'payment_intent.processing':
          await this.handlePaymentIntentProcessing(event.data.object as Stripe.PaymentIntent);
          break;

        case 'charge.refunded':
          await this.handleChargeRefunded(event.data.object as Stripe.Charge);
          break;

        case 'charge.dispute.created':
          await this.handleDisputeCreated(event.data.object as Stripe.Dispute);
          break;

        default:
          this.logger.log(`Unhandled event type: ${event.type}`);
      }

      return { received: true, eventType: event.type };
    } catch (error) {
      this.logger.error(`Error handling webhook ${event.type}:`, error);
      // Return 200 to acknowledge receipt, even if processing failed
      // Stripe will retry failed webhooks
      return { received: true, error: error.message };
    }
  }

  private async handlePaymentIntentSucceeded(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment succeeded: ${paymentIntent.id}`);

    try {
      await this.paymentsService.processSuccessfulPayment(paymentIntent.id);
    } catch (error) {
      this.logger.error('Failed to process successful payment:', error);
      throw error;
    }
  }

  private async handlePaymentIntentFailed(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment failed: ${paymentIntent.id}`);

    const errorMessage = paymentIntent.last_payment_error?.message || 'Payment failed';

    try {
      await this.paymentsService.processFailedPayment(paymentIntent.id, errorMessage);
    } catch (error) {
      this.logger.error('Failed to process failed payment:', error);
    }
  }

  private async handlePaymentIntentCanceled(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment canceled: ${paymentIntent.id}`);

    try {
      await this.paymentsService.processFailedPayment(paymentIntent.id, 'Payment canceled');
    } catch (error) {
      this.logger.error('Failed to process canceled payment:', error);
    }
  }

  private async handlePaymentIntentProcessing(paymentIntent: Stripe.PaymentIntent) {
    this.logger.log(`Payment processing: ${paymentIntent.id}`);
    // No action needed, just log for monitoring
  }

  private async handleChargeRefunded(charge: Stripe.Charge) {
    this.logger.log(`Charge refunded: ${charge.id}, payment intent: ${charge.payment_intent}`);
    // Refund handling is done in the paymentsService.createRefund method
    // This webhook is just for confirmation/logging
  }

  private async handleDisputeCreated(dispute: Stripe.Dispute) {
    this.logger.warn(`Dispute created: ${dispute.id}, payment intent: ${dispute.payment_intent}`);
    // TODO: Implement dispute handling
    // Send notification to admins
  }
}
