import { IsNumber, IsOptional, IsString, IsEnum, Min } from 'class-validator';

export class RefundPaymentDto {
  @IsNumber()
  @IsOptional()
  @Min(0.01)
  amount?: number; // If not provided, full refund

  @IsString()
  @IsOptional()
  @IsEnum(['duplicate', 'fraudulent', 'requested_by_customer'])
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
}
