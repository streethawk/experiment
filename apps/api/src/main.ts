import { NestFactory } from '@nestjs/core';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditInterceptor } from './common/interceptors/audit.interceptor';
import { TenantInterceptor } from './common/interceptors/tenant.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug'],
  });

  const configService = app.get(ConfigService);
  const isDevelopment = configService.get('NODE_ENV') === 'development';

  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        scriptSrc: ["'self'"],
      },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  }));

  // Compression
  app.use(compression());

  // CORS — restricted to known origins
  app.enableCors({
    origin: configService.get<string[]>('ALLOWED_ORIGINS', []),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Home-ID', 'X-Organisation-ID'],
  });

  // API versioning
  app.enableVersioning({ type: VersioningType.URI });
  app.setGlobalPrefix('v1');

  // Global validation pipe — strip unknown fields, validate DTOs
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,          // strip unknown properties
      forbidNonWhitelisted: true,
      transform: true,          // auto-transform to DTO class instances
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(
    new TenantInterceptor(),
    new AuditInterceptor(),
  );

  // Swagger (development only)
  if (isDevelopment) {
    const config = new DocumentBuilder()
      .setTitle('CareCore API')
      .setDescription('UK Care Home SaaS Platform — API Documentation')
      .setVersion('1.0')
      .addBearerAuth()
      .addApiKey({ type: 'apiKey', in: 'header', name: 'X-Home-ID' }, 'home-id')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document, {
      swaggerOptions: { persistAuthorization: true },
    });
  }

  const port = configService.get<number>('PORT', 3000);
  await app.listen(port);
  console.log(`CareCore API running on port ${port}`);
}

bootstrap();
