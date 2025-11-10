import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { getDatabaseConfig, User, Booking, Flight, Passenger } from '@shared/database';
import { BookingsModule } from './bookings/bookings.module';
import { WebsocketModule } from './websocket/websocket.module';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
    }),
    TypeOrmModule.forRoot(getDatabaseConfig()),
    TypeOrmModule.forFeature([User, Booking, Flight, Passenger]),
    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => ({
        secret: process.env.JWT_SECRET,
        signOptions: { expiresIn: process.env.JWT_EXPIRATION || '1h' },
      }),
    }),
    EventEmitterModule.forRoot(),
    BookingsModule,
    WebsocketModule,
  ],
  providers: [JwtStrategy],
})
export class AppModule {}
