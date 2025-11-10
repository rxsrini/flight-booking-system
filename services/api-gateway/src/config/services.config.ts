export const SERVICES = {
  AUTH: {
    name: 'auth-service',
    url: process.env.AUTH_SERVICE_URL || 'http://localhost:3001',
    timeout: 5000,
  },
  USER: {
    name: 'user-service',
    url: process.env.USER_SERVICE_URL || 'http://localhost:3002',
    timeout: 5000,
  },
  FLIGHT: {
    name: 'flight-service',
    url: process.env.FLIGHT_SERVICE_URL || 'http://localhost:3003',
    timeout: 10000, // Longer timeout for GDS calls
  },
  BOOKING: {
    name: 'booking-service',
    url: process.env.BOOKING_SERVICE_URL || 'http://localhost:3004',
    timeout: 8000,
  },
  PAYMENT: {
    name: 'payment-service',
    url: process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005',
    timeout: 15000, // Longer timeout for payment processing
  },
  ANALYTICS: {
    name: 'analytics-service',
    url: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:3006',
    timeout: 10000,
  },
  NOTIFICATION: {
    name: 'notification-service',
    url: process.env.NOTIFICATION_SERVICE_URL || 'http://localhost:3007',
    timeout: 5000,
  },
  AUDIT: {
    name: 'audit-service',
    url: process.env.AUDIT_SERVICE_URL || 'http://localhost:3008',
    timeout: 5000,
  },
};

export const SERVICE_ROUTES = {
  '/auth': SERVICES.AUTH,
  '/users': SERVICES.USER,
  '/flights': SERVICES.FLIGHT,
  '/bookings': SERVICES.BOOKING,
  '/payments': SERVICES.PAYMENT,
  '/analytics': SERVICES.ANALYTICS,
  '/notifications': SERVICES.NOTIFICATION,
  '/audit': SERVICES.AUDIT,
};
