# Getting Started with Flight Booking System

## 🎯 What's Working Right Now

You have **3 fully functional microservices** ready to use:
1. **Auth Service** (Port 3001) - Registration, Login, JWT
2. **User Management Service** (Port 3002) - User CRUD with RBAC
3. **Flight Search Service** (Port 3003) - Multi-GDS flight search with caching

## ⚡ Quick Start (5 Minutes)

### Step 1: Set Up Environment

```bash
cd flight-booking-system

# Copy environment file
cp .env.example .env

# Edit .env and update these critical values:
# - JWT_SECRET=your-super-secret-key-change-this
# - DB_PASSWORD=secure-password
# - AMADEUS_API_KEY=your-amadeus-key (get from https://developers.amadeus.com)
# - AMADEUS_API_SECRET=your-amadeus-secret
```

### Step 2: Start Infrastructure

```bash
# Start PostgreSQL and Redis
docker-compose up -d postgres redis

# Wait for services to be healthy (about 10 seconds)
docker-compose ps
```

### Step 3: Install Dependencies

```bash
# Install all package dependencies
npm install

# Build shared libraries
cd shared/types && npm run build && cd ../..
cd shared/common && npm run build && cd ../..
cd shared/database && npm run build && cd ../..
```

### Step 4: Start Services

Open 3 terminal windows:

**Terminal 1 - Auth Service**
```bash
cd services/auth
npm install
npm run dev
# Should see: 🚀 Auth Service running on http://localhost:3001
```

**Terminal 2 - User Management Service**
```bash
cd services/user-management
npm install
npm run dev
# Should see: 🚀 User Management Service running on http://localhost:3002
```

**Terminal 3 - Flight Search Service**
```bash
cd services/flight-search
npm install
npm run dev
# Should see: 🚀 Flight Search Service running on http://localhost:3003
```

## 🧪 Test the System

### Test 1: Register a User

```bash
curl -X POST http://localhost:3001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!",
    "firstName": "John",
    "lastName": "Doe",
    "role": "CUSTOMER"
  }'
```

**Expected Response**:
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc...",
    "expiresIn": 3600
  },
  "message": "User registered successfully"
}
```

### Test 2: Login

```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "SecurePass123!"
  }'
```

**Save the `accessToken` from the response!**

### Test 3: Get Your Profile

```bash
# Replace YOUR_TOKEN with the accessToken from login
curl http://localhost:3002/api/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test 4: Search Flights

```bash
curl -X POST http://localhost:3003/api/v1/flights/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "origin": "JFK",
    "destination": "LAX",
    "departureDate": "2025-12-01",
    "passengers": {
      "adults": 1,
      "children": 0,
      "infants": 0
    },
    "cabinClass": "ECONOMY"
  }'
```

**Note**: This will search Amadeus GDS (if configured) and local database flights.

### Test 5: Get Available Airports

```bash
curl http://localhost:3003/api/v1/flights/airports \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## 📋 Available API Endpoints

### Auth Service (Port 3001)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/auth/register` | Register new user | No |
| POST | `/api/v1/auth/login` | Login user | No |
| POST | `/api/v1/auth/refresh` | Refresh access token | No |
| GET | `/api/v1/auth/me` | Get current user profile | Yes |
| POST | `/api/v1/auth/verify` | Verify JWT token | No |

### User Management Service (Port 3002)

| Method | Endpoint | Description | Auth Required | Roles |
|--------|----------|-------------|---------------|-------|
| POST | `/api/v1/users` | Create user | Yes | Admin, Business Owner, Agents |
| GET | `/api/v1/users` | List all users | Yes | Admin, Business Owner |
| GET | `/api/v1/users/me` | Get own profile | Yes | All |
| GET | `/api/v1/users/stats` | User statistics | Yes | Admin, Business Owner |
| GET | `/api/v1/users/:id` | Get user by ID | Yes | All (own) / Admin |
| PATCH | `/api/v1/users/:id` | Update user | Yes | All (own) / Admin |
| PATCH | `/api/v1/users/:id/status` | Update user status | Yes | Admin, Business Owner |
| DELETE | `/api/v1/users/:id` | Delete user | Yes | Admin |

### Flight Search Service (Port 3003)

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/v1/flights/search` | Search flights | Yes |
| GET | `/api/v1/flights/airlines` | List airlines | No |
| GET | `/api/v1/flights/airports` | List/search airports | No |
| GET | `/api/v1/flights/:id` | Get flight by ID | Yes |

## 🎭 User Roles & Permissions

### CUSTOMER
- Register and login
- Search flights
- View own profile
- Update own profile
- (Future: Create bookings, make payments)

### TRAVEL_AGENT
- All CUSTOMER permissions
- Create customers
- Create bookings for customers
- Process payments
- View commission reports (planned)

### AIRLINE_AGENT
- All TRAVEL_AGENT permissions
- Manage flights (planned)
- View airline analytics (planned)

### BUSINESS_OWNER
- Manage airline agents
- Manage travel agents
- Manage customers
- View user statistics
- View business analytics (planned)

### ADMIN
- Full system access
- Manage all users
- Manage all roles
- System configuration
- View audit logs (planned)

## 🔧 Common Issues & Solutions

### Issue: "Connection refused" when starting services

**Solution**: Make sure PostgreSQL and Redis are running:
```bash
docker-compose ps
docker-compose up -d postgres redis
```

### Issue: "JWT_SECRET is not defined"

**Solution**: Copy `.env.example` to `.env` and set JWT_SECRET:
```bash
cp .env.example .env
# Edit .env and set JWT_SECRET=your-secret-key
```

### Issue: "Cannot find module '@shared/common'"

**Solution**: Build shared libraries first:
```bash
cd shared/types && npm run build
cd ../common && npm run build
cd ../database && npm run build
```

### Issue: "Database connection failed"

**Solution**: Check PostgreSQL is running and credentials are correct:
```bash
docker-compose logs postgres
# Verify DB_HOST, DB_PORT, DB_USERNAME, DB_PASSWORD in .env
```

### Issue: "Amadeus API returns 401"

**Solution**: Get valid Amadeus API credentials:
1. Sign up at https://developers.amadeus.com
2. Create a new app
3. Copy API Key and API Secret to .env

## 📊 Database Access

### Using psql

```bash
docker-compose exec postgres psql -U postgres -d flight_booking

# Useful queries:
\dt                               # List tables
SELECT * FROM users;              # View users
SELECT * FROM airlines;           # View airlines
SELECT * FROM airports;           # View airports
SELECT count(*) FROM flights;     # Count flights
```

### Using a GUI Client

- **Host**: localhost
- **Port**: 5432
- **Database**: flight_booking
- **Username**: postgres
- **Password**: postgres (or your custom password from .env)

Recommended clients:
- DBeaver (Free, cross-platform)
- pgAdmin (Free, official PostgreSQL tool)
- TablePlus (Paid, macOS/Windows)

## 🔍 Monitoring & Debugging

### View Service Logs

```bash
# Auth service logs
cd services/auth && npm run dev

# User management service logs
cd services/user-management && npm run dev

# Flight search service logs
cd services/flight-search && npm run dev
```

### Check Redis Cache

```bash
docker-compose exec redis redis-cli

# Useful commands:
KEYS *                    # List all keys
GET flight:search:*       # Get cached flight searches
FLUSHALL                  # Clear all cache (use carefully!)
```

### Health Checks

```bash
# Check if services are responding
curl http://localhost:3001/api/v1/auth/me  # Should return 401 (no token)
curl http://localhost:3002/api/v1/users/me # Should return 401 (no token)
curl http://localhost:3003/api/v1/flights/airlines  # Should return airlines list
```

## 🚀 Next Steps

1. **Test all the endpoints** using the examples above
2. **Review BUILD_STATUS.md** to see what's built and what's pending
3. **Continue development**:
   - Complete Booking Service
   - Add Payment Service
   - Build React Frontend
   - Add more GDS providers

## 💡 Development Tips

### Hot Reload

All services use NestJS's built-in hot reload. Just save your files and the services will automatically restart.

### Adding New Endpoints

1. Create a DTO in `src/*/dto/`
2. Add method to service
3. Add route to controller
4. Test with curl or Postman

### Debugging

Add breakpoints and use VS Code's debugger:
1. Install VS Code extension: "Debugger for NestJS"
2. Set breakpoints in your code
3. Run service in debug mode

## 📚 Additional Resources

- **NestJS Documentation**: https://docs.nestjs.com
- **TypeORM Documentation**: https://typeorm.io
- **Amadeus for Developers**: https://developers.amadeus.com
- **PostgreSQL Documentation**: https://www.postgresql.org/docs/

## 🆘 Getting Help

1. Check `BUILD_STATUS.md` for current implementation status
2. Review service logs for error messages
3. Check database connection and data
4. Verify environment variables in `.env`
5. Ensure all dependencies are installed

---

**Happy Coding! 🎉**

You now have a working multi-tenant flight booking system with authentication, user management, and flight search capabilities!
