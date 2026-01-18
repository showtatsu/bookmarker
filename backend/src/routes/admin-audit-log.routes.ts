import { Router } from 'express';
import {
    exportAuditLogs,
    listAdminAuditLogs,
} from '../controllers/audit-log.controller.js';
import { adminMiddleware } from '../middleware/admin.middleware.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// すべてのルートに認証と管理者権限を要求
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/audit-logs - 監査ログ検索（全ユーザ対象）
router.get('/', listAdminAuditLogs);

// GET /api/admin/audit-logs/export - 監査ログエクスポート
router.get('/export', exportAuditLogs);

export default router;
