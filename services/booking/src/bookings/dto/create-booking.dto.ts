import { IsString, IsNotEmpty, IsEmail, IsEnum, ValidateNested, IsArray, ArrayMinSize } from 'class-validator';
import { Type } from 'class-transformer';
import { CabinClass } from '@shared/types';

class PassengerDto {
  @IsEnum(['ADULT', 'CHILD', 'INFANT'])
  @IsNotEmpty()
  type: 'ADULT' | 'CHILD' | 'INFANT';

  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsString()
  @IsNotEmpty()
  dateOfBirth: string;

  @IsString()
  passportNumber?: string;

  @IsString()
  passportExpiry?: string;

  @IsString()
  nationality?: string;

  @IsEmail()
  email?: string;

  @IsString()
  phone?: string;
}

class ContactInfoDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class CreateBookingDto {
  @IsString()
  @IsNotEmpty()
  flightId: string;

  @IsEnum(CabinClass)
  @IsNotEmpty()
  cabinClass: CabinClass;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => PassengerDto)
  passengers: PassengerDto[];

  @ValidateNested()
  @Type(() => ContactInfoDto)
  @IsNotEmpty()
  contactInfo: ContactInfoDto;

  @IsString()
  userId?: string; // Optional: for agents creating bookings for customers
}
