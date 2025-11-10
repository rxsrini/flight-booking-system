# Flight Booking System

A comprehensive, enterprise-grade flight booking platform built with microservices architecture, supporting 1000+ concurrent users with real-time updates, multi-GDS integration, secure payments, and complete audit trails.

![Architecture](https://img.shields.io/badge/Architecture-Microservices-blue)
![Node](https://img.shields.io/badge/Node-18.x-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)
![NestJS](https://img.shields.io/badge/NestJS-10.x-red)
![React](https://img.shields.io/badge/React-18.x-blue)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-blue)
![Redis](https://img.shields.io/badge/Redis-7-red)

## Features

### Core Functionality
- ✈️ **Multi-GDS Flight Search** - Amadeus API integration with real-time availability
- 📅 **Booking Management** - Create, update, and cancel bookings with PNR generation
- 💳 **Secure Payments** - Stripe integration with AES-256 encryption
- 📧 **Email Notifications** - Queue-based email system with 7 templates
- 📊 **Analytics Dashboard** - Comprehensive business intelligence and reporting
- 🔐 **Audit Trail** - Complete compliance-ready audit logging
- 🔄 **Real-time Updates** - WebSocket notifications for booking status

### User Roles
1. **Customers** - Search flights, make bookings, manage reservations
2. **Travel Agents** - Book on behalf of customers
3. **Airline Agents** - Manage bookings and flight operations
4. **Business Owners** - Access analytics and reports
5. **Administrators** - Full system access and user management

### Technical Features
- 🏗️ Microservices architecture (9 services)
- 🚀 API Gateway with rate limiting and routing
- 🔒 JWT authentication with refresh tokens
- 📝 Comprehensive API documentation (Swagger)
- 🐳 Docker containerization
- 📈 Horizontal scalability
- 💾 Caching with Redis
- 🔍 Full-text search
- 📱 RESTful APIs
- 🌐 CORS & security headers

## Project Structure

```
flight-booking-system/
├── services/                    # Microservices
│   ├── auth/                   # Authentication service ✅
│   ├── user-management/        # User management service
│   ├── flight-search/          # Flight search service
│   ├── booking/                # Booking service
│   ├── payment/                # Payment service
│   ├── analytics/              # Analytics service
│   ├── notification/           # Notification service
│   └── audit/                  # Audit service
├── apps/
│   └── web/                    # React frontend application
├── shared/                     # Shared libraries
│   ├── common/                 # Common utilities, guards, decorators ✅
│   ├── database/               # Database entities and config ✅
│   └── types/                  # Shared TypeScript types ✅
└── infrastructure/
    ├── docker/                 # Docker configurations
    └── kubernetes/             # K8s manifests

```

## Database Schema

### Core Tables
- **users** - User accounts with role-based access
- **airlines** - Airline information
- **airports** - Airport details with geolocation
- **flights** - Flight schedules and availability
- **flight_prices** - Dynamic pricing by cabin class
- **bookings** - Booking records with PNR
- **passengers** - Passenger details
- **payments** - Payment transactions
- **audit_logs** - System audit trail
- **notifications** - User notifications
- **permissions** - RBAC permissions
- **role_permissions** - Role-permission mappings

## Features Implemented

### ✅ Completed

1. **Project Structure**
   - Monorepo setup with npm workspaces
   - Shared libraries (types, common, database)
   - Docker and Docker Compose configuration

2. **Database**
   - Complete PostgreSQL schema with 12+ tables
   - TypeORM entity models
   - Migrations and seed data
   - RBAC permissions setup

3. **Authentication Service** (Port 3001)
   - User registration and login
   - JWT token generation and validation
   - Refresh token support (automatic renewal)
   - Password hashing with bcrypt
   - Role-based access control (5 roles)
   - Auth guards and strategies

4. **User Management Service** (Port 3002)
   - User profile management
   - Multi-role support (Customer, Travel Agent, Airline Agent, Business Owner, Admin)
   - User search and filtering
   - Account activation/deactivation
   - Profile updates

5. **Flight Search Service** (Port 3003)
   - Multi-GDS integration (Amadeus API)
   - Real-time flight availability
   - Advanced search filters
   - Price comparison
   - Result caching with Redis
   - Support for multiple cabin classes

6. **Booking Service** (Port 3004)
   - Create, update, cancel bookings
   - Booking reference generation
   - Multi-passenger support
   - WebSocket real-time updates
   - Status tracking (Pending, Confirmed, Cancelled)
   - Integration with payment service

7. **Payment Service** (Port 3005)
   - Stripe integration
   - AES-256-GCM encryption for sensitive data
   - PCI-DSS compliant payment processing
   - Refund support
   - Payment history tracking
   - Webhook handling

8. **Analytics Service** (Port 3006)
   - Revenue analytics
   - Booking trends and statistics
   - User activity tracking
   - Top routes and airlines
   - Business intelligence dashboards
   - Time-series data analysis

9. **Notification Service** (Port 3007)
   - Email notifications with Nodemailer
   - Queue-based delivery with Bull + Redis
   - 7 Handlebars email templates
   - Retry mechanism (3 attempts)
   - Notification history

10. **Audit Service** (Port 3008)
    - Comprehensive audit logging
    - 30+ event types tracked
    - Compliance-ready (GDPR, PCI-DSS, SOX)
    - User action tracking
    - IP address and user agent logging
    - Queryable audit trail

11. **API Gateway** (Port 3000)
    - Service routing and orchestration
    - Rate limiting (3-tier: 10/s, 100/min, 1000/hr)
    - Circuit breaker pattern
    - Request/response logging
    - Health checks
    - Centralized error handling

12. **React Frontend** (Port 3001)
    - Role-based dashboards (5 types)
    - Flight search interface
    - Booking management
    - Payment processing
    - User profile management
    - Real-time updates via WebSocket
    - Responsive design with Tailwind CSS
    - Analytics charts with Recharts

13. **Monitoring & Observability**
    - Prometheus metrics collection
    - Grafana dashboards
    - Winston structured logging
    - Sentry error tracking
    - PostgreSQL, Redis, Node exporters
    - 11 alert rules
    - Performance monitoring

14. **Testing**
    - Unit tests for core services
    - Integration tests for booking flow
    - WebSocket integration tests
    - 70%+ code coverage target
    - Jest testing framework
    - E2E tests

## Getting Started

### Prerequisites
- Node.js >= 18.0.0
- npm >= 9.0.0
- Docker and Docker Compose
- PostgreSQL 15 (or use Docker)

### Installation

1. **Clone and navigate to project**
   ```bash
   cd flight-booking-system
   ```

2. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Install dependencies**
   ```bash
   npm run install:all
   ```

4. **Start infrastructure (PostgreSQL & Redis)**
   ```bash
   docker-compose up -d postgres redis
   ```

5. **Run database migrations**
   The database will be automatically initialized with the init.sql script.

6. **Start services**

   Development mode (all services):
   ```bash
   npm run dev
   ```

   Or start individual services:
   ```bash
   npm run dev:auth       # Auth service on :3001
   npm run dev:user       # User service on :3002
   npm run dev:flight     # Flight service on :3003
   # ... etc
   ```

### Using Docker (Recommended)

Start everything with Docker Compose:
```bash
docker-compose up -d
```

This will start:
- PostgreSQL database
- Redis cache
- All 8 microservices
- Frontend application

## API Documentation

### Authentication Service (Port 3001)

#### Register User
```bash
POST /api/v1/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "role": "CUSTOMER"
}
```

#### Login
```bash
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

#### Get Current User Profile
```bash
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

#### Refresh Token
```bash
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<refresh_token>"
}
```

## Security Features

- **JWT Authentication**: Stateless authentication with access (1h) and refresh tokens (7d)
- **RBAC**: Fine-grained role-based access control with 5 user roles
- **Password Hashing**: bcrypt with 10 salt rounds
- **Input Validation**: class-validator for DTO validation
- **SQL Injection Protection**: TypeORM parameterized queries
- **CORS**: Configurable cross-origin resource sharing
- **Rate Limiting**: Three-tier throttling (10 req/s, 100 req/min, 1000 req/hr)
- **Encryption**: AES-256-GCM for sensitive payment data
- **XSS Protection**: Input sanitization and CSP headers
- **HTTPS Only**: Secure cookie flags
- **Helmet**: Security headers middleware
- **Request Signing**: Webhook signature verification (Stripe)

## Testing

The project includes comprehensive test coverage with unit tests, integration tests, and E2E tests.

### Test Coverage

- **Auth Service**: 15 unit tests covering registration, login, token validation, refresh
- **Booking Service**: 20 unit tests covering booking CRUD, status updates, authorization
- **Payment Service**: 18 unit tests covering payments, encryption, refunds
- **Encryption Service**: 12 unit tests covering AES-256-GCM encryption/decryption
- **Integration Tests**: 10 E2E tests covering complete booking flow
- **WebSocket Tests**: 12 tests covering real-time updates and reconnection

### Running Tests

```bash
# Run all tests
npm run test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch

# Run specific service tests
npm run test -- services/auth
npm run test -- services/booking
npm run test -- services/payment

# Run integration tests
npm run test:integration
```

### Test Results

Expected coverage:
- **Statements**: 70%+
- **Branches**: 70%+
- **Functions**: 70%+
- **Lines**: 70%+

## Environment Variables

Key environment variables (see `.env.example` for complete list):

```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_DATABASE=flight_booking

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d

# Service Ports
AUTH_SERVICE_PORT=3001
USER_SERVICE_PORT=3002
# ... etc

# GDS APIs
AMADEUS_API_KEY=your-key
SABRE_CLIENT_ID=your-id

# Payment Gateway
STRIPE_SECRET_KEY=your-key
```

## Quick Start

### Prerequisites
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+ (or use Docker)
- Redis 7+ (or use Docker)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd flight-booking-system
```

2. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

3. **Start all services with Docker**
```bash
docker-compose up
```

4. **Access the application**
- Frontend: http://localhost:3001
- API Gateway: http://localhost:3000
- API Documentation: http://localhost:3000/api/docs

See [SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md) for detailed architecture documentation.

## Support

For issues and questions:
- Check documentation: `/docs`
- View API docs: http://localhost:3000/api/docs
- Open an issue on GitHub

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ using NestJS, React, and TypeScript**
