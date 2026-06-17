import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { prisma } from '../utils/prismaClient';
import { apiResponse } from '../utils/apiResponse';
import { UserRole } from '@prisma/client';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    branchId: string | null;
    sessionId?: string;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      apiResponse.unauthorized(res, 'No token provided');
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, env.JWT_SECRET) as {
      userId: string;
      sessionId: string;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, email: true, role: true, branchId: true, status: true },
    });

    if (!user) { apiResponse.unauthorized(res, 'User not found'); return; }
    if (user.status !== 'ACTIVE') { apiResponse.unauthorized(res, 'Account is not active'); return; }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      branchId: user.branchId,
      sessionId: decoded.sessionId,
    };
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      apiResponse.unauthorized(res, 'Token expired');
    } else {
      apiResponse.unauthorized(res, 'Invalid token');
    }
  }
};