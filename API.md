# API Documentation

Complete API reference for the Flight Booking System.

## Base URL

All API requests should be sent to:
```
http://localhost:3000/api/v1
```

## Authentication

Most endpoints require authentication using JWT tokens. Include the access token in the Authorization header:

```
Authorization: Bearer <access_token>
```

Access tokens expire after 1 hour. Use the refresh token endpoint to obtain a new access token.

## Response Format

All API responses follow this format:

**Success Response:**
```json
{
  "data": {...},
  "message": "Success",
  "statusCode": 200
}
```

**Error Response:**
```json
{
  "message": "Error message",
  "error": "Error type",
  "statusCode": 400
}
```

---

## Authentication Service

### Register User

Create a new user account.

**Endpoint:** `POST /auth/register`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER",
  "phoneNumber": "+1234567890"
}
```

**Roles:** `CUSTOMER`, `TRAVEL_AGENT`, `AIRLINE_AGENT`, `BUSINESS_OWNER`, `ADMIN`

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER",
  "isActive": true,
  "isEmailVerified": false,
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Login

Authenticate user and receive access/refresh tokens.

**Endpoint:** `POST /auth/login`

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  }
}
```

---

### Refresh Token

Get new access token using refresh token.

**Endpoint:** `POST /auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

**Response:** `200 OK`
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIs...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIs..."
}
```

---

### Get Current User

Get authenticated user's profile.

**Endpoint:** `GET /auth/me`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER",
  "phoneNumber": "+1234567890",
  "isActive": true,
  "isEmailVerified": false
}
```

---

### Logout

Invalidate current refresh token.

**Endpoint:** `POST /auth/logout`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

## User Management Service

### Get User by ID

Get user details by ID (Admin only).

**Endpoint:** `GET /users/:id`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `ADMIN`

**Response:** `200 OK`
```json
{
  "id": "uuid",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER",
  "phoneNumber": "+1234567890",
  "isActive": true
}
```

---

### Update User Profile

Update user profile information.

**Endpoint:** `PATCH /users/:id`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "firstName": "Jane",
  "lastName": "Smith",
  "phoneNumber": "+1234567891"
}
```

**Response:** `200 OK`

---

### Search Users

Search and filter users (Admin only).

**Endpoint:** `GET /users?role=CUSTOMER&isActive=true&search=john`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `ADMIN`

**Query Parameters:**
- `role`: Filter by role
- `isActive`: Filter by active status
- `search`: Search by name or email
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

**Response:** `200 OK`
```json
{
  "data": [...],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

---

## Flight Search Service

### Search Flights

Search for available flights.

**Endpoint:** `GET /flights/search`

**Headers:** `Authorization: Bearer <token>`

**Query Parameters:**
- `origin` (required): Origin airport code (e.g., JFK)
- `destination` (required): Destination airport code (e.g., LAX)
- `departureDate` (required): Departure date (YYYY-MM-DD)
- `returnDate` (optional): Return date for round trips
- `passengers` (required): Number of passengers
- `cabinClass` (optional): ECONOMY, PREMIUM_ECONOMY, BUSINESS, FIRST_CLASS

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "flightNumber": "AA100",
    "airline": {
      "code": "AA",
      "name": "American Airlines"
    },
    "origin": {
      "code": "JFK",
      "name": "John F. Kennedy International",
      "city": "New York"
    },
    "destination": {
      "code": "LAX",
      "name": "Los Angeles International",
      "city": "Los Angeles"
    },
    "departureTime": "2024-06-01T08:00:00Z",
    "arrivalTime": "2024-06-01T11:30:00Z",
    "duration": 390,
    "price": {
      "amount": 450.00,
      "currency": "USD",
      "cabinClass": "ECONOMY"
    },
    "availableSeats": 120
  }
]
```

---

### Get Flight by ID

Get detailed flight information.

**Endpoint:** `GET /flights/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

## Booking Service

### Create Booking

Create a new flight booking.

**Endpoint:** `POST /bookings`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "flightId": "uuid",
  "passengers": [
    {
      "firstName": "John",
      "lastName": "Doe",
      "dateOfBirth": "1990-01-01",
      "passportNumber": "P12345678",
      "nationality": "US"
    }
  ],
  "contactEmail": "user@example.com",
  "contactPhone": "+1234567890",
  "totalAmount": 500,
  "currency": "USD"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "bookingReference": "BK123456",
  "userId": "uuid",
  "flightId": "uuid",
  "status": "PENDING",
  "passengers": [...],
  "totalAmount": 500,
  "currency": "USD",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

---

### Get User Bookings

Get all bookings for authenticated user.

**Endpoint:** `GET /bookings`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`
```json
[
  {
    "id": "uuid",
    "bookingReference": "BK123456",
    "status": "CONFIRMED",
    "flight": {
      "flightNumber": "AA100",
      "departureTime": "2024-06-01T08:00:00Z"
    },
    "totalAmount": 500,
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
]
```

---

### Get Booking by ID

Get booking details.

**Endpoint:** `GET /bookings/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Update Booking Status

Update booking status (Admin/Agent only).

**Endpoint:** `PATCH /bookings/:id/status`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `ADMIN`, `AIRLINE_AGENT`, `TRAVEL_AGENT`

**Request Body:**
```json
{
  "status": "CONFIRMED"
}
```

**Status Values:** `PENDING`, `CONFIRMED`, `CANCELLED`, `COMPLETED`

**Response:** `200 OK`

---

### Cancel Booking

Cancel a booking.

**Endpoint:** `POST /bookings/:id/cancel`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

## Payment Service

### Create Payment

Process payment for a booking.

**Endpoint:** `POST /payments`

**Headers:** `Authorization: Bearer <token>`

**Request Body:**
```json
{
  "bookingId": "uuid",
  "paymentMethodId": "pm_xxx",
  "cardNumber": "4242424242424242",
  "cardExpMonth": 12,
  "cardExpYear": 2025,
  "cardCvc": "123"
}
```

**Response:** `201 Created`
```json
{
  "id": "uuid",
  "bookingId": "uuid",
  "amount": 500,
  "currency": "USD",
  "status": "SUCCEEDED",
  "paymentMethod": "card",
  "cardLast4": "4242",
  "cardBrand": "visa",
  "createdAt": "2024-01-01T00:00:00.000Z"
}
```

**Note:** Card numbers are encrypted using AES-256-GCM and never stored in plain text.

---

### Get Payment by ID

Get payment details.

**Endpoint:** `GET /payments/:id`

**Headers:** `Authorization: Bearer <token>`

**Response:** `200 OK`

---

### Refund Payment

Refund a payment (Admin only).

**Endpoint:** `POST /payments/:id/refund`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `ADMIN`

**Response:** `200 OK`

---

## Analytics Service

### Get Revenue Analytics

Get revenue statistics (Business Owner/Admin only).

**Endpoint:** `GET /analytics/revenue`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `BUSINESS_OWNER`, `ADMIN`

**Query Parameters:**
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)
- `groupBy`: DAY, WEEK, MONTH

**Response:** `200 OK`
```json
{
  "totalRevenue": 125000,
  "currency": "USD",
  "bookingCount": 250,
  "averageBookingValue": 500,
  "data": [
    {
      "date": "2024-01-01",
      "revenue": 5000,
      "bookings": 10
    }
  ]
}
```

---

### Get Booking Statistics

Get booking trends and statistics.

**Endpoint:** `GET /analytics/bookings`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `BUSINESS_OWNER`, `ADMIN`

**Response:** `200 OK`

---

### Get Top Routes

Get most popular flight routes.

**Endpoint:** `GET /analytics/top-routes`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `BUSINESS_OWNER`, `ADMIN`

**Response:** `200 OK`
```json
[
  {
    "origin": "JFK",
    "destination": "LAX",
    "bookingCount": 150,
    "revenue": 75000
  }
]
```

---

## Notification Service

### Send Notification

Send notification to user (System only).

**Endpoint:** `POST /notifications`

**Headers:** `Authorization: Bearer <token>` (Service-to-service)

**Request Body:**
```json
{
  "userId": "uuid",
  "type": "BOOKING_CONFIRMATION",
  "channel": "EMAIL",
  "data": {
    "bookingReference": "BK123456",
    "amount": 500
  }
}
```

**Notification Types:**
- `BOOKING_CONFIRMATION`
- `PAYMENT_SUCCESS`
- `PAYMENT_FAILED`
- `BOOKING_CANCELLED`
- `FLIGHT_DELAY`
- `PASSWORD_RESET`
- `WELCOME_EMAIL`

---

## Audit Service

### Get Audit Logs

Get audit trail (Admin only).

**Endpoint:** `GET /audit`

**Headers:** `Authorization: Bearer <token>`

**Permissions:** `ADMIN`, `BUSINESS_OWNER`

**Query Parameters:**
- `userId`: Filter by user ID
- `eventType`: Filter by event type
- `startDate`: Start date
- `endDate`: End date
- `page`: Page number
- `limit`: Items per page

**Response:** `200 OK`
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "eventType": "USER_LOGIN",
      "eventDescription": "User logged in successfully",
      "ipAddress": "192.168.1.1",
      "userAgent": "Mozilla/5.0...",
      "metadata": {...},
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "total": 1000,
  "page": 1,
  "limit": 50
}
```

---

## WebSocket Events

Connect to WebSocket server for real-time updates:

```javascript
const socket = io('http://localhost:3004', {
  auth: {
    token: '<access_token>'
  }
});
```

### Events

**Client → Server:**
- `join_booking`: Join booking room to receive updates
- `leave_booking`: Leave booking room

**Server → Client:**
- `booking.created`: New booking created
- `booking.status_updated`: Booking status changed
- `booking.cancelled`: Booking cancelled
- `payment.succeeded`: Payment successful
- `payment.failed`: Payment failed
- `flight.delay`: Flight delayed

**Example:**
```javascript
// Join booking room
socket.emit('join_booking', bookingId);

// Listen for status updates
socket.on('booking.status_updated', (data) => {
  console.log('Booking status:', data.status);
});
```

---

## Rate Limits

API rate limits per user:
- **Per second**: 10 requests
- **Per minute**: 100 requests
- **Per hour**: 1000 requests

**Rate Limit Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1609459200
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid input |
| 401  | Unauthorized - Missing or invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists |
| 422  | Unprocessable Entity - Validation error |
| 429  | Too Many Requests - Rate limit exceeded |
| 500  | Internal Server Error |

---

## Common Validation Rules

- **Email**: Valid email format
- **Password**: Min 8 characters, at least 1 uppercase, 1 lowercase, 1 number
- **Phone**: E.164 format (e.g., +1234567890)
- **Date**: ISO 8601 format (YYYY-MM-DD)
- **Airport Code**: 3-letter IATA code
- **Currency**: 3-letter ISO 4217 code

---

## Pagination

All list endpoints support pagination:

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10, max: 100)

**Response:**
```json
{
  "data": [...],
  "total": 1000,
  "page": 1,
  "limit": 10,
  "pages": 100
}
```

---

## Testing the API

### Using cURL

```bash
# Register user
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!","firstName":"John","lastName":"Doe","role":"CUSTOMER","phoneNumber":"+1234567890"}'

# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Test123!"}'

# Search flights
curl -X GET "http://localhost:3000/api/v1/flights/search?origin=JFK&destination=LAX&departureDate=2024-06-01&passengers=1" \
  -H "Authorization: Bearer <token>"
```

### Using Postman

Import the Postman collection from `/docs/postman_collection.json`

---

## Support

For API support:
- Documentation: http://localhost:3000/api/docs (Swagger)
- GitHub Issues: [Repository URL]
- Email: support@flightbooking.com
