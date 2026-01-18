import { z } from 'zod';

/**
 * トークン作成スキーマ
 */
export const createTokenSchema = z.object({
  name: z
    .string()
    .min(1, 'トークン名は必須です')
    .max(100, 'トークン名は100文字以内にしてください')
    .trim(),
  expiresAt: z
    .string()
    .datetime({ message: '有効な日時形式で指定してください' })
    .optional()
    .nullable(),
});

/**
 * トークン一覧取得クエリスキーマ
 */
export const listTokensQuerySchema = z.object({
  sort: z.enum(['name', 'created_at', 'last_used_at', 'expires_at']).optional().default('created_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

export type CreateTokenInput = z.infer<typeof createTokenSchema>;
export type ListTokensQuery = z.infer<typeof listTokensQuerySchema>;
