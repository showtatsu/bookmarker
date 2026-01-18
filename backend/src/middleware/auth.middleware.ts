import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';

export interface JwtPayload {
  userId: number;
  username: string;
}

export interface AuthenticatedRequest extends Request {
  user?: JwtPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

export const authMiddleware = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Cookie からトークンを取得
    const token = req.cookies?.accessToken;

    // Cookie がない場合は Authorization ヘッダーを確認
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    const accessToken = token || bearerToken;

    if (!accessToken) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '認証が必要です',
        },
      });
      return;
    }

    const decoded = jwt.verify(accessToken, JWT_SECRET) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'トークンの有効期限が切れています',
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '無効なトークンです',
      },
    });
  }
};
