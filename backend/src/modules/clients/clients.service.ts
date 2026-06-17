import { Prisma, ClientStatus } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';
import { generateClientNo } from '../../utils/numberGenerator';
import { paginate, paginationMeta } from '../../utils/apiResponse';
import path from 'path';
import fs from 'fs';

const clientSelect = {
  id: true, clientNo: true, firstName: true, lastName: true, otherNames: true,
  dateOfBirth: true, gender: true, nationalId: true, phonePrimary: true,
  phoneSecondary: true, email: true, maritalStatus: true, photoUrl: true,
  status: true, notes: true, createdAt: true, updatedAt: true,
  branch: { select: { id: true, name: true, branchCode: true } },
  loanOfficer: { select: { id: true, firstName: true, lastName: true } },
  addresses: true,
  guarantors: true,
  business: true,
  _count: { select: { loans: true, documents: true } },
};

export class ClientsService {
  async list(params: {
    page?: number; limit?: number; status?: string; branchId?: string;
    loanOfficerId?: string; search?: string;
    actorBranchId?: string | null; actorRole?: string;
  }) {
    const { page = 1, limit = 20, status, branchId, loanOfficerId, search,
      actorBranchId, actorRole } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: Prisma.ClientWhereInput = {};

    const globalRoles = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
    if (actorRole && !globalRoles.includes(actorRole) && actorBranchId) {
      where.branchId = actorBranchId;
    } else if (branchId) {
      where.branchId = branchId;
    }

    if (loanOfficerId) where.loanOfficerId = loanOfficerId;
    if (status) where.status = status as ClientStatus;
    if (search) {
      where.OR = [
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { clientNo: { contains: search, mode: 'insensitive' } },
        { nationalId: { contains: search, mode: 'insensitive' } },
        { phonePrimary: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, clients] = await Promise.all([
      prisma.client.count({ where }),
      prisma.client.findMany({ where, select: clientSelect, skip, take, orderBy: { createdAt: 'desc' } }),
    ]);
    return { clients, meta: paginationMeta(total, page, limit) };
  }

  async findById(id: string) {
    return prisma.client.findUnique({
      where: { id },
      include: {
        branch: { select: { id: true, name: true, branchCode: true } },
        loanOfficer: { select: { id: true, firstName: true, lastName: true } },
        addresses: true,
        guarantors: true,
        business: true,
        documents: {
          orderBy: { uploadedAt: 'desc' },
          select: { id: true, documentType: true, documentName: true, fileUrl: true, mimeType: true, uploadedAt: true },
        },
        loans: {
          orderBy: { applicationDate: 'desc' },
          select: { id: true, loanNo: true, principal: true, status: true, disbursementDate: true,
            maturityDate: true, outstandingPrincipal: true, totalPaid: true },
        },
        _count: { select: { loans: true, documents: true } },
      },
    });
  }

  async create(data: {
    firstName: string; lastName: string; otherNames?: string;
    dateOfBirth?: string; gender?: string; nationalId?: string;
    phonePrimary: string; phoneSecondary?: string; email?: string;
    maritalStatus?: string; branchId: string; loanOfficerId: string;
    notes?: string; createdById: string;
  }) {
    if (data.nationalId) {
      const existing = await prisma.client.findUnique({ where: { nationalId: data.nationalId } });
      if (existing) throw new Error('NATIONAL_ID_EXISTS');
    }

    const clientNo = generateClientNo();
    return prisma.client.create({
      data: {
        clientNo,
        firstName: data.firstName,
        lastName: data.lastName,
        otherNames: data.otherNames,
        dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
        gender: data.gender as any,
        nationalId: data.nationalId || null,
        phonePrimary: data.phonePrimary,
        phoneSecondary: data.phoneSecondary,
        email: data.email,
        maritalStatus: data.maritalStatus as any,
        branchId: data.branchId,
        loanOfficerId: data.loanOfficerId,
        notes: data.notes,
        createdById: data.createdById,
      },
      select: clientSelect,
    });
  }

  async update(id: string, data: Partial<{
    firstName: string; lastName: string; otherNames: string;
    phonePrimary: string; phoneSecondary: string; email: string;
    maritalStatus: string; notes: string; loanOfficerId: string;
  }>) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new Error('NOT_FOUND');
    return prisma.client.update({ where: { id }, data: data as any, select: clientSelect });
  }

  async updateStatus(id: string, status: ClientStatus) {
    const client = await prisma.client.findUnique({ where: { id } });
    if (!client) throw new Error('NOT_FOUND');
    return prisma.client.update({ where: { id }, data: { status }, select: clientSelect });
  }

  async updatePhoto(id: string, photoUrl: string) {
    return prisma.client.update({ where: { id }, data: { photoUrl }, select: { id: true, photoUrl: true } });
  }

  async addDocument(clientId: string, data: {
    documentType: string; documentName?: string; fileUrl: string;
    fileSize?: number; mimeType?: string; uploadedById: string;
  }) {
    return prisma.clientDocument.create({
      data: {
        clientId,
        documentType: data.documentType as any,
        documentName: data.documentName,
        fileUrl: data.fileUrl,
        fileSize: data.fileSize,
        mimeType: data.mimeType,
        uploadedById: data.uploadedById,
      },
    });
  }

  async deleteDocument(documentId: string) {
    const doc = await prisma.clientDocument.findUnique({ where: { id: documentId } });
    if (!doc) throw new Error('NOT_FOUND');
    // Remove file from disk
    const filePath = path.join(process.cwd(), doc.fileUrl.replace(/^\//, ''));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return prisma.clientDocument.delete({ where: { id: documentId } });
  }

  async addAddress(clientId: string, data: {
    addressType: string; streetAddress?: string; city?: string;
    district?: string; region?: string; isPrimary?: boolean;
  }) {
    if (data.isPrimary) {
      await prisma.clientAddress.updateMany({
        where: { clientId }, data: { isPrimary: false },
      });
    }
    return prisma.clientAddress.create({
      data: { clientId, ...data as any },
    });
  }

  async updateAddress(addressId: string, data: Partial<{
    addressType: string; streetAddress: string; city: string;
    district: string; region: string; isPrimary: boolean;
  }>) {
    if (data.isPrimary) {
      const addr = await prisma.clientAddress.findUnique({ where: { id: addressId } });
      if (addr) {
        await prisma.clientAddress.updateMany({
          where: { clientId: addr.clientId }, data: { isPrimary: false },
        });
      }
    }
    return prisma.clientAddress.update({ where: { id: addressId }, data: data as any });
  }

  async addGuarantor(clientId: string, data: {
    firstName: string; lastName: string; phone: string;
    nationalId?: string; relationship?: string; occupation?: string; address?: string;
  }) {
    return prisma.guarantor.create({ data: { clientId, ...data } });
  }

  async updateGuarantor(guarantorId: string, data: Partial<{
    firstName: string; lastName: string; phone: string;
    nationalId: string; relationship: string; occupation: string; address: string;
  }>) {
    return prisma.guarantor.update({ where: { id: guarantorId }, data });
  }

  async upsertBusiness(clientId: string, data: {
    businessName?: string; businessType?: string; registrationNo?: string;
    address?: string; yearsInOperation?: number; monthlyRevenue?: number;
    monthlyExpenses?: number; numberOfEmployees?: number;
  }) {
    return prisma.clientBusiness.upsert({
      where: { clientId },
      create: { clientId, ...data as any },
      update: data as any,
    });
  }

  async getLoanHistory(clientId: string) {
    return prisma.loan.findMany({
      where: { clientId },
      orderBy: { applicationDate: 'desc' },
      include: {
        loanProduct: { select: { name: true } },
        _count: { select: { repayments: true } },
      },
    });
  }
}