// src/app.module.ts

import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import databaseConfig from './config/database.config';
import jwtConfig from './config/jwt.config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { RoomsModule } from './modules/rooms/rooms.module';
import { GuestsModule } from './modules/guests/guests.module';
import { ReservationsModule } from './modules/reservations/reservations.module';
import { ServicesModule } from './modules/services/services.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { ReportsModule } from './modules/reports/reports.module';
import { DepensesModule } from './modules/depenses/depenses.module';

@Module({
  imports: [
    // ── Configuration ──────────────────────────────────────────────────
    ConfigModule.forRoot({
      isGlobal: true,
      load: [databaseConfig, jwtConfig],
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

    // ── Feature Modules ────────────────────────────────────────────────
    PrismaModule,
    AuthModule,
    RoomsModule,
    GuestsModule,
    ReservationsModule,
    ServicesModule,
    DashboardModule,
    ReportsModule,
    DepensesModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
