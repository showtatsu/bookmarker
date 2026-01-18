/**
 * データ転送（インポート/エクスポート）コントローラー
 */

import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';

// ==================== ユーティリティ関数 ====================

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);

  return result;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

async function getOrCreateTag(
  userId: number,
  tagName: string,
  createdTags: Set<string>,
  preview: boolean
): Promise<number> {
  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name: tagName } },
  });

  if (existing) {
    return existing.id;
  }

  // プレビューモードの場合は作成せずにダミーIDを返す
  if (preview) {
    createdTags.add(tagName);
    return -1;
  }

  const newTag = await prisma.tag.create({
    data: {
      userId,
      name: tagName,
      isFavorite: false,
    },
  });

  createdTags.add(tagName);
  return newTag.id;
}

// ==================== エクスポート ====================

/**
 * GET /api/bookmarks/export - ブックマークをCSVエクスポート
 */
export async function exportBookmarks(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const bookmarks = await prisma.bookmark.findMany({
      where: { userId },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const header = 'path,title,description,isFavorite,tags,createdAt';
    const rows = bookmarks.map((b) => {
      const tags = b.tags.map((t) => t.tag.name).join(',');
      return [
        escapeCSV(b.path),
        escapeCSV(b.title),
        escapeCSV(b.description),
        b.isFavorite ? 'true' : 'false',
        escapeCSV(tags),
        b.createdAt.toISOString(),
      ].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="bookmarks_${date}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export bookmarks error:', error);
    res.status(500).json({
      error: {
        code: 'EXPORT_ERROR',
        message: 'エクスポート中にエラーが発生しました',
      },
    });
  }
}

/**
 * GET /api/tags/export - タグをCSVエクスポート
 */
export async function exportTags(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;

    const tags = await prisma.tag.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    });

    const header = 'name,isFavorite';
    const rows = tags.map((t) => {
      return [escapeCSV(t.name), t.isFavorite ? 'true' : 'false'].join(',');
    });

    const csv = [header, ...rows].join('\n');
    const date = new Date().toISOString().split('T')[0];

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="tags_${date}.csv"`
    );
    res.send(csv);
  } catch (error) {
    console.error('Export tags error:', error);
    res.status(500).json({
      error: {
        code: 'EXPORT_ERROR',
        message: 'エクスポート中にエラーが発生しました',
      },
    });
  }
}

// ==================== インポート ====================

interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
  tagsCreated: string[];
  preview: {
    toImport: Array<{ path: string; title: string; tags: string[] }>;
    toSkip: Array<{ path: string; title: string; reason: string }>;
    toUpdate: Array<{ path: string; title: string }>;
  };
}

/**
 * POST /api/bookmarks/import - ブックマークをCSVインポート
 */
export async function importBookmarks(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { csv, preview = false, mode = 'skip' } = req.body;

    if (!csv) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSVデータが必要です',
        },
      });
      return;
    }

    const rows = parseCSV(csv);
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [],
      tagsCreated: [],
      preview: {
        toImport: [],
        toSkip: [],
        toUpdate: [],
      },
    };

    const createdTags = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      try {
        if (!row.path || !row.title) {
          result.errors.push(`行 ${lineNum}: path と title は必須です`);
          continue;
        }

        const existing = await prisma.bookmark.findFirst({
          where: { userId, path: row.path },
        });

        const rawTagField = Array.isArray(row.tags) ? row.tags.join(',') : String(row.tags || '');
        const tagNames = rawTagField
          ? rawTagField.split(',').map((t) => t.trim()).filter(Boolean)
          : [];

        if (existing) {
          if (mode === 'skip') {
            result.skipped++;
            result.preview.toSkip.push({
              path: row.path,
              title: row.title,
              reason: '既に存在します',
            });
            continue;
          } else if (mode === 'update') {
            if (!preview) {
              const tagIds: number[] = [];
              for (const tagName of tagNames) {
                const tagId = await getOrCreateTag(
                  userId,
                  tagName,
                  createdTags,
                  false
                );
                tagIds.push(tagId);
              }

              await prisma.bookmarkTag.deleteMany({
                where: { bookmarkId: existing.id },
              });

              await prisma.bookmark.update({
                where: { id: existing.id },
                data: {
                  title: row.title,
                  description: row.description || null,
                  isFavorite: row.isFavorite === 'true',
                  tags: {
                    create: tagIds.map((tagId) => ({ tagId })),
                  },
                },
              });
            }
            result.updated++;
            result.preview.toUpdate.push({
              path: row.path,
              title: row.title,
            });
            continue;
          }
        }

        // 新規作成
        const tagIds: number[] = [];
        for (const tagName of tagNames) {
          const tagId = await getOrCreateTag(userId, tagName, createdTags, preview);
          tagIds.push(tagId);
        }

        if (!preview) {
          await prisma.bookmark.create({
            data: {
              userId,
              path: row.path,
              title: row.title,
              description: row.description || null,
              isFavorite: row.isFavorite === 'true',
              createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
              tags: {
                create: tagIds.filter((id) => id !== -1).map((tagId) => ({ tagId })),
              },
            },
          });
        }

        result.imported++;
        result.preview.toImport.push({
          path: row.path,
          title: row.title,
          tags: tagNames,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`行 ${lineNum}: ${message}`);
      }
    }

    result.tagsCreated = Array.from(createdTags);

    res.json({ data: result });
  } catch (error) {
    console.error('Import bookmarks error:', error);
    res.status(500).json({
      error: {
        code: 'IMPORT_ERROR',
        message: 'インポート中にエラーが発生しました',
      },
    });
  }
}

/**
 * POST /api/tags/import - タグをCSVインポート
 */
export async function importTags(
  req: AuthenticatedRequest,
  res: Response
): Promise<void> {
  try {
    const userId = req.user!.userId;
    const { csv, preview = false, mode = 'skip' } = req.body;

    if (!csv) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'CSVデータが必要です',
        },
      });
      return;
    }

    const rows = parseCSV(csv);
    const result: ImportResult = {
      imported: 0,
      skipped: 0,
      updated: 0,
      errors: [],
      tagsCreated: [],
      preview: {
        toImport: [],
        toSkip: [],
        toUpdate: [],
      },
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const lineNum = i + 2;

      try {
        if (!row.name) {
          result.errors.push(`行 ${lineNum}: name は必須です`);
          continue;
        }

        const existing = await prisma.tag.findUnique({
          where: { userId_name: { userId, name: row.name } },
        });

        if (existing) {
          if (mode === 'skip') {
            result.skipped++;
            result.preview.toSkip.push({
              path: '',
              title: row.name,
              reason: '既に存在します',
            });
            continue;
          } else if (mode === 'update') {
            if (!preview) {
              await prisma.tag.update({
                where: { id: existing.id },
                data: {
                  isFavorite: row.isFavorite === 'true',
                },
              });
            }
            result.updated++;
            result.preview.toUpdate.push({
              path: '',
              title: row.name,
            });
            continue;
          }
        }

        // 新規作成
        if (!preview) {
          await prisma.tag.create({
            data: {
              userId,
              name: row.name,
              isFavorite: row.isFavorite === 'true',
            },
          });
        }

        result.imported++;
        result.preview.toImport.push({
          path: '',
          title: row.name,
          tags: [],
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        result.errors.push(`行 ${lineNum}: ${message}`);
      }
    }

    res.json({ data: result });
  } catch (error) {
    console.error('Import tags error:', error);
    res.status(500).json({
      error: {
        code: 'IMPORT_ERROR',
        message: 'インポート中にエラーが発生しました',
      },
    });
  }
}
