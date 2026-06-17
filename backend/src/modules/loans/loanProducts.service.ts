import { Prisma } from '@prisma/client';
import { prisma } from '../../utils/prismaClient';

export class LoanProductsService {
  async list(includeInactive = false) {
    return prisma.loanProduct.findMany({
      where: includeInactive ? {} : { status: 'active' },
      orderBy: { name: 'asc' },
    });
  }

  async findById(id: string) {
    return prisma.loanProduct.findUnique({ where: { id } });
  }

  async create(data: Prisma.LoanProductCreateInput & { createdById?: string }) {
    const { createdById, ...rest } = data;
    let code = (rest as any).productCode;
    if (!code) {
      const count = await prisma.loanProduct.count();
      code = `LP-${String(count + 1).padStart(3, '0')}`;
    }
    const existing = await prisma.loanProduct.findUnique({ where: { productCode: code } });
    if (existing) throw new Error('CODE_EXISTS');

    return prisma.loanProduct.create({
      data: { ...rest as any, productCode: code, createdById },
    });
  }

  async update(id: string, data: Partial<Prisma.LoanProductUpdateInput>) {
    const product = await prisma.loanProduct.findUnique({ where: { id } });
    if (!product) throw new Error('NOT_FOUND');
    return prisma.loanProduct.update({ where: { id }, data });
  }

  async updateStatus(id: string, status: 'active' | 'inactive') {
    return prisma.loanProduct.update({ where: { id }, data: { status } });
  }
}