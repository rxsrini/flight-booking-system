import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { RefundPaymentDto } from './dto/refund-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';
import { JwtAuthGuard, RolesGuard, Roles, ResponseUtil } from '@shared/common';
import { UserRole, ApiResponse } from '@shared/types';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post('intent')
  async createPaymentIntent(
    @Body() dto: CreatePaymentIntentDto,
    @Request() req
  ): Promise<ApiResponse> {
    const result = await this.paymentsService.createPaymentIntent(
      dto,
      req.user.id,
      req.user.role
    );
    return ResponseUtil.success(result, 'Payment intent created successfully');
  }

  @Get()
  async findAll(@Query() queryDto: QueryPaymentDto, @Request() req): Promise<ApiResponse> {
    const result = await this.paymentsService.findAll(queryDto, req.user.id, req.user.role);
    return ResponseUtil.paginated(result.payments, result.meta, 'Payments retrieved successfully');
  }

  @Get('stats')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async getStats(@Query('userId') userId?: string): Promise<ApiResponse> {
    const stats = await this.paymentsService.getPaymentStats(userId);
    return ResponseUtil.success(stats, 'Payment statistics retrieved successfully');
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Request() req): Promise<ApiResponse> {
    const payment = await this.paymentsService.findOne(id, req.user.id, req.user.role);
    return ResponseUtil.success(payment, 'Payment retrieved successfully');
  }

  @Post(':id/refund')
  @Roles(UserRole.ADMIN, UserRole.BUSINESS_OWNER)
  async createRefund(
    @Param('id') id: string,
    @Body() dto: RefundPaymentDto,
    @Request() req
  ): Promise<ApiResponse> {
    const result = await this.paymentsService.createRefund(id, dto, req.user.id, req.user.role);
    return ResponseUtil.success(result, 'Refund created successfully');
  }
}
