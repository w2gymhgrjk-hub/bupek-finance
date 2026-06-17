import { Router } from 'express';
import { UsersController } from './users.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { createUserValidation, updateUserValidation, listUsersValidation } from './users.validation';

const router = Router();
const ctrl = new UsersController();

router.use(authenticate);

router.get('/', requireRoles(...ROLES.BRANCH_AND_UP), listUsersValidation,
  (req, res) => ctrl.list(req as any, res));

router.get('/profile', (req, res) => ctrl.getProfile(req as any, res));

router.get('/:id', requireRoles(...ROLES.BRANCH_AND_UP),
  (req, res) => ctrl.getById(req as any, res));

router.get('/:id/activity', requireRoles(...ROLES.MANAGEMENT),
  (req, res) => ctrl.getActivity(req as any, res));

router.post('/', requireRoles(...ROLES.BRANCH_AND_UP), createUserValidation,
  auditLog({ action: 'CREATE_USER', module: 'users' }),
  (req, res) => ctrl.create(req as any, res));

router.put('/:id', requireRoles(...ROLES.BRANCH_AND_UP), updateUserValidation,
  auditLog({ action: 'UPDATE_USER', module: 'users' }),
  (req, res) => ctrl.update(req as any, res));

router.patch('/:id/status', requireRoles(...ROLES.BRANCH_AND_UP),
  auditLog({ action: 'UPDATE_USER_STATUS', module: 'users' }),
  (req, res) => ctrl.updateStatus(req as any, res));

export default router;