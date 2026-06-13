// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { RedisModule } from '@nestjs-modules/ioredis';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import databaseConfig from './config/database.config';
import redisConfig from './config/redis.config';
import jwtConfig from './config/jwt.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ServicesModule } from './modules/services/services.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, redisConfig, jwtConfig],
    }),

    // ── Winston Logging ────────────────────────────────────────────────
    WinstonModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        transports: [
          new winston.transports.Console({
            format: winston.format.combine(
              winston.format.colorize(),
              winston.format.timestamp(),
              winston.format.printf(({ level, message, timestamp }) => {
                return `[${timestamp as string}] ${level}: ${message as string}`;
              }),
            ),
          }),
          ...(configService.get<string>('NODE_ENV') === 'production'
            ? [
                new winston.transports.File({
                  filename: 'logs/app.log',
                  format: winston.format.combine(
                    winston.format.timestamp(),
                    winston.format.json(),
                  ),
                }),
              ]
            : []),
        ],
      }),
    }),

    // ── Redis ──────────────────────────────────────────────────────────
    RedisModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        type: 'single',
        url: configService.get<string>('redis.url', 'redis://localhost:6379'),
        options: {
          enableOfflineQueue: false,
          lazyConnect: true,
          retryStrategy: (times: number) => {
            if (times > 2) return null; // stop retrying after 2 attempts
            return Math.min(times * 1000, 3000);
          },
        },
        onClientReady: (client: import('ioredis').default) => {
          client.on('error', (err: Error & { code?: string }) => {
            if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
              return; // Redis not running — suppress noise, services degrade gracefully
            }
            console.error('[Redis]', err.message);
          });
          // Trigger initial connection (lazyConnect prevents auto-connect)
          void client.connect().catch(() => undefined);
        },
      }),
    }),

    // ── Bull Queue ─────────────────────────────────────────────────────
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('redis.url', 'redis://localhost:6379');
        const url = new URL(redisUrl);
        return {
          redis: {
            host: url.hostname,
            port: parseInt(url.port || '6379', 10),
            maxRetriesPerRequest: 1,
            enableOfflineQueue: false,
            retryStrategy: (times: number) => {
              if (times > 2) return null;
              return Math.min(times * 1000, 3000);
            },
          },
        };
      },
    }),

    // ── Feature Modules ────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    RoomsModule,
    GuestsModule,
    ReservationsModule,
    ServicesModule,
    DashboardModule,
    ReportsModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
