# Deployment Guide

Complete guide for deploying the Flight Booking System to production.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Database Setup](#database-setup)
4. [Docker Deployment](#docker-deployment)
5. [Kubernetes Deployment](#kubernetes-deployment)
6. [Production Checklist](#production-checklist)
7. [Monitoring](#monitoring)
8. [Backup and Recovery](#backup-and-recovery)
9. [Scaling](#scaling)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Services

- **Docker**: 20.10+
- **Docker Compose**: 2.0+ (for Docker deployment)
- **Kubernetes**: 1.24+ (for K8s deployment)
- **PostgreSQL**: 15+ (or managed service like AWS RDS)
- **Redis**: 7+ (or managed service like AWS ElastiCache)

### External Services

- **Amadeus API**: Flight search GDS integration
- **Stripe**: Payment processing
- **Sentry**: Error tracking (optional but recommended)
- **SMTP Server**: Email delivery

---

## Environment Setup

### 1. Clone Repository

```bash
git clone <repository-url>
cd flight-booking-system
```

### 2. Create Environment File

Create `.env` file from template:

```bash
cp .env.example .env
```

### 3. Configure Environment Variables

Edit `.env` with production values:

```env
# Application
NODE_ENV=production
API_VERSION=v1
FRONTEND_URL=https://yourdomain.com

# Database
DB_HOST=your-db-host.rds.amazonaws.com
DB_PORT=5432
DB_USERNAME=flightbooking
DB_PASSWORD=<strong-password>
DB_DATABASE=flight_booking_prod
DB_SSL=true

# Redis
REDIS_HOST=your-redis-host.cache.amazonaws.com
REDIS_PORT=6379
REDIS_PASSWORD=<redis-password>
REDIS_TLS=true

# JWT - Generate secure keys
JWT_SECRET=<generate-secure-secret-256-bits>
JWT_EXPIRATION=1h
REFRESH_TOKEN_EXPIRATION=7d

# Encryption - Must be 32 characters
ENCRYPTION_KEY=<generate-secure-key-32-chars>

# GDS Configuration
AMADEUS_API_KEY=<production-api-key>
AMADEUS_API_SECRET=<production-api-secret>
AMADEUS_ENVIRONMENT=production

SABRE_CLIENT_ID=<production-client-id>
SABRE_CLIENT_SECRET=<production-client-secret>
SABRE_ENVIRONMENT=production

# Payment Gateway
STRIPE_SECRET_KEY=sk_live_...
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Email Configuration
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASSWORD=<sendgrid-api-key>

# Monitoring
LOG_LEVEL=info
SENTRY_DSN=https://xxx@xxx.ingest.sentry.io/xxx

# Prometheus
PROMETHEUS_PORT=9090

# Grafana
GRAFANA_PORT=3010
GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=<strong-password>
```

### 4. Generate Secure Secrets

```bash
# Generate JWT secret (256 bits)
openssl rand -base64 32

# Generate encryption key (32 characters)
openssl rand -base64 32 | head -c 32
```

---

## Database Setup

### Option 1: Managed Database (Recommended)

Use AWS RDS, Google Cloud SQL, or Azure Database for PostgreSQL:

1. **Create PostgreSQL instance**
   - Version: PostgreSQL 15
   - Instance class: db.t3.medium (minimum)
   - Storage: 100GB SSD (auto-scaling enabled)
   - Backup retention: 7 days
   - Enable Multi-AZ for high availability

2. **Configure security groups**
   - Allow inbound on port 5432 from application servers
   - Enable SSL connections

3. **Run migrations**

```bash
# SSH into application server
cd flight-booking-system

# Run database initialization
docker-compose run --rm auth-service npm run migration:run
```

### Option 2: Self-Hosted Database

```bash
# Install PostgreSQL
sudo apt-get update
sudo apt-get install postgresql-15

# Create database and user
sudo -u postgres psql

CREATE DATABASE flight_booking_prod;
CREATE USER flightbooking WITH PASSWORD '<strong-password>';
GRANT ALL PRIVILEGES ON DATABASE flight_booking_prod TO flightbooking;

# Enable SSL
# Edit postgresql.conf
ssl = on
ssl_cert_file = '/path/to/server.crt'
ssl_key_file = '/path/to/server.key'

# Restart PostgreSQL
sudo systemctl restart postgresql
```

---

## Docker Deployment

### 1. Build Images

```bash
# Build all service images
docker-compose build

# Tag images for registry
docker tag flight-booking-auth:latest registry.example.com/flight-booking-auth:latest
docker tag flight-booking-user:latest registry.example.com/flight-booking-user:latest
# ... repeat for all services
```

### 2. Push to Registry

```bash
# Login to registry
docker login registry.example.com

# Push all images
docker-compose push
```

### 3. Deploy with Docker Compose

```bash
# Pull latest images
docker-compose pull

# Start services
docker-compose up -d

# Check service health
docker-compose ps
docker-compose logs -f
```

### 4. Configure Reverse Proxy (Nginx)

```nginx
# /etc/nginx/sites-available/flight-booking

upstream api_gateway {
    server localhost:3000;
}

upstream frontend {
    server localhost:3001;
}

server {
    listen 80;
    server_name api.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;

    location / {
        proxy_pass http://api_gateway;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Static assets caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        proxy_pass http://frontend;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

Enable and restart Nginx:

```bash
sudo ln -s /etc/nginx/sites-available/flight-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Kubernetes Deployment

### 1. Create Namespace

```bash
kubectl create namespace flight-booking-prod
```

### 2. Create Secrets

```bash
# Database credentials
kubectl create secret generic db-credentials \
  --from-literal=host=your-db-host \
  --from-literal=username=flightbooking \
  --from-literal=password=<password> \
  --from-literal=database=flight_booking_prod \
  -n flight-booking-prod

# JWT secrets
kubectl create secret generic jwt-secrets \
  --from-literal=secret=<jwt-secret> \
  -n flight-booking-prod

# Stripe secrets
kubectl create secret generic stripe-secrets \
  --from-literal=secret-key=<stripe-secret> \
  --from-literal=webhook-secret=<webhook-secret> \
  -n flight-booking-prod
```

### 3. Deploy Services

Apply Kubernetes manifests:

```bash
kubectl apply -f infrastructure/kubernetes/postgres.yaml
kubectl apply -f infrastructure/kubernetes/redis.yaml
kubectl apply -f infrastructure/kubernetes/auth-service.yaml
kubectl apply -f infrastructure/kubernetes/user-service.yaml
kubectl apply -f infrastructure/kubernetes/flight-service.yaml
kubectl apply -f infrastructure/kubernetes/booking-service.yaml
kubectl apply -f infrastructure/kubernetes/payment-service.yaml
kubectl apply -f infrastructure/kubernetes/analytics-service.yaml
kubectl apply -f infrastructure/kubernetes/notification-service.yaml
kubectl apply -f infrastructure/kubernetes/audit-service.yaml
kubectl apply -f infrastructure/kubernetes/api-gateway.yaml
kubectl apply -f infrastructure/kubernetes/web-app.yaml
```

### 4. Configure Ingress

```yaml
# infrastructure/kubernetes/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: flight-booking-ingress
  namespace: flight-booking-prod
  annotations:
    kubernetes.io/ingress.class: nginx
    cert-manager.io/cluster-issuer: letsencrypt-prod
spec:
  tls:
  - hosts:
    - api.yourdomain.com
    - yourdomain.com
    secretName: flight-booking-tls
  rules:
  - host: api.yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: api-gateway
            port:
              number: 3000
  - host: yourdomain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: web-app
            port:
              number: 3000
```

Apply ingress:

```bash
kubectl apply -f infrastructure/kubernetes/ingress.yaml
```

### 5. Configure Horizontal Pod Autoscaler

```yaml
# infrastructure/kubernetes/hpa.yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: auth-service-hpa
  namespace: flight-booking-prod
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: auth-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
```

---

## Production Checklist

### Security

- [ ] All environment variables set with production values
- [ ] Strong passwords and secrets generated
- [ ] SSL/TLS certificates installed and configured
- [ ] Database connections use SSL
- [ ] Redis connections use TLS
- [ ] CORS configured with production domains only
- [ ] Rate limiting enabled
- [ ] Security headers configured (CSP, HSTS, etc.)
- [ ] Secrets stored in secure vault (AWS Secrets Manager, etc.)
- [ ] API keys rotated from development values
- [ ] Stripe webhooks configured with production URL

### Database

- [ ] Database backups configured (automated daily)
- [ ] Multi-AZ deployment enabled
- [ ] Read replicas configured for scaling
- [ ] Connection pooling configured
- [ ] Slow query logging enabled
- [ ] Indexes optimized

### Monitoring

- [ ] Prometheus scraping all services
- [ ] Grafana dashboards configured
- [ ] Alert rules tested
- [ ] Sentry DSN configured
- [ ] Log aggregation configured
- [ ] Uptime monitoring enabled (Pingdom, etc.)
- [ ] APM configured (optional)

### Performance

- [ ] Redis caching enabled for flight searches
- [ ] CDN configured for static assets
- [ ] Image optimization enabled
- [ ] Gzip compression enabled
- [ ] Database query optimization
- [ ] Connection pooling configured

### Reliability

- [ ] Health check endpoints configured
- [ ] Circuit breakers tested
- [ ] Retry mechanisms in place
- [ ] Graceful shutdown implemented
- [ ] Load balancer configured
- [ ] Auto-scaling policies set

### Testing

- [ ] All tests passing
- [ ] Load testing completed (1000+ concurrent users)
- [ ] Security scan completed
- [ ] Penetration testing done
- [ ] Backup restoration tested

---

## Monitoring

### Prometheus Metrics

Access Prometheus at: http://prometheus.yourdomain.com:9090

Key metrics to monitor:
- `http_request_duration_seconds` - Response times
- `http_requests_total` - Request counts
- `active_connections` - Active connections
- `bookings_total` - Total bookings
- `payments_total` - Total payments

### Grafana Dashboards

Access Grafana at: http://grafana.yourdomain.com:3010

Pre-configured dashboards:
1. **System Overview** - All services status
2. **Service Details** - Per-service metrics
3. **Business Metrics** - Revenue, bookings
4. **Infrastructure** - Database, Redis performance

### Sentry Error Tracking

Configure Sentry to receive error reports:

1. Create Sentry project
2. Add DSN to environment variables
3. Verify errors are being reported

---

## Backup and Recovery

### Database Backups

**Automated Backups (AWS RDS):**

```bash
# Configure automated backups
aws rds modify-db-instance \
  --db-instance-identifier flight-booking-prod \
  --backup-retention-period 7 \
  --preferred-backup-window "03:00-04:00"
```

**Manual Backup:**

```bash
# Create snapshot
pg_dump -h db-host -U flightbooking -d flight_booking_prod \
  -f backup_$(date +%Y%m%d).sql

# Compress backup
gzip backup_$(date +%Y%m%d).sql

# Upload to S3
aws s3 cp backup_$(date +%Y%m%d).sql.gz \
  s3://your-backup-bucket/database/
```

**Restore from Backup:**

```bash
# Download backup
aws s3 cp s3://your-backup-bucket/database/backup_20240101.sql.gz .

# Decompress
gunzip backup_20240101.sql.gz

# Restore
psql -h db-host -U flightbooking -d flight_booking_prod \
  -f backup_20240101.sql
```

---

## Scaling

### Horizontal Scaling

**Add more service instances:**

```bash
# Docker Compose
docker-compose up -d --scale auth-service=3 --scale booking-service=5

# Kubernetes
kubectl scale deployment auth-service --replicas=3 -n flight-booking-prod
kubectl scale deployment booking-service --replicas=5 -n flight-booking-prod
```

### Vertical Scaling

**Increase resources per instance:**

```yaml
# Kubernetes resources
resources:
  requests:
    cpu: "500m"
    memory: "512Mi"
  limits:
    cpu: "2000m"
    memory: "2Gi"
```

### Database Scaling

- Add read replicas for read-heavy operations
- Enable connection pooling (PgBouncer)
- Implement caching layer (Redis)
- Partition large tables

---

## Troubleshooting

### Service Not Starting

```bash
# Check logs
docker-compose logs service-name
kubectl logs -f deployment/service-name -n flight-booking-prod

# Check environment variables
docker-compose exec service-name env

# Check database connection
docker-compose exec service-name nc -zv db-host 5432
```

### High Memory Usage

```bash
# Check memory usage
docker stats
kubectl top pods -n flight-booking-prod

# Restart service
docker-compose restart service-name
kubectl rollout restart deployment/service-name -n flight-booking-prod
```

### Database Connection Issues

```bash
# Test connection
psql -h db-host -U flightbooking -d flight_booking_prod

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;
```

### Payment Processing Errors

- Verify Stripe webhook URL is accessible
- Check webhook signature verification
- Review Stripe dashboard for failed payments
- Check encryption key is correctly set

---

## Rollback Procedures

### Docker Deployment

```bash
# Rollback to previous version
docker-compose down
docker-compose pull <previous-tag>
docker-compose up -d
```

### Kubernetes Deployment

```bash
# View rollout history
kubectl rollout history deployment/service-name -n flight-booking-prod

# Rollback to previous version
kubectl rollout undo deployment/service-name -n flight-booking-prod

# Rollback to specific revision
kubectl rollout undo deployment/service-name --to-revision=2 -n flight-booking-prod
```

---

## Support

For deployment support:
- Documentation: `/docs`
- Issues: GitHub Issues
- Emergency: support@flightbooking.com
