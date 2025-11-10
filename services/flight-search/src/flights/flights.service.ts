import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between } from 'typeorm';
import { Flight, Airline, Airport } from '@shared/database';
import { Flight as FlightType, FlightSearchParams } from '@shared/types';
import { CacheService } from '../cache/cache.service';
import { AmadeusService } from '../gds/amadeus/amadeus.service';
import { SabreService } from '../gds/sabre/sabre.service';

@Injectable()
export class FlightsService {
  private readonly logger = new Logger(FlightsService.name);

  constructor(
    @InjectRepository(Flight)
    private flightRepository: Repository<Flight>,
    @InjectRepository(Airline)
    private airlineRepository: Repository<Airline>,
    @InjectRepository(Airport)
    private airportRepository: Repository<Airport>,
    private cacheService: CacheService,
    private amadeusService: AmadeusService,
    private sabreService: SabreService,
  ) {}

  async searchFlights(params: FlightSearchParams): Promise<FlightType[]> {
    // Check cache first
    const cacheKey = this.cacheService.generateSearchKey(params);
    const cachedResults = await this.cacheService.get<FlightType[]>(cacheKey);

    if (cachedResults) {
      this.logger.log('Returning cached flight results');
      return cachedResults;
    }

    // Search from multiple GDS sources in parallel
    const [amadeusResults, sabreResults, localResults] = await Promise.all([
      this.amadeusService.searchFlights(params).catch(err => {
        this.logger.error('Amadeus search failed:', err);
        return [];
      }),
      this.sabreService.searchFlights(params).catch(err => {
        this.logger.error('Sabre search failed:', err);
        return [];
      }),
      this.searchLocalFlights(params).catch(err => {
        this.logger.error('Local search failed:', err);
        return [];
      }),
    ]);

    // Combine and deduplicate results
    const allFlights = [...amadeusResults, ...sabreResults, ...localResults];

    // Sort by price
    const sortedFlights = allFlights.sort((a, b) => a.totalPrice - b.totalPrice);

    // Cache results for 5 minutes
    await this.cacheService.set(cacheKey, sortedFlights, 300);

    return sortedFlights;
  }

  private async searchLocalFlights(params: FlightSearchParams): Promise<FlightType[]> {
    // Search flights from local database
    const departureDate = new Date(params.departureDate);
    const startOfDay = new Date(departureDate.setHours(0, 0, 0, 0));
    const endOfDay = new Date(departureDate.setHours(23, 59, 59, 999));

    const originAirport = await this.airportRepository.findOne({
      where: { code: params.origin }
    });

    const destinationAirport = await this.airportRepository.findOne({
      where: { code: params.destination }
    });

    if (!originAirport || !destinationAirport) {
      return [];
    }

    const flights = await this.flightRepository.find({
      where: {
        originAirportId: originAirport.id,
        destinationAirportId: destinationAirport.id,
        departureTime: Between(startOfDay, endOfDay),
        status: 'SCHEDULED' as any,
      },
      relations: ['airline', 'originAirport', 'destinationAirport', 'prices'],
    });

    return flights.map(flight => this.transformFlightEntity(flight, params.cabinClass));
  }

  private transformFlightEntity(flight: any, cabinClass: any): FlightType {
    const price = flight.prices?.find((p: any) => p.cabinClass === cabinClass);

    return {
      id: flight.id,
      segments: [{
        id: flight.id,
        flightNumber: flight.flightNumber,
        airline: {
          code: flight.airline.code,
          name: flight.airline.name,
          logo: flight.airline.logo,
        },
        departureAirport: {
          code: flight.originAirport.code,
          name: flight.originAirport.name,
          city: flight.originAirport.city,
          country: flight.originAirport.country,
          timezone: flight.originAirport.timezone,
        },
        arrivalAirport: {
          code: flight.destinationAirport.code,
          name: flight.destinationAirport.name,
          city: flight.destinationAirport.city,
          country: flight.destinationAirport.country,
          timezone: flight.destinationAirport.timezone,
        },
        departureTime: flight.departureTime,
        arrivalTime: flight.arrivalTime,
        duration: flight.duration,
        aircraft: flight.aircraft,
        cabinClass,
        availableSeats: price?.availableSeats || flight.availableSeats,
        status: flight.status,
      }],
      totalDuration: flight.duration,
      totalPrice: price?.price || flight.basePrice,
      currency: flight.currency,
      stops: 0,
      gdsSource: 'Local',
    };
  }

  async getFlightById(id: string): Promise<Flight | null> {
    return this.flightRepository.findOne({
      where: { id },
      relations: ['airline', 'originAirport', 'destinationAirport', 'prices'],
    });
  }

  async getAirlines(): Promise<Airline[]> {
    return this.airlineRepository.find();
  }

  async getAirports(search?: string): Promise<Airport[]> {
    if (search) {
      return this.airportRepository
        .createQueryBuilder('airport')
        .where('airport.code ILIKE :search', { search: `%${search}%` })
        .orWhere('airport.name ILIKE :search', { search: `%${search}%` })
        .orWhere('airport.city ILIKE :search', { search: `%${search}%` })
        .limit(20)
        .getMany();
    }

    return this.airportRepository.find({ take: 100 });
  }

  async updateFlightStatus(id: string, status: any): Promise<void> {
    await this.flightRepository.update(id, { status });

    // Clear related cache entries
    await this.cacheService.clearPattern('flight:search:*');
  }
}
