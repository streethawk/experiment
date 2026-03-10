import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bull';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';
import { ResidentsModule } from './modules/residents/residents.module';
import { MedicationsModule } from './modules/medications/medications.module';
import { CareNotesModule } from './modules/care-notes/care-notes.module';
import { IncidentsModule } from './modules/incidents/incidents.module';
import { StaffModule } from './modules/staff/staff.module';
import { RotaModule } from './modules/rota/rota.module';
import { FinanceModule } from './modules/finance/finance.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { ComplianceModule } from './modules/compliance/compliance.module';
import { FamilyPortalModule } from './modules/family-portal/family-portal.module';
import { IotModule } from './modules/iot/iot.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { HealthController } from './health.controller';
import appConfig from './config/app.config';
import databaseConfig from './config/database.config';
import awsConfig from './config/aws.config';

@Module({
  imports: [
    // Config — loaded before everything else
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, databaseConfig, awsConfig],
      envFilePath: ['.env.local', '.env'],
    }),

    // Rate limiting — 100 req/min per user, 500 req/min per IP
    ThrottlerModule.forRoot([
      { name: 'per-user', ttl: 60000, limit: 100 },
      { name: 'per-ip',   ttl: 60000, limit: 500 },
    ]),

    // Event bus for inter-module communication
    EventEmitterModule.forRoot({ wildcard: true }),

    // Background job queues
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        redis: {
          host: config.get('REDIS_HOST', 'localhost'),
          port: config.get<number>('REDIS_PORT', 6379),
          password: config.get('REDIS_PASSWORD'),
          tls: config.get('NODE_ENV') === 'production' ? {} : undefined,
        },
        defaultJobOptions: {
          removeOnComplete: 100,
          removeOnFail: 50,
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
        },
      }),
    }),

    // Health checks
    TerminusModule,

    // Database
    DatabaseModule,

    // Feature modules
    AuthModule,
    ResidentsModule,
    MedicationsModule,
    CareNotesModule,
    IncidentsModule,
    StaffModule,
    RotaModule,
    FinanceModule,
    InventoryModule,
    ComplianceModule,
    FamilyPortalModule,
    IotModule,
    AnalyticsModule,
    NotificationsModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
