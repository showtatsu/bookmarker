import bcrypt from 'bcryptjs';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { loginSchema, registerSchema } from '../schemas/auth.schema.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET || 'dev-refresh-secret-key-do-not-use-in-production';
const JWT_EXPIRES_IN = 60 * 60; // 1 hour in seconds
const JWT_REFRESH_EXPIRES_IN = 7 * 24 * 60 * 60; // 7 days in seconds

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
};

function generateTokens(userId: number, username: string) {
  const accessToken = jwt.sign({ userId, username }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  const refreshToken = jwt.sign({ userId, username }, JWT_REFRESH_SECRET, {
    expiresIn: JWT_REFRESH_EXPIRES_IN,
  });

  return { accessToken, refreshToken };
}

// POST /api/auth/register
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const validation = registerSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力内容に誤りがあります',
          details: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }

    const { username, email, password } = validation.data;

    // ユーザー名・メールの重複チェック
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }],
      },
    });

    if (existingUser) {
      const field = existingUser.username === username ? 'username' : 'email';
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: field === 'username' ? 'このユーザー名は既に使用されています' : 'このメールアドレスは既に使用されています',
        },
      });
      return;
    }

    // パスワードハッシュ化
    const passwordHash = await bcrypt.hash(password, 12);

    // ユーザー作成
    const user = await prisma.user.create({
      data: {
        username,
        email,
        passwordHash,
      },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
      },
    });

    res.status(201).json({
      data: user,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー登録に失敗しました',
      },
    });
  }
}

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const validation = loginSchema.safeParse(req.body);

    if (!validation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: '入力内容に誤りがあります',
          details: validation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }

    const { username, password } = validation.data;

    // ユーザー検索
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'ユーザー名またはパスワードが正しくありません',
        },
      });
      return;
    }

    // パスワード検証
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);

    if (!isValidPassword) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'ユーザー名またはパスワードが正しくありません',
        },
      });
      return;
    }

    // トークン生成
    const { accessToken, refreshToken } = generateTokens(user.id, user.username);

    // Cookie に設定
    res.cookie('accessToken', accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 1000, // 1時間
    });

    res.cookie('refreshToken', refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
    });

    res.json({
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ログインに失敗しました',
      },
    });
  }
}

// POST /api/auth/logout
export async function logout(_req: Request, res: Response): Promise<void> {
  res.clearCookie('accessToken', COOKIE_OPTIONS);
  res.clearCookie('refreshToken', COOKIE_OPTIONS);

  res.status(204).send();
}

// POST /api/auth/refresh
export async function refresh(req: Request, res: Response): Promise<void> {
  try {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'リフレッシュトークンがありません',
        },
      });
      return;
    }

    const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as {
      userId: number;
      username: string;
    };

    // ユーザーが存在するか確認
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'ユーザーが見つかりません',
        },
      });
      return;
    }

    // 新しいトークンを生成
    const tokens = generateTokens(user.id, user.username);

    // Cookie に設定
    res.cookie('accessToken', tokens.accessToken, {
      ...COOKIE_OPTIONS,
      maxAge: 60 * 60 * 1000, // 1時間
    });

    res.cookie('refreshToken', tokens.refreshToken, {
      ...COOKIE_OPTIONS,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7日
    });

    res.json({
      data: {
        message: 'トークンを更新しました',
      },
    });
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({
        error: {
          code: 'TOKEN_EXPIRED',
          message: 'リフレッシュトークンの有効期限が切れています。再度ログインしてください',
        },
      });
      return;
    }

    res.status(401).json({
      error: {
        code: 'AUTHENTICATION_ERROR',
        message: '無効なリフレッシュトークンです',
      },
    });
  }
}

// GET /api/auth/me
export async function me(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: '認証が必要です',
        },
      });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        username: true,
        email: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'ユーザーが見つかりません',
        },
      });
      return;
    }

    res.json({
      data: user,
    });
  } catch (error) {
    console.error('Me error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ユーザー情報の取得に失敗しました',
      },
    });
  }
}
