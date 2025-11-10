# Monitoring, Logging, and Error Tracking

Comprehensive observability setup for the Flight Booking System.

## Overview

The system includes:
- **Prometheus** - Metrics collection and alerting
- **Grafana** - Metrics visualization and dashboards
- **Winston** - Structured logging
- **Sentry** - Error tracking and monitoring
- **Exporters** - PostgreSQL, Redis, and Node metrics

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Microservices                          │
│  (Auth, User, Flight, Booking, Payment, Analytics, etc.)   │
│                                                             │
│  • Winston Logger → File logs                              │
│  • Prometheus Metrics → /metrics endpoint                  │
│  • Sentry → Error tracking                                 │
└──────────────┬────────────────┬─────────────┬──────────────┘
               │                │             │
               ▼                ▼             ▼
    ┌──────────────┐  ┌─────────────┐  ┌──────────┐
    │  Prometheus  │  │   Sentry    │  │   Logs   │
    │  (Port 9090) │  │   Cloud     │  │  Files   │
    └──────┬───────┘  └─────────────┘  └──────────┘
           │
           ▼
    ┌──────────────┐
    │   Grafana    │
    │  (Port 3010) │
    │  Dashboards  │
    └──────────────┘
```

## Components

### 1. Prometheus (Port 9090)

**Metrics Collection**: Scrapes metrics from all services every 15 seconds

**Metrics Tracked**:
- HTTP request duration and count
- Active connections
- Database query performance
- Business metrics (bookings, payments)
- System metrics (CPU, memory, disk)

**Alert Rules**:
- Service down
- High error rate (>5%)
- High response time (>1s at p95)
- High memory usage (>1GB)
- Database connection pool exhaustion
- High payment failure rate
- PostgreSQL/Redis down

**Access**: http://localhost:9090

### 2. Grafana (Port 3010)

**Visualization**: Beautiful dashboards for metrics

**Default Credentials**:
- Username: `admin`
- Password: `admin`

**Pre-configured Dashboards**:
- System Overview - All services status, request rates, response times
- Service Details - Per-service metrics
- Business Metrics - Bookings, payments, revenue
- Infrastructure - Database, Redis, system resources

**Access**: http://localhost:3010

### 3. Winston Logger

**Structured Logging**: JSON logs with timestamp, service name, level, message

**Log Levels**:
- `error` - Errors and exceptions
- `warn` - Warning messages
- `info` - General information
- `http` - HTTP requests
- `debug` - Debug information

**Log Files**:
- `logs/{service}-error.log` - Error logs only
- `logs/{service}-combined.log` - All logs
- Rotated at 5MB, keeps 5 files

**Log Format**:
```json
{
  "timestamp": "2024-01-01 12:00:00",
  "level": "info",
  "message": "User logged in",
  "service": "auth-service",
  "userId": "123",
  "ip": "192.168.1.1"
}
```

### 4. Sentry

**Error Tracking**: Automatic error capture and reporting

**Features**:
- Exception capture with stack traces
- Performance monitoring
- Release tracking
- User context
- Breadcrumbs
- Source maps for minified code

**Configuration**:
```env
SENTRY_DSN=your-sentry-dsn
```

**What Gets Tracked**:
- Unhandled exceptions
- Promise rejections
- HTTP errors (excluding 404s)
- Custom error messages
- Performance traces

### 5. Exporters

#### PostgreSQL Exporter (Port 9187)
Metrics from PostgreSQL database:
- Connection pool status
- Query performance
- Database size
- Lock statistics

#### Redis Exporter (Port 9121)
Metrics from Redis:
- Memory usage
- Connected clients
- Commands per second
- Hit/miss rates

#### Node Exporter (Port 9100)
System metrics:
- CPU usage
- Memory usage
- Disk I/O
- Network statistics

## Metrics Exposed

### HTTP Metrics

```
# Request duration histogram
http_request_duration_seconds{method, route, status_code, service}

# Request counter
http_requests_total{method, route, status_code, service}

# Active connections
active_connections{service}
```

### Database Metrics

```
# Query duration histogram
db_query_duration_seconds{query_type, service}
```

### Business Metrics

```
# Total bookings counter
bookings_total{status, service}

# Total payments counter
payments_total{status, service}

# Payment amount histogram
payment_amount{currency, service}
```

### System Metrics

```
# Memory usage
process_resident_memory_bytes

# CPU usage
process_cpu_seconds_total

# Node.js metrics (automatically collected)
nodejs_heap_size_total_bytes
nodejs_heap_size_used_bytes
nodejs_external_memory_bytes
nodejs_gc_duration_seconds
```

## Setup Instructions

### 1. Start Monitoring Stack

```bash
# Start all services including monitoring
docker-compose up -d

# Check monitoring services
docker-compose ps prometheus grafana
```

### 2. Configure Sentry (Optional)

1. Create account at https://sentry.io
2. Create new project
3. Get DSN from project settings
4. Add to `.env`:
```env
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx
```

### 3. Access Dashboards

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3010 (admin/admin)
- **Metrics Endpoints**: http://localhost:3000/metrics (for each service)

### 4. Import Grafana Dashboards

Dashboards are auto-imported from `infrastructure/monitoring/grafana/dashboards/`

To add custom dashboard:
1. Go to Grafana UI
2. Create dashboard
3. Export JSON
4. Save to `infrastructure/monitoring/grafana/dashboards/`
5. Restart Grafana

## Using Metrics in Code

### Example: Track Custom Metric

```typescript
import { bookingsTotal } from '@flight-booking/common/metrics';

// When booking is created
bookingsTotal.inc({ status: 'confirmed', service: 'booking-service' });
```

### Example: Track Database Query

```typescript
import { dbQueryDuration } from '@flight-booking/common/metrics';

const timer = dbQueryDuration.startTimer({ query_type: 'select', service: 'booking-service' });

// Execute query
await repository.find();

timer(); // Record duration
```

### Example: Log with Winston

```typescript
import { createLogger } from '@flight-booking/common/logger';

const logger = createLogger('booking-service');

logger.info('Booking created', { bookingId: '123', userId: '456' });
logger.error('Payment failed', { error: err.message, bookingId: '123' });
```

### Example: Track Error with Sentry

```typescript
import { captureException } from '@flight-booking/common/sentry';

try {
  await processPayment();
} catch (error) {
  captureException(error, {
    bookingId: '123',
    amount: 500,
    currency: 'USD',
  });
  throw error;
}
```

## Alert Configuration

### Email Alerts (Optional)

1. Configure Alertmanager:
```yaml
# alertmanager.yml
receivers:
  - name: 'email'
    email_configs:
      - to: 'team@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.gmail.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'password'
```

2. Update Prometheus config to use Alertmanager

### Slack Alerts (Optional)

```yaml
receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/xxx'
        channel: '#alerts'
        title: 'Alert: {{ .GroupLabels.alertname }}'
```

## Querying Metrics

### Prometheus Queries

```promql
# Average response time by service
avg(rate(http_request_duration_seconds_sum[5m])) by (service)
  /
avg(rate(http_request_duration_seconds_count[5m])) by (service)

# Error rate by service
sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service)
  /
sum(rate(http_requests_total[5m])) by (service)

# Booking rate (bookings per minute)
rate(bookings_total[1m]) * 60

# Payment success rate
sum(rate(payments_total{status="succeeded"}[5m]))
  /
sum(rate(payments_total[5m]))
```

## Troubleshooting

### Prometheus Not Scraping

1. Check service is exposing metrics:
```bash
curl http://localhost:3001/metrics
```

2. Check Prometheus targets:
- Go to http://localhost:9090/targets
- Look for services in "DOWN" state

3. Check network connectivity:
```bash
docker-compose exec prometheus ping auth-service
```

### Grafana Dashboard Not Showing Data

1. Verify Prometheus datasource:
- Grafana → Configuration → Data Sources
- Test connection

2. Check query syntax in panel
3. Verify time range selection

### Logs Not Appearing

1. Check logs directory exists:
```bash
mkdir -p logs
```

2. Check file permissions:
```bash
chmod 755 logs
```

3. View logs in real-time:
```bash
tail -f logs/booking-service-combined.log
```

### High Memory Usage

1. Check Prometheus retention:
```bash
# Limit retention to 15 days
--storage.tsdb.retention.time=15d
```

2. Check log rotation is working
3. Monitor with:
```bash
docker stats
```

## Best Practices

### Logging

✅ **Do**:
- Log at appropriate levels
- Include context (userId, bookingId, etc.)
- Use structured logging (JSON)
- Sanitize sensitive data (passwords, credit cards)

❌ **Don't**:
- Log passwords or secrets
- Log excessive debug info in production
- Log PII without proper handling

### Metrics

✅ **Do**:
- Use histograms for durations
- Use counters for totals
- Add meaningful labels
- Keep cardinality low (<100 unique values per label)

❌ **Don't**:
- Use high-cardinality labels (user IDs, timestamps)
- Create too many metrics
- Use gauges for counters

### Alerts

✅ **Do**:
- Set appropriate thresholds
- Include context in alert messages
- Test alerts regularly
- Have runbooks for each alert

❌ **Don't**:
- Alert on every small issue
- Create alerts without clear action items
- Ignore alerts

## Performance Impact

- **Prometheus scraping**: <1% CPU overhead
- **Metrics collection**: <5MB memory per service
- **Winston logging**: <1% CPU overhead
- **Sentry**: <0.1% overhead (sampling at 10%)

## Maintenance

### Daily
- Check alert status
- Review error logs

### Weekly
- Review dashboards
- Check disk usage
- Analyze slow queries

### Monthly
- Clean old logs
- Review alert rules
- Update retention policies
- Optimize slow services

## Resources

- Prometheus: https://prometheus.io/docs/
- Grafana: https://grafana.com/docs/
- Sentry: https://docs.sentry.io/
- Winston: https://github.com/winstonjs/winston

## Support

For issues:
1. Check logs: `docker-compose logs <service>`
2. Check metrics: http://localhost:9090
3. Check Grafana: http://localhost:3010
4. Check Sentry dashboard
