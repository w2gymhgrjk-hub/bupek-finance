import { Prisma, LoanStatus } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';
import { generateLoanNo } from '../../utils/numberGenerator';
import { calculateSchedule, calculateFees } from '../../utils/scheduleCalculator';
import { paginate, paginationMeta } from '../../utils/apiResponse';
import { env } from '../../config/env';

const loanSelect = {
  id: true, loanNo: true, status: true, principal: true, interestRate: true,
  interestType: true, term: true, termUnit: true, repaymentFrequency: true,
  totalInterest: true, totalRepayable: true, processingFee: true, insuranceFee: true,
  outstandingPrincipal: true, outstandingInterest: true, totalPaid: true,
  purpose: true, applicationDate: true, approvalDate: true,
  disbursementDate: true, maturityDate: true, gracePeriodDays: true,
  rejectionReason: true, createdAt: true, updatedAt: true,
  client: { select: { id: true, clientNo: true, firstName: true, lastName: true, phonePrimary: true } },
  loanProduct: { select: { id: true, name: true, productCode: true } },
  branch: { select: { id: true, name: true, branchCode: true } },
  loanOfficer: { select: { id: true, firstName: true, lastName: true } },
  approvedBy: { select: { id: true, firstName: true, lastName: true } },
  disbursedBy: { select: { id: true, firstName: true, lastName: true } },
};

export class LoansService {
  async list(params: {
    page?: number; limit?: number; status?: string; branchId?: string;
    loanOfficerId?: string; clientId?: string; search?: string;
    startDate?: string; endDate?: string;
    actorBranchId?: string | null; actorRole?: string;
  }) {
    const { page = 1, limit = 20, status, branchId, loanOfficerId, clientId,
      search, startDate, endDate, actorBranchId, actorRole } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: Prisma.LoanWhereInput = {};

    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (loanOfficerId) where.loanOfficerId = loanOfficerId;
    if (clientId) where.clientId = clientId;
    if (status) where.status = status as LoanStatus;
    if (startDate || endDate) {
      where.applicationDate = {};
      if (startDate) (where.applicationDate as any).gte = new Date(startDate);
      if (endDate) (where.applicationDate as any).lte = new Date(endDate);
    }
    if (search) {
      where.OR = [
        { loanNo: { contains: search, mode: 'insensitive' } },
        { client: { firstName: { contains: search, mode: 'insensitive' } } },
        { client: { lastName: { contains: search, mode: 'insensitive' } } },
        { client: { clientNo: { contains: search, mode: 'insensitive' } } },
      ];
    }

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({ where, select: loanSelect, skip, take, orderBy: { applicationDate: 'desc' } }),
    ]);
    return { loans, meta: paginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.loan.findUnique({
      where: { id },
      include: {
        ...loanSelect,
        schedules: { orderBy: { installmentNo: 'asc' } },
        workflow: {
          orderBy: { stepNo: 'asc' },
          include: { actor: { select: { firstName: true, lastName: true, role: true } } },
        },
        repayments: {
          where: { isReversed: false },
          orderBy: { paymentDate: 'desc' },
          take: 5,
          select: { id: true, receiptNo: true, amountReceived: true, paymentDate: true, collectionMethod: true },
        },
      },
    });
  }

  async create(data: {
    clientId: string; loanProductId: string; branchId: string; loanOfficerId: string;
    principal: number; interestRate: number; interestType: 'FLAT' | 'REDUCING_BALANCE';
    term: number; termUnit: 'DAYS' | 'WEEKS' | 'MONTHS';
    repaymentFrequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
    gracePeriodDays?: number; purpose?: string; createdById: string;
  }) {
    // Validate client is active
    const client = await prisma.client.findUnique({ where: { id: data.clientId } });
    if (!client) throw new Error('CLIENT_NOT_FOUND');
    if (client.status !== 'ACTIVE') throw new Error('CLIENT_INACTIVE');

    // Get product for fee calculation
    const product = await prisma.loanProduct.findUnique({ where: { id: data.loanProductId } });
    if (!product) throw new Error('PRODUCT_NOT_FOUND');
    if (product.status !== 'active') throw new Error('PRODUCT_INACTIVE');

    const principal = data.principal;
    const processingFee = calculateFees(
      principal, product.processingFeeType, Number(product.processingFeeValue)
    );
    const insuranceFee = calculateFees(
      principal, product.insuranceFeeType, Number(product.insuranceFeeValue)
    );

    const loanNo = generateLoanNo();

    return prisma.$transaction(async (tx) => {
      const loan = await tx.loan.create({
        data: {
          loanNo,
          client:      { connect: { id: data.clientId } },
          loanProduct: { connect: { id: data.loanProductId } },
          branch:      { connect: { id: data.branchId } },
          loanOfficer: data.loanOfficerId ? { connect: { id: data.loanOfficerId } } : undefined,
          principal,
          interestRate: data.interestRate,
          interestType: data.interestType,
          term: data.term,
          termUnit: data.termUnit,
          repaymentFrequency: data.repaymentFrequency,
          gracePeriodDays: data.gracePeriodDays || 0,
          processingFee,
          insuranceFee,
          purpose: data.purpose,
          status: 'PENDING',
          createdById: data.createdById || null,
        },
        select: loanSelect,
      });

      await tx.loanWorkflow.create({
        data: {
          loan:     { connect: { id: loan.id } },
          stepNo:   1,
          action:   'SUBMITTED',
          actor:    { connect: { id: data.createdById } },
          actorRole: 'LOAN_OFFICER',
          notes:    'Loan application submitted',
        },
      });

      return loan;
    });
  }

  async recommend(loanId: string, actorId: string, actorRole: string, notes?: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('NOT_FOUND');
    if (!['PENDING', 'UNDER_REVIEW'].includes(loan.status)) throw new Error('INVALID_STATE');

    const stepNo = await prisma.loanWorkflow.count({ where: { loanId } });
    return prisma.$transaction([
      prisma.loan.update({ where: { id: loanId }, data: { status: 'RECOMMENDED' }, select: loanSelect }),
      prisma.loanWorkflow.create({
        data: { loan: { connect: { id: loanId } }, stepNo: stepNo + 1, action: 'RECOMMENDED', actor: { connect: { id: actorId } }, actorRole, notes },
      }),
    ]);
  }

  async approve(loanId: string, actorId: string, actorRole: string, notes?: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('NOT_FOUND');
    if (!['PENDING', 'UNDER_REVIEW', 'RECOMMENDED'].includes(loan.status)) throw new Error('INVALID_STATE');

    // Large loans require OM or CEO approval
    if (Number(loan.principal) > env.LOAN_APPROVAL_THRESHOLD &&
        !['CEO_ADMIN', 'OPERATIONS_MANAGER'].includes(actorRole)) {
      throw new Error('REQUIRES_HIGHER_APPROVAL');
    }

    const stepNo = await prisma.loanWorkflow.count({ where: { loanId } });
    return prisma.$transaction([
      prisma.loan.update({
        where: { id: loanId },
        data: { status: 'APPROVED', approvalDate: new Date(), approvedById: actorId },
        select: loanSelect,
      }),
      prisma.loanWorkflow.create({
        data: { loan: { connect: { id: loanId } }, stepNo: stepNo + 1, action: 'APPROVED', actor: { connect: { id: actorId } }, actorRole, notes },
      }),
    ]);
  }

  async reject(loanId: string, actorId: string, actorRole: string, rejectionReason: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('NOT_FOUND');
    if (['PAID', 'ACTIVE', 'WRITTEN_OFF'].includes(loan.status)) throw new Error('INVALID_STATE');

    const stepNo = await prisma.loanWorkflow.count({ where: { loanId } });
    return prisma.$transaction([
      prisma.loan.update({
        where: { id: loanId },
        data: { status: 'REJECTED', rejectionReason },
        select: loanSelect,
      }),
      prisma.loanWorkflow.create({
        data: { loan: { connect: { id: loanId } }, stepNo: stepNo + 1, action: 'REJECTED', actor: { connect: { id: actorId } }, actorRole, notes: rejectionReason },
      }),
    ]);
  }

  async disburse(loanId: string, actorId: string, actorRole: string, disbursementDate: string) {
    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { loanProduct: true },
    });
    if (!loan) throw new Error('NOT_FOUND');
    if (loan.status !== 'APPROVED') throw new Error('NOT_APPROVED');

    const disDate = new Date(disbursementDate);
    const schedule = calculateSchedule({
      principal: Number(loan.principal),
      interestRate: Number(loan.interestRate) / 100,
      interestType: loan.interestType,
      term: loan.term,
      termUnit: loan.termUnit,
      repaymentFrequency: loan.repaymentFrequency,
      disbursementDate: disDate,
      gracePeriodDays: loan.gracePeriodDays,
    });

    const totalInterest = schedule.reduce((s, r) => s + r.interestDue, 0);
    const totalRepayable = schedule.reduce((s, r) => s + r.totalDue, 0);
    const maturityDate = schedule[schedule.length - 1].dueDate;
    const stepNo = await prisma.loanWorkflow.count({ where: { loanId } });

    return prisma.$transaction(async (tx) => {
      const updated = await tx.loan.update({
        where: { id: loanId },
        data: {
          status: 'ACTIVE',
          disbursementDate: disDate,
          maturityDate,
          totalInterest,
          totalRepayable,
          outstandingPrincipal: Number(loan.principal),
          outstandingInterest: totalInterest,
          disbursedById: actorId,
        },
        select: loanSelect,
      });

      await tx.loanSchedule.createMany({
        data: schedule.map(row => ({
          loanId,
          installmentNo: row.installmentNo,
          dueDate: row.dueDate,
          openingBalance: row.openingBalance,
          principalDue: row.principalDue,
          interestDue: row.interestDue,
          totalDue: row.totalDue,
          closingBalance: row.closingBalance,
        })),
      });

      await tx.loanWorkflow.create({
        data: { loan: { connect: { id: loanId } }, stepNo: stepNo + 1, action: 'DISBURSED', actor: { connect: { id: actorId } }, actorRole,
          notes: `Disbursed on ${disDate.toISOString().slice(0,10)}` },
      });

      return updated;
    });
  }

  async writeOff(loanId: string, actorId: string, writeOffReason: string) {
    const loan = await prisma.loan.findUnique({ where: { id: loanId } });
    if (!loan) throw new Error('NOT_FOUND');
    if (!['ACTIVE', 'OVERDUE'].includes(loan.status)) throw new Error('INVALID_STATE');

    return prisma.$transaction([
      prisma.loan.update({ where: { id: loanId }, data: { status: 'WRITTEN_OFF' }, select: loanSelect }),
      prisma.writtenOffLoan.create({
        data: {
          loan: { connect: { id: loanId } },
          outstandingPrincipal: loan.outstandingPrincipal,
          outstandingInterest: loan.outstandingInterest,
          totalWrittenOff: Number(loan.outstandingPrincipal) + Number(loan.outstandingInterest),
          writeOffReason,
          approvedById: actorId,
        },
      }),
    ]);
  }

  async getSchedule(loanId: string) {
    return prisma.loanSchedule.findMany({
      where: { loanId },
      orderBy: { installmentNo: 'asc' },
    });
  }

  async getOverdue(params: { page?: number; limit?: number; branchId?: string; actorBranchId?: string | null; actorRole?: string }) {
    const { page = 1, limit = 20, branchId, actorBranchId, actorRole } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: Prisma.LoanWhereInput = { status: 'OVERDUE' };

    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    const [total, loans] = await Promise.all([
      prisma.loan.count({ where }),
      prisma.loan.findMany({
        where, skip, take, orderBy: { maturityDate: 'asc' },
        include: {
          client: { select: { id: true, clientNo: true, firstName: true, lastName: true, phonePrimary: true } },
          branch: { select: { id: true, name: true } },
          loanOfficer: { select: { id: true, firstName: true, lastName: true } },
          schedules: {
            where: { status: { in: ['OVERDUE', 'PARTIAL'] } },
            orderBy: { dueDate: 'asc' },
          },
        },
      }),
    ]);

    const now = new Date();
    const loansWithDaysOverdue = loans.map(loan => {
      const earliestOverdue = loan.schedules.reduce((earliest, s) => {
        const diff = Math.floor((now.getTime() - s.dueDate.getTime()) / 86400000);
        return diff > earliest ? diff : earliest;
      }, 0);
      return { ...loan, daysOverdue: earliestOverdue };
    });

    return { loans: loansWithDaysOverdue, meta: paginationMeta(total, page, limit) };
  }

  async previewSchedule(data: {
    principal: number; interestRate: number; interestType: 'FLAT' | 'REDUCING_BALANCE';
    term: number; termUnit: 'DAYS' | 'WEEKS' | 'MONTHS';
    repaymentFrequency: 'DAILY' | 'WEEKLY' | 'BI_WEEKLY' | 'MONTHLY';
    disbursementDate: string; gracePeriodDays?: number;
  }) {
    const schedule = calculateSchedule({
      ...data,
      interestRate: data.interestRate / 100,
      disbursementDate: new Date(data.disbursementDate),
    });
    const totalInterest = schedule.reduce((s, r) => s + r.interestDue, 0);
    const totalRepayable = schedule.reduce((s, r) => s + r.totalDue, 0);
    return { schedule, totalInterest: Math.round(totalInterest * 100) / 100, totalRepayable: Math.round(totalRepayable * 100) / 100 };
  }
}