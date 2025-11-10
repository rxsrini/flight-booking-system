import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { HealthService } from './health.service';

@Controller('health')
@ApiTags('Health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Get API Gateway health status' })
  @ApiResponse({ status: 200, description: 'Gateway is healthy' })
  async getHealth() {
    return this.healthService.getGatewayHealth();
  }

  @Get('services')
  @ApiOperation({ summary: 'Check health of all microservices' })
  @ApiResponse({
    status: 200,
    description: 'Health status of all services',
    schema: {
      example: {
        status: 'up',
        timestamp: '2024-01-01T12:00:00.000Z',
        services: {
          'auth-service': { status: 'up', responseTime: '45ms' },
          'user-service': { status: 'up', responseTime: '32ms' },
          'flight-service': { status: 'up', responseTime: '67ms' },
        }
      }
    }
  })
  async checkServices() {
    return this.healthService.checkAllServices();
  }
}
