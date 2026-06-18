const b = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
const email = 'ceo@bupekfinance.co.tz';
const password = 'Admin@1234';
p.user.findUnique({ where: { email: email.toLowerCase() }, select: { passwordHash: true, status: true } })
  .then(u => {
    if (!u) return console.log('USER NOT FOUND');
    console.log('Status:', u.status);
    return b.compare(password, u.passwordHash).then(m => console.log('Match:', m));
  })
  .catch(console.error)
  .finally(() => p.$disconnect());
