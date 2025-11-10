import { Controller, Get, Post, Body, Param, Query, UseGuards } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { SearchFlightsDto } from './dto/search-flights.dto';
import { JwtAuthGuard, ResponseUtil } from '@shared/common';
import { ApiResponse } from '@shared/types';

@Controller('flights')
export class FlightsController {
  constructor(private readonly flightsService: FlightsService) {}

  @Post('search')
  @UseGuards(JwtAuthGuard)
  async search(@Body() searchDto: SearchFlightsDto): Promise<ApiResponse> {
    const flights = await this.flightsService.searchFlights(searchDto);
    return ResponseUtil.success(flights, `Found ${flights.length} flights`);
  }

  @Get('airlines')
  async getAirlines(): Promise<ApiResponse> {
    const airlines = await this.flightsService.getAirlines();
    return ResponseUtil.success(airlines, 'Airlines retrieved successfully');
  }

  @Get('airports')
  async getAirports(@Query('search') search?: string): Promise<ApiResponse> {
    const airports = await this.flightsService.getAirports(search);
    return ResponseUtil.success(airports, 'Airports retrieved successfully');
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  async getFlightById(@Param('id') id: string): Promise<ApiResponse> {
    const flight = await this.flightsService.getFlightById(id);
    if (!flight) {
      return ResponseUtil.error('Flight not found');
    }
    return ResponseUtil.success(flight, 'Flight retrieved successfully');
  }
}
