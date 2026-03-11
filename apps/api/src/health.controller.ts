import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { Public } from './common/decorators/public.decorator';
import { PRISMA_SERVICE } from './database/database.module';
import { Inject } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    @Inject(PRISMA_SERVICE) private prisma: PrismaClient,
  ) {}

  @Get()
  @Public()
  @HealthCheck()
  check() {
    return this.health.check([
      () => ({
        database: {
          status: 'up',
        },
      }),
    ]);
  }
}
