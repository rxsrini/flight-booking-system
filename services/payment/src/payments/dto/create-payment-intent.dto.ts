import { IsString, IsNotEmpty, IsUUID } from 'class-validator';

export class CreatePaymentIntentDto {
  @IsUUID()
  @IsNotEmpty()
  bookingId: string;
}
