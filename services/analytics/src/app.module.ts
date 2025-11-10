import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ScheduleModule } from '@nestjs/schedule';
import { getDatabaseConfig, User, Booking, Payment, Flight, Airline, Airport } from '@shared/database';
import { AnalyticsModule } from './analytics/analytics.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([User, Booking, Payment, Flight, Airline, Airport]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION || '1h' },
      }),
    }),
    ScheduleModule.forRoot(),
    AnalyticsModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
