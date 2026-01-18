import { Router } from 'express';
import {
    exportTags,
    importTags,
} from '../controllers/data-transfer.controller.js';
import {
    createTag,
    deleteTag,
    getTag,
    listTags,
    toggleTagFavorite,
    updateTag,
} from '../controllers/tag.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// すべてのルートに認証を要求
router.use(authMiddleware);

// GET /api/tags/export - タグをCSVエクスポート
router.get('/export', exportTags);

// POST /api/tags/import - タグをCSVインポート
router.post('/import', importTags);

// GET /api/tags - タグ一覧取得
router.get('/', listTags);

// GET /api/tags/:id - タグ詳細取得
router.get('/:id', getTag);

// POST /api/tags - タグ作成
router.post('/', createTag);

// PUT /api/tags/:id - タグ更新
router.put('/:id', updateTag);

// PUT /api/tags/:id/favorite - お気に入り切り替え
router.put('/:id/favorite', toggleTagFavorite);

// DELETE /api/tags/:id - タグ削除
router.delete('/:id', deleteTag);

export default router;
