/**
 * Run with: npx ts-node scripts/reset-passwords.ts
 * Resets all seed user passwords and clears any account lockouts.
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const USERS = [
  { email: 'ceo@bupekfinance.co.tz',    password: 'Admin@1234',  role: 'CEO_ADMIN' },
  { email: 'ops@bupekfinance.co.tz',    password: 'Ops@1234',   role: 'OPERATIONS_MANAGER' },
  { email: 'bm.hq@bupekfinance.co.tz',  password: 'Bm@12345',   role: 'BRANCH_MANAGER' },
  { email: 'lo1@bupekfinance.co.tz',    password: 'Lo@12345',   role: 'LOAN_OFFICER' },
];

async function main() {
  console.log('\n🔑 Resetting passwords & clearing lockouts...\n');

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);
    const updated = await prisma.user.updateMany({
      where: { email: u.email },
      data: {
        passwordHash: hash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: 'ACTIVE',
      },
    });

    if (updated.count > 0) {
      console.log(`✅  ${u.role.padEnd(22)} ${u.email.padEnd(35)} password: ${u.password}`);
    } else {
      console.log(`⚠️   Not found: ${u.email} — run seed first`);
    }
  }

  // Also clear all sessions so old tokens don't cause confusion
  const deleted = await prisma.userSession.deleteMany({});
  console.log(`\n🗑️  Cleared ${deleted.count} stale session(s)\n`);
  console.log('✅  Done! Restart the backend and try logging in again.\n');
}

main().catch(console.error).finally(() => prisma.$disconnect());
