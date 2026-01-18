import { Router } from 'express';
import {
    createToken,
    deleteToken,
    listTokens,
} from '../controllers/token.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// すべてのルートに認証を要求
router.use(authMiddleware);

// GET /api/tokens - トークン一覧取得
router.get('/', listTokens);

// POST /api/tokens - トークン発行
router.post('/', createToken);

// DELETE /api/tokens/:id - トークン削除
router.delete('/:id', deleteToken);

export default router;
