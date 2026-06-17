import cron from 'node-cron';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

export function startOverdueDetectionJob() {
  // Run daily at 00:01
  cron.schedule('1 0 * * *', async () => {
    logger.info('Running overdue detection job...');
    try {
      const today = new Date(); today.setHours(0,0,0,0);

      // Mark schedules as OVERDUE
      const overdueSchedules = await prisma.loanSchedule.updateMany({
        where: {
          status: { in: ['PENDING', 'PARTIAL'] },
          dueDate: { lt: today },
        },
        data: { status: 'OVERDUE' },
      });

      // Mark loans as OVERDUE if any schedule is overdue
      const loansWithOverdueSchedules = await prisma.loan.findMany({
        where: {
          status: 'ACTIVE',
          schedules: { some: { status: 'OVERDUE' } },
        },
        select: { id: true },
      });

      if (loansWithOverdueSchedules.length > 0) {
        await prisma.loan.updateMany({
          where: { id: { in: loansWithOverdueSchedules.map(l => l.id) } },
          data: { status: 'OVERDUE' },
        });
      }

      // Restore ACTIVE for loans where all overdue schedules are now paid
      const potentiallyFixed = await prisma.loan.findMany({
        where: { status: 'OVERDUE' },
        include: { schedules: { where: { status: 'OVERDUE' } } },
      });

      const toRestore = potentiallyFixed.filter(l => l.schedules.length === 0);
      if (toRestore.length > 0) {
        await prisma.loan.updateMany({
          where: { id: { in: toRestore.map(l => l.id) } },
          data: { status: 'ACTIVE' },
        });
      }

      logger.info(`Overdue detection: ${overdueSchedules.count} schedules marked overdue, ${loansWithOverdueSchedules.length} loans marked overdue`);
    } catch (err) {
      logger.error('Overdue detection job failed:', err);
    }
  }, { timezone: 'Africa/Dar_es_Salaam' });

  logger.info('Overdue detection job scheduled (daily 00:01)');
}