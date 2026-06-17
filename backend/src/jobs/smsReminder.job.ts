import cron from 'node-cron';
import { prisma } from '../utils/prismaClient';
import { sendSms, interpolateTemplate } from '../modules/sms/sms.gateway';
import { logger } from '../utils/logger';

async function sendReminders(daysOffset: number, trigger: 'DUE_REMINDER' | 'OVERDUE_REMINDER') {
  const template = await prisma.smsTemplate.findFirst({
    where: { triggerEvent: trigger, isActive: true,
      ...(trigger === 'DUE_REMINDER' ? { daysBeforeDue: daysOffset } : { daysAfterDue: daysOffset }) },
  });
  if (!template) return;

  const today = new Date(); today.setHours(0,0,0,0);
  const targetDate = new Date(today);
  if (trigger === 'DUE_REMINDER') {
    targetDate.setDate(targetDate.getDate() + daysOffset);
  } else {
    targetDate.setDate(targetDate.getDate() - daysOffset);
  }
  const nextDay = new Date(targetDate); nextDay.setDate(nextDay.getDate() + 1);

  const schedules = await prisma.loanSchedule.findMany({
    where: {
      dueDate: { gte: targetDate, lt: nextDay },
      status: trigger === 'DUE_REMINDER' ? 'PENDING' : { in: ['OVERDUE', 'PARTIAL'] },
    },
    include: {
      loan: {
        include: { client: { select: { id: true, firstName: true, lastName: true, phonePrimary: true } } },
      },
    },
  });

  let sent = 0, failed = 0;
  for (const schedule of schedules) {
    const loan = schedule.loan;
    const client = loan.client;
    const amountDue = Number(schedule.totalDue) - Number(schedule.totalPaid);
    const daysOverdue = Math.floor((today.getTime() - schedule.dueDate.getTime()) / 86400000);

    const message = interpolateTemplate(template.messageTemplate, {
      client_name: `${client.firstName} ${client.lastName}`,
      loan_no: loan.loanNo,
      amount_due: amountDue.toFixed(2),
      due_date: schedule.dueDate.toISOString().slice(0,10),
      days_overdue: Math.max(0, daysOverdue).toString(),
    });

    const result = await sendSms(client.phonePrimary, message);

    await prisma.smsLog.create({
      data: {
        templateId: template.id, recipientPhone: client.phonePrimary,
        clientId: client.id, loanId: loan.id, message,
        status: result.success ? 'SENT' : 'FAILED',
        sentAt: result.success ? new Date() : null,
        providerMessageId: result.messageId,
        providerResponse: result.response as any,
        provider: 'africastalking',
      },
    });

    if (result.success) sent++; else failed++;
    await new Promise(r => setTimeout(r, 100)); // rate limit
  }
  logger.info(`SMS ${trigger}: sent=${sent}, failed=${failed}`);
}

export function startSmsReminderJob() {
  // Due reminders at 08:00
  cron.schedule('0 8 * * *', async () => {
    logger.info('Running SMS due reminder job...');
    try {
      await sendReminders(1, 'DUE_REMINDER');
      await sendReminders(3, 'DUE_REMINDER');
      await sendReminders(7, 'DUE_REMINDER');
    } catch (err) { logger.error('SMS due reminder job failed:', err); }
  }, { timezone: 'Africa/Dar_es_Salaam' });

  // Overdue reminders at 08:30
  cron.schedule('30 8 * * *', async () => {
    logger.info('Running SMS overdue reminder job...');
    try {
      await sendReminders(1, 'OVERDUE_REMINDER');
      await sendReminders(3, 'OVERDUE_REMINDER');
      await sendReminders(7, 'OVERDUE_REMINDER');
      await sendReminders(14, 'OVERDUE_REMINDER');
      await sendReminders(30, 'OVERDUE_REMINDER');
    } catch (err) { logger.error('SMS overdue reminder job failed:', err); }
  }, { timezone: 'Africa/Dar_es_Salaam' });

  logger.info('SMS reminder jobs scheduled');
}