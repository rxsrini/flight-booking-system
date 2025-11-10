import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, timeout, catchError, of } from 'rxjs';
import { SERVICES } from '../config/services.config';

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly httpService: HttpService) {}

  async checkAllServices(): Promise<any> {
    const serviceKeys = Object.keys(SERVICES);
    const healthChecks = await Promise.all(
      serviceKeys.map((key) => this.checkService(SERVICES[key])),
    );

    const services = {};
    serviceKeys.forEach((key, index) => {
      services[SERVICES[key].name] = healthChecks[index];
    });

    const allHealthy = healthChecks.every((check) => check.status === 'up');

    return {
      status: allHealthy ? 'up' : 'degraded',
      timestamp: new Date().toISOString(),
      services,
    };
  }

  private async checkService(service: any): Promise<any> {
    const startTime = Date.now();

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${service.url}/api/v1/health`).pipe(
          timeout(3000),
          catchError((error) => {
            return of({
              status: 503,
              data: { error: error.message },
            });
          }),
        ),
      );

      const duration = Date.now() - startTime;

      if (response.status === 200) {
        return {
          status: 'up',
          responseTime: `${duration}ms`,
          url: service.url,
        };
      } else {
        return {
          status: 'down',
          responseTime: `${duration}ms`,
          url: service.url,
          error: response.data?.error || 'Service unavailable',
        };
      }
    } catch (error) {
      const duration = Date.now() - startTime;
      return {
        status: 'down',
        responseTime: `${duration}ms`,
        url: service.url,
        error: error.message || 'Connection failed',
      };
    }
  }

  async getGatewayHealth(): Promise<any> {
    return {
      status: 'up',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
        unit: 'MB',
      },
    };
  }
}
