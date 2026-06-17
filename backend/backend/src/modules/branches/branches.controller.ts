import { Response } from 'express';
import { validationResult } from 'express-validator';
import { BranchesService } from './branches.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { apiResponse } from '../../utils/apiResponse';

const svc = new BranchesService();

export class BranchesController {
  async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, status, search } = req.query as any;
      const result = await svc.list({ page, limit, status, search });
      return apiResponse.success(res, result.branches, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const branch = await svc.findById(req.params.id);
      if (!branch) return apiResponse.notFound(res, 'Branch');
      return apiResponse.success(res, branch);
    } catch { return apiResponse.serverError(res); }
  }

  async create(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Branch validation errors:', errors.array());
      return apiResponse.error(res, 'Validation failed', 400, errors.array());
    }
    try {
      const branch = await svc.create({ ...req.body, createdById: req.user!.id });
      return apiResponse.created(res, branch);
    } catch (err: any) {
      console.error('Branch create error:', err);
      if (err.message === 'CODE_EXISTS') return apiResponse.conflict(res, 'Branch code already exists');
      return apiResponse.serverError(res);
    }
  }

  async update(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const branch = await svc.update(req.params.id, req.body);
      return apiResponse.success(res, branch);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Branch');
      return apiResponse.serverError(res);
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      await svc.delete(req.params.id);
      return apiResponse.success(res, { message: 'Branch deactivated' });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Branch');
      if (err.message === 'HAS_ACTIVE_LOANS') return apiResponse.error(res, 'Branch has active loans and cannot be deleted', 422);
      if (err.message === 'HAS_ACTIVE_CLIENTS') return apiResponse.error(res, 'Branch has active clients and cannot be deleted', 422);
      return apiResponse.serverError(res);
    }
  }

  async getStaff(req: AuthRequest, res: Response) {
    try {
      const { page, limit } = req.query as any;
      const result = await svc.getStaff(req.params.id, page, limit);
      return apiResponse.success(res, result.staff, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async getPerformance(req: AuthRequest, res: Response) {
    try {
      const { startDate, endDate } = req.query as any;
      const data = await svc.getPerformance(
        req.params.id,
        startDate ? new Date(startDate) : undefined,
        endDate ? new Date(endDate) : undefined,
      );
      return apiResponse.success(res, data);
    } catch { return apiResponse.serverError(res); }
  }

  async compare(req: AuthRequest, res: Response) {
    try {
      const branchIds = req.query.ids ? String(req.query.ids).split(',') : undefined;
      const data = await svc.compare(branchIds);
      return apiResponse.success(res, data);
    } catch { return apiResponse.serverError(res); }
  }
}