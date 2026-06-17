import { Response } from 'express';

interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export const apiResponse = {
  success<T>(res: Response, data: T, statusCode = 200, meta?: PaginationMeta) {
    return res.status(statusCode).json({ success: true, data, ...(meta && { meta }) });
  },

  created<T>(res: Response, data: T) {
    return res.status(201).json({ success: true, data });
  },

  error(res: Response, message: string, statusCode = 400, errors?: unknown) {
    return res.status(statusCode).json({ success: false, error: message, ...(errors && { errors }) });
  },

  notFound(res: Response, resource = 'Resource') {
    return res.status(404).json({ success: false, error: `${resource} not found` });
  },

  forbidden(res: Response, message = 'Access denied') {
    return res.status(403).json({ success: false, error: message });
  },

  unauthorized(res: Response, message = 'Unauthorized') {
    return res.status(401).json({ success: false, error: message });
  },

  conflict(res: Response, message: string) {
    return res.status(409).json({ success: false, error: message });
  },

  serverError(res: Response, message = 'Internal server error') {
    return res.status(500).json({ success: false, error: message });
  },
};

export const paginate = (page = 1, limit = 20) => {
  const p = Math.max(1, parseInt(String(page)));
  const l = Math.min(100, Math.max(1, parseInt(String(limit))));
  const skip = (p - 1) * l;
  return { page: p, limit: l, skip };
};

export const paginationMeta = (total: number, page: number, limit: number): PaginationMeta => ({
  page,
  limit,
  total,
  totalPages: Math.ceil(total / limit),
});