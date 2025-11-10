# Railway Deployment Guide

Complete guide to deploy the Flight Booking System to Railway.

## Quick Deploy (5 Minutes)

### Step 1: Login to Railway

```bash
cd /Users/ravisrinivasan/flight-booking-system
railway login
```

This opens your browser to authenticate.

### Step 2: Create New Project

```bash
railway init
```

Select "Create new project" and name it `flight-booking-system`.

### Step 3: Add PostgreSQL Database

```bash
railway add --database postgresql
```

### Step 4: Add Redis

```bash
railway add --database redis
```

### Step 5: Link GitHub Repository (Optional but Recommended)

```bash
railway link
```

Or connect via Railway dashboard: https://railway.app/dashboard

### Step 6: Set Environment Variables

```bash
# Copy the template
cp .env.example .env.railway

# Edit .env.railway with your production values
# Railway will automatically inject database URLs
```

Upload variables to Railway:

```bash
railway variables --set-from-file .env.railway
```

Or set them manually in Railway dashboard.

### Step 7: Deploy Services

**Option A: Deploy via GitHub (Recommended)**

1. Push to GitHub (already done ✅)
2. Go to https://railway.app/new
3. Select "Deploy from GitHub repo"
4. Choose `rxsrini/flight-booking-system`
5. Railway will auto-detect services and deploy

**Option B: Deploy via CLI**

```bash
# Deploy all services
railway up
```

---

## Detailed Service Configuration

### Required Environment Variables

Railway auto-provides these:
- `DATABASE_URL` - PostgreSQL connection string
- `REDIS_URL` - Redis connection string

You need to set these manually:

```bash
# JWT Configuration
railway variables set JWT_SECRET=<generate-with-openssl-rand-base64-32>
railway variables set JWT_EXPIRATION=1h
railway variables set REFRESH_TOKEN_EXPIRATION=7d

# Encryption
railway variables set ENCRYPTION_KEY=<32-character-key>

# Amadeus API
railway variables set AMADEUS_API_KEY=<your-key>
railway variables set AMADEUS_API_SECRET=<your-secret>

# Stripe
railway variables set STRIPE_SECRET_KEY=<your-key>
railway variables set STRIPE_PUBLISHABLE_KEY=<your-key>
railway variables set STRIPE_WEBHOOK_SECRET=<your-secret>

# Email (SendGrid recommended for Railway)
railway variables set SMTP_HOST=smtp.sendgrid.net
railway variables set SMTP_PORT=587
railway variables set SMTP_USER=apikey
railway variables set SMTP_PASSWORD=<sendgrid-api-key>

# Sentry (optional)
railway variables set SENTRY_DSN=<your-dsn>

# Application
railway variables set NODE_ENV=production
railway variables set FRONTEND_URL=<your-railway-frontend-url>
```

---

## Multi-Service Deployment

Railway supports monorepos. Create separate services for each microservice:

### Via Railway Dashboard (Easiest):

1. Go to https://railway.app/dashboard
2. Create new project: `flight-booking-system`
3. Add services:
   - PostgreSQL (from template)
   - Redis (from template)
   - Auth Service (from GitHub, root: `services/auth`)
   - User Service (from GitHub, root: `services/user-management`)
   - Flight Service (from GitHub, root: `services/flight-search`)
   - Booking Service (from GitHub, root: `services/booking`)
   - Payment Service (from GitHub, root: `services/payment`)
   - Analytics Service (from GitHub, root: `services/analytics`)
   - Notification Service (from GitHub, root: `services/notification`)
   - Audit Service (from GitHub, root: `services/audit`)
   - API Gateway (from GitHub, root: `services/api-gateway`)
   - Web Frontend (from GitHub, root: `apps/web`)

4. Configure each service:
   - Build Command: `npm install && npm run build`
   - Start Command: `npm start`
   - Port: Respective service port (3001-3008, 3000 for gateway)

### Via railway.toml (Alternative):

Create `railway.toml` in project root (I'll create this below).

---

## Service URLs

After deployment, Railway provides URLs for each service:

```
Auth Service: https://auth-service-production.up.railway.app
User Service: https://user-service-production.up.railway.app
Flight Service: https://flight-service-production.up.railway.app
Booking Service: https://booking-service-production.up.railway.app
Payment Service: https://payment-service-production.up.railway.app
Analytics Service: https://analytics-service-production.up.railway.app
Notification Service: https://notification-service-production.up.railway.app
Audit Service: https://audit-service-production.up.railway.app
API Gateway: https://api-gateway-production.up.railway.app
Frontend: https://flight-booking-production.up.railway.app
```

Update your environment variables with these URLs.

---

## Database Initialization

After PostgreSQL is provisioned:

```bash
# Get database URL
railway variables

# Run migrations (connect to database via Railway CLI)
railway run psql $DATABASE_URL -f shared/database/init.sql
```

Or use Railway's built-in PostgreSQL management.

---

## Monitoring on Railway

Railway provides:
- Real-time logs
- Metrics dashboard
- Deployment history
- Resource usage

Access at: https://railway.app/project/<your-project-id>

---

## Custom Domain (Optional)

1. Go to service settings in Railway dashboard
2. Click "Settings" > "Domains"
3. Add custom domain
4. Update DNS records as instructed

Example:
- `api.yourdomain.com` → API Gateway
- `app.yourdomain.com` → Frontend

---

## Deployment Commands Quick Reference

```bash
# Login
railway login

# Create project
railway init

# Add database
railway add --database postgresql
railway add --database redis

# Set variables
railway variables set KEY=value

# Deploy
railway up

# View logs
railway logs

# Open dashboard
railway open

# Run commands in Railway environment
railway run <command>

# Check status
railway status
```

---

## Troubleshooting

### Build Fails

Check build logs:
```bash
railway logs --build
```

### Service Not Starting

Check runtime logs:
```bash
railway logs
```

### Database Connection Issues

Verify DATABASE_URL is set:
```bash
railway variables
```

### Environment Variables Missing

Set them via CLI or dashboard:
```bash
railway variables set KEY=value
```

---

## Cost Estimation

Railway pricing (as of 2024):
- **Hobby Plan**: $5/month
  - 512 MB RAM per service
  - $0.000231/GB outbound traffic
  - Shared CPU

- **Pro Plan**: $20/month + usage
  - Up to 32 GB RAM
  - Dedicated resources
  - Priority support

Estimated monthly cost for this project:
- **Hobby**: ~$5-15 (depending on traffic)
- **Pro**: ~$20-50 (with moderate traffic)

---

## Next Steps After Deployment

1. ✅ Verify all services are running
2. ✅ Test API endpoints
3. ✅ Configure custom domains
4. ✅ Set up monitoring alerts
5. ✅ Enable backups for PostgreSQL
6. ✅ Configure CI/CD (Railway auto-deploys on git push)
7. ✅ Review and optimize resource allocation

---

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Railway Status: https://status.railway.app

---

## Simple One-Command Deploy

If you just want to deploy quickly:

```bash
# After railway login
railway init && \
railway add --database postgresql && \
railway add --database redis && \
railway up
```

Then configure environment variables in the Railway dashboard!
