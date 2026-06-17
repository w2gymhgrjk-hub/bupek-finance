import { Response } from 'express';
import { validationResult } from 'express-validator';
import { UserRole, UserStatus } from '@prisma/client';
import { UsersService } from './users.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { apiResponse } from '../../utils/apiResponse';

const svc = new UsersService();

export class UsersController {
  async list(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const { page, limit, role, status, branchId, search } = req.query as any;
      const result = await svc.list({
        page, limit, role, status, branchId, search,
        actorBranchId: req.user!.branchId,
        actorRole: req.user!.role,
      });
      return apiResponse.success(res, result.users, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const user = await svc.findById(req.params.id);
      if (!user) return apiResponse.notFound(res, 'User');
      return apiResponse.success(res, user);
    } catch { return apiResponse.serverError(res); }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const user = await svc.getProfile(req.user!.id);
      return apiResponse.success(res, user);
    } catch { return apiResponse.serverError(res); }
  }

  async create(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const user = await svc.create({ ...req.body, createdById: req.user!.id });
      return apiResponse.created(res, user);
    } catch (err: any) {
      if (err.message === 'EMAIL_EXISTS') return apiResponse.conflict(res, 'Email already exists');
      return apiResponse.serverError(res);
    }
  }

  async update(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const user = await svc.update(req.params.id, req.body);
      return apiResponse.success(res, user);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'User');
      return apiResponse.serverError(res);
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      if (!['ACTIVE', 'INACTIVE', 'SUSPENDED'].includes(status))
        return apiResponse.error(res, 'Invalid status', 400);
      const user = await svc.updateStatus(req.params.id, status as UserStatus);
      return apiResponse.success(res, user);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'User');
      return apiResponse.serverError(res);
    }
  }

  async getActivity(req: AuthRequest, res: Response) {
    try {
      const { page, limit } = req.query as any;
      const result = await svc.getActivity(req.params.id, page, limit);
      return apiResponse.success(res, result.logs, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }
}