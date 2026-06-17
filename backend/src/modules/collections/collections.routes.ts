import { Router } from 'express';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { CollectionsService } from './collections.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { apiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const svc = new CollectionsService();

router.use(authenticate);

router.get('/overdue', requireRoles(...ROLES.ALL), async (req: AuthRequest, res) => {
  try {
    const result = await svc.getOverdueList({ ...req.query as any, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
    return apiResponse.success(res, result.loans, 200, result.meta);
  } catch { return apiResponse.serverError(res); }
});

router.get('/arrears-report', requireRoles(...ROLES.ALL), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getBranchArrearsReport(req.query.branchId as string, req.user!.branchId, req.user!.role);
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/:loanId/activities', requireRoles(...ROLES.COLLECTION_STAFF), async (req: AuthRequest, res) => {
  try {
    const { page, limit } = req.query as any;
    const result = await svc.getActivities(req.params.loanId, page, limit);
    return apiResponse.success(res, result.activities, 200, result.meta);
  } catch { return apiResponse.serverError(res); }
});

router.post('/:loanId/activities', requireRoles(...ROLES.COLLECTION_STAFF),
  [
    body('activityType').isIn(['PHONE_CALL','FIELD_VISIT','SMS','EMAIL','LETTER']),
    body('notes').trim().notEmpty().withMessage('Notes required'),
    body('outcome').isIn(['PAID','PROMISED','REFUSED','UNREACHABLE','OTHER']),
    body('promiseToPayDate').optional().isISO8601(),
    body('promiseAmount').optional().isFloat({ min: 0 }),
    body('nextFollowUpDate').optional().isISO8601(),
  ],
  auditLog({ action: 'LOG_COLLECTION_ACTIVITY', module: 'collections' }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      // Get loan to get clientId
      const { prisma } = await import('../../utils/prismaClient');
      const loan = await prisma.loan.findUnique({ where: { id: req.params.loanId }, select: { clientId: true } });
      if (!loan) return apiResponse.notFound(res, 'Loan');
      const activity = await svc.logActivity({ ...req.body, loanId: req.params.loanId, clientId: loan.clientId, officerId: req.user!.id });
      return apiResponse.created(res, activity);
    } catch { return apiResponse.serverError(res); }
  });

export default router;