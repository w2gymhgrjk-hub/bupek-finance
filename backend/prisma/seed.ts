import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create branches
  const hq = await prisma.branch.upsert({
    where: { branchCode: 'BFL-HQ' },
    update: {},
    create: { branchCode: 'BFL-HQ', name: 'Head Office', address: 'Dar es Salaam CBD', phone: '+255222000001', email: 'hq@bupekfinance.co.tz', region: 'Dar es Salaam', district: 'Ilala', status: 'ACTIVE' },
  });

  const kla = await prisma.branch.upsert({
    where: { branchCode: 'BFL-KLA' },
    update: {},
    create: { branchCode: 'BFL-KLA', name: 'Kariakoo Branch', address: 'Kariakoo Market', phone: '+255222000002', email: 'kariakoo@bupekfinance.co.tz', region: 'Dar es Salaam', district: 'Ilala', status: 'ACTIVE' },
  });

  const mwz = await prisma.branch.upsert({
    where: { branchCode: 'BFL-MWZ' },
    update: {},
    create: { branchCode: 'BFL-MWZ', name: 'Mwanza Branch', address: 'Rock City Mall', phone: '+255282000001', email: 'mwanza@bupekfinance.co.tz', region: 'Mwanza', district: 'Nyamagana', status: 'ACTIVE' },
  });

  const hash = (pw: string) => bcrypt.hash(pw, 12);

  // Create CEO
  const ceo = await prisma.user.upsert({
    where: { email: 'ceo@bupekfinance.co.tz' },
    update: {},
    create: {
      userNo: 'BFL-USR-0001', firstName: 'James', lastName: 'Mwangi',
      email: 'ceo@bupekfinance.co.tz', phone: '+255712000001',
      passwordHash: await hash('Admin@1234'), role: 'CEO_ADMIN', status: 'ACTIVE',
    },
  });

  // Create Operations Manager
  const om = await prisma.user.upsert({
    where: { email: 'ops@bupekfinance.co.tz' },
    update: {},
    create: {
      userNo: 'BFL-USR-0002', firstName: 'Grace', lastName: 'Kimaro',
      email: 'ops@bupekfinance.co.tz', phone: '+255712000002',
      passwordHash: await hash('Ops@1234'), role: 'OPERATIONS_MANAGER', status: 'ACTIVE',
      createdById: ceo.id,
    },
  });

  // Create Branch Managers
  const bm1 = await prisma.user.upsert({
    where: { email: 'bm.hq@bupekfinance.co.tz' },
    update: {},
    create: {
      userNo: 'BFL-USR-0003', firstName: 'Robert', lastName: 'Makundi',
      email: 'bm.hq@bupekfinance.co.tz', phone: '+255712000003',
      passwordHash: await hash('Bm@12345'), role: 'BRANCH_MANAGER',
      branchId: hq.id, status: 'ACTIVE', createdById: ceo.id,
    },
  });

  // Assign branch manager to HQ
  await prisma.branch.update({ where: { id: hq.id }, data: { managerId: bm1.id } });

  // Create Loan Officer
  const lo1 = await prisma.user.upsert({
    where: { email: 'lo1@bupekfinance.co.tz' },
    update: {},
    create: {
      userNo: 'BFL-USR-0004', firstName: 'Peter', lastName: 'Njau',
      email: 'lo1@bupekfinance.co.tz', phone: '+255712000004',
      passwordHash: await hash('Lo@12345'), role: 'LOAN_OFFICER',
      branchId: hq.id, status: 'ACTIVE', createdById: bm1.id,
    },
  });

  // Create Collection Officer
  await prisma.user.upsert({
    where: { email: 'co1@bupekfinance.co.tz' },
    update: {},
    create: {
      userNo: 'BFL-USR-0005', firstName: 'Mary', lastName: 'Osei',
      email: 'co1@bupekfinance.co.tz', phone: '+255712000005',
      passwordHash: await hash('Co@12345'), role: 'COLLECTION_OFFICER',
      branchId: hq.id, status: 'ACTIVE', createdById: bm1.id,
    },
  });

  // Create Accountant
  await prisma.user.upsert({
    where: { email: 'acc@bupekfinance.co.tz' },
    update: {},
    create: {
      userNo: 'BFL-USR-0006', firstName: 'Fatuma', lastName: 'Hassan',
      email: 'acc@bupekfinance.co.tz', phone: '+255712000006',
      passwordHash: await hash('Acc@12345'), role: 'ACCOUNTANT',
      branchId: hq.id, status: 'ACTIVE', createdById: bm1.id,
    },
  });

  // Create Loan Products
  const bizLoan = await prisma.loanProduct.upsert({
    where: { productCode: 'LP-BIZ' },
    update: {},
    create: {
      productCode: 'LP-BIZ', name: 'Business Loan',
      description: 'Short-term business loan for micro and small enterprises',
      minAmount: 100000, maxAmount: 5000000,
      interestRate: 3.0, interestType: 'FLAT',
      minTerm: 1, maxTerm: 12, termUnit: 'MONTHS',
      repaymentFrequency: 'MONTHLY',
      processingFeeType: 'PERCENTAGE', processingFeeValue: 2.0,
      insuranceFeeType: 'PERCENTAGE', insuranceFeeValue: 0.5,
      requiresGuarantor: true, gracePeriodDays: 7, penaltyRate: 0.5,
      status: 'active', createdById: ceo.id,
    },
  });

  await prisma.loanProduct.upsert({
    where: { productCode: 'LP-AGR' },
    update: {},
    create: {
      productCode: 'LP-AGR', name: 'Agricultural Loan',
      description: 'Seasonal loan for farmers',
      minAmount: 50000, maxAmount: 2000000,
      interestRate: 2.5, interestType: 'FLAT',
      minTerm: 3, maxTerm: 12, termUnit: 'MONTHS',
      repaymentFrequency: 'MONTHLY',
      processingFeeType: 'PERCENTAGE', processingFeeValue: 1.5,
      insuranceFeeType: 'FIXED', insuranceFeeValue: 5000,
      requiresGuarantor: false, gracePeriodDays: 30, penaltyRate: 0.3,
      status: 'active', createdById: ceo.id,
    },
  });

  // Create SMS Templates
  await prisma.smsTemplate.upsert({
    where: { code: 'DUE_3DAYS' },
    update: {},
    create: {
      code: 'DUE_3DAYS', name: 'Due in 3 Days',
      messageTemplate: 'Dear {{client_name}}, your loan {{loan_no}} payment of TZS {{amount_due}} is due on {{due_date}}. Please ensure timely payment. BUPEK Finance.',
      triggerEvent: 'DUE_REMINDER', daysBeforeDue: 3, isActive: true, createdById: ceo.id,
    },
  });

  await prisma.smsTemplate.upsert({
    where: { code: 'OVERDUE_DAY1' },
    update: {},
    create: {
      code: 'OVERDUE_DAY1', name: 'Overdue Day 1',
      messageTemplate: 'Dear {{client_name}}, your BUPEK Finance loan {{loan_no}} payment is overdue. Please pay TZS {{amount_due}} immediately to avoid penalties. Call us: 0800-BUPEK.',
      triggerEvent: 'OVERDUE_REMINDER', daysAfterDue: 1, isActive: true, createdById: ceo.id,
    },
  });

  await prisma.smsTemplate.upsert({
    where: { code: 'PAYMENT_RECEIVED' },
    update: {},
    create: {
      code: 'PAYMENT_RECEIVED', name: 'Payment Received',
      messageTemplate: 'Dear {{client_name}}, we received TZS {{amount_due}} for loan {{loan_no}}. Outstanding balance: TZS {{outstanding}}. Thank you. BUPEK Finance.',
      triggerEvent: 'PAYMENT_RECEIVED', isActive: true, createdById: ceo.id,
    },
  });

  await prisma.smsTemplate.upsert({
    where: { code: 'LOAN_APPROVED' },
    update: {},
    create: {
      code: 'LOAN_APPROVED', name: 'Loan Approved',
      messageTemplate: 'Dear {{client_name}}, congratulations! Your loan {{loan_no}} of TZS {{amount_due}} has been approved. You will be contacted for disbursement. BUPEK Finance.',
      triggerEvent: 'LOAN_APPROVED', isActive: true, createdById: ceo.id,
    },
  });

  // Create sample client
  const client1 = await prisma.client.upsert({
    where: { nationalId: 'TZ-19850312-001' },
    update: {},
    create: {
      clientNo: 'BFL-CLT-00001', firstName: 'John', lastName: 'Doe',
      nationalId: 'TZ-19850312-001', phonePrimary: '+255712345001',
      dateOfBirth: new Date('1985-03-12'), gender: 'MALE', maritalStatus: 'MARRIED',
      branchId: hq.id, loanOfficerId: lo1.id,
      status: 'ACTIVE', createdById: lo1.id,
    },
  });

  // Add address to client
  await prisma.clientAddress.upsert({
    where: { id: 'seed-addr-001' },
    update: {},
    create: {
      id: 'seed-addr-001', clientId: client1.id, addressType: 'HOME',
      streetAddress: 'Plot 45, Msasani Road', city: 'Dar es Salaam',
      district: 'Kinondoni', region: 'Dar es Salaam', isPrimary: true,
    },
  }).catch(() => {});

  // Add business info
  await prisma.clientBusiness.upsert({
    where: { clientId: client1.id },
    update: {},
    create: {
      clientId: client1.id, businessName: 'Doe General Store',
      businessType: 'Retail', address: 'Kariakoo Market Stand 12',
      yearsInOperation: 5, monthlyRevenue: 2500000, monthlyExpenses: 1500000,
      numberOfEmployees: 2,
    },
  });

  console.log('Seed complete!');
  console.log('\nDefault Credentials:');
  console.log('CEO/Admin:   ceo@bupekfinance.co.tz   | Admin@1234');
  console.log('Ops Mgr:     ops@bupekfinance.co.tz   | Ops@1234');
  console.log('Branch Mgr:  bm.hq@bupekfinance.co.tz | Bm@12345');
  console.log('Loan Officer:lo1@bupekfinance.co.tz   | Lo@12345');
  console.log('Collection:  co1@bupekfinance.co.tz   | Co@12345');
  console.log('Accountant:  acc@bupekfinance.co.tz   | Acc@12345');
}

main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());