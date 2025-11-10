import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { NOTIFICATION_QUEUE } from './queue.module';

export enum NotificationType {
  BOOKING_CONFIRMATION = 'booking_confirmation',
  BOOKING_CANCELLED = 'booking_cancelled',
  PAYMENT_RECEIPT = 'payment_receipt',
  PAYMENT_FAILED = 'payment_failed',
  PASSWORD_RESET = 'password_reset',
  WELCOME = 'welcome',
  BOOKING_REMINDER = 'booking_reminder',
}

export interface NotificationJob {
  type: NotificationType;
  recipient: string;
  data: any;
}

@Injectable()
export class NotificationQueueService {
  private readonly logger = new Logger(NotificationQueueService.name);

  constructor(
    @InjectQueue(NOTIFICATION_QUEUE) private notificationQueue: Queue,
  ) {}

  async addNotification(
    type: NotificationType,
    recipient: string,
    data: any,
    options?: {
      delay?: number;
      priority?: number;
      attempts?: number;
    },
  ): Promise<void> {
    try {
      const job = await this.notificationQueue.add(
        type,
        {
          type,
          recipient,
          data,
        },
        {
          delay: options?.delay || 0,
          priority: options?.priority || 1,
          attempts: options?.attempts || 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      );

      this.logger.log(
        `Added notification job ${job.id} of type ${type} for ${recipient}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to add notification job: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  async addBookingConfirmation(email: string, bookingDetails: any) {
    return this.addNotification(
      NotificationType.BOOKING_CONFIRMATION,
      email,
      bookingDetails,
      { priority: 2 },
    );
  }

  async addBookingCancellation(email: string, cancellationDetails: any) {
    return this.addNotification(
      NotificationType.BOOKING_CANCELLED,
      email,
      cancellationDetails,
      { priority: 2 },
    );
  }

  async addPaymentReceipt(email: string, paymentDetails: any) {
    return this.addNotification(
      NotificationType.PAYMENT_RECEIPT,
      email,
      paymentDetails,
      { priority: 2 },
    );
  }

  async addPaymentFailed(email: string, failureDetails: any) {
    return this.addNotification(
      NotificationType.PAYMENT_FAILED,
      email,
      failureDetails,
      { priority: 3 }, // High priority
    );
  }

  async addPasswordReset(email: string, resetDetails: any) {
    return this.addNotification(
      NotificationType.PASSWORD_RESET,
      email,
      resetDetails,
      { priority: 3 }, // High priority
    );
  }

  async addWelcomeEmail(email: string, userDetails: any) {
    return this.addNotification(
      NotificationType.WELCOME,
      email,
      userDetails,
      { priority: 1 }, // Lower priority
    );
  }

  async addBookingReminder(
    email: string,
    reminderDetails: any,
    delayInMs: number,
  ) {
    return this.addNotification(
      NotificationType.BOOKING_REMINDER,
      email,
      reminderDetails,
      {
        delay: delayInMs,
        priority: 2,
      },
    );
  }

  async getQueueStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.notificationQueue.getWaitingCount(),
      this.notificationQueue.getActiveCount(),
      this.notificationQueue.getCompletedCount(),
      this.notificationQueue.getFailedCount(),
      this.notificationQueue.getDelayedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  async clearCompletedJobs() {
    await this.notificationQueue.clean(0, 'completed');
    this.logger.log('Cleared completed jobs from queue');
  }

  async retryFailedJobs() {
    const failedJobs = await this.notificationQueue.getFailed();
    let retriedCount = 0;

    for (const job of failedJobs) {
      try {
        await job.retry();
        retriedCount++;
      } catch (error) {
        this.logger.error(`Failed to retry job ${job.id}: ${error.message}`);
      }
    }

    this.logger.log(`Retried ${retriedCount} failed jobs`);
    return retriedCount;
  }
}
