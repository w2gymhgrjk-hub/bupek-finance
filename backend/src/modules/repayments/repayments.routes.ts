import { Router } from 'express';
import { body } from 'express-validator';
import { RepaymentsController } from './repayments.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';

const router = Router();
const ctrl = new RepaymentsController();

const recordValidation = [
  body('loanId').isUUID().withMessage('Loan ID required'),
  body('amountReceived').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('paymentDate').isISO8601().withMessage('Valid payment date required'),
  body('collectionMethod').isIn(['CASH','MOBILE_MONEY','BANK_TRANSFER','CHEQUE']),
  body('referenceNo').optional().trim(),
  body('notes').optional().trim(),
];

router.use(authenticate);

router.get('/', requireRoles(...ROLES.ALL), (req, res) => ctrl.list(req as any, res));
router.get('/daily-summary', requireRoles(...ROLES.ALL), (req, res) => ctrl.dailySummary(req as any, res));
router.get('/:id', requireRoles(...ROLES.ALL), (req, res) => ctrl.getById(req as any, res));
router.get('/:id/receipt', requireRoles(...ROLES.ALL), (req, res) => ctrl.getReceipt(req as any, res));

router.post('/', requireRoles(...ROLES.ALL), recordValidation,
  auditLog({ action: 'RECORD_REPAYMENT', module: 'repayments' }),
  (req, res) => ctrl.record(req as any, res));

router.post('/:id/reverse', requireRoles(...ROLES.MANAGEMENT),
  auditLog({ action: 'REVERSE_REPAYMENT', module: 'repayments' }),
  (req, res) => ctrl.reverse(req as any, res));

export default router;