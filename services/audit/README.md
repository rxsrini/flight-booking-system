# Audit Service

The Audit Service provides comprehensive audit trail tracking for the Flight Booking System. It captures all user actions, system events, data modifications, and security-related activities to ensure compliance and accountability.

## Features

- **Comprehensive Audit Logging**: Tracks 30+ different types of actions across the system
- **Event-Driven Architecture**: Automatically captures events from all microservices via Redis
- **Data Change Tracking**: Records before/after states for all data modifications
- **Security Monitoring**: Tracks login failures, permission denials, and sensitive data access
- **Advanced Querying**: Powerful search and filtering capabilities with pagination
- **Compliance Ready**: Supports GDPR, PCI-DSS, and other regulatory requirements
- **Timeline Views**: User activity timelines and entity history tracking
- **Statistics & Analytics**: Aggregate metrics for audit data analysis
- **Automatic Cleanup**: Configurable retention policy for old audit logs

## Audit Event Types

### Authentication Events
- `LOGIN` - User login
- `LOGOUT` - User logout
- `LOGIN_FAILED` - Failed login attempt
- `PASSWORD_RESET` - Password reset request
- `TOKEN_REFRESH` - JWT token refresh

### User Management Events
- `USER_CREATED` - New user registration
- `USER_UPDATED` - User profile/role updates
- `USER_DELETED` - User deletion
- `USER_STATUS_CHANGED` - Status changes (active/inactive)

### Booking Events
- `BOOKING_CREATED` - New booking
- `BOOKING_UPDATED` - Booking modifications
- `BOOKING_CANCELLED` - Booking cancellation
- `BOOKING_CONFIRMED` - Booking confirmation
- `BOOKING_VIEWED` - Booking detail access

### Payment Events
- `PAYMENT_INITIATED` - Payment started
- `PAYMENT_SUCCEEDED` - Successful payment
- `PAYMENT_FAILED` - Failed payment
- `REFUND_INITIATED` - Refund request
- `REFUND_COMPLETED` - Refund processed

### Flight Events
- `FLIGHT_SEARCHED` - Flight search query
- `FLIGHT_VIEWED` - Flight details viewed
- `FLIGHT_CREATED` - New flight added
- `FLIGHT_UPDATED` - Flight details updated

### Security Events
- `PERMISSION_DENIED` - Access denied
- `SENSITIVE_DATA_ACCESSED` - Access to sensitive information

### System Events
- `API_REQUEST` - API endpoint access
- `WEBHOOK_RECEIVED` - External webhook
- `SYSTEM_ERROR` - System errors
- `DATA_EXPORTED` - Data export
- `REPORT_GENERATED` - Report generation

## Severity Levels

- **LOW**: Routine operations (login, logout, data view)
- **MEDIUM**: Data modifications (create, update)
- **HIGH**: Critical operations (delete, payment failure)
- **CRITICAL**: Security events (sensitive data access, permission denial)

## API Endpoints

### Query Audit Logs
```
GET /api/v1/audit/logs
```

**Query Parameters:**
- `action`: Filter by action type
- `userId`: Filter by user ID
- `entityType`: Filter by entity type
- `entityId`: Filter by entity ID
- `severity`: Filter by severity level
- `startDate`: Start date (ISO format)
- `endDate`: End date (ISO format)
- `service`: Filter by service name
- `userEmail`: Filter by user email
- `userRole`: Filter by user role
- `success`: Filter by success status (true/false)
- `search`: Text search across multiple fields
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)
- `sortBy`: Field to sort by (default: timestamp)
- `sortOrder`: ASC or DESC (default: DESC)

**Response:**
```json
{
  "data": [
    {
      "id": "uuid",
      "action": "BOOKING_CREATED",
      "userId": "user-uuid",
      "userEmail": "user@example.com",
      "userRole": "CUSTOMER",
      "entityType": "Booking",
      "entityId": "booking-uuid",
      "newValue": { "pnr": "ABC123", ... },
      "severity": "MEDIUM",
      "timestamp": "2024-01-01T12:00:00Z",
      "success": true
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 20,
    "totalPages": 8
  }
}
```

**Access**: Admin, Business Owner

### Get Single Audit Log
```
GET /api/v1/audit/logs/:id
```

**Access**: Admin, Business Owner

### Get Audit Statistics
```
GET /api/v1/audit/statistics?startDate=2024-01-01&endDate=2024-12-31
```

Returns aggregate statistics:
- Total audit logs
- Breakdown by action type
- Breakdown by severity
- Top 10 most active users
- Failed operations count
- Critical events count
- Recent activity (last 24 hours)

**Access**: Admin, Business Owner

### Get User Activity Timeline
```
GET /api/v1/audit/user/:userId/timeline?limit=50
```

Returns chronological list of user actions.

**Access**: Admin, Business Owner

### Get Entity History
```
GET /api/v1/audit/entity/:entityType/:entityId/history
```

Returns complete history of changes to a specific entity.

**Example:**
```
GET /api/v1/audit/entity/Booking/abc-123-def/history
```

**Access**: Admin, Business Owner

### Get Security Events
```
GET /api/v1/audit/security/events?limit=100
```

Returns recent security-related events (failed logins, permission denials, sensitive data access).

**Access**: Admin only

### Cleanup Old Logs
```
DELETE /api/v1/audit/logs/cleanup?daysToKeep=90
```

Deletes audit logs older than specified days.

**Access**: Admin only

### Create Audit Log (Manual)
```
POST /api/v1/audit/logs
Content-Type: application/json

{
  "action": "USER_CREATED",
  "userId": "user-uuid",
  "userEmail": "admin@example.com",
  "userRole": "ADMIN",
  "entityType": "User",
  "entityId": "new-user-uuid",
  "newValue": { ... },
  "severity": "MEDIUM"
}
```

**Access**: Admin only

## Microservice Event Handlers

The service automatically listens to these events from other microservices:

### User Service Events
- `user.login` - Successful login
- `user.login_failed` - Failed login attempt
- `user.logout` - User logout
- `user.created` - New user registered
- `user.updated` - User profile updated
- `user.deleted` - User deleted
- `user.password_reset` - Password reset requested

### Booking Service Events
- `booking.created` - New booking created
- `booking.updated` - Booking modified
- `booking.cancelled` - Booking cancelled

### Payment Service Events
- `payment.initiated` - Payment started
- `payment.succeeded` - Payment successful
- `payment.failed` - Payment failed
- `refund.initiated` - Refund started
- `refund.completed` - Refund completed

### System Events
- `webhook.received` - Webhook from external service
- `permission.denied` - Access denied
- `sensitive_data.accessed` - Sensitive data viewed

## Database Schema

The audit logs are stored in the `audit_logs` table with the following fields:

- `id`: UUID primary key
- `action`: Enum of audit actions
- `userId`: User who performed the action
- `userEmail`: User's email
- `userRole`: User's role
- `entityType`: Type of entity affected (User, Booking, Payment, etc.)
- `entityId`: ID of the affected entity
- `oldValue`: JSON object of previous state
- `newValue`: JSON object of new state
- `metadata`: Additional context data
- `ipAddress`: Request IP address
- `userAgent`: Request user agent
- `severity`: Severity level (LOW, MEDIUM, HIGH, CRITICAL)
- `description`: Human-readable description
- `success`: Whether the action succeeded
- `errorMessage`: Error details if failed
- `timestamp`: When the event occurred
- `service`: Which microservice generated the event
- `method`: HTTP method (for API requests)
- `endpoint`: API endpoint (for API requests)
- `statusCode`: HTTP status code
- `duration`: Request duration in milliseconds

### Indexes

For optimal query performance, the following indexes are created:
- `userId + timestamp`
- `action + timestamp`
- `entityType + entityId`
- `timestamp`
- `action`
- `userId`

## Example Queries

### Find all failed login attempts in the last 7 days
```bash
curl "http://localhost:3008/api/v1/audit/logs?action=LOGIN_FAILED&startDate=2024-01-01&endDate=2024-01-07" \
  -H "Authorization: Bearer <admin-token>"
```

### Get complete history of a booking
```bash
curl "http://localhost:3008/api/v1/audit/entity/Booking/abc-123-def/history" \
  -H "Authorization: Bearer <admin-token>"
```

### Find all critical security events
```bash
curl "http://localhost:3008/api/v1/audit/logs?severity=CRITICAL" \
  -H "Authorization: Bearer <admin-token>"
```

### Get user activity for specific user
```bash
curl "http://localhost:3008/api/v1/audit/user/user-uuid/timeline?limit=100" \
  -H "Authorization: Bearer <admin-token>"
```

### Search audit logs by text
```bash
curl "http://localhost:3008/api/v1/audit/logs?search=ABC123" \
  -H "Authorization: Bearer <admin-token>"
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
docker build -t audit-service .
docker run -p 3008:3008 audit-service
```

## Environment Variables

See `.env.example` for required configuration:
- `AUDIT_SERVICE_PORT`: Port to run the service on (default: 3008)
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`: PostgreSQL connection
- `REDIS_HOST`, `REDIS_PORT`: Redis for microservice communication
- `JWT_SECRET`: Secret key for JWT token verification
- `AUDIT_RETENTION_DAYS`: Days to keep audit logs (default: 90)

## Compliance Features

### GDPR Compliance
- Complete audit trail of personal data access
- Data modification tracking with before/after states
- User deletion tracking
- Data export tracking

### PCI-DSS Compliance
- Payment transaction tracking
- Sensitive data access logging
- Failed access attempt tracking
- Security event monitoring

### SOX Compliance
- Financial transaction audit trail
- User action tracking
- Change management tracking
- Retention policy enforcement

## Best Practices

### What to Audit
✅ **Always Audit:**
- Authentication events (login, logout, password reset)
- Authorization failures
- Data modifications (create, update, delete)
- Sensitive data access
- Financial transactions
- Configuration changes
- User management actions

❌ **Don't Audit:**
- Sensitive data values (passwords, credit card numbers)
- Personal information in plain text
- Excessive read operations (unless required)

### Data Retention

Configure retention policy based on compliance requirements:
- GDPR: Minimum 1 year, maximum as needed
- PCI-DSS: Minimum 1 year, 3 months immediately accessible
- SOX: Minimum 7 years

### Performance Optimization

- Use database indexes effectively
- Clean up old logs regularly
- Consider partitioning for large datasets
- Archive old logs to cold storage
- Use async event processing

## Integration with Other Services

### Emitting Events from Other Services

```typescript
import { ClientProxy } from '@nestjs/microservices';

// Inject Redis client
constructor(
  @Inject('REDIS_CLIENT') private client: ClientProxy
) {}

// Emit audit event
this.client.emit('booking.created', {
  userId: user.id,
  userEmail: user.email,
  userRole: user.role,
  bookingId: booking.id,
  pnr: booking.pnr,
  // ... other booking details
});
```

## Monitoring

### Key Metrics to Monitor
- Audit log creation rate
- Failed operation count
- Critical event count
- Database storage usage
- Query performance

### Alerts to Configure
- Spike in failed login attempts (potential brute force)
- Unusual sensitive data access patterns
- High rate of permission denials
- Critical events

## Technology Stack

- **NestJS**: Backend framework
- **TypeORM**: Database ORM
- **PostgreSQL**: Database with JSONB support
- **Redis**: Microservice communication
- **JWT**: Authentication
- **TypeScript**: Programming language

## Future Enhancements

- [ ] Real-time audit log streaming
- [ ] Anomaly detection using ML
- [ ] Audit log visualization dashboard
- [ ] Export to SIEM systems (Splunk, ELK)
- [ ] Blockchain-based immutable audit trail
- [ ] Advanced reporting and analytics
- [ ] Audit log encryption
- [ ] Compliance report generation
- [ ] Automated alerting for suspicious activity
