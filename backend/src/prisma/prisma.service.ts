import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private static createPrismaClientOptions(): any {
    const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';
    
    if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
      console.log('Database configuration: PostgreSQL pool adapter activated.');
      const pool = new Pool({ connectionString: dbUrl });
      const adapter = new PrismaPg(pool);
      return { adapter };
    } else {
      console.log('Database configuration: SQLite (LibSQL) adapter activated.');
      const adapter = new PrismaLibSql({ url: dbUrl });
      return { adapter };
    }
  }

  constructor() {
    super(PrismaService.createPrismaClientOptions());
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
