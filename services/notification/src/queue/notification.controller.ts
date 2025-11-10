import { Controller, Get, Post, Body } from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { NotificationQueueService, NotificationType } from './queue.service';

@Controller('notifications')
export class NotificationController {
  constructor(
    private readonly notificationQueueService: NotificationQueueService,
  ) {}

  @Get('stats')
  async getQueueStats() {
    return this.notificationQueueService.getQueueStats();
  }

  @Post('clear-completed')
  async clearCompleted() {
    await this.notificationQueueService.clearCompletedJobs();
    return { message: 'Completed jobs cleared' };
  }

  @Post('retry-failed')
  async retryFailed() {
    const count = await this.notificationQueueService.retryFailedJobs();
    return { message: `Retried ${count} failed jobs` };
  }

  // Microservice event handlers for inter-service communication

  @MessagePattern('booking.created')
  async handleBookingCreated(@Payload() data: any) {
    await this.notificationQueueService.addBookingConfirmation(
      data.customerEmail,
      {
        pnr: data.pnr,
        customerName: data.customerName,
        flightNumber: data.flightNumber,
        airline: data.airline,
        origin: data.origin,
        destination: data.destination,
        departureDate: data.departureDate,
        departureTime: data.departureTime,
        arrivalDate: data.arrivalDate,
        arrivalTime: data.arrivalTime,
        passengers: data.passengers,
        cabinClass: data.cabinClass,
        totalAmount: data.totalAmount,
        currency: data.currency,
      },
    );
  }

  @MessagePattern('booking.cancelled')
  async handleBookingCancelled(@Payload() data: any) {
    await this.notificationQueueService.addBookingCancellation(
      data.customerEmail,
      {
        pnr: data.pnr,
        customerName: data.customerName,
        flightNumber: data.flightNumber,
        refundAmount: data.refundAmount,
        currency: data.currency,
        reason: data.reason,
      },
    );
  }

  @MessagePattern('payment.succeeded')
  async handlePaymentSucceeded(@Payload() data: any) {
    await this.notificationQueueService.addPaymentReceipt(
      data.customerEmail,
      {
        receiptNumber: data.paymentId,
        customerName: data.customerName,
        pnr: data.pnr,
        amount: data.amount,
        currency: data.currency,
        paymentMethod: data.paymentMethod,
        paymentDate: data.paymentDate,
        transactionId: data.transactionId,
      },
    );
  }

  @MessagePattern('payment.failed')
  async handlePaymentFailed(@Payload() data: any) {
    await this.notificationQueueService.addPaymentFailed(data.customerEmail, {
      customerName: data.customerName,
      pnr: data.pnr,
      amount: data.amount,
      currency: data.currency,
      reason: data.reason,
      retryUrl: data.retryUrl,
    });
  }

  @MessagePattern('user.created')
  async handleUserCreated(@Payload() data: any) {
    await this.notificationQueueService.addWelcomeEmail(data.email, {
      name: data.name,
      role: data.role,
      loginUrl: `${process.env.FRONTEND_URL}/login`,
    });
  }

  @MessagePattern('user.password_reset')
  async handlePasswordReset(@Payload() data: any) {
    await this.notificationQueueService.addPasswordReset(data.email, {
      name: data.name,
      resetLink: data.resetLink,
      expiresIn: '1 hour',
    });
  }

  @Post('send')
  async sendNotification(
    @Body()
    body: {
      type: NotificationType;
      recipient: string;
      data: any;
    },
  ) {
    await this.notificationQueueService.addNotification(
      body.type,
      body.recipient,
      body.data,
    );
    return { message: 'Notification queued successfully' };
  }
}
