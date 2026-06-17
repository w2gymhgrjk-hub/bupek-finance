import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';
import { generateBranchCode } from '../../utils/numberGenerator';
import { paginate, paginationMeta } from '../../utils/apiResponse';

const branchSelect = {
  id: true, branchCode: true, name: true, address: true, phone: true,
  email: true, region: true, district: true, status: true, createdAt: true, updatedAt: true,
  manager: { select: { id: true, firstName: true, lastName: true, email: true } },
  _count: { select: { users: true, clients: true, loans: true } },
};

export class BranchesService {
  async list(params: { page?: number; limit?: number; status?: string; search?: string }) {
    const { page = 1, limit = 20, status, search } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: Prisma.BranchWhereInput = {};
    if (status) where.status = status as any;
    if (search) where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { branchCode: { contains: search, mode: 'insensitive' } },
      { region: { contains: search, mode: 'insensitive' } },
    ];
    const [total, branches] = await Promise.all([
      prisma.branch.count({ where }),
      prisma.branch.findMany({ where, select: branchSelect, skip, take, orderBy: { name: 'asc' } }),
    ]);
    return { branches, meta: paginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.branch.findUnique({ where: { id }, select: branchSelect });
  }

  async create(data: {
    name: string; branchCode?: string; address?: string; phone?: string;
    email?: string; region?: string; district?: string; managerId?: string;
    createdById: string;
  }) {
    const code = data.branchCode || generateBranchCode(data.name);
    const existing = await prisma.branch.findUnique({ where: { branchCode: code } });
    if (existing) throw new Error('CODE_EXISTS');

    return prisma.branch.create({
      data: {
        branchCode: code,
        name: data.name,
        address: data.address,
        phone: data.phone,
        email: data.email,
        region: data.region,
        district: data.district,
        manager: data.managerId ? { connect: { id: data.managerId } } : undefined,
        createdBy: data.createdById ? { connect: { id: data.createdById } } : undefined,
      },
      select: branchSelect,
    });
  }

  async update(id: string, data: {
    name?: string; address?: string; phone?: string; email?: string;
    region?: string; district?: string; managerId?: string | null;
  }) {
    const branch = await prisma.branch.findUnique({ where: { id } });
    if (!branch) throw new Error('NOT_FOUND');
    return prisma.branch.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.email !== undefined && { email: data.email }),
        ...(data.region !== undefined && { region: data.region }),
        ...(data.district !== undefined && { district: data.district }),
        ...(data.managerId !== undefined && { managerId: data.managerId || null }),
      },
      select: branchSelect,
    });
  }

  async delete(id: string) {
    // Check for active loans or clients before delete
    const [activeLoans, activeClients] = await Promise.all([
      prisma.loan.count({ where: { branchId: id, status: { in: ['ACTIVE', 'DISBURSED', 'OVERDUE'] } } }),
      prisma.client.count({ where: { branchId: id, status: 'ACTIVE' } }),
    ]);
    if (activeLoans > 0) throw new Error('HAS_ACTIVE_LOANS');
    if (activeClients > 0) throw new Error('HAS_ACTIVE_CLIENTS');
    return prisma.branch.update({ where: { id }, data: { status: 'INACTIVE' }, select: branchSelect });
  }

  async getStaff(branchId: string, page = 1, limit = 20) {
    const { skip, limit: take } = paginate(page, limit);
    const where = { branchId };
    const [total, staff] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where, skip, take, orderBy: { role: 'asc' },
        select: { id: true, userNo: true, firstName: true, lastName: true, email: true, role: true, status: true },
      }),
    ]);
    return { staff, meta: paginationMeta(total, page, limit) };
  }

  async getPerformance(branchId: string, startDate?: Date, endDate?: Date) {
    const dateFilter = startDate && endDate
      ? { gte: startDate, lte: endDate }
      : undefined;

    const [
      totalClients, activeLoans, totalDisbursed,
      totalCollected, overdueLoans, totalPortfolio,
    ] = await Promise.all([
      prisma.client.count({ where: { branchId } }),
      prisma.loan.count({ where: { branchId, status: 'ACTIVE' } }),
      prisma.loan.aggregate({
        where: { branchId, disbursementDate: dateFilter ? dateFilter : undefined },
        _sum: { principal: true },
      }),
      prisma.repayment.aggregate({
        where: { branchId, isReversed: false, paymentDate: dateFilter ? { gte: startDate, lte: endDate } : undefined },
        _sum: { amountReceived: true },
      }),
      prisma.loan.count({ where: { branchId, status: 'OVERDUE' } }),
      prisma.loan.aggregate({
        where: { branchId, status: { in: ['ACTIVE', 'OVERDUE'] } },
        _sum: { outstandingPrincipal: true },
      }),
    ]);

    return {
      branchId,
      totalClients,
      activeLoans,
      overdueLoans,
      totalDisbursed: totalDisbursed._sum.principal || 0,
      totalCollected: totalCollected._sum.amountReceived || 0,
      totalPortfolio: totalPortfolio._sum.outstandingPrincipal || 0,
    };
  }

  async compare(branchIds?: string[]) {
    const where = branchIds?.length ? { id: { in: branchIds } } : {};
    const branches = await prisma.branch.findMany({
      where,
      select: { id: true, name: true, branchCode: true },
    });

    const metrics = await Promise.all(
      branches.map(b => this.getPerformance(b.id))
    );

    return branches.map((b, i) => ({ ...b, ...metrics[i] }));
  }
}