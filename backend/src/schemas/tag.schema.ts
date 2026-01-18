import { z } from 'zod';

/**
 * タグ作成スキーマ
 */
export const createTagSchema = z.object({
  name: z
    .string()
    .min(1, 'タグ名は必須です')
    .max(50, 'タグ名は50文字以内にしてください')
    .trim(),
  isFavorite: z.boolean().optional().default(false),
});

/**
 * タグ更新スキーマ
 */
export const updateTagSchema = z.object({
  name: z
    .string()
    .min(1, 'タグ名は必須です')
    .max(50, 'タグ名は50文字以内にしてください')
    .trim()
    .optional(),
  isFavorite: z.boolean().optional(),
});

/**
 * タグ一覧取得クエリスキーマ
 */
export const listTagsQuerySchema = z.object({
  search: z.string().optional(),
  favorite: z.coerce.boolean().optional(),
  sort: z
    .enum(['name', 'created_at', 'bookmark_count'])
    .optional()
    .default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type CreateTagInput = z.infer<typeof createTagSchema>;
export type UpdateTagInput = z.infer<typeof updateTagSchema>;
export type ListTagsQuery = z.infer<typeof listTagsQuerySchema>;
