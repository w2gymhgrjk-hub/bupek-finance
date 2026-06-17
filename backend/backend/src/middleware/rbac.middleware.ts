import { Response, NextFunction } from 'express';
import { UserRole } from '@prisma/client';
import { AuthRequest } from './auth.middleware';
import { apiResponse } from '../utils/apiResponse';

export const requireRoles = (...roles: UserRole[]) =>
  (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) { apiResponse.unauthorized(res); return; }
    if (!roles.includes(req.user.role)) {
      apiResponse.forbidden(res, 'Insufficient permissions for this action');
      return;
    }
    next();
  };

// Scope branch-level resources: CEO/OM see all; others see own branch
export const scopeBranch = (req: AuthRequest, _res: Response, next: NextFunction): void => {
  const globalRoles: UserRole[] = ['CEO_ADMIN', 'OPERATIONS_MANAGER'];
  if (req.user && !globalRoles.includes(req.user.role)) {
    (req as any).branchFilter = { branchId: req.user.branchId };
  } else {
    (req as any).branchFilter = {};
  }
  next();
};

export const ROLES = {
  ALL: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'COLLECTION_OFFICER', 'ACCOUNTANT'] as UserRole[],
  MANAGEMENT: ['CEO_ADMIN', 'OPERATIONS_MANAGER'] as UserRole[],
  BRANCH_AND_UP: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER'] as UserRole[],
  LOAN_STAFF: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER'] as UserRole[],
  COLLECTION_STAFF: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'BRANCH_MANAGER', 'LOAN_OFFICER', 'COLLECTION_OFFICER'] as UserRole[],
  FINANCE: ['CEO_ADMIN', 'OPERATIONS_MANAGER', 'ACCOUNTANT'] as UserRole[],
};