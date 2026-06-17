import { prisma } from '../../utils/prismaClient';

export class ReportsService {
  async getDashboard(branchId?: string, actorBranchId?: string | null, actorRole?: string) {
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const scopedBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId || undefined;

    const branchWhere = scopedBranch ? { branchId: scopedBranch } : {};
    const today = new Date(); today.setHours(0,0,0,0);
    const tomorrow = new Date(today); tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      totalPortfolio, totalClients, activeLoans, overdueLoans,
      todayCollections, totalArrears, pendingLoans,
    ] = await Promise.all([
      prisma.loan.aggregate({ where: { ...branchWhere, status: { in: ['ACTIVE','OVERDUE'] } }, _sum: { outstandingPrincipal: true } }),
      prisma.client.count({ where: { ...branchWhere, status: 'ACTIVE' } }),
      prisma.loan.count({ where: { ...branchWhere, status: 'ACTIVE' } }),
      prisma.loan.count({ where: { ...branchWhere, status: 'OVERDUE' } }),
      prisma.repayment.aggregate({
        where: { ...branchWhere, isReversed: false, paymentDate: { gte: today, lt: tomorrow } },
        _sum: { amountReceived: true }, _count: { id: true },
      }),
      prisma.loan.aggregate({ where: { ...branchWhere, status: 'OVERDUE' }, _sum: { outstandingPrincipal: true } }),
      prisma.loan.count({ where: { ...branchWhere, status: { in: ['PENDING','UNDER_REVIEW','RECOMMENDED','APPROVED'] } } }),
    ]);

    return {
      totalPortfolio: totalPortfolio._sum.outstandingPrincipal || 0,
      totalClients,
      activeLoans,
      overdueLoans,
      totalArrears: totalArrears._sum.outstandingPrincipal || 0,
      todayCollections: { amount: todayCollections._sum.amountReceived || 0, count: todayCollections._count.id },
      pendingLoans,
    };
  }

  async getPAR(asOfDate?: string, branchId?: string, actorBranchId?: string | null, actorRole?: string) {
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const scopedBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId || undefined;
    const date = asOfDate ? new Date(asOfDate) : new Date();
    const branchFilter = scopedBranch ? `AND l.branch_id = '${scopedBranch}'` : '';

    const totalPortfolio = await prisma.loan.aggregate({
      where: { ...(scopedBranch ? { branchId: scopedBranch } : {}), status: { in: ['ACTIVE','OVERDUE'] } },
      _sum: { outstandingPrincipal: true },
    });
    const portfolio = Number(totalPortfolio._sum.outstandingPrincipal) || 1;

    const buckets = [1, 7, 30, 60, 90, 180];
    const parResults = await Promise.all(buckets.map(async days => {
      const result = await prisma.$queryRawUnsafe<Array<{ loan_count: bigint; outstanding: number }>>(`
        SELECT COUNT(DISTINCT l.id) AS loan_count, COALESCE(SUM(l.outstanding_principal),0) AS outstanding
        FROM loans l
        JOIN loan_schedules s ON s.loan_id = l.id
        WHERE s.status IN ('OVERDUE','PARTIAL')
          AND ('${date.toISOString()}'::date - s.due_date) >= ${days}
          AND l.status NOT IN ('PAID','WRITTEN_OFF')
          ${branchFilter}
      `);
      const row = result[0];
      const outstanding = Number(row?.outstanding || 0);
      return { days, loanCount: Number(row?.loan_count || 0), outstanding, parRatio: ((outstanding / portfolio) * 100).toFixed(2) };
    }));

    return { asOfDate: date.toISOString().slice(0,10), totalPortfolio: portfolio, parBuckets: parResults };
  }

  async getDailyCollections(params: { startDate?: string; endDate?: string; branchId?: string; actorBranchId?: string | null; actorRole?: string }) {
    const { startDate, endDate, branchId, actorBranchId, actorRole } = params;
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const scopedBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId || undefined;

    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
    const end = endDate ? new Date(endDate) : new Date();
    const where: any = { isReversed: false, paymentDate: { gte: start, lte: end } };
    if (scopedBranch) where.branchId = scopedBranch;

    const daily = await prisma.repayment.groupBy({
      by: ['paymentDate'],
      where,
      _sum: { amountReceived: true, principalPaid: true, interestPaid: true, penaltyPaid: true },
      _count: { id: true },
      orderBy: { paymentDate: 'asc' },
    });

    const total = daily.reduce((s, d) => s + Number(d._sum.amountReceived || 0), 0);
    return { collections: daily, totalAmount: Math.round(total * 100) / 100, startDate: start, endDate: end };
  }

  async getLoanOfficerPerformance(params: { startDate?: string; endDate?: string; branchId?: string; officerId?: string; actorBranchId?: string | null; actorRole?: string }) {
    const { startDate, endDate, branchId, officerId, actorBranchId, actorRole } = params;
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const scopedBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId || undefined;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const where: any = {};
    if (scopedBranch) where.branchId = scopedBranch;
    if (officerId) where.loanOfficerId = officerId;

    const officers = await prisma.user.findMany({
      where: {
        role: { in: ['LOAN_OFFICER', 'BRANCH_MANAGER'] },
        ...(scopedBranch ? { branchId: scopedBranch } : {}),
        ...(officerId ? { id: officerId } : {}),
      },
      select: { id: true, firstName: true, lastName: true, userNo: true, branch: { select: { name: true } } },
    });

    const performance = await Promise.all(officers.map(async o => {
      const loanWhere = { loanOfficerId: o.id, ...(startDate || endDate ? { applicationDate: dateFilter } : {}) };
      const [submitted, approved, disbursed, activeLoans, overdueLoans, totalCollected] = await Promise.all([
        prisma.loan.count({ where: { ...loanWhere } }),
        prisma.loan.count({ where: { ...loanWhere, status: { in: ['APPROVED','DISBURSED','ACTIVE','PAID'] } } }),
        prisma.loan.count({ where: { ...loanWhere, status: { in: ['DISBURSED','ACTIVE','PAID','OVERDUE','WRITTEN_OFF'] } } }),
        prisma.loan.count({ where: { loanOfficerId: o.id, status: 'ACTIVE' } }),
        prisma.loan.count({ where: { loanOfficerId: o.id, status: 'OVERDUE' } }),
        prisma.repayment.aggregate({
          where: { collectedById: o.id, isReversed: false, ...(startDate || endDate ? { paymentDate: dateFilter } : {}) },
          _sum: { amountReceived: true },
        }),
      ]);
      return {
        officer: o, submitted, approved, disbursed,
        activeLoans, overdueLoans,
        totalCollected: totalCollected._sum.amountReceived || 0,
      };
    }));

    return performance;
  }

  async getBranchPerformance(params: { startDate?: string; endDate?: string }) {
    const { startDate, endDate } = params;
    const branches = await prisma.branch.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, name: true, branchCode: true },
    });

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);

    const performance = await Promise.all(branches.map(async b => {
      const [clients, activeLoans, overdueLoans, portfolio, disbursed, collected] = await Promise.all([
        prisma.client.count({ where: { branchId: b.id, status: 'ACTIVE' } }),
        prisma.loan.count({ where: { branchId: b.id, status: 'ACTIVE' } }),
        prisma.loan.count({ where: { branchId: b.id, status: 'OVERDUE' } }),
        prisma.loan.aggregate({ where: { branchId: b.id, status: { in: ['ACTIVE','OVERDUE'] } }, _sum: { outstandingPrincipal: true } }),
        prisma.loan.aggregate({ where: { branchId: b.id, ...(startDate || endDate ? { disbursementDate: dateFilter } : {}) }, _sum: { principal: true } }),
        prisma.repayment.aggregate({ where: { branchId: b.id, isReversed: false, ...(startDate || endDate ? { paymentDate: dateFilter } : {}) }, _sum: { amountReceived: true } }),
      ]);
      return {
        branch: b, clients, activeLoans, overdueLoans,
        portfolio: portfolio._sum.outstandingPrincipal || 0,
        disbursed: disbursed._sum.principal || 0,
        collected: collected._sum.amountReceived || 0,
      };
    }));

    return performance;
  }

  async getProfitSummary(params: { startDate?: string; endDate?: string; branchId?: string; actorBranchId?: string | null; actorRole?: string }) {
    const { startDate, endDate, branchId, actorBranchId, actorRole } = params;
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const scopedBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId || undefined;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const where: any = { isReversed: false };
    if (scopedBranch) where.branchId = scopedBranch;
    if (startDate || endDate) where.paymentDate = dateFilter;

    const income = await prisma.repayment.aggregate({
      where,
      _sum: { interestPaid: true, penaltyPaid: true, chargesPaid: true },
    });

    const fees = await prisma.loan.aggregate({
      where: { ...(scopedBranch ? { branchId: scopedBranch } : {}), ...(startDate || endDate ? { disbursementDate: dateFilter } : {}), status: { not: 'PENDING' } },
      _sum: { processingFee: true, insuranceFee: true },
    });

    const monthlyBreakdown = await prisma.repayment.groupBy({
      by: ['paymentDate'],
      where,
      _sum: { interestPaid: true, penaltyPaid: true, chargesPaid: true },
      orderBy: { paymentDate: 'asc' },
    });

    return {
      interestIncome: income._sum.interestPaid || 0,
      penaltyIncome: income._sum.penaltyPaid || 0,
      chargesIncome: income._sum.chargesPaid || 0,
      processingFees: fees._sum.processingFee || 0,
      insuranceFees: fees._sum.insuranceFee || 0,
      totalIncome: Number(income._sum.interestPaid || 0) + Number(income._sum.penaltyPaid || 0) +
                   Number(income._sum.chargesPaid || 0) + Number(fees._sum.processingFee || 0) + Number(fees._sum.insuranceFee || 0),
      monthlyBreakdown,
    };
  }

  async getExpenseSummary(params: { startDate?: string; endDate?: string; branchId?: string; actorBranchId?: string | null; actorRole?: string }) {
    const { startDate, endDate, branchId, actorBranchId, actorRole } = params;
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const scopedBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId || undefined;

    const dateFilter: any = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    const wh: any = {};
    if (scopedBranch) wh.branchId = scopedBranch;
    if (startDate || endDate) wh.writtenOffAt = dateFilter;

    const [writeOffs, reversals] = await Promise.all([
      prisma.writtenOffLoan.findMany({
        where: wh,
        include: { loan: { select: { loanNo: true, branch: { select: { name: true } } } } },
      }),
      prisma.repayment.findMany({
        where: { isReversed: true, ...(scopedBranch ? { branchId: scopedBranch } : {}), ...(startDate || endDate ? { reversedAt: dateFilter } : {}) },
        select: { receiptNo: true, amountReceived: true, reversedAt: true, reversalReason: true },
      }),
    ]);

    return {
      writeOffs,
      totalWrittenOff: writeOffs.reduce((s, w) => s + Number(w.totalWrittenOff), 0),
      reversals,
      totalReversed: reversals.reduce((s, r) => s + Number(r.amountReceived), 0),
    };
  }
}