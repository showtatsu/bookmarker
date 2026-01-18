import { z } from 'zod';

/**
 * 監査ログ一覧取得クエリスキーマ（一般ユーザー向け）
 */
export const listAuditLogsQuerySchema = z.object({
  action: z.string().optional(),
  from: z.string().datetime({ message: '有効な日時形式で指定してください' }).optional(),
  to: z.string().datetime({ message: '有効な日時形式で指定してください' }).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * 監査ログ一覧取得クエリスキーマ（管理者向け）
 */
export const listAdminAuditLogsQuerySchema = z.object({
  userId: z.coerce.number().int().optional(),
  action: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  from: z.string().datetime({ message: '有効な日時形式で指定してください' }).optional(),
  to: z.string().datetime({ message: '有効な日時形式で指定してください' }).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(50),
});

/**
 * 監査ログエクスポートクエリスキーマ
 */
export const exportAuditLogsQuerySchema = z.object({
  userId: z.coerce.number().int().optional(),
  action: z.string().optional(),
  severity: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  from: z.string().datetime({ message: '有効な日時形式で指定してください' }).optional(),
  to: z.string().datetime({ message: '有効な日時形式で指定してください' }).optional(),
  format: z.enum(['json', 'csv']).optional().default('json'),
});

export type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;
export type ListAdminAuditLogsQuery = z.infer<typeof listAdminAuditLogsQuerySchema>;
export type ExportAuditLogsQuery = z.infer<typeof exportAuditLogsQuerySchema>;
