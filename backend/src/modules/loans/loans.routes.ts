import { Router } from 'express';
import { LoansController } from './loans.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import {
  createLoanValidation, approvalValidation, rejectionValidation,
  disbursementValidation, writeOffValidation, calculateScheduleValidation,
} from './loans.validation';

const router = Router();
const ctrl = new LoansController();

router.use(authenticate);

router.get('/', requireRoles(...ROLES.ALL), (req, res) => ctrl.list(req as any, res));
router.get('/overdue', requireRoles(...ROLES.ALL), (req, res) => ctrl.getOverdue(req as any, res));
router.get('/:id', requireRoles(...ROLES.ALL), (req, res) => ctrl.getById(req as any, res));
router.get('/:id/schedule', requireRoles(...ROLES.ALL), (req, res) => ctrl.getSchedule(req as any, res));

router.post('/calculate-schedule', requireRoles(...ROLES.LOAN_STAFF), calculateScheduleValidation,
  (req, res) => ctrl.previewSchedule(req as any, res));

router.post('/', requireRoles(...ROLES.LOAN_STAFF), createLoanValidation,
  auditLog({ action: 'SUBMIT_LOAN', module: 'loans' }),
  (req, res) => ctrl.create(req as any, res));

router.post('/:id/recommend', requireRoles(...ROLES.LOAN_STAFF), approvalValidation,
  auditLog({ action: 'RECOMMEND_LOAN', module: 'loans' }),
  (req, res) => ctrl.recommend(req as any, res));

router.post('/:id/approve', requireRoles(...ROLES.BRANCH_AND_UP), approvalValidation,
  auditLog({ action: 'APPROVE_LOAN', module: 'loans' }),
  (req, res) => ctrl.approve(req as any, res));

router.post('/:id/reject', requireRoles(...ROLES.BRANCH_AND_UP), rejectionValidation,
  auditLog({ action: 'REJECT_LOAN', module: 'loans' }),
  (req, res) => ctrl.reject(req as any, res));

router.post('/:id/disburse', requireRoles(...ROLES.FINANCE), disbursementValidation,
  auditLog({ action: 'DISBURSE_LOAN', module: 'loans' }),
  (req, res) => ctrl.disburse(req as any, res));

router.post('/:id/write-off', requireRoles('CEO_ADMIN'), writeOffValidation,
  auditLog({ action: 'WRITE_OFF_LOAN', module: 'loans' }),
  (req, res) => ctrl.writeOff(req as any, res));

export default router;