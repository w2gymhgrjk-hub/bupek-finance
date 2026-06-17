import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { prisma } from '../../utils/prismaClient';
import { env } from '../../config/env';
import { logger } from '../../utils/logger';

const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_MINUTES = 30;

export class AuthService {
  async login(email: string, password: string, ip: string, userAgent: string) {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: {
        id: true, email: true, firstName: true, lastName: true,
        role: true, branchId: true, status: true,
        passwordHash: true, failedLoginAttempts: true, lockedUntil: true,
      },
    });

    // Audit: failed if no user
    if (!user) {
      await this.recordAudit(null, 'LOGIN_FAILED', 'auth', ip, userAgent, 'FAILURE',
        `Login attempt for unknown email: ${email}`);
      throw new Error('INVALID_CREDENTIALS');
    }

    if (user.status !== 'ACTIVE') throw new Error('ACCOUNT_INACTIVE');

    // Check lockout
    if (user.lockedUntil && new Date() < user.lockedUntil) {
      const minutes = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
      throw new Error(`ACCOUNT_LOCKED:${minutes}`);
    }

    const passwordMatch = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatch) {
      const attempts = user.failedLoginAttempts + 1;
      const lockoutUpdate = attempts >= MAX_LOGIN_ATTEMPTS
        ? { failedLoginAttempts: 0, lockedUntil: new Date(Date.now() + LOCKOUT_MINUTES * 60000) }
        : { failedLoginAttempts: attempts };

      await prisma.user.update({ where: { id: user.id }, data: lockoutUpdate });
      await this.recordAudit(user.id, 'LOGIN_FAILED', 'auth', ip, userAgent, 'FAILURE',
        `Invalid password attempt ${attempts}/${MAX_LOGIN_ATTEMPTS}`);
      throw new Error('INVALID_CREDENTIALS');
    }

    // Reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: { failedLoginAttempts: 0, lockedUntil: null, lastLoginAt: new Date() },
    });

    // Create session
    const refreshToken = crypto.randomBytes(64).toString('hex');
    const refreshTokenHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    const session = await prisma.userSession.create({
      data: { userId: user.id, refreshTokenHash, ipAddress: ip, userAgent, expiresAt },
    });

    const accessToken = jwt.sign(
      { userId: user.id, sessionId: session.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    await this.recordAudit(user.id, 'LOGIN', 'auth', ip, userAgent, 'SUCCESS', 'User logged in');

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        branchId: user.branchId,
      },
    };
  }

  async refreshToken(token: string, ip: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const session = await prisma.userSession.findFirst({
      where: { refreshTokenHash: tokenHash, revokedAt: null, expiresAt: { gt: new Date() } },
      include: { user: { select: { id: true, email: true, role: true, branchId: true, status: true } } },
    });

    if (!session) throw new Error('INVALID_REFRESH_TOKEN');
    if (session.user.status !== 'ACTIVE') throw new Error('ACCOUNT_INACTIVE');

    // Rotate refresh token
    const newRefreshToken = crypto.randomBytes(64).toString('hex');
    const newTokenHash = crypto.createHash('sha256').update(newRefreshToken).digest('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    await prisma.userSession.update({
      where: { id: session.id },
      data: { refreshTokenHash: newTokenHash, expiresAt },
    });

    const accessToken = jwt.sign(
      { userId: session.user.id, sessionId: session.id },
      env.JWT_SECRET,
      { expiresIn: env.JWT_EXPIRES_IN as any }
    );

    return { accessToken, refreshToken: newRefreshToken };
  }

  async logout(sessionId: string, userId: string, ip: string, userAgent: string) {
    await prisma.userSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
    await this.recordAudit(userId, 'LOGOUT', 'auth', ip, userAgent, 'SUCCESS', 'User logged out');
  }

  async forgotPassword(email: string) {
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) return; // Silently succeed to prevent email enumeration

    // Invalidate existing tokens
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
      },
    });

    logger.info(`Password reset token generated for ${email}: ${rawToken}`);
    // In production: send email with reset link containing rawToken
    return rawToken;
  }

  async resetPassword(token: string, newPassword: string) {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const resetToken = await prisma.passwordResetToken.findFirst({
      where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    });
    if (!resetToken) throw new Error('INVALID_RESET_TOKEN');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash, passwordChangedAt: new Date(), failedLoginAttempts: 0, lockedUntil: null },
      }),
      prisma.passwordResetToken.update({ where: { id: resetToken.id }, data: { usedAt: new Date() } }),
      // Revoke all sessions on password reset
      prisma.userSession.updateMany({
        where: { userId: resetToken.userId },
        data: { revokedAt: new Date() },
      }),
    ]);
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new Error('USER_NOT_FOUND');

    const match = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!match) throw new Error('WRONG_CURRENT_PASSWORD');

    const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash, passwordChangedAt: new Date() },
    });
  }

  private async recordAudit(
    userId: string | null, action: string, module: string,
    ip: string, userAgent: string, status: 'SUCCESS' | 'FAILURE', description: string
  ) {
    await prisma.auditLog.create({
      data: { userId, action, module, description, ipAddress: ip, userAgent, status },
    }).catch(e => logger.error('Audit log error', e));
  }
}