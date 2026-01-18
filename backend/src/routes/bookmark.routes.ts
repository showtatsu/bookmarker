import { Router } from 'express';
import {
    createBookmark,
    deleteBookmark,
    getBookmark,
    listBookmarks,
    toggleFavorite,
    updateBookmark,
} from '../controllers/bookmark.controller.js';
import {
    exportBookmarks,
    importBookmarks,
} from '../controllers/data-transfer.controller.js';
import { authMiddleware } from '../middleware/auth.middleware.js';

const router = Router();

// すべてのルートに認証を要求
router.use(authMiddleware);

// GET /api/bookmarks/export - ブックマークをCSVエクスポート
router.get('/export', exportBookmarks);

// POST /api/bookmarks/import - ブックマークをCSVインポート
router.post('/import', importBookmarks);

// GET /api/bookmarks - ブックマーク一覧取得
router.get('/', listBookmarks);

// GET /api/bookmarks/:id - ブックマーク詳細取得
router.get('/:id', getBookmark);

// POST /api/bookmarks - ブックマーク作成
router.post('/', createBookmark);

// PUT /api/bookmarks/:id - ブックマーク更新
router.put('/:id', updateBookmark);

// DELETE /api/bookmarks/:id - ブックマーク削除
router.delete('/:id', deleteBookmark);

// PUT /api/bookmarks/:id/favorite - お気に入りトグル
router.put('/:id/favorite', toggleFavorite);

export default router;
