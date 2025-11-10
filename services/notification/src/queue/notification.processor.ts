import { Processor, Process, OnQueueCompleted, OnQueueFailed } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { EmailService } from '../email/email.service';
import { NOTIFICATION_QUEUE } from './queue.module';
import { NotificationType, NotificationJob } from './queue.service';

@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private readonly emailService: EmailService) {}

  @Process(NotificationType.BOOKING_CONFIRMATION)
  async handleBookingConfirmation(job: Job<NotificationJob>) {
    this.logger.log(
      `Processing booking confirmation for ${job.data.recipient}`,
    );
    return this.emailService.sendBookingConfirmation(
      job.data.recipient,
      job.data.data,
    );
  }

  @Process(NotificationType.BOOKING_CANCELLED)
  async handleBookingCancellation(job: Job<NotificationJob>) {
    this.logger.log(
      `Processing booking cancellation for ${job.data.recipient}`,
    );
    return this.emailService.sendBookingCancellation(
      job.data.recipient,
      job.data.data,
    );
  }

  @Process(NotificationType.PAYMENT_RECEIPT)
  async handlePaymentReceipt(job: Job<NotificationJob>) {
    this.logger.log(`Processing payment receipt for ${job.data.recipient}`);
    return this.emailService.sendPaymentReceipt(
      job.data.recipient,
      job.data.data,
    );
  }

  @Process(NotificationType.PAYMENT_FAILED)
  async handlePaymentFailed(job: Job<NotificationJob>) {
    this.logger.log(`Processing payment failed for ${job.data.recipient}`);
    return this.emailService.sendPaymentFailed(
      job.data.recipient,
      job.data.data,
    );
  }

  @Process(NotificationType.PASSWORD_RESET)
  async handlePasswordReset(job: Job<NotificationJob>) {
    this.logger.log(`Processing password reset for ${job.data.recipient}`);
    return this.emailService.sendPasswordReset(
      job.data.recipient,
      job.data.data,
    );
  }

  @Process(NotificationType.WELCOME)
  async handleWelcome(job: Job<NotificationJob>) {
    this.logger.log(`Processing welcome email for ${job.data.recipient}`);
    return this.emailService.sendWelcomeEmail(
      job.data.recipient,
      job.data.data,
    );
  }

  @Process(NotificationType.BOOKING_REMINDER)
  async handleBookingReminder(job: Job<NotificationJob>) {
    this.logger.log(`Processing booking reminder for ${job.data.recipient}`);
    return this.emailService.sendBookingReminder(
      job.data.recipient,
      job.data.data,
    );
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(
      `Job ${job.id} completed successfully for ${job.data.recipient}`,
    );
  }

  @OnQueueFailed()
  onFailed(job: Job, error: Error) {
    this.logger.error(
      `Job ${job.id} failed for ${job.data.recipient}: ${error.message}`,
      error.stack,
    );
  }
}
