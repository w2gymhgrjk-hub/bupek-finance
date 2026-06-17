import { Response, NextFunction } from 'express';
import { AuthRequest } from './auth.middleware';
import { prisma } from '../utils/prismaClient';
import { logger } from '../utils/logger';

interface AuditOptions {
  action: string;
  module: string;
  getEntityId?: (req: AuthRequest) => string | undefined;
}

export const auditLog = (options: AuditOptions) =>
  async (req: AuthRequest, res: Response, next: NextFunction): Promise<void> => {
    const originalJson = res.json.bind(res);
    res.json = function (body: unknown) {
      const statusCode = res.statusCode;
      const isSuccess = statusCode >= 200 && statusCode < 300;

      prisma.auditLog.create({
        data: {
          userId: req.user?.id,
          sessionId: req.user?.sessionId,
          action: options.action,
          module: options.module,
          entityType: options.getEntityId ? options.module.toLowerCase() : undefined,
          entityId: options.getEntityId ? options.getEntityId(req) : req.params?.id,
          description: `${options.action} by ${req.user?.email || 'unknown'} from ${req.ip}`,
          newValues: req.method !== 'GET' ? (req.body as any) : undefined,
          ipAddress: req.ip || req.socket.remoteAddress,
          userAgent: req.get('user-agent'),
          status: isSuccess ? 'SUCCESS' : 'FAILURE',
        },
      }).catch((e: unknown) => logger.error('Audit log failed', e));

      return originalJson(body);
    };
    next();
  };