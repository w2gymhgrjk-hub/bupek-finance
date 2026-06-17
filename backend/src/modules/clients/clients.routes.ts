import { Router } from 'express';
import { ClientsController } from './clients.controller';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { uploadDocument, uploadPhoto } from '../../middleware/upload.middleware';
import {
  createClientValidation, updateClientValidation,
  addAddressValidation, addGuarantorValidation, businessValidation,
} from './clients.validation';

const router = Router();
const ctrl = new ClientsController();

router.use(authenticate);

router.get('/', requireRoles(...ROLES.ALL), (req, res) => ctrl.list(req as any, res));
router.get('/:id', requireRoles(...ROLES.ALL), (req, res) => ctrl.getById(req as any, res));
router.get('/:id/loans', requireRoles(...ROLES.ALL), (req, res) => ctrl.getLoanHistory(req as any, res));

router.post('/', requireRoles(...ROLES.LOAN_STAFF), createClientValidation,
  auditLog({ action: 'CREATE_CLIENT', module: 'clients' }),
  (req, res) => ctrl.create(req as any, res));

router.put('/:id', requireRoles(...ROLES.LOAN_STAFF), updateClientValidation,
  auditLog({ action: 'UPDATE_CLIENT', module: 'clients' }),
  (req, res) => ctrl.update(req as any, res));

router.patch('/:id/status', requireRoles(...ROLES.MANAGEMENT),
  auditLog({ action: 'UPDATE_CLIENT_STATUS', module: 'clients' }),
  (req, res) => ctrl.updateStatus(req as any, res));

router.post('/:id/photo', requireRoles(...ROLES.LOAN_STAFF),
  (req, res, next) => uploadPhoto(req, res, next),
  (req, res) => ctrl.uploadPhoto(req as any, res));

router.post('/:id/documents', requireRoles(...ROLES.LOAN_STAFF),
  (req, res, next) => uploadDocument(req, res, next),
  auditLog({ action: 'UPLOAD_DOCUMENT', module: 'clients' }),
  (req, res) => ctrl.addDocument(req as any, res));

router.delete('/:id/documents/:docId', requireRoles(...ROLES.MANAGEMENT),
  auditLog({ action: 'DELETE_DOCUMENT', module: 'clients' }),
  (req, res) => ctrl.deleteDocument(req as any, res));

router.post('/:id/addresses', requireRoles(...ROLES.LOAN_STAFF), addAddressValidation,
  (req, res) => ctrl.addAddress(req as any, res));

router.put('/:id/addresses/:addrId', requireRoles(...ROLES.LOAN_STAFF),
  (req, res) => ctrl.updateAddress(req as any, res));

router.post('/:id/guarantors', requireRoles(...ROLES.LOAN_STAFF), addGuarantorValidation,
  (req, res) => ctrl.addGuarantor(req as any, res));

router.put('/:id/guarantors/:gId', requireRoles(...ROLES.LOAN_STAFF),
  (req, res) => ctrl.updateGuarantor(req as any, res));

router.put('/:id/business', requireRoles(...ROLES.LOAN_STAFF), businessValidation,
  (req, res) => ctrl.upsertBusiness(req as any, res));

export default router;