import { prisma } from '../../utils/prismaClient';
import { sendSms, interpolateTemplate } from './sms.gateway';
import { paginate, paginationMeta } from '../../utils/apiResponse';

export class SmsService {
  async listTemplates() {
    return prisma.smsTemplate.findMany({ orderBy: { name: 'asc' } });
  }

  async createTemplate(data: {
    name: string; code: string; messageTemplate: string;
    triggerEvent: string; daysBeforeDue?: number; daysAfterDue?: number;
    createdById: string;
  }) {
    const existing = await prisma.smsTemplate.findUnique({ where: { code: data.code } });
    if (existing) throw new Error('CODE_EXISTS');
    return prisma.smsTemplate.create({
      data: { ...data as any },
    });
  }

  async updateTemplate(id: string, data: Partial<{
    name: string; messageTemplate: string; isActive: boolean;
    daysBeforeDue: number; daysAfterDue: number;
  }>) {
    return prisma.smsTemplate.update({ where: { id }, data });
  }

  async sendSingle(data: {
    clientId: string; message: string; templateId?: string;
    loanId?: string; sentById: string;
  }) {
    const client = await prisma.client.findUnique({
      where: { id: data.clientId },
      select: { phonePrimary: true, firstName: true, lastName: true },
    });
    if (!client) throw new Error('CLIENT_NOT_FOUND');

    const log = await prisma.smsLog.create({
      data: {
        templateId: data.templateId,
        recipientPhone: client.phonePrimary,
        clientId: data.clientId,
        loanId: data.loanId,
        message: data.message,
        status: 'PENDING',
        sentById: data.sentById,
      },
    });

    const result = await sendSms(client.phonePrimary, data.message);

    await prisma.smsLog.update({
      where: { id: log.id },
      data: {
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : null,
        providerMessageId: result.messageId,
        providerResponse: result.response as any,
        provider: 'africastalking',
      },
    });

    return { ...log, status: result.success ? 'SENT' : 'FAILED', result };
  }

  async sendBulk(data: {
    clientIds?: string[]; loanIds?: string[]; templateId: string;
    branchId?: string; status?: string; sentById: string;
  }) {
    const template = await prisma.smsTemplate.findUnique({ where: { id: data.templateId } });
    if (!template) throw new Error('TEMPLATE_NOT_FOUND');
    if (!template.isActive) throw new Error('TEMPLATE_INACTIVE');

    let clients: Array<{ id: string; phonePrimary: string; firstName: string; lastName: string }> = [];

    if (data.clientIds?.length) {
      clients = await prisma.client.findMany({
        where: { id: { in: data.clientIds }, status: 'ACTIVE' },
        select: { id: true, phonePrimary: true, firstName: true, lastName: true },
      });
    } else if (data.loanIds?.length) {
      const loans = await prisma.loan.findMany({
        where: { id: { in: data.loanIds } },
        include: { client: { select: { id: true, phonePrimary: true, firstName: true, lastName: true } } },
      });
      clients = loans.map(l => l.client);
    } else if (data.branchId) {
      clients = await prisma.client.findMany({
        where: { branchId: data.branchId, status: 'ACTIVE' },
        select: { id: true, phonePrimary: true, firstName: true, lastName: true },
      });
    }

    const results = { sent: 0, failed: 0, total: clients.length };
    for (const client of clients) {
      const message = interpolateTemplate(template.messageTemplate, {
        client_name: `${client.firstName} ${client.lastName}`,
      });
      try {
        await this.sendSingle({ clientId: client.id, message, templateId: template.id, sentById: data.sentById });
        results.sent++;
      } catch { results.failed++; }
      // Rate limiting: 10 SMS per second
      await new Promise(r => setTimeout(r, 100));
    }
    return results;
  }

  async getLogs(params: { page?: number; limit?: number; status?: string; clientId?: string }) {
    const { page = 1, limit = 20, status, clientId } = params;
    const { skip, limit: take } = paginate(page, limit);
    const where: any = {};
    if (status) where.status = status;
    if (clientId) where.clientId = clientId;
    const [total, logs] = await Promise.all([
      prisma.smsLog.count({ where }),
      prisma.smsLog.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: {
          template: { select: { name: true, code: true } },
          client: { select: { clientNo: true, firstName: true, lastName: true } },
        },
      }),
    ]);
    return { logs, meta: paginationMeta(total, page, limit) };
  }

  async sendAutomated(trigger: string, loanId: string) {
    const template = await prisma.smsTemplate.findFirst({
      where: { triggerEvent: trigger as any, isActive: true },
    });
    if (!template) return;

    const loan = await prisma.loan.findUnique({
      where: { id: loanId },
      include: { client: { select: { id: true, firstName: true, lastName: true, phonePrimary: true } } },
    });
    if (!loan) return;

    const vars: Record<string, string> = {
      client_name: `${loan.client.firstName} ${loan.client.lastName}`,
      loan_no: loan.loanNo,
      amount_due: loan.outstandingPrincipal.toString(),
      outstanding: loan.outstandingPrincipal.toString(),
    };

    const message = interpolateTemplate(template.messageTemplate, vars);
    await this.sendSingle({
      clientId: loan.client.id, loanId, message,
      templateId: template.id, sentById: 'system',
    });
  }
}