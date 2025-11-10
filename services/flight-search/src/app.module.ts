import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { HttpModule } from '@nestjs/axios';
import { getDatabaseConfig, User, Flight, Airline, Airport } from '@shared/database';
import { FlightsModule } from './flights/flights.module';
import { JwtStrategy } from './strategies/jwt.strategy';
import { CacheModule } from './cache/cache.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([User, Flight, Airline, Airport]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION || '1h' },
      }),
    }),
    HttpModule,
    CacheModule,
    FlightsModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
