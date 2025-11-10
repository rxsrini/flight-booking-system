import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AxiosError, AxiosRequestConfig } from 'axios';
import { catchError, firstValueFrom, retry, timeout } from 'rxjs';
import { SERVICES } from '../config/services.config';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  constructor(private readonly httpService: HttpService) {}

  async proxyRequest(
    serviceName: string,
    method: string,
    path: string,
    headers: any,
    body?: any,
    query?: any,
  ): Promise<any> {
    const service = this.getServiceConfig(serviceName);

    if (!service) {
      throw new HttpException(
        `Service ${serviceName} not found`,
        HttpStatus.NOT_FOUND,
      );
    }

    const url = `${service.url}/api/v1${path}`;
    const startTime = Date.now();

    this.logger.log(
      `Proxying ${method} request to ${service.name}: ${url}`,
    );

    try {
      const config: AxiosRequestConfig = {
        method: method as any,
        url,
        headers: this.sanitizeHeaders(headers),
        timeout: service.timeout,
      };

      if (body) {
        config.data = body;
      }

      if (query && Object.keys(query).length > 0) {
        config.params = query;
      }

      const response = await firstValueFrom(
        this.httpService.request(config).pipe(
          timeout(service.timeout),
          retry({
            count: 2,
            delay: 1000,
            resetOnSuccess: true,
          }),
          catchError((error: AxiosError) => {
            this.handleProxyError(error, service.name, url);
            throw error;
          }),
        ),
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Request to ${service.name} completed in ${duration}ms with status ${response.status}`,
      );

      return {
        data: response.data,
        status: response.status,
        headers: response.headers,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error(
        `Request to ${service.name} failed after ${duration}ms: ${error.message}`,
      );
      throw error;
    }
  }

  private getServiceConfig(serviceName: string) {
    const serviceKey = serviceName.toUpperCase().replace('-SERVICE', '');
    return SERVICES[serviceKey];
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };

    // Remove headers that shouldn't be forwarded
    delete sanitized.host;
    delete sanitized.connection;
    delete sanitized['content-length'];
    delete sanitized['transfer-encoding'];

    // Keep authorization header
    if (headers.authorization) {
      sanitized.authorization = headers.authorization;
    }

    return sanitized;
  }

  private handleProxyError(error: AxiosError, serviceName: string, url: string) {
    if (error.code === 'ECONNREFUSED') {
      this.logger.error(`Service ${serviceName} is unavailable at ${url}`);
      throw new HttpException(
        {
          message: `Service ${serviceName} is currently unavailable`,
          service: serviceName,
          error: 'Service Unavailable',
        },
        HttpStatus.SERVICE_UNAVAILABLE,
      );
    }

    if (error.code === 'ETIMEDOUT' || error.code === 'ECONNABORTED') {
      this.logger.error(`Request to ${serviceName} timed out`);
      throw new HttpException(
        {
          message: `Request to ${serviceName} timed out`,
          service: serviceName,
          error: 'Gateway Timeout',
        },
        HttpStatus.GATEWAY_TIMEOUT,
      );
    }

    if (error.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx
      this.logger.error(
        `Service ${serviceName} returned error: ${error.response.status}`,
      );
      throw new HttpException(
        error.response.data || {
          message: 'Service request failed',
          service: serviceName,
        },
        error.response.status,
      );
    }

    // Something happened in setting up the request that triggered an Error
    this.logger.error(`Error proxying to ${serviceName}: ${error.message}`);
    throw new HttpException(
      {
        message: 'Failed to proxy request',
        service: serviceName,
        error: error.message,
      },
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }

  async checkServiceHealth(serviceName: string): Promise<boolean> {
    const service = this.getServiceConfig(serviceName);

    if (!service) {
      return false;
    }

    try {
      const response = await firstValueFrom(
        this.httpService.get(`${service.url}/api/v1/health`).pipe(
          timeout(3000),
          catchError(() => {
            throw new Error('Health check failed');
          }),
        ),
      );

      return response.status === 200;
    } catch (error) {
      this.logger.warn(`Health check failed for ${service.name}`);
      return false;
    }
  }
}
