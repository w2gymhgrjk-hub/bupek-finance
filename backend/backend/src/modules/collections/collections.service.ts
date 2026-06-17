import { prisma } from '../../utils/prismaClient';
import { paginate, paginationMeta } from '../../utils/apiResponse';

export class CollectionsService {
  async getOverdueList(params: {
    page?: number; limit?: number; branchId?: string; officerId?: string;
    minDays?: number; maxDays?: number;
    actorBranchId?: string | null; actorRole?: string;
  }) {
    const { page = 1, limit = 20, branchId, officerId, minDays, maxDays,
      actorBranchId, actorRole } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: any = { status: 'OVERDUE' };

    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }
    if (officerId) where.loanOfficerId = officerId;

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where, skip, take, orderBy: { maturityDate: 'asc' },
        include: {
          client: { select: { id: true, clientNo: true, firstName: true, lastName: true, phonePrimary: true } },
          branch: { select: { id: true, name: true, branchCode: true } },
          loanOfficer: { select: { id: true, firstName: true, lastName: true } },
          schedules: { where: { status: { in: ['OVERDUE', 'PARTIAL', 'PENDING'] } }, orderBy: { dueDate: 'asc' } },
          collectionActivities: { orderBy: { createdAt: 'desc' }, take: 1 },
        },
      }),
    ]);

    const now = new Date();
    const enriched = loans.map(loan => {
      const overdueSchedules = loan.schedules.filter(s => s.status === 'OVERDUE' || s.status === 'PARTIAL');
      const earliestDue = overdueSchedules.length > 0
        ? overdueSchedules.reduce((e, s) => s.dueDate < e ? s.dueDate : e, overdueSchedules[0].dueDate)
        : loan.maturityDate || new Date();
      const daysOverdue = Math.max(0, Math.floor((now.getTime() - earliestDue.getTime()) / 86400000));
      const arrearsAmount = overdueSchedules.reduce((sum, s) =>
        sum + Number(s.principalDue) - Number(s.principalPaid) +
              Number(s.interestDue) - Number(s.interestPaid), 0);
      return { ...loan, daysOverdue, arrearsAmount: Math.round(arrearsAmount * 100) / 100 };
    }).filter(l => {
      if (minDays !== undefined && l.daysOverdue < Number(minDays)) return false;
      if (maxDays !== undefined && l.daysOverdue > Number(maxDays)) return false;
      return true;
    });

    return { loans: enriched, meta: paginationMeta(total, page, limit) };
  }

  async getActivities(loanId: string, page = 1, limit = 20) {
    const { skip, limit: take } = paginate(page, limit);
    const where = { loanId };
    const [total, activities] = await Promise.all([
      prisma.collectionActivity.count({ where }),
      prisma.collectionActivity.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { officer: { select: { firstName: true, lastName: true, role: true } } },
      }),
    ]);
    return { activities, meta: paginationMeta(total, page, limit) };
  }

  async logActivity(data: {
    loanId: string; clientId: string; officerId: string;
    activityType: string; notes: string; outcome: string;
    promiseToPayDate?: string; promiseAmount?: number; nextFollowUpDate?: string;
  }) {
    return prisma.collectionActivity.create({
      data: {
        loanId: data.loanId,
        clientId: data.clientId,
        officerId: data.officerId,
        activityType: data.activityType as any,
        notes: data.notes,
        outcome: data.outcome as any,
        promiseToPayDate: data.promiseToPayDate ? new Date(data.promiseToPayDate) : null,
        promiseAmount: data.promiseAmount || null,
        nextFollowUpDate: data.nextFollowUpDate ? new Date(data.nextFollowUpDate) : null,
      },
      include: { officer: { select: { firstName: true, lastName: true } } },
    });
  }

  async getBranchArrearsReport(branchId?: string, actorBranchId?: string | null, actorRole?: string) {
    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    const targetBranch = (actorRole && !globalRoles.includes(actorRole) && actorBranchId)
      ? actorBranchId : branchId;

    const whereClause = targetBranch ? `AND l.branch_id = '${targetBranch}'` : '';

    // PAR buckets
    const parData = await prisma.$queryRawUnsafe<Array<{
      par_bucket: string; loan_count: bigint; outstanding: number;
    }>>(`
      SELECT
        CASE
          WHEN MAX(CURRENT_DATE - s.due_date) BETWEEN 1 AND 7 THEN 'PAR 1-7'
          WHEN MAX(CURRENT_DATE - s.due_date) BETWEEN 8 AND 30 THEN 'PAR 8-30'
          WHEN MAX(CURRENT_DATE - s.due_date) BETWEEN 31 AND 60 THEN 'PAR 31-60'
          WHEN MAX(CURRENT_DATE - s.due_date) BETWEEN 61 AND 90 THEN 'PAR 61-90'
          WHEN MAX(CURRENT_DATE - s.due_date) > 90 THEN 'PAR 90+'
          ELSE 'Current'
        END AS par_bucket,
        COUNT(DISTINCT l.id) AS loan_count,
        SUM(l.outstanding_principal) AS outstanding
      FROM loans l
      JOIN loan_schedules s ON s.loan_id = l.id
      WHERE s.status IN ('OVERDUE','PARTIAL')
        AND l.status = 'OVERDUE'
        ${whereClause}
      GROUP BY par_bucket
      ORDER BY outstanding DESC
    `);

    const branches = await prisma.branch.findMany({
      where: targetBranch ? { id: targetBranch } : {},
      select: {
        id: true, name: true, branchCode: true,
        loans: {
          where: { status: 'OVERDUE' },
          select: { outstandingPrincipal: true },
        },
      },
    });

    const branchSummary = branches.map(b => ({
      branchId: b.id,
      branchName: b.name,
      branchCode: b.branchCode,
      overdueLoans: b.loans.length,
      totalArrears: b.loans.reduce((s, l) => s + Number(l.outstandingPrincipal), 0),
    }));

    return { parBuckets: parData, branchSummary };
  }
}