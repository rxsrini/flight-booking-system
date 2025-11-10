import request from 'supertest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../../auth/src/auth/auth.module';
import { BookingModule } from '../../booking/src/booking/booking.module';
import { PaymentModule } from '../../payment/src/payment/payment.module';
import { FlightSearchModule } from '../../flight-search/src/flight/flight.module';

describe('Booking Flow Integration Tests (e2e)', () => {
  let app: INestApplication;
  let accessToken: string;
  let userId: string;
  let flightId: string;
  let bookingId: string;

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
          dropSchema: true, // Clean database before tests
        }),
        AuthModule,
        FlightSearchModule,
        BookingModule,
        PaymentModule,
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Complete Booking Flow', () => {
    it('1. Should register a new user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'CUSTOMER',
          phoneNumber: '+1234567890',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.email).toBe('testuser@example.com');
      expect(response.body.role).toBe('CUSTOMER');
      userId = response.body.id;
    });

    it('2. Should login and receive access token', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'testuser@example.com',
          password: 'Password123!',
        })
        .expect(200);

      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');
      expect(response.body.user.email).toBe('testuser@example.com');
      accessToken = response.body.accessToken;
    });

    it('3. Should search for flights', async () => {
      const response = await request(app.getHttpServer())
        .get('/flights/search')
        .query({
          origin: 'JFK',
          destination: 'LAX',
          departureDate: '2024-06-01',
          passengers: 1,
        })
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0]).toHaveProperty('id');
      expect(response.body[0]).toHaveProperty('origin');
      expect(response.body[0]).toHaveProperty('destination');
      flightId = response.body[0].id;
    });

    it('4. Should create a booking', async () => {
      const response = await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          flightId: flightId,
          passengers: [
            {
              firstName: 'John',
              lastName: 'Doe',
              dateOfBirth: '1990-01-01',
              passportNumber: 'P12345678',
              nationality: 'US',
            },
          ],
          contactEmail: 'testuser@example.com',
          contactPhone: '+1234567890',
          totalAmount: 500,
          currency: 'USD',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body).toHaveProperty('bookingReference');
      expect(response.body.status).toBe('PENDING');
      expect(response.body.totalAmount).toBe(500);
      bookingId = response.body.id;
    });

    it('5. Should retrieve the created booking', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.id).toBe(bookingId);
      expect(response.body.status).toBe('PENDING');
      expect(response.body.passengers).toHaveLength(1);
    });

    it('6. Should process payment for the booking', async () => {
      const response = await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bookingId: bookingId,
          paymentMethodId: 'pm_card_visa',
          cardNumber: '4242424242424242',
          cardExpMonth: 12,
          cardExpYear: 2025,
          cardCvc: '123',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.status).toBe('SUCCEEDED');
      expect(response.body.amount).toBe(500);
      expect(response.body.cardLast4).toBe('4242');
      expect(response.body).not.toHaveProperty('cardNumber'); // Ensure card number is not exposed
    });

    it('7. Should verify booking status updated to CONFIRMED', async () => {
      const response = await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('CONFIRMED');
    });

    it('8. Should retrieve user bookings', async () => {
      const response = await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(response.body[0].id).toBe(bookingId);
    });

    it('9. Should cancel the booking', async () => {
      const response = await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.status).toBe('CANCELLED');
    });

    it('10. Should not allow payment for cancelled booking', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bookingId: bookingId,
          paymentMethodId: 'pm_card_visa',
          cardNumber: '4242424242424242',
          cardExpMonth: 12,
          cardExpYear: 2025,
          cardCvc: '123',
        })
        .expect(400);
    });
  });

  describe('Error Handling', () => {
    it('Should return 401 for requests without token', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .expect(401);
    });

    it('Should return 401 for invalid token', async () => {
      await request(app.getHttpServer())
        .get('/bookings')
        .set('Authorization', 'Bearer invalid_token')
        .expect(401);
    });

    it('Should return 404 for non-existent booking', async () => {
      await request(app.getHttpServer())
        .get('/bookings/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('Should return 400 for invalid booking data', async () => {
      await request(app.getHttpServer())
        .post('/bookings')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          flightId: 'invalid',
          // Missing required fields
        })
        .expect(400);
    });

    it('Should return 400 for invalid payment card', async () => {
      await request(app.getHttpServer())
        .post('/payments')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          bookingId: bookingId,
          paymentMethodId: 'pm_card_visa',
          cardNumber: 'invalid',
          cardExpMonth: 12,
          cardExpYear: 2025,
          cardCvc: '123',
        })
        .expect(400);
    });
  });

  describe('Authorization Tests', () => {
    let otherUserToken: string;
    let otherUserBookingId: string;

    it('Should register another user', async () => {
      const response = await request(app.getHttpServer())
        .post('/auth/register')
        .send({
          email: 'otheruser@example.com',
          password: 'Password123!',
          firstName: 'Jane',
          lastName: 'Smith',
          role: 'CUSTOMER',
          phoneNumber: '+1234567891',
        })
        .expect(201);

      const loginResponse = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'otheruser@example.com',
          password: 'Password123!',
        })
        .expect(200);

      otherUserToken = loginResponse.body.accessToken;
    });

    it('Should not allow user to view other user bookings', async () => {
      await request(app.getHttpServer())
        .get(`/bookings/${bookingId}`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403); // Forbidden
    });

    it('Should not allow user to cancel other user bookings', async () => {
      await request(app.getHttpServer())
        .post(`/bookings/${bookingId}/cancel`)
        .set('Authorization', `Bearer ${otherUserToken}`)
        .expect(403);
    });
  });
});
