import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from '@nestjs/common';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { AuditService } from './audit.service';
import { CreateAuditLogDto } from './dto/create-audit-log.dto';
import { AuditQueryDto } from './dto/audit-query.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { UserRole } from '@flight-booking/types';
import { CurrentUser } from '../decorators/current-user.decorator';
import { AuditAction, AuditSeverity } from '@flight-booking/database';

@Controller('audit')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Post('logs')
  @Roles(UserRole.ADMIN)
  async createAuditLog(@Body() createAuditLogDto: CreateAuditLogDto) {
    return this.auditService.createAuditLog(createAuditLogDto);
  }

  @Get('logs')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async findAll(@Query() queryDto: AuditQueryDto) {
    return this.auditService.findAll(queryDto);
  }

  @Get('logs/:id')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async findOne(@Param('id') id: string) {
    return this.auditService.findOne(id);
  }

  @Get('statistics')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getStatistics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    return this.auditService.getAuditStatistics(start, end);
  }

  @Get('user/:userId/timeline')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getUserTimeline(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.auditService.getUserActivityTimeline(userId, limit);
  }

  @Get('entity/:entityType/:entityId/history')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getEntityHistory(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
  ) {
    return this.auditService.getEntityHistory(entityType, entityId);
  }

  @Get('security/events')
  @Roles(UserRole.ADMIN)
  async getSecurityEvents(@Query('limit') limit?: number) {
    return this.auditService.getSecurityEvents(limit);
  }

  @Delete('logs/cleanup')
  @Roles(UserRole.ADMIN)
  async deleteOldLogs(@Query('daysToKeep') daysToKeep: number = 90) {
    const deleted = await this.auditService.deleteOldLogs(daysToKeep);
    return { message: `Deleted ${deleted} old audit logs`, deleted };
  }

  // Microservice event handlers

  @MessagePattern('user.login')
  async handleUserLogin(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.LOGIN,
      data.userId,
      data.email,
      data.role,
      {
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
        metadata: { loginTime: new Date() },
        severity: AuditSeverity.LOW,
      },
    );
  }

  @MessagePattern('user.login_failed')
  async handleLoginFailed(@Payload() data: any) {
    await this.auditService.logSystemEvent(AuditAction.LOGIN_FAILED, {
      metadata: { email: data.email, reason: data.reason },
      ipAddress: data.ipAddress,
      severity: AuditSeverity.MEDIUM,
      description: `Failed login attempt for ${data.email}`,
      success: false,
      errorMessage: data.reason,
    });
  }

  @MessagePattern('user.logout')
  async handleUserLogout(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.LOGOUT,
      data.userId,
      data.email,
      data.role,
      {
        metadata: { logoutTime: new Date() },
        severity: AuditSeverity.LOW,
      },
    );
  }

  @MessagePattern('user.created')
  async handleUserCreated(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.USER_CREATED,
      data.createdBy || 'system',
      data.createdByEmail || 'system',
      data.createdByRole || 'ADMIN',
      {
        entityType: 'User',
        entityId: data.userId,
        newValue: {
          email: data.email,
          role: data.role,
          status: data.status,
        },
        severity: AuditSeverity.MEDIUM,
        description: `New user created: ${data.email}`,
      },
    );
  }

  @MessagePattern('user.updated')
  async handleUserUpdated(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.USER_UPDATED,
      data.updatedBy,
      data.updatedByEmail,
      data.updatedByRole,
      {
        entityType: 'User',
        entityId: data.userId,
        oldValue: data.oldValues,
        newValue: data.newValues,
        severity: AuditSeverity.MEDIUM,
        description: `User updated: ${data.userEmail}`,
      },
    );
  }

  @MessagePattern('user.deleted')
  async handleUserDeleted(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.USER_DELETED,
      data.deletedBy,
      data.deletedByEmail,
      data.deletedByRole,
      {
        entityType: 'User',
        entityId: data.userId,
        oldValue: data.userData,
        severity: AuditSeverity.HIGH,
        description: `User deleted: ${data.userEmail}`,
      },
    );
  }

  @MessagePattern('booking.created')
  async handleBookingCreated(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.BOOKING_CREATED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        entityType: 'Booking',
        entityId: data.bookingId,
        newValue: {
          pnr: data.pnr,
          flightId: data.flightId,
          totalAmount: data.totalAmount,
          status: data.status,
        },
        severity: AuditSeverity.MEDIUM,
        description: `Booking created: ${data.pnr}`,
      },
    );
  }

  @MessagePattern('booking.updated')
  async handleBookingUpdated(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.BOOKING_UPDATED,
      data.updatedBy,
      data.updatedByEmail,
      data.updatedByRole,
      {
        entityType: 'Booking',
        entityId: data.bookingId,
        oldValue: data.oldValues,
        newValue: data.newValues,
        severity: AuditSeverity.MEDIUM,
        description: `Booking updated: ${data.pnr}`,
      },
    );
  }

  @MessagePattern('booking.cancelled')
  async handleBookingCancelled(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.BOOKING_CANCELLED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        entityType: 'Booking',
        entityId: data.bookingId,
        metadata: { pnr: data.pnr, reason: data.reason },
        severity: AuditSeverity.MEDIUM,
        description: `Booking cancelled: ${data.pnr}`,
      },
    );
  }

  @MessagePattern('payment.initiated')
  async handlePaymentInitiated(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.PAYMENT_INITIATED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        entityType: 'Payment',
        entityId: data.paymentId,
        newValue: {
          amount: data.amount,
          currency: data.currency,
          bookingId: data.bookingId,
        },
        severity: AuditSeverity.MEDIUM,
        description: `Payment initiated for booking ${data.bookingId}`,
      },
    );
  }

  @MessagePattern('payment.succeeded')
  async handlePaymentSucceeded(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.PAYMENT_SUCCEEDED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        entityType: 'Payment',
        entityId: data.paymentId,
        metadata: {
          amount: data.amount,
          currency: data.currency,
          transactionId: data.transactionId,
        },
        severity: AuditSeverity.MEDIUM,
        description: `Payment successful: ${data.transactionId}`,
      },
    );
  }

  @MessagePattern('payment.failed')
  async handlePaymentFailed(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.PAYMENT_FAILED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        entityType: 'Payment',
        entityId: data.paymentId,
        metadata: { amount: data.amount, reason: data.reason },
        severity: AuditSeverity.HIGH,
        description: `Payment failed for booking ${data.bookingId}`,
        success: false,
        errorMessage: data.reason,
      },
    );
  }

  @MessagePattern('refund.initiated')
  async handleRefundInitiated(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.REFUND_INITIATED,
      data.initiatedBy,
      data.initiatedByEmail,
      data.initiatedByRole,
      {
        entityType: 'Payment',
        entityId: data.paymentId,
        metadata: { amount: data.amount, reason: data.reason },
        severity: AuditSeverity.HIGH,
        description: `Refund initiated for payment ${data.paymentId}`,
      },
    );
  }

  @MessagePattern('refund.completed')
  async handleRefundCompleted(@Payload() data: any) {
    await this.auditService.logSystemEvent(AuditAction.REFUND_COMPLETED, {
      entityType: 'Payment',
      entityId: data.paymentId,
      metadata: {
        amount: data.amount,
        refundId: data.refundId,
      },
      severity: AuditSeverity.MEDIUM,
      description: `Refund completed: ${data.refundId}`,
    });
  }

  @MessagePattern('webhook.received')
  async handleWebhookReceived(@Payload() data: any) {
    await this.auditService.logSystemEvent(AuditAction.WEBHOOK_RECEIVED, {
      service: data.service,
      metadata: {
        eventType: data.eventType,
        webhookId: data.webhookId,
      },
      severity: AuditSeverity.LOW,
      description: `Webhook received from ${data.service}: ${data.eventType}`,
    });
  }

  @MessagePattern('permission.denied')
  async handlePermissionDenied(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.PERMISSION_DENIED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        metadata: {
          resource: data.resource,
          action: data.action,
          requiredRole: data.requiredRole,
        },
        severity: AuditSeverity.HIGH,
        description: `Access denied to ${data.resource} for user ${data.userEmail}`,
        success: false,
      },
    );
  }

  @MessagePattern('sensitive_data.accessed')
  async handleSensitiveDataAccessed(@Payload() data: any) {
    await this.auditService.logUserAction(
      AuditAction.SENSITIVE_DATA_ACCESSED,
      data.userId,
      data.userEmail,
      data.userRole,
      {
        entityType: data.entityType,
        entityId: data.entityId,
        metadata: { dataType: data.dataType, fields: data.fields },
        severity: AuditSeverity.CRITICAL,
        description: `Sensitive data accessed: ${data.dataType}`,
      },
    );
  }
}
