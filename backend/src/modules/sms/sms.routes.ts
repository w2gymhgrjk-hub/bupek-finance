import { Router } from 'express';
import { body } from 'express-validator';
import { validationResult } from 'express-validator';
import { SmsService } from './sms.service';
import { authenticate } from '../../middleware/auth.middleware';
import { requireRoles, ROLES } from '../../middleware/rbac.middleware';
import { auditLog } from '../../middleware/audit.middleware';
import { apiResponse } from '../../utils/apiResponse';
import { AuthRequest } from '../../middleware/auth.middleware';

const router = Router();
const svc = new SmsService();

router.use(authenticate);

router.get('/templates', requireRoles(...ROLES.MANAGEMENT), async (_req, res) => {
  try { return apiResponse.success(res, await svc.listTemplates()); }
  catch { return apiResponse.serverError(res); }
});

router.post('/templates', requireRoles(...ROLES.MANAGEMENT),
  [body('name').trim().notEmpty(), body('code').trim().notEmpty(), body('messageTemplate').trim().notEmpty(), body('triggerEvent').notEmpty()],
  auditLog({ action: 'CREATE_SMS_TEMPLATE', module: 'sms' }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const t = await svc.createTemplate({ ...req.body, createdById: req.user!.id });
      return apiResponse.created(res, t);
    } catch (err: any) {
      if (err.message === 'CODE_EXISTS') return apiResponse.conflict(res, 'Template code already exists');
      return apiResponse.serverError(res);
    }
  });

router.put('/templates/:id', requireRoles(...ROLES.MANAGEMENT),
  auditLog({ action: 'UPDATE_SMS_TEMPLATE', module: 'sms' }),
  async (req, res) => {
    try { return apiResponse.success(res, await svc.updateTemplate(req.params.id, req.body)); }
    catch { return apiResponse.serverError(res); }
  });

router.post('/send', requireRoles(...ROLES.COLLECTION_STAFF),
  [body('clientId').isUUID(), body('message').trim().notEmpty()],
  auditLog({ action: 'SEND_SMS', module: 'sms' }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const result = await svc.sendSingle({ ...req.body, sentById: req.user!.id });
      return apiResponse.success(res, result);
    } catch (err: any) {
      if (err.message === 'CLIENT_NOT_FOUND') return apiResponse.notFound(res, 'Client');
      return apiResponse.serverError(res);
    }
  });

router.post('/bulk', requireRoles(...ROLES.BRANCH_AND_UP),
  [body('templateId').isUUID()],
  auditLog({ action: 'BULK_SMS', module: 'sms' }),
  async (req: AuthRequest, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const result = await svc.sendBulk({ ...req.body, sentById: req.user!.id });
      return apiResponse.success(res, result);
    } catch (err: any) {
      if (err.message === 'TEMPLATE_NOT_FOUND') return apiResponse.notFound(res, 'Template');
      if (err.message === 'TEMPLATE_INACTIVE') return apiResponse.error(res, 'Template is inactive', 422);
      return apiResponse.serverError(res);
    }
  });

router.get('/logs', requireRoles(...ROLES.BRANCH_AND_UP), async (req, res) => {
  try {
    const result = await svc.getLogs(req.query as any);
    return apiResponse.success(res, result.logs, 200, result.meta);
  } catch { return apiResponse.serverError(res); }
});

// Test SMS connectivity — CEO/OM only
router.post('/test', requireRoles(...ROLES.MANAGEMENT),
  [body('phone').trim().notEmpty().withMessage('Phone number required'),
   body('message').trim().optional()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    const { sendSms } = await import('./sms.gateway');
    const { phone, message = 'BUPEK Finance: SMS connectivity test. System is working correctly.' } = req.body;
    const result = await sendSms(phone, message);
    return apiResponse.success(res, {
      ...result,
      note: result.success
        ? 'SMS delivered successfully'
        : 'SMS failed — check AT_API_KEY and AT_USERNAME in backend/.env',
    });
  });

export default router;