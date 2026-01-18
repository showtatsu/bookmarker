import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from './auth.middleware.js';

/**
 * 管理者ユーザーのユーザー名リスト
 * 環境変数 ADMIN_USERS から読み取る（カンマ区切り）
 */
const ADMIN_USERS = (process.env.ADMIN_USERS || 'admin').split(',').map((u) => u.trim());

/**
 * 管理者権限チェックミドルウェア
 */
export const adminMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '認証が必要です',
      },
    });
    return;
  }

  if (!ADMIN_USERS.includes(req.user.username)) {
    res.status(403).json({
      error: {
        code: 'AUTHORIZATION_ERROR',
        message: '管理者権限が必要です',
      },
    });
    return;
  }

  next();
};
