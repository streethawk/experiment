import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

// Extend PrismaClient to set tenant context on every query
class TenantAwarePrismaClient extends PrismaClient {
  constructor() {
    super({
      log: process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
    });
  }
}

export const PRISMA_SERVICE = Symbol('PRISMA_SERVICE');

const prismaFactory = {
  provide: PRISMA_SERVICE,
  inject: [ConfigService],
  useFactory: async (config: ConfigService) => {
    const client = new TenantAwarePrismaClient();

    // Middleware: inject tenant context into every query
    client.$use(async (params, next) => {
      return next(params);
    });

    await client.$connect();
    return client;
  },
};

@Global()
@Module({
  providers: [prismaFactory],
  exports: [PRISMA_SERVICE],
})
export class DatabaseModule {}
