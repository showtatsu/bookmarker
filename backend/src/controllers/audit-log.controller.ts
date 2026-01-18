import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import prisma from '../lib/prisma.js';
import type { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import {
  exportAuditLogsQuerySchema,
  listAdminAuditLogsQuerySchema,
  listAuditLogsQuerySchema,
} from '../schemas/audit-log.schema.js';

/**
 * 監査ログをレスポンス形式に変換
 */
function formatAuditLogResponse(log: {
  id: number;
  timestamp: Date;
  userId: number | null;
  action: string;
  resourceType: string | null;
  resourceId: number | null;
  severity: string;
  ipAddress: string | null;
  userAgent: string | null;
  requestId: string | null;
  details: unknown;
  outcome: string;
  user?: { username: string } | null;
}) {
  return {
    id: log.id,
    timestamp: log.timestamp.toISOString(),
    userId: log.userId,
    username: log.user?.username ?? null,
    action: log.action,
    resourceType: log.resourceType,
    resourceId: log.resourceId,
    severity: log.severity,
    ipAddress: log.ipAddress,
    userAgent: log.userAgent,
    requestId: log.requestId,
    details: log.details,
    outcome: log.outcome,
  };
}

/**
 * GET /api/audit-logs - 監査ログ一覧取得（自分のみ）
 */
export async function listAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const queryValidation = listAuditLogsQuerySchema.safeParse(req.query);

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

    const { action, from, to, page, limit } = queryValidation.data;

    // WHERE条件を構築
    const where: Prisma.AuditLogWhereInput = {
      userId,
    };

    if (action) {
      where.action = action;
    }

    if (from || to) {
      where.timestamp = {};
      if (from) {
        where.timestamp.gte = new Date(from);
      }
      if (to) {
        where.timestamp.lte = new Date(to);
      }
    }

    // 総件数を取得
    const total = await prisma.auditLog.count({ where });

    // ログを取得
    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      data: logs.map(formatAuditLogResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List audit logs error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '監査ログの取得に失敗しました',
      },
    });
  }
}

/**
 * GET /api/audit-logs/:id - 監査ログ詳細取得
 */
export async function getAuditLog(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.userId;
    const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const logId = parseInt(String(rawId), 10);

    if (isNaN(logId)) {
      res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'IDが不正です',
        },
      });
      return;
    }

    const log = await prisma.auditLog.findUnique({
      where: { id: logId },
      include: {
        user: {
          select: { username: true },
        },
      },
    });

    if (!log) {
      res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: '監査ログが見つかりません',
        },
      });
      return;
    }

    // 自分のログのみ閲覧可能
    if (log.userId !== userId) {
      res.status(403).json({
        error: {
          code: 'AUTHORIZATION_ERROR',
          message: 'この監査ログにアクセスする権限がありません',
        },
      });
      return;
    }

    res.json({
      data: formatAuditLogResponse(log),
    });
  } catch (error) {
    console.error('Get audit log error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '監査ログの取得に失敗しました',
      },
    });
  }
}

/**
 * GET /api/admin/audit-logs - 監査ログ検索（全ユーザ対象）
 * 管理者のみアクセス可能
 */
export async function listAdminAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const queryValidation = listAdminAuditLogsQuerySchema.safeParse(req.query);

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

    const { userId, action, severity, from, to, page, limit } = queryValidation.data;

    // WHERE条件を構築
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (severity) {
      where.severity = severity;
    }

    if (from || to) {
      where.timestamp = {};
      if (from) {
        where.timestamp.gte = new Date(from);
      }
      if (to) {
        where.timestamp.lte = new Date(to);
      }
    }

    // 総件数を取得
    const total = await prisma.auditLog.count({ where });

    // ログを取得
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { timestamp: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    });

    res.json({
      data: logs.map(formatAuditLogResponse),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('List admin audit logs error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '監査ログの取得に失敗しました',
      },
    });
  }
}

/**
 * GET /api/admin/audit-logs/export - 監査ログエクスポート
 * 管理者のみアクセス可能
 */
export async function exportAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const queryValidation = exportAuditLogsQuerySchema.safeParse(req.query);

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

    const { userId, action, severity, from, to, format } = queryValidation.data;

    // WHERE条件を構築
    const where: Prisma.AuditLogWhereInput = {};

    if (userId) {
      where.userId = userId;
    }

    if (action) {
      where.action = action;
    }

    if (severity) {
      where.severity = severity;
    }

    if (from || to) {
      where.timestamp = {};
      if (from) {
        where.timestamp.gte = new Date(from);
      }
      if (to) {
        where.timestamp.lte = new Date(to);
      }
    }

    // 全ログを取得（エクスポートなのでページネーションなし）
    const logs = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { username: true },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    const formattedLogs = logs.map(formatAuditLogResponse);
    const dateStr = new Date().toISOString().split('T')[0];

    if (format === 'csv') {
      // CSV形式でエクスポート
      const headers = [
        'id',
        'timestamp',
        'userId',
        'username',
        'action',
        'resourceType',
        'resourceId',
        'severity',
        'ipAddress',
        'userAgent',
        'requestId',
        'outcome',
        'details',
      ];

      const csvRows = [headers.join(',')];
      for (const log of formattedLogs) {
        const row = [
          log.id,
          log.timestamp,
          log.userId ?? '',
          log.username ?? '',
          log.action,
          log.resourceType ?? '',
          log.resourceId ?? '',
          log.severity,
          log.ipAddress ?? '',
          `"${(log.userAgent ?? '').replace(/"/g, '""')}"`,
          log.requestId ?? '',
          log.outcome,
          `"${JSON.stringify(log.details ?? {}).replace(/"/g, '""')}"`,
        ];
        csvRows.push(row.join(','));
      }

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${dateStr}.csv"`);
      res.send(csvRows.join('\n'));
    } else {
      // JSON形式でエクスポート
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="audit_logs_${dateStr}.json"`);
      res.json({
        exportedAt: new Date().toISOString(),
        count: formattedLogs.length,
        data: formattedLogs,
      });
    }
  } catch (error) {
    console.error('Export audit logs error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: '監査ログのエクスポートに失敗しました',
      },
    });
  }
}
