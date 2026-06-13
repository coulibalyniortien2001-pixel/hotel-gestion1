// src/main.ts

import { NestFactory, Reflector } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import helmet from 'helmet';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  // ── Global Exception Filter ──────────────────────────────────────────
  app.useGlobalFilters(new HttpExceptionFilter());

  // ── Security ─────────────────────────────────────────────────────────
  // CSP assoupli pour permettre l'affichage de Swagger UI
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", 'data:', 'validator.swagger.io'],
        },
      },
    }),
  );

  // ── CORS ─────────────────────────────────────────────────────────────
  app.enableCors({
    origin: ['http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  });

  // ── Global Prefix ─────────────────────────────────────────────────────
  app.setGlobalPrefix('api');

  // ── Validation Pipe ──────────────────────────────────────────────────
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: false },
    }),
  );

  // ── Interceptors ──────────────────────────────────────────────────────
  app.useGlobalInterceptors(
    new TransformInterceptor(app.get(Reflector)),
    new LoggingInterceptor(),
  );

  // ── Swagger ──────────────────────────────────────────────────────────
  const swaggerConfig = new DocumentBuilder()
    .setTitle('PMS Hôtel API')
    .setDescription(
      'API REST du système de gestion hôtelière (Property Management System).\n\n' +
        '**Authentification** : obtenez un token via `POST /api/auth/login`, ' +
        'puis cliquez sur **Authorize** et collez votre `access_token`.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Collez ici votre access_token JWT (sans le préfixe Bearer)',
      },
      'access-token',
    )
    .addTag('auth', 'Authentification et gestion des tokens JWT')
    .addTag('rooms', 'Gestion des chambres')
    .addTag('guests', 'Gestion des clients')
    .addTag('reservations', 'Gestion des réservations')
    .addTag('services', 'Prestations hôtelières')
    .addTag('dashboard', 'Statistiques temps réel (cache Redis 60s)')
    .addTag('reports', 'Documents : reçus, factures, rapports de séjour')
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
    customSiteTitle: 'PMS Hôtel — API Docs',
  });

  const port = process.env.PORT ?? 8011;
  await app.listen(port);
  console.log(`🚀 PMS API running on:  http://localhost:${port}/api`);
  console.log(`📚 Swagger docs:        http://localhost:${port}/api/docs`);
}
bootstrap();
