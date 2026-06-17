import { prisma } from '../../utils/prismaClient';
import { generateReceiptNo } from '../../utils/numberGenerator';
import { paginate, paginationMeta } from '../../utils/apiResponse';

export class RepaymentsService {
  async list(params: {
    page?: number; limit?: number; branchId?: string; loanId?: string;
    startDate?: string; endDate?: string; collectedById?: string;
    actorBranchId?: string | null; actorRole?: string;
  }) {
    const { page = 1, limit = 20, branchId, loanId, startDate, endDate,
      collectedById, actorBranchId, actorRole } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: any = { isReversed: false };

    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (loanId) where.loanId = loanId;
    if (collectedById) where.collectedById = collectedById;
    if (startDate || endDate) {
      where.paymentDate = {};
      if (startDate) where.paymentDate.gte = new Date(startDate);
      if (endDate) where.paymentDate.lte = new Date(endDate);
    }

    const [total, repayments] = await Promise.all([
      prisma.repayment.count({ where }),
      prisma.repayment.findMany({
        where, skip, take, orderBy: { paymentDate: 'desc' },
        include: {
          loan: { select: { loanNo: true } },
          client: { select: { clientNo: true, firstName: true, lastName: true } },
          branch: { select: { name: true } },
          collectedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);
    return { repayments, meta: paginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.repayment.findUnique({
      where: { id },
      include: {
        loan: { select: { loanNo: true, principal: true } },
        client: { select: { clientNo: true, firstName: true, lastName: true, phonePrimary: true } },
        branch: { select: { name: true, branchCode: true } },
        collectedBy: { select: { firstName: true, lastName: true } },
        verifiedBy: { select: { firstName: true, lastName: true } },
        allocations: { include: { schedule: { select: { installmentNo: true, dueDate: true } } } },
      },
    });
  }

  async record(data: {
    loanId: string; paymentDate: string; amountReceived: number;
    collectionMethod: string; referenceNo?: string; notes?: string;
    collectedById: string; branchId: string;
  }) {
    const loan = await prisma.loan.findUnique({
      where: { id: data.loanId },
      include: {
        client: { select: { id: true } },
        schedules: {
          where: { status: { in: ['PENDING', 'PARTIAL', 'OVERDUE'] } },
          orderBy: { dueDate: 'asc' },
        },
      },
    });
    // Use the loan's own branchId if caller doesn't have one
    const branchId = data.branchId || (loan as any)?.branchId;

    if (!loan) throw new Error('LOAN_NOT_FOUND');
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) throw new Error('LOAN_NOT_ACTIVE');
    if (data.amountReceived <= 0) throw new Error('INVALID_AMOUNT');

    const receiptNo = generateReceiptNo();
    let remaining = data.amountReceived;
    let totalPrincipalPaid = 0;
    let totalInterestPaid = 0;
    let totalPenaltyPaid = 0;

    const allocations: Array<{
      scheduleId: string;
      principalAllocated: number;
      interestAllocated: number;
      penaltyAllocated: number;
    }> = [];

    const scheduleUpdates: Array<{ id: string; data: any }> = [];

    // Allocate: penalties first, then interest, then principal (oldest first)
    for (const schedule of loan.schedules) {
      if (remaining <= 0) break;

      const penaltyOwed = Number(schedule.penaltyDue) - Number(schedule.penaltyPaid);
      const interestOwed = Number(schedule.interestDue) - Number(schedule.interestPaid);
      const principalOwed = Number(schedule.principalDue) - Number(schedule.principalPaid);
      const totalOwed = penaltyOwed + interestOwed + principalOwed;

      if (totalOwed <= 0) continue;

      const penaltyPay = Math.min(remaining, penaltyOwed);
      remaining -= penaltyPay;
      const interestPay = Math.min(remaining, interestOwed);
      remaining -= interestPay;
      const principalPay = Math.min(remaining, principalOwed);
      remaining -= principalPay;

      const newPenaltyPaid = Number(schedule.penaltyPaid) + penaltyPay;
      const newInterestPaid = Number(schedule.interestPaid) + interestPay;
      const newPrincipalPaid = Number(schedule.principalPaid) + principalPay;
      const newTotalPaid = newPenaltyPaid + newInterestPaid + newPrincipalPaid;

      const isFullyPaid = Math.abs(newTotalPaid - Number(schedule.totalDue)) < 0.01 ||
        (newPrincipalPaid >= Number(schedule.principalDue) &&
         newInterestPaid >= Number(schedule.interestDue));

      scheduleUpdates.push({
        id: schedule.id,
        data: {
          principalPaid: newPrincipalPaid,
          interestPaid: newInterestPaid,
          penaltyPaid: newPenaltyPaid,
          totalPaid: newTotalPaid,
          status: isFullyPaid ? 'PAID' : 'PARTIAL',
          paidAt: isFullyPaid ? new Date() : null,
        },
      });

      if (penaltyPay > 0 || interestPay > 0 || principalPay > 0) {
        allocations.push({
          scheduleId: schedule.id,
          principalAllocated: round2(principalPay),
          interestAllocated: round2(interestPay),
          penaltyAllocated: round2(penaltyPay),
        });
      }

      totalPrincipalPaid += principalPay;
      totalInterestPaid += interestPay;
      totalPenaltyPaid += penaltyPay;
    }

    const newOutstandingPrincipal = Math.max(0, Number(loan.outstandingPrincipal) - totalPrincipalPaid);
    const newOutstandingInterest = Math.max(0, Number(loan.outstandingInterest) - totalInterestPaid);
    const newTotalPaid = Number(loan.totalPaid) + data.amountReceived;

    // Check if loan is fully paid
    const allSchedulesPaid = await this.checkAllPaid(loan.id, scheduleUpdates);
    const newLoanStatus = (allSchedulesPaid && newOutstandingPrincipal < 0.01) ? 'PAID' : loan.status;

    return prisma.$transaction(async (tx) => {
      const repayment = await tx.repayment.create({
        data: {
          receiptNo,
          loanId: data.loanId,
          clientId: loan.client.id,
          branch: branchId ? { connect: { id: branchId } } : undefined,
          paymentDate: new Date(data.paymentDate),
          amountReceived: data.amountReceived,
          principalPaid: round2(totalPrincipalPaid),
          interestPaid: round2(totalInterestPaid),
          penaltyPaid: round2(totalPenaltyPaid),
          collectionMethod: data.collectionMethod as any,
          referenceNo: data.referenceNo,
          notes: data.notes,
          collectedBy: data.collectedById ? { connect: { id: data.collectedById } } : undefined,
        },
      });

      if (allocations.length > 0) {
        await tx.repaymentAllocation.createMany({
          data: allocations.map(a => ({ ...a, repaymentId: repayment.id })),
        });
      }

      for (const upd of scheduleUpdates) {
        await tx.loanSchedule.update({ where: { id: upd.id }, data: upd.data });
      }

      await tx.loan.update({
        where: { id: data.loanId },
        data: {
          outstandingPrincipal: round2(newOutstandingPrincipal),
          outstandingInterest: round2(newOutstandingInterest),
          totalPaid: round2(newTotalPaid),
          status: newLoanStatus as any,
        },
      });

      return repayment;
    });
  }

  private async checkAllPaid(loanId: string, pendingUpdates: Array<{ id: string; data: any }>) {
    const schedules = await prisma.loanSchedule.findMany({ where: { loanId } });
    return schedules.every(s => {
      const update = pendingUpdates.find(u => u.id === s.id);
      const status = update ? update.data.status : s.status;
      return status === 'PAID';
    });
  }

  async reverse(repaymentId: string, reversedById: string, reversalReason: string) {
    const repayment = await prisma.repayment.findUnique({
      where: { id: repaymentId },
      include: { allocations: true, loan: true },
    });
    if (!repayment) throw new Error('NOT_FOUND');
    if (repayment.isReversed) throw new Error('ALREADY_REVERSED');

    return prisma.$transaction(async (tx) => {
      // Reverse schedule allocations
      for (const alloc of repayment.allocations) {
        const schedule = await tx.loanSchedule.findUnique({ where: { id: alloc.scheduleId } });
        if (!schedule) continue;
        await tx.loanSchedule.update({
          where: { id: alloc.scheduleId },
          data: {
            principalPaid: Math.max(0, Number(schedule.principalPaid) - Number(alloc.principalAllocated)),
            interestPaid: Math.max(0, Number(schedule.interestPaid) - Number(alloc.interestAllocated)),
            penaltyPaid: Math.max(0, Number(schedule.penaltyPaid) - Number(alloc.penaltyAllocated)),
            totalPaid: Math.max(0, Number(schedule.totalPaid) - (Number(alloc.principalAllocated) + Number(alloc.interestAllocated) + Number(alloc.penaltyAllocated))),
            status: 'PENDING',
            paidAt: null,
          },
        });
      }

      // Restore loan balances
      await tx.loan.update({
        where: { id: repayment.loanId },
        data: {
          outstandingPrincipal: { increment: repayment.principalPaid },
          outstandingInterest: { increment: repayment.interestPaid },
          totalPaid: { decrement: repayment.amountReceived },
          status: 'ACTIVE',
        },
      });

      return tx.repayment.update({
        where: { id: repaymentId },
        data: { isReversed: true, reversedById, reversedAt: new Date(), reversalReason },
      });
    });
  }

  async dailySummary(date?: string, branchId?: string, actorBranchId?: string | null, actorRole?: string) {
    const targetDate = date ? new Date(date) : new Date();
    const start = new Date(targetDate); start.setHours(0,0,0,0);
    const end = new Date(targetDate); end.setHours(23,59,59,999);
    const where: any = { isReversed: false, paymentDate: { gte: start, lte: end } };

    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const [totals, byMethod, byOfficer, repayments] = await Promise.all([
      prisma.repayment.aggregate({
        where, _sum: { amountReceived: true, principalPaid: true, interestPaid: true, penaltyPaid: true },
        _count: { id: true },
      }),
      prisma.repayment.groupBy({
        by: ['collectionMethod'], where,
        _sum: { amountReceived: true }, _count: { id: true },
      }),
      prisma.repayment.groupBy({
        by: ['collectedById'], where,
        _sum: { amountReceived: true }, _count: { id: true },
      }),
      prisma.repayment.findMany({
        where, orderBy: { paymentDate: 'desc' },
        include: {
          client: { select: { clientNo: true, firstName: true, lastName: true } },
          loan: { select: { loanNo: true } },
          collectedBy: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    const officerDetails = await Promise.all(
      byOfficer.map(async o => {
        const officer = await prisma.user.findUnique({
          where: { id: o.collectedById },
          select: { firstName: true, lastName: true },
        });
        return { ...o, officer };
      })
    );

    return { date: targetDate.toISOString().slice(0,10), totals, byMethod, byOfficer: officerDetails, repayments };
  }

  async generateReceiptData(repaymentId: string) {
    const repayment = await this.findById(repaymentId);
    if (!repayment) throw new Error('NOT_FOUND');
    const loanAfter = await prisma.loan.findUnique({
      where: { id: repayment.loanId as string },
      select: { outstandingPrincipal: true, outstandingInterest: true, loanNo: true },
    });
    return { repayment, loanAfter };
  }
}

function round2(n: number) { return Math.round(n * 100) / 100; }