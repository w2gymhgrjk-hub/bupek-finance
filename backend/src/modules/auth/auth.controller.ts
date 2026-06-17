import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import { AuthService } from './auth.service';
import { AuthRequest } from '../../middleware/auth.middleware';
import { apiResponse } from '../../utils/apiResponse';

const svc = new AuthService();

export class AuthController {
  async login(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());

    try {
      const { email, password } = req.body;
      const ip = req.ip || req.socket.remoteAddress || '';
      const ua = req.get('user-agent') || '';
      const result = await svc.login(email, password, ip, ua);
      return apiResponse.success(res, result);
    } catch (err: any) {
      if (err.message === 'INVALID_CREDENTIALS') return apiResponse.error(res, 'Invalid email or password', 401);
      if (err.message === 'ACCOUNT_INACTIVE') return apiResponse.error(res, 'Account is inactive or suspended', 403);
      if (err.message?.startsWith('ACCOUNT_LOCKED')) {
        const minutes = err.message.split(':')[1];
        return apiResponse.error(res, `Account locked. Try again in ${minutes} minutes`, 423);
      }
      return apiResponse.serverError(res);
    }
  }

  async refresh(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) return apiResponse.error(res, 'Refresh token required', 400);
      const ip = req.ip || '';
      const result = await svc.refreshToken(refreshToken, ip);
      return apiResponse.success(res, result);
    } catch {
      return apiResponse.unauthorized(res, 'Invalid or expired refresh token');
    }
  }

  async logout(req: AuthRequest, res: Response) {
    try {
      const sessionId = req.user!.sessionId!;
      const ip = req.ip || '';
      const ua = req.get('user-agent') || '';
      await svc.logout(sessionId, req.user!.id, ip, ua);
      return apiResponse.success(res, { message: 'Logged out successfully' });
    } catch {
      return apiResponse.serverError(res);
    }
  }

  async forgotPassword(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    await svc.forgotPassword(req.body.email);
    return apiResponse.success(res, { message: 'If that email exists, a reset link has been sent' });
  }

  async resetPassword(req: Request, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      await svc.resetPassword(req.body.token, req.body.password);
      return apiResponse.success(res, { message: 'Password reset successfully' });
    } catch {
      return apiResponse.error(res, 'Invalid or expired reset token', 400);
    }
  }

  async changePassword(req: AuthRequest, res: Response) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return apiResponse.error(res, 'Validation failed', 400, errors.array());
    try {
      await svc.changePassword(req.user!.id, req.body.currentPassword, req.body.newPassword);
      return apiResponse.success(res, { message: 'Password changed successfully' });
    } catch (err: any) {
      if (err.message === 'WRONG_CURRENT_PASSWORD') return apiResponse.error(res, 'Current password is incorrect', 400);
      return apiResponse.serverError(res);
    }
  }
}