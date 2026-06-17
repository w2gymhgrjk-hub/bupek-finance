// Plain Node.js — no TypeScript needed
// Run: node scripts/reset-passwords.js

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('\nConnecting to database...');

  const USERS = [
    { email: 'ceo@bupekfinance.co.tz',   password: 'Admin@1234' },
    { email: 'ops@bupekfinance.co.tz',   password: 'Ops@1234'   },
    { email: 'bm.hq@bupekfinance.co.tz', password: 'Bm@12345'   },
    { email: 'lo1@bupekfinance.co.tz',   password: 'Lo@12345'   },
  ];

  for (const u of USERS) {
    const hash = await bcrypt.hash(u.password, 12);
    const result = await prisma.user.updateMany({
      where: { email: u.email },
      data: {
        passwordHash: hash,
        failedLoginAttempts: 0,
        lockedUntil: null,
        status: 'ACTIVE',
      },
    });
    if (result.count > 0) {
      console.log(`OK  ${u.email}  =>  ${u.password}`);
    } else {
      console.log(`MISSING: ${u.email} (user not in DB)`);
    }
  }

  await prisma.userSession.deleteMany({});
  console.log('\nAll sessions cleared. Restart the backend and try logging in.\n');
}

main()
  .catch(e => { console.error('ERROR:', e.message); process.exit(1); })
  .finally(() => prisma.$disconnect());
