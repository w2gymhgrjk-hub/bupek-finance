import { Response } from 'express';
import { validationResult } from 'express-validator';
import { ClientStatus } from '@prisma/client';
import { ClientsService } from './clients.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { apiResponse } from '../../utils/apiResponse';
import path from 'path';
import { env } from '../../config/env';

const svc = new ClientsService();

export class ClientsController {
  async list(req: AuthRequest, res: Response) {
    try {
      const { page, limit, status, branchId, loanOfficerId, search } = req.query as any;
      const result = await svc.list({
        page, limit, status, branchId, loanOfficerId, search,
        actorBranchId: req.user!.branchId,
        actorRole: req.user!.role,
      });
      return apiResponse.success(res, result.clients, 200, result.meta);
    } catch { return apiResponse.serverError(res); }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const client = await svc.findById(req.params.id);
      if (!client) return apiResponse.notFound(res, 'Client');
      return apiResponse.success(res, client);
    } catch { return apiResponse.serverError(res); }
  }

  async create(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const client = await svc.create({ ...req.body, createdById: req.user!.id });
      return apiResponse.created(res, client);
    } catch (err: any) {
      if (err.message === 'NATIONAL_ID_EXISTS') return apiResponse.conflict(res, 'National ID already registered');
      return apiResponse.serverError(res);
    }
  }

  async update(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const client = await svc.update(req.params.id, req.body);
      return apiResponse.success(res, client);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Client');
      return apiResponse.serverError(res);
    }
  }

  async updateStatus(req: AuthRequest, res: Response) {
    try {
      const { status } = req.body;
      if (!['ACTIVE','INACTIVE','BLACKLISTED'].includes(status))
        return apiResponse.error(res, 'Invalid status', 400);
      const client = await svc.updateStatus(req.params.id, status as ClientStatus);
      return apiResponse.success(res, client);
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Client');
      return apiResponse.serverError(res);
    }
  }

  async uploadPhoto(req: AuthRequest, res: Response) {
    try {
      if (!req.file) return apiResponse.error(res, 'No photo uploaded', 400);
      const fileUrl = `/uploads/photos/${req.file.filename}`;
      const client = await svc.updatePhoto(req.params.id, fileUrl);
      return apiResponse.success(res, client);
    } catch { return apiResponse.serverError(res); }
  }

  async addDocument(req: AuthRequest, res: Response) {
    try {
      if (!req.file) return apiResponse.error(res, 'No file uploaded', 400);
      const { documentType, documentName } = req.body;
      if (!documentType) return apiResponse.error(res, 'Document type required', 400);
      const doc = await svc.addDocument(req.params.id, {
        documentType,
        documentName: documentName || req.file.originalname,
        fileUrl: `/uploads/documents/${req.file.filename}`,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        uploadedById: req.user!.id,
      });
      return apiResponse.created(res, doc);
    } catch { return apiResponse.serverError(res); }
  }

  async deleteDocument(req: AuthRequest, res: Response) {
    try {
      await svc.deleteDocument(req.params.docId);
      return apiResponse.success(res, { message: 'Document deleted' });
    } catch (err: any) {
      if (err.message === 'NOT_FOUND') return apiResponse.notFound(res, 'Document');
      return apiResponse.serverError(res);
    }
  }

  async addAddress(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const address = await svc.addAddress(req.params.id, req.body);
      return apiResponse.created(res, address);
    } catch { return apiResponse.serverError(res); }
  }

  async updateAddress(req: AuthRequest, res: Response) {
    try {
      const address = await svc.updateAddress(req.params.addrId, req.body);
      return apiResponse.success(res, address);
    } catch { return apiResponse.serverError(res); }
  }

  async addGuarantor(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const g = await svc.addGuarantor(req.params.id, req.body);
      return apiResponse.created(res, g);
    } catch { return apiResponse.serverError(res); }
  }

  async updateGuarantor(req: AuthRequest, res: Response) {
    try {
      const g = await svc.updateGuarantor(req.params.gId, req.body);
      return apiResponse.success(res, g);
    } catch { return apiResponse.serverError(res); }
  }

  async upsertBusiness(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      const biz = await svc.upsertBusiness(req.params.id, req.body);
      return apiResponse.success(res, biz);
    } catch { return apiResponse.serverError(res); }
  }

  async getLoanHistory(req: AuthRequest, res: Response) {
    try {
      const loans = await svc.getLoanHistory(req.params.id);
      return apiResponse.success(res, loans);
    } catch { return apiResponse.serverError(res); }
  }
}