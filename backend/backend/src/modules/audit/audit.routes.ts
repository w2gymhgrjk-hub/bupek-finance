import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles } from '../../middleware/rbac.middleware';
import { prisma } from '../../utils/prismaClient';
import { apiResponse, paginate, paginationMeta } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
router.use(authenticate);

// Full audit trail — CEO only
router.get('/', requireRoles('CEO_ADMIN'), async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20, userId, action, module, startDate, endDate } = req.query as any;
    const { skip, limit: take } = paginate(page, limit);
    const where: any = {};
    if (userId) where.userId = userId;
    if (action) where.action = { contains: action, mode: 'insensitive' };
    if (module) where.module = module;
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) where.createdAt.lte = new Date(endDate);
    }
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({
        where, skip, take, orderBy: { createdAt: 'desc' },
        include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
      }),
    ]);
    return apiResponse.success(res, logs, 200, paginationMeta(total, Number(page), Number(limit)));
  } catch { return apiResponse.serverError(res); }
});

// Own audit entries — all authenticated users
router.get('/me', async (req: AuthRequest, res) => {
  try {
    const { page = 1, limit = 20 } = req.query as any;
    const { skip, limit: take } = paginate(page, limit);
    const where = { userId: req.user!.id };
    const [total, logs] = await Promise.all([
      prisma.auditLog.count({ where }),
      prisma.auditLog.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
    ]);
    return apiResponse.success(res, logs, 200, paginationMeta(total, Number(page), Number(limit)));
  } catch { return apiResponse.serverError(res); }
});

export default router;