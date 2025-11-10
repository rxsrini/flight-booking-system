# Notification Service

The Notification Service handles all email notifications for the Flight Booking System using a queue-based architecture with Bull and Redis. It provides reliable, scalable email delivery with automatic retries and failure handling.

## Features

- **Queue-Based Email Processing**: Uses Bull with Redis for reliable message queuing
- **Multiple Email Templates**: 7 professional Handlebars templates for different notification types
- **Automatic Retries**: Failed emails are automatically retried with exponential backoff
- **Event-Driven Architecture**: Listens to events from other microservices via Redis
- **Priority Queuing**: Critical notifications (payment failures, password resets) get higher priority
- **Scheduled Notifications**: Delayed email delivery for flight reminders
- **SMTP Support**: Works with any SMTP provider (Gmail, SendGrid, AWS SES, etc.)
- **Queue Monitoring**: REST API endpoints to monitor queue health and statistics

## Email Templates

The service includes 7 professionally designed email templates:

1. **Booking Confirmation** - Sent when a booking is successfully created
2. **Booking Cancelled** - Sent when a booking is cancelled
3. **Payment Receipt** - Sent when payment is successful
4. **Payment Failed** - Sent when payment fails (high priority)
5. **Password Reset** - Sent for password reset requests (high priority)
6. **Welcome Email** - Sent when a new user registers
7. **Booking Reminder** - Scheduled reminder before flight departure

## Architecture

```
┌─────────────────┐
│  Other Services │
│  (Booking,      │
│   Payment, etc) │
└────────┬────────┘
         │ Emit Events
         ▼
┌─────────────────────┐         ┌──────────────┐
│ Notification        │◄────────┤ Redis        │
│ Controller          │         │ (Transport)  │
└─────────┬───────────┘         └──────────────┘
          │
          │ Add to Queue
          ▼
┌─────────────────────┐         ┌──────────────┐
│ Bull Queue          │◄────────┤ Redis        │
│ (Notifications)     │         │ (Queue Store)│
└─────────┬───────────┘         └──────────────┘
          │
          │ Process Jobs
          ▼
┌─────────────────────┐
│ Notification        │
│ Processor           │
└─────────┬───────────┘
          │
          │ Send Emails
          ▼
┌─────────────────────┐
│ Email Service       │
│ (Nodemailer + SMTP) │
└─────────────────────┘
```

## API Endpoints

### Queue Statistics
```
GET /api/v1/notifications/stats
```

Returns queue statistics:
- Waiting jobs
- Active jobs
- Completed jobs
- Failed jobs
- Delayed jobs

**Response:**
```json
{
  "waiting": 5,
  "active": 2,
  "completed": 150,
  "failed": 3,
  "delayed": 10,
  "total": 170
}
```

### Clear Completed Jobs
```
POST /api/v1/notifications/clear-completed
```

Removes all completed jobs from the queue to free up Redis memory.

### Retry Failed Jobs
```
POST /api/v1/notifications/retry-failed
```

Manually retries all failed jobs in the queue.

### Send Notification (Manual)
```
POST /api/v1/notifications/send
Content-Type: application/json

{
  "type": "booking_confirmation",
  "recipient": "customer@example.com",
  "data": {
    "pnr": "ABC123",
    "customerName": "John Doe",
    "flightNumber": "AA123",
    ...
  }
}
```

## Microservice Events

The service listens to these events from other microservices:

### booking.created
Triggered when a new booking is created.

**Payload:**
```typescript
{
  customerEmail: string;
  pnr: string;
  customerName: string;
  flightNumber: string;
  airline: string;
  origin: string;
  destination: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
  arrivalTime: string;
  passengers: number;
  cabinClass: string;
  totalAmount: number;
  currency: string;
}
```

### booking.cancelled
Triggered when a booking is cancelled.

### payment.succeeded
Triggered when a payment is successful.

### payment.failed
Triggered when a payment fails.

### user.created
Triggered when a new user registers.

### user.password_reset
Triggered when a user requests a password reset.

## Queue Configuration

### Job Options

- **Priority**: 1 (low) to 3 (high)
  - Welcome emails: Priority 1
  - Booking confirmations: Priority 2
  - Payment failures & password resets: Priority 3

- **Retry Strategy**: Exponential backoff
  - Attempts: 3
  - Initial delay: 2 seconds
  - Max delay: 8 seconds

- **Cleanup**:
  - Completed jobs are automatically removed
  - Failed jobs are kept for manual inspection

### Example: Scheduled Flight Reminder

```typescript
// Send reminder 24 hours before departure
const hoursUntilDeparture = 24;
const delayInMs = hoursUntilDeparture * 60 * 60 * 1000;

await notificationQueueService.addBookingReminder(
  'customer@example.com',
  reminderDetails,
  delayInMs
);
```

## Email Service Configuration

### SMTP Providers

#### Gmail
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-specific-password
```

**Note:** Enable 2FA and create an app-specific password in your Google account.

#### SendGrid
```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=your-sendgrid-api-key
```

#### AWS SES
```env
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-username
SMTP_PASSWORD=your-smtp-password
```

## Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Update .env with your SMTP configuration
```

## Running the Service

```bash
# Development
npm run start:dev

# Production
npm run build
npm run start:prod

# Docker
docker build -t notification-service .
docker run -p 3007:3007 notification-service
```

## Testing Email Templates

You can test email templates by sending a manual notification:

```bash
curl -X POST http://localhost:3007/api/v1/notifications/send \
  -H "Content-Type: application/json" \
  -d '{
    "type": "booking_confirmation",
    "recipient": "test@example.com",
    "data": {
      "pnr": "ABC123",
      "customerName": "Test User",
      "flightNumber": "AA100",
      "airline": "American Airlines",
      "origin": "JFK",
      "destination": "LAX",
      "departureDate": "2024-12-25",
      "departureTime": "10:00 AM",
      "arrivalDate": "2024-12-25",
      "arrivalTime": "1:00 PM",
      "passengers": 2,
      "cabinClass": "Economy",
      "totalAmount": 500,
      "currency": "USD"
    }
  }'
```

## Environment Variables

See `.env.example` for required configuration:
- `NOTIFICATION_SERVICE_PORT`: Port to run the service on (default: 3007)
- `REDIS_HOST`, `REDIS_PORT`: Redis connection for queue
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`: Email provider settings
- `FRONTEND_URL`: Frontend URL for links in emails

## Integration with Other Services

### From Booking Service

```typescript
import { ClientProxy } from '@nestjs/microservices';

// Emit event when booking is created
this.client.emit('booking.created', {
  customerEmail: booking.user.email,
  pnr: booking.pnr,
  // ... other booking details
});
```

### From Payment Service

```typescript
// Emit event when payment succeeds
this.client.emit('payment.succeeded', {
  customerEmail: payment.booking.user.email,
  paymentId: payment.id,
  // ... other payment details
});
```

## Monitoring

### Queue Health Check

Monitor queue health by checking:
1. Failed job count (should be low)
2. Active vs waiting ratio (should be balanced)
3. Processing time for jobs

### Logs

The service logs:
- Job additions to queue
- Job processing start
- Job completion/failure
- Email send success/failure

Example logs:
```
[NotificationQueueService] Added notification job 12345 of type booking_confirmation for customer@example.com
[NotificationProcessor] Processing booking confirmation for customer@example.com
[EmailService] Email sent: <message-id> to customer@example.com
[NotificationProcessor] Job 12345 completed successfully for customer@example.com
```

## Error Handling

### Automatic Retries

Failed emails are automatically retried 3 times with exponential backoff:
- Attempt 1: Immediate
- Attempt 2: After 2 seconds
- Attempt 3: After 4 seconds
- Attempt 4: After 8 seconds

### Manual Retry

If all automatic retries fail, use the retry endpoint:
```bash
curl -X POST http://localhost:3007/api/v1/notifications/retry-failed
```

### Common Issues

1. **Authentication Error**: Check SMTP credentials
2. **Connection Timeout**: Verify SMTP host/port and firewall rules
3. **Template Not Found**: Ensure templates are copied to dist folder during build

## Technology Stack

- **NestJS**: Backend framework
- **Bull**: Queue management
- **Redis**: Message broker and queue storage
- **Nodemailer**: Email sending
- **Handlebars**: Email templating
- **TypeScript**: Programming language

## Performance Considerations

- **Concurrency**: Bull processes multiple jobs concurrently (default: 1, configurable)
- **Memory**: Completed jobs are auto-removed to save Redis memory
- **Rate Limiting**: Consider SMTP provider rate limits (Gmail: 500/day for free accounts)
- **Template Caching**: Templates are loaded once on startup and cached in memory

## Future Enhancements

- [ ] SMS notifications via Twilio
- [ ] Push notifications
- [ ] In-app notifications
- [ ] Email tracking (open/click rates)
- [ ] Template versioning
- [ ] A/B testing for email content
- [ ] Unsubscribe management
- [ ] Email preferences per user
- [ ] Multi-language templates
- [ ] Rich analytics dashboard
