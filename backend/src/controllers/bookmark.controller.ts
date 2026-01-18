import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  createBookmarkSchema,
  getPathType,
  listBookmarksQuerySchema,
  updateBookmarkSchema,
} from '../schemas/bookmark.schema.js';

/**
 * ブックマークをレスポンス形式に変換
 */
function formatBookmarkResponse(
  bookmark: {
    id: number;
    path: string;
    title: string;
    description: string | null;
    isFavorite: boolean;
    createdAt: Date;
    updatedAt: Date;
    tags: { tag: { name: string } }[];
  }
) {
  return {
    id: bookmark.id,
    path: bookmark.path,
    pathType: getPathType(bookmark.path),
    title: bookmark.title,
    description: bookmark.description,
    isFavorite: bookmark.isFavorite,
    tags: bookmark.tags.map((bt) => bt.tag.name),
    createdAt: bookmark.createdAt.toISOString(),
    updatedAt: bookmark.updatedAt.toISOString(),
  };
}

/**
 * GET /api/bookmarks - ブックマーク一覧取得
 */
export async function listBookmarks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const queryValidation = listBookmarksQuerySchema.safeParse(req.query);

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

    const { search, pathType, tags, favorite, page, limit, sort, order } = queryValidation.data;

    // WHERE条件を構築
    const where: Prisma.BookmarkWhereInput = {
      userId,
    };

    // 検索条件
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
        { path: { contains: search } },
      ];
    }

    // お気に入りフィルター
    if (favorite) {
      where.isFavorite = true;
    }

    // タグフィルター
    if (tags) {
      const rawTags = Array.isArray(tags) ? tags.join(',') : String(tags);
      const tagNames = rawTags.split(',').map((t) => t.trim()).filter(Boolean);
      if (tagNames.length > 0) {
        where.tags = {
          some: {
            tag: {
              name: { in: tagNames },
              userId,
            },
          },
        };
      }
    }

    // ソートフィールドのマッピング
    const sortFieldMap: Record<string, string> = {
      created_at: 'createdAt',
      updated_at: 'updatedAt',
      title: 'title',
    };
    const orderBy = { [sortFieldMap[sort]]: order };

    // 総件数取得
    const total = await prisma.bookmark.count({ where });

    // ブックマーク取得
    const bookmarks = await prisma.bookmark.findMany({
      where,
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit,
    });

    // pathType でフィルター（DB検索後）
    let filteredBookmarks = bookmarks;
    if (pathType) {
      filteredBookmarks = bookmarks.filter((b) => getPathType(b.path) === pathType);
    }

    res.json({
      data: filteredBookmarks.map(formatBookmarkResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List bookmarks error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ブックマークの取得に失敗しました',
      },
    });
  }
}

/**
 * GET /api/bookmarks/:id - ブックマーク詳細取得
 */
export async function getBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bookmarkId = parseInt(String(rawId), 10);

    if (isNaN(bookmarkId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    const bookmark = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!bookmark) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'ブックマークが見つかりません',
        },
      });
      return;
    }

    // 所有者チェック
    if (bookmark.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このブックマークにアクセスする権限がありません',
        },
      });
      return;
    }

    res.json({
      data: formatBookmarkResponse(bookmark),
    });
  } catch (error) {
    console.error('Get bookmark error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ブックマークの取得に失敗しました',
      },
    });
  }
}

/**
 * POST /api/bookmarks - ブックマーク作成
 */
export async function createBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const validation = createBookmarkSchema.safeParse(req.body);

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

    const { path, title, description, isFavorite, tags } = validation.data;

    // タグの取得または作成
    const tagRecords = await Promise.all(
      tags.map(async (tagName) => {
        let tag = await prisma.tag.findUnique({
          where: {
            userId_name: {
              userId,
              name: tagName,
            },
          },
        });

        if (!tag) {
          tag = await prisma.tag.create({
            data: {
              userId,
              name: tagName,
            },
          });
        }

        return tag;
      })
    );

    // ブックマーク作成
    const bookmark = await prisma.bookmark.create({
      data: {
        userId,
        path,
        title,
        description: description ?? null,
        isFavorite,
        tags: {
          create: tagRecords.map((tag) => ({
            tagId: tag.id,
          })),
        },
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.status(201).json({
      data: formatBookmarkResponse(bookmark),
    });
  } catch (error) {
    console.error('Create bookmark error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ブックマークの作成に失敗しました',
      },
    });
  }
}

/**
 * PUT /api/bookmarks/:id - ブックマーク更新
 */
export async function updateBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bookmarkId = parseInt(String(rawId), 10);

    if (isNaN(bookmarkId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    const validation = updateBookmarkSchema.safeParse(req.body);

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

    // 既存のブックマーク確認
    const existing = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'ブックマークが見つかりません',
        },
      });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このブックマークを更新する権限がありません',
        },
      });
      return;
    }

    const { path, title, description, isFavorite, tags } = validation.data;

    // タグの更新がある場合
    if (tags !== undefined) {
      // 既存のタグ関連を削除
      await prisma.bookmarkTag.deleteMany({
        where: { bookmarkId },
      });

      // 新しいタグを取得または作成
      const tagRecords = await Promise.all(
        tags.map(async (tagName) => {
          let tag = await prisma.tag.findUnique({
            where: {
              userId_name: {
                userId,
                name: tagName,
              },
            },
          });

          if (!tag) {
            tag = await prisma.tag.create({
              data: {
                userId,
                name: tagName,
              },
            });
          }

          return tag;
        })
      );

      // 新しいタグ関連を作成
      await prisma.bookmarkTag.createMany({
        data: tagRecords.map((tag) => ({
          bookmarkId,
          tagId: tag.id,
        })),
      });
    }

    // ブックマーク更新
    const bookmark = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        ...(path !== undefined && { path }),
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(isFavorite !== undefined && { isFavorite }),
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.json({
      data: formatBookmarkResponse(bookmark),
    });
  } catch (error) {
    console.error('Update bookmark error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ブックマークの更新に失敗しました',
      },
    });
  }
}

/**
 * DELETE /api/bookmarks/:id - ブックマーク削除
 */
export async function deleteBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bookmarkId = parseInt(String(rawId), 10);

    if (isNaN(bookmarkId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    // 既存のブックマーク確認
    const existing = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
    });

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'ブックマークが見つかりません',
        },
      });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このブックマークを削除する権限がありません',
        },
      });
      return;
    }

    await prisma.bookmark.delete({
      where: { id: bookmarkId },
    });

    res.status(204).send();
  } catch (error) {
    console.error('Delete bookmark error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'ブックマークの削除に失敗しました',
      },
    });
  }
}

/**
 * PUT /api/bookmarks/:id/favorite - お気に入りトグル
 */
export async function toggleFavorite(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const bookmarkId = parseInt(String(rawId), 10);

    if (isNaN(bookmarkId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    // 既存のブックマーク確認
    const existing = await prisma.bookmark.findUnique({
      where: { id: bookmarkId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    if (!existing) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'ブックマークが見つかりません',
        },
      });
      return;
    }

    if (existing.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'このブックマークを更新する権限がありません',
        },
      });
      return;
    }

    // お気に入りをトグル
    const bookmark = await prisma.bookmark.update({
      where: { id: bookmarkId },
      data: {
        isFavorite: !existing.isFavorite,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    res.json({
      data: formatBookmarkResponse(bookmark),
    });
  } catch (error) {
    console.error('Toggle favorite error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'お気に入りの更新に失敗しました',
      },
    });
  }
}
