import { PrismaClient, Role, KYCStatus } from '@prisma/client';
import { PrismaLibSql } from '@prisma/adapter-libsql';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcryptjs';
import 'dotenv/config';

const dbUrl = process.env.DATABASE_URL || 'file:./dev.db';

let prisma: PrismaClient;

if (dbUrl.startsWith('postgresql://') || dbUrl.startsWith('postgres://')) {
  console.log('Seed configuration: PostgreSQL pool adapter activated.');
  const pool = new Pool({ connectionString: dbUrl });
  const adapter = new PrismaPg(pool);
  prisma = new PrismaClient({ adapter });
} else {
  console.log('Seed configuration: SQLite (LibSQL) adapter activated.');
  const adapter = new PrismaLibSql({
    url: dbUrl,
  });
  prisma = new PrismaClient({ adapter });
}

async function main() {
  console.log(`Starting database seeding with URL: ${dbUrl}...`);

  // Clean existing database records
  await prisma.auditLog.deleteMany({});
  await prisma.pawaPayTransaction.deleteMany({});
  await prisma.dcaPlan.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.securitiesWallet.deleteMany({});
  await prisma.cashWallet.deleteMany({});
  await prisma.user.deleteMany({});

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Create SGI Admin (KYC & Management role)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@sgi.ci',
      password: passwordHash,
      firstName: 'Directeur',
      lastName: 'SGI',
      phone: '+2250707070701',
      role: Role.ADMIN_KYC,
      kycStatus: KYCStatus.APPROUVE,
      consentSMS: true,
    },
  });
  console.log(`Seeded Admin User: ${adminUser.email}`);

  // 2. Create SGI Client with cash wallet and securities wallet
  const clientUser = await prisma.user.create({
    data: {
      email: 'client@sgi.ci',
      password: passwordHash,
      firstName: 'Jean',
      lastName: 'Koffi',
      phone: '+2250707070703',
      role: Role.CLIENT,
      kycStatus: KYCStatus.APPROUVE,
      consentSMS: true,
      cashWallet: {
        create: {
          balanceTotal: 1000000.0, // 1,000,000 XOF
          balanceFrozen: 0.0,
          currency: 'XOF',
        },
      },
      securitiesWallet: {
        createMany: {
          data: [
            { codeValeur: 'SNTS', quantity: 50, averageBuyPrice: 16500.0 }, // Sonatel shares
            { codeValeur: 'CIEC', quantity: 100, averageBuyPrice: 2100.0 },  // CIE shares
          ],
        },
      },
    },
  });
  console.log(`Seeded Client User: ${clientUser.email}`);

  console.log('Database seeding completed successfully. Only 1 Client and 1 Admin accounts generated.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
