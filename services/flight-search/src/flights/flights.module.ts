import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { HttpModule } from '@nestjs/axios';
import { Flight, Airline, Airport } from '@shared/database';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';
import { AmadeusService } from '../gds/amadeus/amadeus.service';
import { SabreService } from '../gds/sabre/sabre.service';
import { CacheModule } from '../cache/cache.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Flight, Airline, Airport]),
    HttpModule,
    CacheModule,
  ],
  controllers: [FlightsController],
  providers: [FlightsService, AmadeusService, SabreService],
  exports: [FlightsService],
})
export class FlightsModule {}
