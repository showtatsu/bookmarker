import { Router } from 'express';
import {
    getAuditLog,
    listAuditLogs,
} from '../controllers/audit-log.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// すべてのルートに認証を要求
router.use(authMiddleware);

// GET /api/audit-logs - 監査ログ一覧取得（自分のみ）
router.get('/', listAuditLogs);

// GET /api/audit-logs/:id - 監査ログ詳細取得
router.get('/:id', getAuditLog);

export default router;
