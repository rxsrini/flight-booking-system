import { Request, Response, NextFunction } from 'express';
import * as promClient from 'prom-client';

// Create a Registry
export const register = new promClient.Registry();

// Add default metrics
promClient.collectDefaultMetrics({
  register,
  prefix: 'nodejs_',
});

// HTTP request duration histogram
export const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code', 'service'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5],
  registers: [register],
});

// HTTP request counter
export const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code', 'service'],
  registers: [register],
});

// Active connections gauge
export const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['service'],
  registers: [register],
});

// Database query duration
export const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type', 'service'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
  registers: [register],
});

// Business metrics
export const bookingsTotal = new promClient.Counter({
  name: 'bookings_total',
  help: 'Total number of bookings',
  labelNames: ['status', 'service'],
  registers: [register],
});

export const paymentsTotal = new promClient.Counter({
  name: 'payments_total',
  help: 'Total number of payments',
  labelNames: ['status', 'service'],
  registers: [register],
});

export const paymentAmount = new promClient.Histogram({
  name: 'payment_amount',
  help: 'Payment amounts',
  labelNames: ['currency', 'service'],
  buckets: [10, 50, 100, 500, 1000, 5000, 10000],
  registers: [register],
});

// Middleware to track HTTP metrics
export function metricsMiddleware(serviceName: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    // Increment active connections
    activeConnections.inc({ service: serviceName });

    // Track when response finishes
    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000;
      const route = req.route?.path || req.path;
      const statusCode = res.statusCode.toString();

      // Record metrics
      httpRequestDuration
        .labels(req.method, route, statusCode, serviceName)
        .observe(duration);

      httpRequestTotal
        .labels(req.method, route, statusCode, serviceName)
        .inc();

      // Decrement active connections
      activeConnections.dec({ service: serviceName });
    });

    next();
  };
}

// Metrics endpoint handler
export function metricsHandler() {
  return async (req: Request, res: Response) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  };
}
