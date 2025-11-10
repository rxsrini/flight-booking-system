import { IsOptional, IsDateString, IsEnum, IsString } from 'class-validator';

export enum TimeGrouping {
  HOUR = 'hour',
  DAY = 'day',
  WEEK = 'week',
  MONTH = 'month',
  YEAR = 'year',
}

export class DateRangeQueryDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(TimeGrouping)
  groupBy?: TimeGrouping = TimeGrouping.DAY;

  @IsOptional()
  @IsString()
  timezone?: string = 'UTC';
}
