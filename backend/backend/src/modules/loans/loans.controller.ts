import { Response } from 'express';
import { validationResult } from 'express-validator';
import { LoansService } from './loans.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { apiResponse } from '../../utils/apiResponse';

const svc = new LoansService();

export class LoansController {
  async list(req: AuthRequest, res: Response) {
    try {
      const result = await svc.list({ ...req.query as any, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
      return apiResponse.success(res, result.loans, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const loan = await svc.findById(req.params.id);
      if (!loan) return apiResponse.notFound(res, 'Loan');
      return apiResponse.success(res, loan);
    } catch { return apiResponse.serverError(res); }
  }

  async create(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const loan = await svc.create({
        ...req.body,
        loanOfficerId: req.body.loanOfficerId || req.user!.id,
        createdById: req.user!.id,
      });
      return apiResponse.created(res, loan);
    } catch (err: any) {
      const map: Record<string, string> = {
        CLIENT_NOT_FOUND: 'Client not found',
        CLIENT_INACTIVE: 'Client is not active',
        PRODUCT_NOT_FOUND: 'Loan product not found',
        PRODUCT_INACTIVE: 'Loan product is not active',
      };
      if (map[err.message]) return apiResponse.error(res, map[err.message], 422);
      console.error('Loan create error:', err);
      return apiResponse.serverError(res);
    }
  }

  async recommend(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const [loan] = await svc.recommend(req.params.id, req.user!.id, req.user!.role, req.body.notes);
      return apiResponse.success(res, loan);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Loan');
      if (err.message === 'INVALID_STATE') return apiResponse.error(res, 'Loan cannot be recommended in its current state', 422);
      return apiResponse.serverError(res);
    }
  }

  async approve(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const [loan] = await svc.approve(req.params.id, req.user!.id, req.user!.role, req.body.notes);
      return apiResponse.success(res, loan);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Loan');
      if (err.message === 'INVALID_STATE') return apiResponse.error(res, 'Loan is not in a state that can be approved', 422);
      if (err.message === 'REQUIRES_HIGHER_APPROVAL') return apiResponse.error(res, 'This loan amount requires Operations Manager or CEO approval', 403);
      return apiResponse.serverError(res);
    }
  }

  async reject(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const [loan] = await svc.reject(req.params.id, req.user!.id, req.user!.role, req.body.rejectionReason);
      return apiResponse.success(res, loan);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Loan');
      if (err.message === 'INVALID_STATE') return apiResponse.error(res, 'Loan cannot be rejected in its current state', 422);
      return apiResponse.serverError(res);
    }
  }

  async disburse(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const loan = await svc.disburse(req.params.id, req.user!.id, req.user!.role, req.body.disbursementDate);
      return apiResponse.success(res, loan);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Loan');
      if (err.message === 'NOT_APPROVED') return apiResponse.error(res, 'Only approved loans can be disbursed', 422);
      return apiResponse.serverError(res);
    }
  }

  async writeOff(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const [loan] = await svc.writeOff(req.params.id, req.user!.id, req.body.writeOffReason);
      return apiResponse.success(res, loan);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Loan');
      if (err.message === 'INVALID_STATE') return apiResponse.error(res, 'Only active or overdue loans can be written off', 422);
      return apiResponse.serverError(res);
    }
  }

  async getSchedule(req: AuthRequest, res: Response) {
    try {
      const schedule = await svc.getSchedule(req.params.id);
      return apiResponse.success(res, schedule);
    } catch { return apiResponse.serverError(res); }
  }

  async getOverdue(req: AuthRequest, res: Response) {
    try {
      const result = await svc.getOverdue({ ...req.query as any, actorBranchId: req.user!.branchId, actorRole: req.user!.role });
      return apiResponse.success(res, result.loans, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async previewSchedule(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const result = await svc.previewSchedule(req.body);
      return apiResponse.success(res, result);
    } catch { return apiResponse.serverError(res); }
  }
}