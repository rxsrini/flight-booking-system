# API Gateway

The API Gateway serves as the single entry point for all client requests to the Flight Booking System. It provides intelligent routing, rate limiting, security, monitoring, and service orchestration.

## Features

- **Unified Entry Point**: Single API endpoint for all microservices
- **Intelligent Routing**: Automatic request routing to appropriate microservices
- **Rate Limiting**: Multi-tier throttling (per second, minute, hour)
- **Security**: Helmet, CORS, JWT authentication
- **Load Balancing**: Request distribution across service instances
- **Circuit Breaking**: Automatic retry with exponential backoff
- **Health Monitoring**: Real-time health checks for all services
- **Request Logging**: Comprehensive HTTP request/response logging
- **API Documentation**: Auto-generated Swagger/OpenAPI docs
- **Compression**: Response compression for better performance
- **Error Handling**: Centralized error handling and formatting

## Architecture

```
┌─────────────┐
│   Clients   │
│ (Web, App)  │
└──────┬──────┘
       │
       ▼
┌─────────────────────────────────────┐
│         API Gateway (Port 3000)     │
│  ┌──────────────────────────────┐   │
│  │  Rate Limiting & Throttling  │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │   Security (Helmet, CORS)    │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │    Request Logging           │   │
│  └──────────────────────────────┘   │
│  ┌──────────────────────────────┐   │
│  │   Intelligent Routing        │   │
│  └──────────────────────────────┘   │
└──────┬───┬───┬───┬───┬───┬───┬──────┘
       │   │   │   │   │   │   │
       ▼   ▼   ▼   ▼   ▼   ▼   ▼
┌─────────────────────────────────────┐
│          Microservices              │
│  Auth │ User │ Flight │ Booking     │
│  Payment │ Analytics │ Notification │
│  Audit                              │
└─────────────────────────────────────┘
```

## Service Routes

All requests are routed through the API Gateway at `http://localhost:3000/api/v1`:

| Route | Target Service | Port |
|-------|---------------|------|
| `/auth/*` | Authentication Service | 3001 |
| `/users/*` | User Management Service | 3002 |
| `/flights/*` | Flight Search Service | 3003 |
| `/bookings/*` | Booking Service | 3004 |
| `/payments/*` | Payment Service | 3005 |
| `/analytics/*` | Analytics Service | 3006 |
| `/notifications/*` | Notification Service | 3007 |
| `/audit/*` | Audit Service | 3008 |

## Rate Limiting

The gateway implements three-tier rate limiting:

### Tier 1: Short (Per Second)
- **Window**: 1 second
- **Limit**: 10 requests
- **Use case**: Prevent spam/abuse

### Tier 2: Medium (Per Minute)
- **Window**: 1 minute
- **Limit**: 100 requests
- **Use case**: Normal API usage

### Tier 3: Long (Per Hour)
- **Window**: 1 hour
- **Limit**: 1000 requests
- **Use case**: Sustained usage monitoring

When rate limit is exceeded, the API returns:
```json
{
  "statusCode": 429,
  "message": "ThrottlerException: Too Many Requests"
}
```

## Request Flow

1. **Client Request** → API Gateway receives request
2. **Security Check** → Helmet & CORS validation
3. **Rate Limiting** → Throttle check (if exceeded, return 429)
4. **Authentication** → JWT validation (if required)
5. **Logging** → Log incoming request
6. **Route Matching** → Determine target service
7. **Proxy Request** → Forward to microservice
8. **Retry Logic** → Retry on failure (2 attempts, 1s delay)
9. **Timeout** → Service-specific timeouts
10. **Response** → Return to client
11. **Logging** → Log response with duration

## Service Timeouts

Different services have different timeout configurations:

- **Auth Service**: 5 seconds
- **User Service**: 5 seconds
- **Flight Service**: 10 seconds (GDS calls can be slow)
- **Booking Service**: 8 seconds
- **Payment Service**: 15 seconds (payment processing)
- **Analytics Service**: 10 seconds (complex queries)
- **Notification Service**: 5 seconds
- **Audit Service**: 5 seconds

## Error Handling

### Service Unavailable (503)
When a microservice is down or unreachable:
```json
{
  "message": "Service auth-service is currently unavailable",
  "service": "auth-service",
  "error": "Service Unavailable"
}
```

### Gateway Timeout (504)
When a microservice doesn't respond in time:
```json
{
  "message": "Request to booking-service timed out",
  "service": "booking-service",
  "error": "Gateway Timeout"
}
```

### Service Error (4xx/5xx)
Proxied errors from microservices are returned as-is with original status code.

## Health Checks

### Gateway Health
```bash
GET /api/v1/health
```

Returns:
```json
{
  "status": "up",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "uptime": 3600,
  "memory": {
    "used": 45,
    "total": 128,
    "unit": "MB"
  }
}
```

### All Services Health
```bash
GET /api/v1/health/services
```

Returns:
```json
{
  "status": "up",
  "timestamp": "2024-01-01T12:00:00.000Z",
  "services": {
    "auth-service": {
      "status": "up",
      "responseTime": "45ms",
      "url": "http://localhost:3001"
    },
    "user-service": {
      "status": "up",
      "responseTime": "32ms",
      "url": "http://localhost:3002"
    },
    "flight-service": {
      "status": "down",
      "responseTime": "3001ms",
      "url": "http://localhost:3003",
      "error": "Connection timeout"
    }
  }
}
```

## API Documentation

Interactive Swagger documentation is available at:
```
http://localhost:3000/api/docs
```

Features:
- Complete API reference for all endpoints
- Try-it-out functionality
- Request/response examples
- Authentication support (JWT)
- Organized by service tags

## Example Requests

### Authentication
```bash
# Login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Response
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": { ... }
}
```

### Search Flights
```bash
curl -X GET "http://localhost:3000/api/v1/flights/search?origin=JFK&destination=LAX&date=2024-12-25" \
  -H "Authorization: Bearer <token>"
```

### Create Booking
```bash
curl -X POST http://localhost:3000/api/v1/bookings \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "flightId": "flight-uuid",
    "passengers": [...]
  }'
```

### Process Payment
```bash
curl -X POST http://localhost:3000/api/v1/payments \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bookingId": "booking-uuid",
    "amount": 500,
    "paymentMethod": "card"
  }'
```

## Security Features

### Helmet
Protects against common vulnerabilities:
- XSS attacks
- Clickjacking
- MIME type sniffing
- DNS prefetch control

### CORS
Configured for frontend origin:
```typescript
{
  origin: process.env.FRONTEND_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}
```

### JWT Authentication
- Token validation via Passport JWT strategy
- Automatic header forwarding to services
- Token expiration handling

## Request Logging

All requests are logged with:
- HTTP method
- URL path
- Client IP
- User agent
- Response status code
- Duration in milliseconds

Example logs:
```
[HTTP] → POST /api/v1/auth/login - 192.168.1.1 - Mozilla/5.0...
[HTTP] ← POST /api/v1/auth/login 200 - 145ms

[HTTP] → GET /api/v1/flights/search?origin=JFK - 192.168.1.1
[HTTP] ← GET /api/v1/flights/search 200 - 2340ms
```

## Circuit Breaking

The gateway implements automatic retry with exponential backoff:
- **Retry Count**: 2 attempts
- **Initial Delay**: 1 second
- **Strategy**: Exponential backoff
- **Reset**: On successful request

Failed requests after retries result in appropriate error responses.

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with service URLs
```

## Running the Gateway

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Docker
docker build -t api-gateway .
docker run -p 3000:3000 api-gateway
```

## Environment Variables

See `.env.example` for required configuration:
- `API_GATEWAY_PORT`: Gateway port (default: 3000)
- `JWT_SECRET`: JWT secret key for validation
- `*_SERVICE_URL`: URLs for all 8 microservices
- `FRONTEND_URL`: Frontend origin for CORS
- `THROTTLE_TTL`, `THROTTLE_LIMIT`: Rate limiting config

## Monitoring

### Key Metrics to Monitor
- Request rate (requests/second)
- Response time (p50, p95, p99)
- Error rate (4xx, 5xx)
- Service health status
- Rate limit hits
- Circuit breaker trips

### Health Check Automation
Run periodic health checks:
```bash
# Check gateway health
curl http://localhost:3000/api/v1/health

# Check all services
curl http://localhost:3000/api/v1/health/services
```

## Performance Optimization

### Response Compression
- Automatic gzip compression for responses
- Reduces bandwidth by 60-80%

### Connection Pooling
- HTTP keep-alive enabled
- Connection reuse across requests

### Request Deduplication
- Identical concurrent requests can be cached
- Reduces load on backend services

## Load Balancing

For production deployment, consider:

### Multiple Gateway Instances
```
┌──────────────┐
│ Load Balancer│
│   (Nginx)    │
└──────┬───────┘
       │
   ┌───┴───┬───────┬───────┐
   ▼       ▼       ▼       ▼
Gateway Gateway Gateway Gateway
 :3000   :3001   :3002   :3003
```

### Service Discovery
- Use service registry (Consul, etcd)
- Dynamic service URL resolution
- Automatic failover

## Troubleshooting

### Gateway not starting
- Check if port 3000 is available
- Verify environment variables
- Check service URLs are correct

### Service timeouts
- Check backend service health
- Increase timeout in `services.config.ts`
- Review network connectivity

### Rate limiting issues
- Adjust throttle limits in `app.module.ts`
- Consider IP-based vs user-based limiting
- Use Redis for distributed rate limiting

### CORS errors
- Verify `FRONTEND_URL` in `.env`
- Check allowed headers configuration
- Review browser console for details

## Technology Stack

- **NestJS**: Backend framework
- **Axios**: HTTP client for service requests
- **Passport JWT**: Authentication
- **Helmet**: Security headers
- **Compression**: Response compression
- **Swagger**: API documentation
- **Throttler**: Rate limiting

## Future Enhancements

- [ ] Service mesh integration (Istio, Linkerd)
- [ ] GraphQL gateway support
- [ ] WebSocket proxying
- [ ] API versioning support
- [ ] Request/response transformation
- [ ] Caching layer (Redis)
- [ ] Distributed tracing (Jaeger, Zipkin)
- [ ] Metrics export (Prometheus)
- [ ] A/B testing support
- [ ] API analytics dashboard
- [ ] Custom rate limiting per user/tier
- [ ] Request signing/validation
