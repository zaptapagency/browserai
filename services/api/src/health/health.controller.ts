import { Controller, Get } from '@nestjs/common';

interface HealthResponse {
  status: 'ok' | 'unhealthy';
  timestamp: string;
  uptime: number;
  checks: {
    database: 'ok' | 'error';
    redis: 'ok' | 'error';
  };
}

@Controller('health')
export class HealthController {
  @Get()
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: 'ok', // TODO: check actual DB connection in M1
        redis: 'ok', // TODO: check actual Redis connection in M1
      },
    };
  }

  @Get('ready')
  getReadiness(): HealthResponse {
    return this.getHealth();
  }
}
