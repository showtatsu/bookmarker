import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  createTagSchema,
  listTagsQuerySchema,
  updateTagSchema,
} from '../schemas/tag.schema.js';

/**
 * タグをレスポンス形式に変換
 */
function formatTagResponse(tag: {
  id: number;
  name: string;
  isFavorite: boolean;
  createdAt: Date;
  _count?: { bookmarks: number };
}) {
  return {
    id: tag.id,
    name: tag.name,
    isFavorite: tag.isFavorite,
    bookmarkCount: tag._count?.bookmarks ?? 0,
    createdAt: tag.createdAt.toISOString(),
  };
}

/**
 * GET /api/tags - タグ一覧取得
 */
export async function listTags(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const queryValidation = listTagsQuerySchema.safeParse(req.query);

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

    const { search, favorite, sort, order } = queryValidation.data;

    // WHERE条件を構築
    const where: Prisma.TagWhereInput = {
      userId,
    };

    // 検索条件
    if (search) {
      where.name = { contains: search };
    }

    // お気に入りフィルター
    if (favorite !== undefined) {
      where.isFavorite = favorite;
    }

    // ソートフィールドのマッピング
    let orderBy: Prisma.TagOrderByWithRelationInput;
    if (sort === 'bookmark_count') {
      orderBy = { bookmarks: { _count: order } } as any;
    } else if (sort === 'created_at') {
      orderBy = { createdAt: order } as any;
    } else {
      orderBy = { name: order } as any;
    }

    // タグ取得
    const tags = await prisma.tag.findMany({
      where,
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
      orderBy,
    });

    res.json({
      data: tags.map(formatTagResponse),
    });
  } catch (error) {
    console.error('List tags error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'タグの取得に失敗しました',
      },
    });
  }
}

/**
 * GET /api/tags/:id - タグ詳細取得
 */
export async function getTag(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tagId = parseInt(String(rawId), 10);

    if (isNaN(tagId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    const tag = await prisma.tag.findUnique({
      where: { id: tagId },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    if (!tag) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'タグが見つかりません',
        },
      });
      return;
    }

    // 所有者チェック
    if (tag.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このタグにアクセスする権限がありません',
        },
      });
      return;
    }

    res.json({
      data: formatTagResponse(tag),
    });
  } catch (error) {
    console.error('Get tag error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'タグの取得に失敗しました',
      },
    });
  }
}

/**
 * POST /api/tags - タグ作成
 */
export async function createTag(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const validation = createTagSchema.safeParse(req.body);

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

    const { name } = validation.data;

    // 重複チェック
    const existing = await prisma.tag.findUnique({
      where: {
        userId_name: {
          userId,
          name,
        },
      },
    });

    if (existing) {
      res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'このタグ名は既に使用されています',
        },
      });
      return;
    }

    // タグ作成
    const tag = await prisma.tag.create({
      data: {
        userId,
        name,
        isFavorite: validation.data.isFavorite,
      },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    res.status(201).json({
      data: formatTagResponse(tag),
    });
  } catch (error) {
    console.error('Create tag error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'タグの作成に失敗しました',
      },
    });
  }
}

/**
 * PUT /api/tags/:id - タグ更新
 */
export async function updateTag(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tagId = parseInt(String(rawId), 10);

    if (isNaN(tagId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    const validation = updateTagSchema.safeParse(req.body);

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

    // 既存のタグ確認
    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'タグが見つかりません',
        },
      });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このタグを更新する権限がありません',
        },
      });
      return;
    }

    const validatedData = validation.data;

    // 新しい名前の重複チェック（名前が変更される場合のみ）
    if (validatedData.name && validatedData.name !== existing.name) {
      const duplicate = await prisma.tag.findUnique({
        where: {
          userId_name: {
            userId,
            name: validatedData.name,
          },
        },
      });

      if (duplicate) {
        res.status(409).json({
          error: {
            code: 'CONFLICT',
            message: 'このタグ名は既に使用されています',
          },
        });
        return;
      }
    }

    // 更新データを構築
    const updateData: { name?: string; isFavorite?: boolean } = {};
    if (validatedData.name !== undefined) {
      updateData.name = validatedData.name;
    }
    if (validatedData.isFavorite !== undefined) {
      updateData.isFavorite = validatedData.isFavorite;
    }

    // タグ更新
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: updateData,
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    res.json({
      data: formatTagResponse(tag),
    });
  } catch (error) {
    console.error('Update tag error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'タグの更新に失敗しました',
      },
    });
  }
}

/**
 * DELETE /api/tags/:id - タグ削除
 */
export async function deleteTag(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tagId = parseInt(String(rawId), 10);

    if (isNaN(tagId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    // 既存のタグ確認
    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'タグが見つかりません',
        },
      });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このタグを削除する権限がありません',
        },
      });
      return;
    }

    await prisma.tag.delete({
      where: { id: tagId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete tag error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'タグの削除に失敗しました',
      },
    });
  }
}

/**
 * PUT /api/tags/:id/favorite - タグのお気に入り切り替え
 */
export async function toggleTagFavorite(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const tagId = parseInt(String(rawId), 10);

    if (isNaN(tagId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    // 既存のタグ確認
    const existing = await prisma.tag.findUnique({
      where: { id: tagId },
    });

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'タグが見つかりません',
        },
      });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このタグを更新する権限がありません',
        },
      });
      return;
    }

    // お気に入り状態を切り替え
    const tag = await prisma.tag.update({
      where: { id: tagId },
      data: { isFavorite: !existing.isFavorite },
      include: {
        _count: {
          select: { bookmarks: true },
        },
      },
    });

    res.json({
      data: formatTagResponse(tag),
    });
  } catch (error) {
    console.error('Toggle tag favorite error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'お気に入りの切り替えに失敗しました',
      },
    });
  }
}
