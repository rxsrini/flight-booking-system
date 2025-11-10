# Analytics Service

The Analytics Service provides comprehensive business intelligence and reporting capabilities for the Flight Booking System. It aggregates data from bookings, payments, users, and flights to provide actionable insights.

## Features

- **Dashboard Overview**: Key metrics with period-over-period growth rates
- **Booking Analytics**: Booking trends, status breakdown, cabin class analysis
- **Revenue Analytics**: Financial metrics, payment methods, daily revenue trends
- **User Analytics**: User distribution, growth trends, top customers
- **Flight Analytics**: Popular routes, top airlines, busiest airports
- **Real-time Metrics**: Live system status and recent activity

## Role-Based Access Control

Different analytics endpoints are accessible to different user roles:

- **Admin**: Full access to all analytics
- **Business Owner**: Access to all analytics except operational details
- **Airline Agent**: Access to booking and flight analytics only
- **Travel Agent**: No access
- **Customer**: No access

## API Endpoints

### Dashboard Overview
```
GET /api/v1/analytics/dashboard?startDate=2024-01-01&endDate=2024-12-31&groupBy=day&timezone=UTC
```

Returns key metrics including:
- Total bookings and growth rate
- Total revenue and growth rate
- Total users and growth rate
- Average booking value and growth rate

**Access**: Admin, Business Owner, Airline Agent

### Booking Analytics
```
GET /api/v1/analytics/bookings?startDate=2024-01-01&endDate=2024-12-31&groupBy=day&timezone=UTC
```

Returns:
- Booking trends over time
- Status breakdown (confirmed, pending, cancelled)
- Cabin class distribution
- Top performing agents

**Access**: Admin, Business Owner, Airline Agent

### Revenue Analytics
```
GET /api/v1/analytics/revenue?startDate=2024-01-01&endDate=2024-12-31&groupBy=month&timezone=UTC
```

Returns:
- Revenue trends over time
- Revenue by payment status
- Payment method distribution
- Daily revenue statistics

**Access**: Admin, Business Owner only

### User Analytics
```
GET /api/v1/analytics/users?startDate=2024-01-01&endDate=2024-12-31&groupBy=week&timezone=UTC
```

Returns:
- User distribution by role
- User distribution by status
- New user trends
- Top customers by booking value

**Access**: Admin, Business Owner only

### Flight Analytics
```
GET /api/v1/analytics/flights?startDate=2024-01-01&endDate=2024-12-31
```

Returns:
- Top 10 popular routes
- Top 10 airlines by bookings
- Top 10 busiest airports

**Access**: Admin, Business Owner, Airline Agent

### Real-time Metrics
```
GET /api/v1/analytics/realtime
```

Returns live metrics for:
- Last 24 hours: bookings, revenue, new users
- Last 1 hour: bookings, revenue, active users

**Access**: Admin, Business Owner, Airline Agent

## Query Parameters

All endpoints (except real-time) support these query parameters:

- `startDate` (optional): Start date in ISO format (default: 30 days ago)
- `endDate` (optional): End date in ISO format (default: today)
- `groupBy` (optional): Time grouping - `hour`, `day`, `week`, `month`, `year` (default: `day`)
- `timezone` (optional): Timezone for date calculations (default: `UTC`)

## Authentication

All endpoints require JWT authentication. Include the JWT token in the Authorization header:

```
Authorization: Bearer <your-jwt-token>
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your configuration
```

## Running the Service

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Docker
docker build -t analytics-service .
docker run -p 3006:3006 analytics-service
```

## Environment Variables

See `.env.example` for required configuration:
- `ANALYTICS_SERVICE_PORT`: Port to run the service on (default: 3006)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: PostgreSQL connection
- `JWT_SECRET`: Secret key for JWT token verification

## Database Dependencies

The Analytics Service queries the following tables:
- `bookings`: For booking analytics
- `payments`: For revenue analytics
- `users`: For user analytics
- `flights`: For flight analytics
- `airlines`: For airline information
- `airports`: For airport information

Ensure all database tables are properly set up before running the service.

## Technology Stack

- **NestJS**: Backend framework
- **TypeORM**: Database ORM
- **PostgreSQL**: Database
- **JWT**: Authentication
- **class-validator**: Request validation

## Growth Rate Calculations

Growth rates are calculated by comparing the current period with the previous period of equal length:

```
Growth Rate = ((Current - Previous) / Previous) × 100
```

Example: If analyzing Jan 1-15 (15 days), the comparison period would be Dec 17-31 (previous 15 days).

## Performance Considerations

- Complex queries use database aggregations for efficiency
- Consider adding database indexes on frequently queried columns
- Real-time metrics are limited to recent data (24 hours) for performance
- Consider caching frequently accessed analytics data with Redis

## Future Enhancements

- [ ] Export analytics to CSV/PDF
- [ ] Scheduled email reports
- [ ] Custom dashboard builder
- [ ] Predictive analytics using ML
- [ ] Comparative analytics (year-over-year)
- [ ] Agent performance rankings
- [ ] Customer lifetime value analysis
