# Flight Booking Web Application

React-based frontend for the Flight Booking System with role-based dashboards.

## Features

- **Authentication** - Login and registration with JWT
- **Role-Based Dashboards**:
  - Customer: Book flights, manage bookings
  - Travel Agent: Book for customers
  - Airline Agent: Manage flight operations
  - Business Owner: View analytics and reports
  - Admin: Full system access
- **Flight Search** - Search and book flights
- **Booking Management** - View and cancel bookings
- **Real-time Updates** - Live booking status updates
- **Responsive Design** - Works on desktop and mobile

## Technology Stack

- **React 18** - UI library
- **TypeScript** - Type safety
- **Material-UI** - Component library
- **React Router** - Navigation
- **React Query** - Data fetching
- **Formik + Yup** - Forms & validation
- **Recharts** - Data visualization
- **Axios** - HTTP client

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
```

3. Start development server:
```bash
npm start
```

The app will open at http://localhost:3000

### Building for Production

```bash
npm run build
```

## Project Structure

```
src/
├── components/       # Reusable components
│   ├── Layout.tsx
│   └── PrivateRoute.tsx
├── contexts/         # React contexts
│   └── AuthContext.tsx
├── pages/            # Page components
│   ├── auth/         # Login, Register
│   ├── dashboards/   # Role-based dashboards
│   ├── flights/      # Flight search
│   ├── bookings/     # Booking management
│   └── profile/      # User profile
├── services/         # API services
│   ├── api.ts
│   ├── auth.service.ts
│   ├── flight.service.ts
│   ├── booking.service.ts
│   ├── payment.service.ts
│   └── analytics.service.ts
├── App.tsx           # Main app component
└── index.tsx         # Entry point
```

## Available Scripts

- `npm start` - Start development server
- `npm run build` - Build for production
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

## Environment Variables

- `REACT_APP_API_URL` - API Gateway URL (default: http://localhost:3000/api/v1)

## Docker

Build and run with Docker:

```bash
docker build -t flight-booking-web .
docker run -p 3000:80 flight-booking-web
```

## Features by Role

### Customer
- Search and book flights
- View booking history
- Cancel bookings
- View booking details

### Travel Agent
- Search and book flights for customers
- Manage customer bookings
- View booking statistics

### Airline Agent
- Manage flight operations
- View booking analytics
- Handle booking modifications

### Business Owner
- View analytics dashboards
- Revenue and booking trends
- User statistics
- Real-time metrics

### Admin
- Full system access
- User management (coming soon)
- System analytics
- Audit logs (coming soon)

## API Integration

The app communicates with the backend API Gateway at `/api/v1`. All requests include JWT authentication tokens.

### Authentication Flow
1. User logs in with email/password
2. Receives JWT access token and refresh token
3. Access token stored in localStorage
4. Automatic token refresh on expiration
5. Logout clears tokens

### API Services
- **auth.service.ts** - Authentication
- **flight.service.ts** - Flight search
- **booking.service.ts** - Booking management
- **payment.service.ts** - Payment processing
- **analytics.service.ts** - Business analytics

## Styling

The app uses Material-UI with a custom theme:
- Primary color: #1976d2 (blue)
- Secondary color: #dc004e (pink)
- Roboto font family
- Responsive breakpoints

## Error Handling

- API errors shown via snackbar notifications
- Form validation with Formik and Yup
- Loading states with CircularProgress
- Error boundaries for component errors

## Future Enhancements

- [ ] Real-time WebSocket notifications
- [ ] Dark mode support
- [ ] Multi-language support
- [ ] Advanced seat selection
- [ ] Travel insurance integration
- [ ] Mobile app (React Native)
- [ ] Offline support with PWA
- [ ] Push notifications

## License

MIT License
