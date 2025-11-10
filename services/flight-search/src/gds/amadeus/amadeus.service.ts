import { Injectable, Logger, HttpException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { Flight, FlightSearchParams } from '@shared/types';

@Injectable()
export class AmadeusService {
  private readonly logger = new Logger(AmadeusService.name);
  private readonly baseUrl = 'https://test.api.amadeus.com/v2';
  private accessToken: string | null = null;
  private tokenExpiry: Date | null = null;

  constructor(
    private httpService: HttpService,
    private configService: ConfigService,
  ) {}

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.post(
          'https://test.api.amadeus.com/v1/security/oauth2/token',
          new URLSearchParams({
            grant_type: 'client_credentials',
            client_id: this.configService.get('AMADEUS_API_KEY') || '',
            client_secret: this.configService.get('AMADEUS_API_SECRET') || '',
          }),
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          }
        )
      );

      this.accessToken = response.data.access_token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);

      return this.accessToken;
    } catch (error) {
      this.logger.error('Failed to get Amadeus access token:', error);
      throw new HttpException('Failed to authenticate with Amadeus', 500);
    }
  }

  async searchFlights(params: FlightSearchParams): Promise<Flight[]> {
    try {
      const token = await this.getAccessToken();

      const searchParams = new URLSearchParams({
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: params.passengers.adults.toString(),
        children: params.passengers.children.toString(),
        infants: params.passengers.infants.toString(),
        travelClass: this.mapCabinClass(params.cabinClass),
        nonStop: params.directFlightsOnly ? 'true' : 'false',
        max: '50',
      });

      if (params.returnDate) {
        searchParams.append('returnDate', params.returnDate);
      }

      const response = await firstValueFrom(
        this.httpService.get(
          `${this.baseUrl}/shopping/flight-offers?${searchParams}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )
      );

      return this.transformAmadeusResponse(response.data);
    } catch (error) {
      this.logger.error('Amadeus flight search failed:', error);
      return [];
    }
  }

  private transformAmadeusResponse(data: any): Flight[] {
    if (!data.data || !Array.isArray(data.data)) {
      return [];
    }

    return data.data.map((offer: any) => {
      const itinerary = offer.itineraries[0];
      const segments = itinerary.segments.map((segment: any) => ({
        id: segment.id,
        flightNumber: `${segment.carrierCode}${segment.number}`,
        airline: {
          code: segment.carrierCode,
          name: this.getAirlineName(segment.carrierCode),
        },
        departureAirport: {
          code: segment.departure.iataCode,
          name: segment.departure.iataCode,
          city: segment.departure.iataCode,
          country: '',
          timezone: '',
        },
        arrivalAirport: {
          code: segment.arrival.iataCode,
          name: segment.arrival.iataCode,
          city: segment.arrival.iataCode,
          country: '',
          timezone: '',
        },
        departureTime: new Date(segment.departure.at),
        arrivalTime: new Date(segment.arrival.at),
        duration: this.parseDuration(segment.duration),
        aircraft: segment.aircraft?.code || 'Unknown',
        cabinClass: this.mapCabinClassFromAmadeus(offer.travelerPricings[0]?.fareDetailsBySegment[0]?.cabin),
        availableSeats: segment.numberOfSeats || 9,
        status: 'SCHEDULED' as any,
      }));

      return {
        id: offer.id,
        segments,
        totalDuration: this.parseDuration(itinerary.duration),
        totalPrice: parseFloat(offer.price.total),
        currency: offer.price.currency,
        stops: segments.length - 1,
        gdsSource: 'Amadeus',
      };
    });
  }

  private mapCabinClass(cabinClass: string): string {
    const mapping: Record<string, string> = {
      ECONOMY: 'ECONOMY',
      PREMIUM_ECONOMY: 'PREMIUM_ECONOMY',
      BUSINESS: 'BUSINESS',
      FIRST_CLASS: 'FIRST',
    };
    return mapping[cabinClass] || 'ECONOMY';
  }

  private mapCabinClassFromAmadeus(cabin: string): any {
    const mapping: Record<string, string> = {
      ECONOMY: 'ECONOMY',
      PREMIUM_ECONOMY: 'PREMIUM_ECONOMY',
      BUSINESS: 'BUSINESS',
      FIRST: 'FIRST_CLASS',
    };
    return mapping[cabin] || 'ECONOMY';
  }

  private parseDuration(duration: string): number {
    // Parse ISO 8601 duration format PT2H30M to minutes
    const matches = duration.match(/PT(\d+H)?(\d+M)?/);
    if (!matches) return 0;

    const hours = matches[1] ? parseInt(matches[1]) : 0;
    const minutes = matches[2] ? parseInt(matches[2]) : 0;

    return hours * 60 + minutes;
  }

  private getAirlineName(code: string): string {
    // Simplified airline name mapping
    const airlines: Record<string, string> = {
      AA: 'American Airlines',
      DL: 'Delta Air Lines',
      UA: 'United Airlines',
      BA: 'British Airways',
      LH: 'Lufthansa',
      AF: 'Air France',
      EK: 'Emirates',
      QR: 'Qatar Airways',
    };
    return airlines[code] || code;
  }
}
