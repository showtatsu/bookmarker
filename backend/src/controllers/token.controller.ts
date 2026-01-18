import { Prisma } from '@prisma/client';
import crypto from 'crypto';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  createTokenSchema,
  listTokensQuerySchema,
} from '../schemas/token.schema.js';

/**
 * APIトークンを生成
 * プレフィックス付きで識別しやすくする
 */
function generateApiToken(): string {
  const token = crypto.randomBytes(32).toString('hex');
  return `bkmk_${token}`;
}

/**
 * トークンをハッシュ化
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * トークンをレスポンス形式に変換
 */
function formatTokenResponse(token: {
  id: number;
  name: string;
  lastUsedAt: Date | null;
  createdAt: Date;
  expiresAt: Date | null;
}) {
  return {
    id: token.id,
    name: token.name,
    lastUsedAt: token.lastUsedAt?.toISOString() ?? null,
    createdAt: token.createdAt.toISOString(),
    expiresAt: token.expiresAt?.toISOString() ?? null,
  };
}

/**
 * GET /api/tokens - トークン一覧取得
 */
export async function listTokens(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const queryValidation = listTokensQuerySchema.safeParse(req.query);

    if (!queryValidation.success) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'クエリパラメータが不正です',
          details: queryValidation.error.errors.map((e) => ({
            field: e.path.join('.'),
            message: e.message,
          })),
        },
      });
      return;
    }

    const { sort, order } = queryValidation.data;

    // ソートフィールドのマッピング
    let orderBy: Prisma.ApiTokenOrderByWithRelationInput;
    switch (sort) {
        case 'name':
        orderBy = { name: order } as any;
        break;
      case 'last_used_at':
        orderBy = { lastUsedAt: order } as any;
        break;
      case 'expires_at':
        orderBy = { expiresAt: order } as any;
        break;
      default:
        orderBy = { createdAt: order } as any;
    }

    const tokens = await prisma.apiToken.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
        // tokenHashは含めない（セキュリティ）
      },
      orderBy,
    });

    res.json({
      data: tokens.map(formatTokenResponse),
    });
  } catch (error) {
    console.error('List tokens error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンの取得に失敗しました',
      },
    });
  }
}

/**
 * POST /api/tokens - トークン発行
 */
export async function createToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const validation = createTokenSchema.safeParse(req.body);

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

    const { name, expiresAt } = validation.data;

    // 同名トークンの重複チェック
    const existingToken = await prisma.apiToken.findFirst({
      where: {
        userId,
        name,
      },
    });

    if (existingToken) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: '同じ名前のトークンが既に存在します',
        },
      });
      return;
    }

    // トークン生成とハッシュ化
    const rawToken = generateApiToken();
    const tokenHash = hashToken(rawToken);

    const token = await prisma.apiToken.create({
      data: {
        userId,
        name,
        tokenHash,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
      select: {
        id: true,
        name: true,
        lastUsedAt: true,
        createdAt: true,
        expiresAt: true,
      },
    });

    // 作成時のみ生トークンを返す
    res.status(201).json({
      data: {
        ...formatTokenResponse(token),
        token: rawToken, // この値は一度だけ表示される
      },
    });
  } catch (error) {
    console.error('Create token error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンの作成に失敗しました',
      },
    });
  }
}

/**
 * DELETE /api/tokens/:id - トークン削除
 */
export async function deleteToken(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tokenId = parseInt(String(rawId), 10);

    if (isNaN(tokenId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    const token = await prisma.apiToken.findUnique({
      where: { id: tokenId },
    });

    if (!token) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'トークンが見つかりません',
        },
      });
      return;
    }

    // 所有者チェック
    if (token.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このトークンを削除する権限がありません',
        },
      });
      return;
    }

    await prisma.apiToken.delete({
      where: { id: tokenId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete token error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'トークンの削除に失敗しました',
      },
    });
  }
}
