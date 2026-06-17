import { Router } from 'express';
import { ReportsService } from './reports.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { apiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const svc = new ReportsService();

router.use(authenticate);

router.get('/dashboard', requireRoles(...ROLES.ALL), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getDashboard(req.query.branchId as string, req.user!.branchId, req.user!.role);
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/par', requireRoles(...ROLES.ALL), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getPAR(req.query.asOfDate as string, req.query.branchId as string, req.user!.branchId, req.user!.role);
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/daily-collections', requireRoles(...ROLES.ALL), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getDailyCollections({ ...req.query as any, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/loan-officer-performance', requireRoles(...ROLES.BRANCH_AND_UP, 'LOAN_OFFICER'), async (req: AuthRequest, res) => {
  try {
    const officerId = req.user!.role === 'LOAN_OFFICER' ? req.user!.id : req.query.officerId as string;
    const data = await svc.getLoanOfficerPerformance({ ...req.query as any, officerId, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/branch-performance', requireRoles(...ROLES.MANAGEMENT, 'BRANCH_MANAGER', 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getBranchPerformance(req.query as any);
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/profit-summary', requireRoles(...ROLES.MANAGEMENT, 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getProfitSummary({ ...req.query as any, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

router.get('/expense-summary', requireRoles(...ROLES.MANAGEMENT, 'ACCOUNTANT'), async (req: AuthRequest, res) => {
  try {
    const data = await svc.getExpenseSummary({ ...req.query as any, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
    return apiResponse.success(res, data);
  } catch { return apiResponse.serverError(res); }
});

export default router;