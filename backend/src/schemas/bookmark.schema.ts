import { z } from 'zod';

/**
 * パス形式のバリデーション
 * ADR-0014に基づき、URL、ファイルパス、UNCパスなど多様な形式をサポート
 */
function isValidPath(path: string): boolean {
  // URL (http, https, ftp, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return true;

  // Windows UNC paths
  // Standard UNC: \\server\share (minimum: \\s\s)
  if (/^\\\\[^\\?]+\\[^\\]+/.test(path)) return true;
  // Long UNC: \\?\UNC\server\share
  if (/^\\\\\?\\UNC\\[^\\]+\\[^\\]+/i.test(path)) return true;
  // Device path: \\.\ (e.g., \\.\PhysicalDrive0)
  if (/^\\\\\.\\/.test(path)) return true;
  // Long path: \\?\C:\ (for paths > 260 chars)
  if (/^\\\\\?\\[A-Za-z]:\\/.test(path)) return true;

  // Windows drive letter (C:\, D:/, etc.)
  if (/^[A-Za-z]:[\\\/]/.test(path)) return true;

  // Unix absolute path
  if (path.startsWith('/')) return true;

  // Home directory
  if (path.startsWith('~')) return true;

  return false;
}

/**
 * パス種別の自動判定
 */
export type PathType = 'url' | 'file' | 'network';

export function getPathType(path: string): PathType {
  // URL schemes
  if (/^https?:\/\//i.test(path)) return 'url';
  if (/^(ftp|ftps|ssh|sftp|smb|dav|davs|nfs):\/\//i.test(path)) return 'network';

  // file:// URI - check if it's a network path (file://server/share)
  if (/^file:\/\/[^/]/i.test(path)) return 'network'; // file://server/share
  if (/^file:\/\//i.test(path)) return 'file'; // file:///C:/path

  // Windows UNC paths (various forms)
  // Standard UNC: \\server\share
  if (/^\\\\[^?\\.]/.test(path)) return 'network';
  // Long UNC: \\?\UNC\server\share
  if (/^\\\\\?\\UNC\\/i.test(path)) return 'network';
  // Device path: \\.\
  if (/^\\\\\.\\/.test(path)) return 'file';
  // Long path: \\?\C:\
  if (/^\\\\\?\\[A-Za-z]:/.test(path)) return 'file';

  // Windows drive letter (C:\, D:\, C:/)
  if (/^[A-Za-z]:[\\\/]/.test(path)) return 'file';

  // Unix absolute path or home directory
  if (/^[\/~]/.test(path)) return 'file';

  // Custom protocol (vscode://, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return 'url';

  // Default to file
  return 'file';
}

/**
 * ブックマーク作成スキーマ
 */
export const createBookmarkSchema = z.object({
  path: z
    .string()
    .min(1, 'パスは必須です')
    .max(2000, 'パスは2000文字以内にしてください')
    .refine(isValidPath, 'パスの形式が正しくありません'),
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(200, 'タイトルは200文字以内にしてください'),
  description: z
    .string()
    .max(1000, '説明は1000文字以内にしてください')
    .optional()
    .nullable(),
  isFavorite: z.boolean().default(false),
  tags: z.array(z.string().min(1).max(50)).default([]),
});

/**
 * ブックマーク更新スキーマ
 */
export const updateBookmarkSchema = z.object({
  path: z
    .string()
    .min(1, 'パスは必須です')
    .max(2000, 'パスは2000文字以内にしてください')
    .refine(isValidPath, 'パスの形式が正しくありません')
    .optional(),
  title: z
    .string()
    .min(1, 'タイトルは必須です')
    .max(200, 'タイトルは200文字以内にしてください')
    .optional(),
  description: z
    .string()
    .max(1000, '説明は1000文字以内にしてください')
    .optional()
    .nullable(),
  isFavorite: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(50)).optional(),
});

/**
 * ブックマーク一覧取得クエリスキーマ
 */
export const listBookmarksQuerySchema = z.object({
  search: z.string().optional(),
  pathType: z.enum(['url', 'file', 'network']).optional(),
  tags: z.string().optional(), // カンマ区切り
  favorite: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
  page: z
    .string()
    .optional()
    .default('1')
    .transform((val) => Math.max(1, parseInt(val, 10) || 1)),
  limit: z
    .string()
    .optional()
    .default('20')
    .transform((val) => Math.min(100, Math.max(1, parseInt(val, 10) || 20))),
  sort: z.enum(['created_at', 'updated_at', 'title']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateBookmarkInput = z.infer<typeof createBookmarkSchema>;
export type UpdateBookmarkInput = z.infer<typeof updateBookmarkSchema>;
export type ListBookmarksQuery = z.infer<typeof listBookmarksQuerySchema>;
