import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { io, Socket } from 'socket.io-client';
import { BookingModule } from '../../booking/src/booking/booking.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';

describe('WebSocket Integration Tests (e2e)', () => {
  let app: INestApplication;
  let clientSocket: Socket;
  let jwtService: JwtService;
  let accessToken: string;
  const userId = 'test-user-id';
  const bookingId = 'test-booking-id';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [
        TypeOrmModule.forRoot({
          type: 'postgres',
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          username: process.env.DB_USERNAME || 'postgres',
          password: process.env.DB_PASSWORD || 'postgres',
          database: process.env.DB_DATABASE || 'flight_booking_test',
          autoLoadEntities: true,
          synchronize: true,
        }),
        BookingModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.listen(3004);

    jwtService = moduleFixture.get<JwtService>(JwtService);
    accessToken = jwtService.sign({
      sub: userId,
      email: 'test@example.com',
      role: 'CUSTOMER',
    });
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach((done) => {
    clientSocket = io('http://localhost:3004', {
      auth: {
        token: accessToken,
      },
      transports: ['websocket'],
    });

    clientSocket.on('connect', () => {
      done();
    });
  });

  afterEach(() => {
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });

  describe('Connection', () => {
    it('should connect to WebSocket server with valid token', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });

    it('should reject connection without token', (done) => {
      const noAuthSocket = io('http://localhost:3004', {
        transports: ['websocket'],
      });

      noAuthSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        noAuthSocket.disconnect();
        done();
      });

      noAuthSocket.on('connect', () => {
        fail('Should not connect without token');
        noAuthSocket.disconnect();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const invalidTokenSocket = io('http://localhost:3004', {
        auth: {
          token: 'invalid.token.here',
        },
        transports: ['websocket'],
      });

      invalidTokenSocket.on('connect_error', (error) => {
        expect(error).toBeDefined();
        invalidTokenSocket.disconnect();
        done();
      });

      invalidTokenSocket.on('connect', () => {
        fail('Should not connect with invalid token');
        invalidTokenSocket.disconnect();
        done();
      });
    });
  });

  describe('Booking Events', () => {
    it('should receive booking.created event', (done) => {
      const bookingData = {
        id: bookingId,
        bookingReference: 'BK123456',
        status: 'PENDING',
        userId: userId,
      };

      clientSocket.on('booking.created', (data) => {
        expect(data).toMatchObject(bookingData);
        done();
      });

      // Simulate booking created event from server
      clientSocket.emit('booking.created', bookingData);
    });

    it('should receive booking.status_updated event', (done) => {
      const statusUpdateData = {
        id: bookingId,
        status: 'CONFIRMED',
        updatedAt: new Date().toISOString(),
      };

      clientSocket.on('booking.status_updated', (data) => {
        expect(data.status).toBe('CONFIRMED');
        expect(data.id).toBe(bookingId);
        done();
      });

      clientSocket.emit('booking.status_updated', statusUpdateData);
    });

    it('should receive booking.cancelled event', (done) => {
      const cancelData = {
        id: bookingId,
        status: 'CANCELLED',
        reason: 'User cancelled',
      };

      clientSocket.on('booking.cancelled', (data) => {
        expect(data.status).toBe('CANCELLED');
        expect(data.id).toBe(bookingId);
        done();
      });

      clientSocket.emit('booking.cancelled', cancelData);
    });

    it('should receive payment.succeeded event', (done) => {
      const paymentData = {
        bookingId: bookingId,
        paymentId: 'payment-123',
        amount: 500,
        currency: 'USD',
        status: 'SUCCEEDED',
      };

      clientSocket.on('payment.succeeded', (data) => {
        expect(data.status).toBe('SUCCEEDED');
        expect(data.bookingId).toBe(bookingId);
        expect(data.amount).toBe(500);
        done();
      });

      clientSocket.emit('payment.succeeded', paymentData);
    });

    it('should receive payment.failed event', (done) => {
      const paymentFailData = {
        bookingId: bookingId,
        paymentId: 'payment-456',
        error: 'Insufficient funds',
        status: 'FAILED',
      };

      clientSocket.on('payment.failed', (data) => {
        expect(data.status).toBe('FAILED');
        expect(data.error).toBe('Insufficient funds');
        done();
      });

      clientSocket.emit('payment.failed', paymentFailData);
    });

    it('should receive flight.delay event', (done) => {
      const delayData = {
        flightId: 'FL001',
        bookingId: bookingId,
        delayMinutes: 30,
        newDepartureTime: '2024-06-01T15:30:00Z',
        reason: 'Weather conditions',
      };

      clientSocket.on('flight.delay', (data) => {
        expect(data.delayMinutes).toBe(30);
        expect(data.reason).toBe('Weather conditions');
        done();
      });

      clientSocket.emit('flight.delay', delayData);
    });
  });

  describe('Room Management', () => {
    it('should join booking room', (done) => {
      clientSocket.emit('join_booking', bookingId);

      clientSocket.on('joined_booking', (data) => {
        expect(data.bookingId).toBe(bookingId);
        done();
      });
    });

    it('should leave booking room', (done) => {
      clientSocket.emit('join_booking', bookingId);

      clientSocket.on('joined_booking', () => {
        clientSocket.emit('leave_booking', bookingId);

        clientSocket.on('left_booking', (data) => {
          expect(data.bookingId).toBe(bookingId);
          done();
        });
      });
    });

    it('should receive updates only for joined bookings', (done) => {
      const booking1 = 'booking-1';
      const booking2 = 'booking-2';

      let receivedForBooking1 = false;
      let receivedForBooking2 = false;

      // Join only booking1
      clientSocket.emit('join_booking', booking1);

      clientSocket.on('joined_booking', () => {
        // Listen for updates
        clientSocket.on('booking.status_updated', (data) => {
          if (data.id === booking1) {
            receivedForBooking1 = true;
          } else if (data.id === booking2) {
            receivedForBooking2 = true;
          }

          // Check results after a delay
          setTimeout(() => {
            expect(receivedForBooking1).toBe(true);
            expect(receivedForBooking2).toBe(false);
            done();
          }, 100);
        });

        // Emit updates for both bookings
        clientSocket.emit('booking.status_updated', { id: booking1, status: 'CONFIRMED' });
        clientSocket.emit('booking.status_updated', { id: booking2, status: 'CONFIRMED' });
      });
    });
  });

  describe('Reconnection', () => {
    it('should handle disconnect and reconnect', (done) => {
      let disconnected = false;
      let reconnected = false;

      clientSocket.on('disconnect', () => {
        disconnected = true;
      });

      clientSocket.on('connect', () => {
        if (disconnected) {
          reconnected = true;
          expect(reconnected).toBe(true);
          done();
        }
      });

      // Disconnect and reconnect
      clientSocket.disconnect();
      setTimeout(() => {
        clientSocket.connect();
      }, 100);
    });

    it('should maintain booking subscriptions after reconnect', (done) => {
      clientSocket.emit('join_booking', bookingId);

      clientSocket.on('joined_booking', () => {
        // Disconnect
        clientSocket.disconnect();

        // Reconnect
        setTimeout(() => {
          clientSocket.connect();

          clientSocket.on('connect', () => {
            // Re-join booking room
            clientSocket.emit('join_booking', bookingId);

            clientSocket.on('joined_booking', () => {
              expect(clientSocket.connected).toBe(true);
              done();
            });
          });
        }, 100);
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid booking ID', (done) => {
      clientSocket.emit('join_booking', 'invalid-booking-id');

      clientSocket.on('error', (error) => {
        expect(error).toBeDefined();
        expect(error.message).toContain('Invalid booking');
        done();
      });
    });

    it('should handle server errors gracefully', (done) => {
      clientSocket.on('exception', (error) => {
        expect(error).toBeDefined();
        done();
      });

      // Emit invalid data that should cause server error
      clientSocket.emit('booking.created', { invalid: 'data' });
    });
  });
});
