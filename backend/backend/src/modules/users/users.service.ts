import bcrypt from 'bcryptjs';
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';
import { generateUserNo } from '../../utils/numberGenerator';
import { paginate, paginationMeta } from '../../utils/apiResponse';

const SALT_ROUNDS = 12;

const userSelect = {
  id: true, userNo: true, firstName: true, lastName: true, email: true,
  phone: true, role: true, branchId: true, status: true,
  lastLoginAt: true, createdAt: true, updatedAt: true,
  branch: { select: { id: true, name: true, branchCode: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

export class UsersService {
  async list(params: {
    page?: number; limit?: number; role?: UserRole; status?: UserStatus;
    branchId?: string; search?: string; actorBranchId?: string | null;
    actorRole?: UserRole;
  }) {
    const { page = 1, limit = 20, role, status, branchId, search, actorBranchId, actorRole } = params;
    const { skip, limit: take } = paginate(page, limit);

    const where: Prisma.UserWhereInput = {};

    // Branch scoping: non-global roles only see their branch
    const globalRoles: UserRole[] = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (role) where.role = role;
    if (status) where.status = status;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { userNo: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({ where, select: userSelect, skip, take, orderBy: { createdAt: 'desc' } }),
    ]);

    return { users, meta: paginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.user.findUnique({ where: { id }, select: userSelect });
  }

  async create(data: {
    firstName: string; lastName: string; email: string; phone?: string;
    role: UserRole; branchId?: string; password: string; createdById: string;
  }) {
    const existing = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (existing) throw new Error('EMAIL_EXISTS');

    const passwordHash = await bcrypt.hash(data.password, SALT_ROUNDS);
    const userNo = generateUserNo();

    return prisma.user.create({
      data: {
        userNo,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email.toLowerCase(),
        phone: data.phone,
        passwordHash,
        role: data.role,
        branch: data.branchId ? { connect: { id: data.branchId } } : undefined,
        createdBy: data.createdById ? { connect: { id: data.createdById } } : undefined,
      },
      select: userSelect,
    });
  }

  async update(id: string, data: {
    firstName?: string; lastName?: string; phone?: string; branchId?: string;
  }) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('NOT_FOUND');

    return prisma.user.update({
      where: { id },
      data: {
        ...(data.firstName && { firstName: data.firstName }),
        ...(data.lastName && { lastName: data.lastName }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.branchId !== undefined && { branchId: data.branchId || null }),
      },
      select: userSelect,
    });
  }

  async updateStatus(id: string, status: UserStatus) {
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) throw new Error('NOT_FOUND');
    return prisma.user.update({ where: { id }, data: { status }, select: userSelect });
  }

  async getActivity(userId: string, page = 1, limit = 20) {
    const { skip, limit: take } = paginate(page, limit);
    const where = { userId };
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        select: { id: true, action: true, module: true, entityType: true,
          entityId: true, description: true, ipAddress: true, status: true, createdAt: true },
      }),
    ]);
    return { logs, meta: paginationMeta(total, page, limit) };
  }

  async getProfile(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        ...userSelect,
        passwordChangedAt: true,
        lastLoginAt: true,
        failedLoginAttempts: true,
      },
    });
  }
}