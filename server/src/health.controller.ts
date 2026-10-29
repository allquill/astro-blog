import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiTags } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { DataSource } from 'typeorm';

@ApiTags('health')
@SkipThrottle()
@Controller('api/health')
export class HealthController {
  constructor(private readonly db: DataSource) {}

  /** Container health check: the process is up and the database answers. */
  @Get()
  @ApiOkResponse({ schema: { example: { ok: true } } })
  async health() {
    await this.db.query('SELECT 1');
    return { ok: true };
  }
}
