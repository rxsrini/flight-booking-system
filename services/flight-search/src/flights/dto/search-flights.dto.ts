import { IsString, IsNotEmpty, IsDateString, IsOptional, IsEnum, IsInt, Min, Max, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CabinClass } from '@shared/types';

class PassengerCountDto {
  @IsInt()
  @Min(1)
  @Max(9)
  adults: number;

  @IsInt()
  @Min(0)
  @Max(8)
  children: number;

  @IsInt()
  @Min(0)
  @Max(4)
  infants: number;
}

export class SearchFlightsDto {
  @IsString()
  @IsNotEmpty()
  origin: string;

  @IsString()
  @IsNotEmpty()
  destination: string;

  @IsDateString()
  @IsNotEmpty()
  departureDate: string;

  @IsDateString()
  @IsOptional()
  returnDate?: string;

  @ValidateNested()
  @Type(() => PassengerCountDto)
  passengers: PassengerCountDto;

  @IsEnum(CabinClass)
  @IsNotEmpty()
  cabinClass: CabinClass;

  @IsBoolean()
  @IsOptional()
  directFlightsOnly?: boolean;
}
