import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import bookmarkRoutes from '../../src/routes/bookmark.routes.js';
import type { TestUser } from '../helpers.js';
import { createTestBookmark, createTestUser } from '../helpers.js';

// テスト用Expressアプリを作成
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/bookmarks', bookmarkRoutes);
  return app;
}

describe('Bookmark API', () => {
  let app: express.Express;
  let testUser: TestUser;

  beforeEach(async () => {
    app = createApp();
    testUser = await createTestUser();
  });

  describe('GET /api/bookmarks', () => {
    it('should return empty list when no bookmarks exist', async () => {
      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
      expect(response.body.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      });
    });

    it('should return bookmarks for authenticated user', async () => {
      await createTestBookmark(testUser.id, {
        path: 'https://example.com',
        title: 'Example',
      });

      const response = await request(app)
        .get('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].path).toBe('https://example.com');
      expect(response.body.data[0].pathType).toBe('url');
    });

    it('should filter by search keyword', async () => {
      await createTestBookmark(testUser.id, { title: 'JavaScript Guide', path: 'https://js.com' });
      await createTestBookmark(testUser.id, { title: 'Python Docs', path: 'https://python.org' });

      const response = await request(app)
        .get('/api/bookmarks?search=JavaScript')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('JavaScript Guide');
    });

    it('should filter by favorite', async () => {
      await createTestBookmark(testUser.id, { title: 'Favorite', isFavorite: true });
      await createTestBookmark(testUser.id, { title: 'Not Favorite', isFavorite: false });

      const response = await request(app)
        .get('/api/bookmarks?favorite=true')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Favorite');
    });

    it('should filter by tags', async () => {
      await createTestBookmark(testUser.id, { title: 'Tagged', tags: ['javascript', 'web'] });
      await createTestBookmark(testUser.id, { title: 'Untagged' });

      const response = await request(app)
        .get('/api/bookmarks?tags=javascript')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('Tagged');
    });

    it('should filter by pathType', async () => {
      await createTestBookmark(testUser.id, { path: 'https://example.com', title: 'URL' });
      await createTestBookmark(testUser.id, { path: '/home/user/file.txt', title: 'File' });
      await createTestBookmark(testUser.id, { path: '\\\\server\\share', title: 'Network' });

      const response = await request(app)
        .get('/api/bookmarks?pathType=file')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].title).toBe('File');
    });

    it('should paginate results', async () => {
      for (let i = 0; i < 25; i++) {
        await createTestBookmark(testUser.id, { title: `Bookmark ${i}` });
      }

      const response = await request(app)
        .get('/api/bookmarks?page=2&limit=10')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(10);
      expect(response.body.pagination).toEqual({
        page: 2,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/bookmarks');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/bookmarks/:id', () => {
    it('should return a specific bookmark', async () => {
      const bookmark = await createTestBookmark(testUser.id, {
        path: 'https://example.com',
        title: 'Example',
        description: 'Test description',
        tags: ['test'],
      });

      const response = await request(app)
        .get(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(bookmark.id);
      expect(response.body.data.path).toBe('https://example.com');
      expect(response.body.data.pathType).toBe('url');
      expect(response.body.data.title).toBe('Example');
      expect(response.body.data.description).toBe('Test description');
      expect(response.body.data.tags).toContain('test');
    });

    it('should return 404 for non-existent bookmark', async () => {
      const response = await request(app)
        .get('/api/bookmarks/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for other user bookmark', async () => {
      const otherUser = await createTestUser('other', 'other@example.com');
      const bookmark = await createTestBookmark(otherUser.id);

      const response = await request(app)
        .get(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/bookmarks', () => {
    it('should create a bookmark with URL path', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          path: 'https://example.com',
          title: 'Example Site',
          description: 'A test bookmark',
          tags: ['test', 'example'],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.path).toBe('https://example.com');
      expect(response.body.data.pathType).toBe('url');
      expect(response.body.data.title).toBe('Example Site');
      expect(response.body.data.tags).toContain('test');
      expect(response.body.data.tags).toContain('example');
    });

    it('should create a bookmark with file path', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          path: '/home/user/documents/file.md',
          title: 'Local File',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.pathType).toBe('file');
    });

    it('should create a bookmark with UNC path', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          path: '\\\\server\\share\\document.docx',
          title: 'Network File',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.pathType).toBe('network');
    });

    it('should create a bookmark with Windows path', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          path: 'C:\\Users\\user\\Documents\\file.txt',
          title: 'Windows File',
        });

      expect(response.status).toBe(201);
      expect(response.body.data.pathType).toBe('file');
    });

    it('should return validation error for missing required fields', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          description: 'No path or title',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for invalid path', async () => {
      const response = await request(app)
        .post('/api/bookmarks')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          path: 'invalid-path',
          title: 'Invalid',
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('PUT /api/bookmarks/:id', () => {
    it('should update a bookmark', async () => {
      const bookmark = await createTestBookmark(testUser.id);

      const response = await request(app)
        .put(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Updated Title',
          description: 'Updated description',
        });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated Title');
      expect(response.body.data.description).toBe('Updated description');
    });

    it('should update tags', async () => {
      const bookmark = await createTestBookmark(testUser.id, { tags: ['old'] });

      const response = await request(app)
        .put(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          tags: ['new1', 'new2'],
        });

      expect(response.status).toBe(200);
      expect(response.body.data.tags).toContain('new1');
      expect(response.body.data.tags).toContain('new2');
      expect(response.body.data.tags).not.toContain('old');
    });

    it('should return 404 for non-existent bookmark', async () => {
      const response = await request(app)
        .put('/api/bookmarks/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Updated',
        });

      expect(response.status).toBe(404);
    });

    it('should return 403 for other user bookmark', async () => {
      const otherUser = await createTestUser('other', 'other@example.com');
      const bookmark = await createTestBookmark(otherUser.id);

      const response = await request(app)
        .put(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          title: 'Hijacked',
        });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/bookmarks/:id', () => {
    it('should delete a bookmark', async () => {
      const bookmark = await createTestBookmark(testUser.id);

      const response = await request(app)
        .delete(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(204);

      // 削除確認
      const getResponse = await request(app)
        .get(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const response = await request(app)
        .delete('/api/bookmarks/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for other user bookmark', async () => {
      const otherUser = await createTestUser('other', 'other@example.com');
      const bookmark = await createTestBookmark(otherUser.id);

      const response = await request(app)
        .delete(`/api/bookmarks/${bookmark.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/bookmarks/:id/favorite', () => {
    it('should toggle favorite status', async () => {
      const bookmark = await createTestBookmark(testUser.id, { isFavorite: false });

      // Toggle to true
      let response = await request(app)
        .put(`/api/bookmarks/${bookmark.id}/favorite`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFavorite).toBe(true);

      // Toggle to false
      response = await request(app)
        .put(`/api/bookmarks/${bookmark.id}/favorite`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.isFavorite).toBe(false);
    });

    it('should return 404 for non-existent bookmark', async () => {
      const response = await request(app)
        .put('/api/bookmarks/99999/favorite')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(404);
    });
  });
});
