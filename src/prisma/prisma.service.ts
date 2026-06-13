// src/prisma/prisma.service.ts

import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

/**
 * pg-connection-string warns when sslmode is 'prefer', 'require', or 'verify-ca'
 * because their semantics will change in pg v9. Replace them with the explicit
 * 'verify-full' (current behaviour) to silence the security warning.
 */
function normalizeDatabaseUrl(url: string): string {
  return url.replace(
    /sslmode=(prefer|require|verify-ca)/g,
    'sslmode=verify-full',
  );
}

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    const pool = new Pool({ connectionString: normalizeDatabaseUrl(process.env.DATABASE_URL!) });
    const adapter = new PrismaPg(pool);
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Prisma connected to database');
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log('Prisma disconnected from database');
  }
}
