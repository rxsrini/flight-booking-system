import {
  All,
  Controller,
  Req,
  Res,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ProxyService } from './proxy.service';
import { ApiTags, ApiExcludeEndpoint } from '@nestjs/swagger';

@Controller()
@ApiTags('Proxy')
export class ProxyController {
  constructor(private readonly proxyService: ProxyService) {}

  @All('auth/*')
  @ApiExcludeEndpoint()
  async proxyAuth(@Req() req: Request, @Res() res: Response) {
    return this.proxy('auth-service', req, res);
  }

  @All('users/*')
  @ApiExcludeEndpoint()
  async proxyUsers(@Req() req: Request, @Res() res: Response) {
    return this.proxy('user-service', req, res);
  }

  @All('flights/*')
  @ApiExcludeEndpoint()
  async proxyFlights(@Req() req: Request, @Res() res: Response) {
    return this.proxy('flight-service', req, res);
  }

  @All('bookings/*')
  @ApiExcludeEndpoint()
  async proxyBookings(@Req() req: Request, @Res() res: Response) {
    return this.proxy('booking-service', req, res);
  }

  @All('payments/*')
  @ApiExcludeEndpoint()
  async proxyPayments(@Req() req: Request, @Res() res: Response) {
    return this.proxy('payment-service', req, res);
  }

  @All('analytics/*')
  @ApiExcludeEndpoint()
  async proxyAnalytics(@Req() req: Request, @Res() res: Response) {
    return this.proxy('analytics-service', req, res);
  }

  @All('notifications/*')
  @ApiExcludeEndpoint()
  async proxyNotifications(@Req() req: Request, @Res() res: Response) {
    return this.proxy('notification-service', req, res);
  }

  @All('audit/*')
  @ApiExcludeEndpoint()
  async proxyAudit(@Req() req: Request, @Res() res: Response) {
    return this.proxy('audit-service', req, res);
  }

  private async proxy(
    serviceName: string,
    req: Request,
    res: Response,
  ): Promise<void> {
    try {
      // Extract the path after /api/v1
      const basePrefix = '/api/v1';
      let path = req.url;

      // Remove /api/v1 if it exists at the start
      if (path.startsWith(basePrefix)) {
        path = path.substring(basePrefix.length);
      }

      // Extract query string
      const queryIndex = path.indexOf('?');
      let queryString = '';
      if (queryIndex !== -1) {
        queryString = path.substring(queryIndex);
        path = path.substring(0, queryIndex);
      }

      const response = await this.proxyService.proxyRequest(
        serviceName,
        req.method,
        path,
        req.headers,
        req.body,
        req.query,
      );

      // Set response headers
      if (response.headers) {
        Object.keys(response.headers).forEach((key) => {
          // Skip certain headers
          if (
            !['content-encoding', 'transfer-encoding', 'connection'].includes(
              key.toLowerCase(),
            )
          ) {
            res.setHeader(key, response.headers[key]);
          }
        });
      }

      // Send response
      res.status(response.status).json(response.data);
    } catch (error) {
      if (error instanceof HttpException) {
        const status = error.getStatus();
        const response = error.getResponse();
        res.status(status).json(response);
      } else {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          message: 'Internal server error',
          error: error.message,
        });
      }
    }
  }
}
