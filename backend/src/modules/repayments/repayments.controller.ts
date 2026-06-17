import { Response } from 'express';
import { validationResult } from 'express-validator';
import { RepaymentsService } from './repayments.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { apiResponse } from '../../utils/apiResponse';

const svc = new RepaymentsService();

export class RepaymentsController {
  async list(req: AuthRequest, res: Response) {
    try {
      const result = await svc.list({
        ...req.query as any,
        actorBranchId: req.user!.branchId,
        actorRole: req.user!.role,
      });
      return apiResponse.success(res, result.repayments, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const r = await svc.findById(req.params.id);
      if (!r) return apiResponse.notFound(res, 'Repayment');
      return apiResponse.success(res, r);
    } catch { return apiResponse.serverError(res); }
  }

  async record(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const repayment = await svc.record({
        ...req.body,
        collectedById: req.user!.id,
        branchId: req.body.branchId || req.user!.branchId,
      });
      return apiResponse.created(res, repayment);
    } catch (err: any) {
      const map: Record<string,string> = {
        LOAN_NOT_FOUND: 'Loan not found',
        LOAN_NOT_ACTIVE: 'Loan is not active or overdue',
        INVALID_AMOUNT: 'Amount must be greater than zero',
      };
      if (map[err.message]) return apiResponse.error(res, map[err.message], 422);
      return apiResponse.serverError(res);
    }
  }

  async reverse(req: AuthRequest, res: Response) {
    try {
      const { reversalReason } = req.body;
      if (!reversalReason?.trim()) return apiResponse.error(res, 'Reversal reason required', 400);
      const repayment = await svc.reverse(req.params.id, req.user!.id, reversalReason);
      return apiResponse.success(res, repayment);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Repayment');
      if (err.message === 'ALREADY_REVERSED') return apiResponse.error(res, 'Repayment already reversed', 422);
      return apiResponse.serverError(res);
    }
  }

  async dailySummary(req: AuthRequest, res: Response) {
    try {
      const { date, branchId } = req.query as any;
      const data = await svc.dailySummary(date, branchId, req.user!.branchId, req.user!.role);
      return apiResponse.success(res, data);
    } catch { return apiResponse.serverError(res); }
  }

  async getReceipt(req: AuthRequest, res: Response) {
    try {
      const data = await svc.generateReceiptData(req.params.id);
      return apiResponse.success(res, data);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Repayment');
      return apiResponse.serverError(res);
    }
  }
}