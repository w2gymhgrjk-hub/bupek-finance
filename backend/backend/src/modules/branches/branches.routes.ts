import { Router } from 'express';
import { BranchesController } from './branches.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { createBranchValidation, updateBranchValidation } from './branches.validation';

const router = Router();
const ctrl = new BranchesController();

router.use(authenticate);

router.get('/', requireRoles(...ROLES.ALL), (req, res) => ctrl.list(req as any, res));
router.get('/compare', requireRoles(...ROLES.MANAGEMENT), (req, res) => ctrl.compare(req as any, res));
router.get('/:id', requireRoles(...ROLES.ALL), (req, res) => ctrl.getById(req as any, res));
router.get('/:id/staff', requireRoles(...ROLES.BRANCH_AND_UP), (req, res) => ctrl.getStaff(req as any, res));
router.get('/:id/performance', requireRoles(...ROLES.BRANCH_AND_UP), (req, res) => ctrl.getPerformance(req as any, res));

router.post('/', requireRoles('CEO_ADMIN'), createBranchValidation,
  auditLog({ action: 'CREATE_BRANCH', module: 'branches' }),
  (req, res) => ctrl.create(req as any, res));

router.put('/:id', requireRoles(...ROLES.BRANCH_AND_UP), updateBranchValidation,
  auditLog({ action: 'UPDATE_BRANCH', module: 'branches' }),
  (req, res) => ctrl.update(req as any, res));

router.delete('/:id', requireRoles('CEO_ADMIN'),
  auditLog({ action: 'DELETE_BRANCH', module: 'branches' }),
  (req, res) => ctrl.delete(req as any, res));

export default router;