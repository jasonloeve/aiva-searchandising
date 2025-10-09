import { Controller, Get } from '@nestjs/common';

/**
 * Health check endpoint for monitoring
 */
@Controller('health')
export class HealthController {
  /**
   * Basic health check
   * @returns Health status
   */
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'aiva-searchandising-backend',
    };
  }

  /**
   * Detailed health check with system info
   * @returns Detailed health status
   */
  @Get('detailed')
  detailedCheck() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'aiva-searchandising-backend',
      uptime: process.uptime(),
      memory: {
        used: process.memoryUsage().heapUsed,
        total: process.memoryUsage().heapTotal,
        rss: process.memoryUsage().rss,
      },
      node: process.version,
    };
  }
}
