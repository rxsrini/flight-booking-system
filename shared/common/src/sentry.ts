import * as Sentry from '@sentry/node';
import { Application } from 'express';

export function initializeSentry(app: Application, serviceName: string) {
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      serverName: serviceName,
      integrations: [
        // Enable HTTP calls tracing
        new Sentry.Integrations.Http({ tracing: true }),
        // Enable Express.js middleware tracing
        new Sentry.Integrations.Express({ app }),
      ],
      // Performance Monitoring
      tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
      // Capture unhandled promise rejections
      beforeSend(event, hint) {
        // Filter out certain errors if needed
        if (event.exception) {
          const error = hint.originalException;
          if (error && typeof error === 'object' && 'statusCode' in error) {
            const statusCode = (error as any).statusCode;
            // Don't send 404 errors to Sentry
            if (statusCode === 404) {
              return null;
            }
          }
        }
        return event;
      },
    });

    console.log(`✓ Sentry initialized for ${serviceName}`);
  } else {
    console.log('⚠ Sentry DSN not configured, error tracking disabled');
  }
}

export function sentryRequestHandler() {
  return Sentry.Handlers.requestHandler();
}

export function sentryTracingHandler() {
  return Sentry.Handlers.tracingHandler();
}

export function sentryErrorHandler() {
  return Sentry.Handlers.errorHandler({
    shouldHandleError(error) {
      // Capture all errors
      return true;
    },
  });
}

export function captureException(error: Error, context?: any) {
  Sentry.captureException(error, {
    extra: context,
  });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = 'info') {
  Sentry.captureMessage(message, level);
}

export { Sentry };
