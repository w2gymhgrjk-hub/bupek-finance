import { Router, Request, Response } from 'express';
import { LoanProductsService } from './loanProducts.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { apiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth.middleware';
import { createProductValidation } from './loanProducts.validation';
import { validationResult } from 'express-validator';

const router = Router();
const svc = new LoanProductsService();

router.use(authenticate);

router.get('/', async (req: Request, res: Response) => {
  const products = await svc.list(req.query.includeInactive === 'true');
  return apiResponse.success(res, products);
});

router.get('/:id', async (req: Request, res: Response) => {
  const p = await svc.findById(req.params.id);
  if (!p) return apiResponse.notFound(res, 'Loan product');
  return apiResponse.success(res, p);
});

router.post('/', requireRoles(...ROLES.MANAGEMENT), createProductValidation,
  auditLog({ action: 'CREATE_LOAN_PRODUCT', module: 'loan_products' }),
  async (req: AuthRequest, res: Response) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const product = await svc.create({ ...req.body, createdById: req.user!.id } as any);
      return apiResponse.created(res, product);
    } catch (err: any) {
      if (err.message === 'CODE_EXISTS') return apiResponse.conflict(res, 'Product code exists');
      return apiResponse.serverError(res);
    }
  });

router.put('/:id', requireRoles(...ROLES.MANAGEMENT),
  auditLog({ action: 'UPDATE_LOAN_PRODUCT', module: 'loan_products' }),
  async (req: Request, res: Response) => {
    try {
      const p = await svc.update(req.params.id, req.body);
      return apiResponse.success(res, p);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Loan product');
      return apiResponse.serverError(res);
    }
  });

router.patch('/:id/status', requireRoles(...ROLES.MANAGEMENT),
  async (req: Request, res: Response) => {
    const { status } = req.body;
    if (!['active','inactive'].includes(status))
      return apiResponse.error(res, 'Status must be active or inactive', 400);
    const p = await svc.updateStatus(req.params.id, status);
    return apiResponse.success(res, p);
  });

export default router;