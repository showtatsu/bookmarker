import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import tagRoutes from '../../src/routes/tag.routes.js';
import type { TestUser } from '../helpers.js';
import { createTestBookmark, createTestTag, createTestUser } from '../helpers.js';

// テスト用Expressアプリを作成
function createApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use('/api/tags', tagRoutes);
  return app;
}

describe('Tag API', () => {
  let app: express.Express;
  let testUser: TestUser;

  beforeEach(async () => {
    app = createApp();
    testUser = await createTestUser();
  });

  describe('GET /api/tags', () => {
    it('should return empty list when no tags exist', async () => {
      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return tags for authenticated user', async () => {
      await createTestTag(testUser.id, 'javascript');
      await createTestTag(testUser.id, 'typescript');

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should filter by search keyword', async () => {
      await createTestTag(testUser.id, 'javascript');
      await createTestTag(testUser.id, 'python');

      const response = await request(app)
        .get('/api/tags?search=java')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('javascript');
    });

    it('should sort by name ascending by default', async () => {
      await createTestTag(testUser.id, 'zebra');
      await createTestTag(testUser.id, 'alpha');

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].name).toBe('alpha');
      expect(response.body.data[1].name).toBe('zebra');
    });

    it('should sort by name descending', async () => {
      await createTestTag(testUser.id, 'alpha');
      await createTestTag(testUser.id, 'zebra');

      const response = await request(app)
        .get('/api/tags?order=desc')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].name).toBe('zebra');
    });

    it('should include bookmark count', async () => {
      await createTestBookmark(testUser.id, { tags: ['tagged'] });
      await createTestBookmark(testUser.id, { tags: ['tagged'] });
      await createTestTag(testUser.id, 'untagged');

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      const taggedTag = response.body.data.find((t: any) => t.name === 'tagged');
      const untaggedTag = response.body.data.find((t: any) => t.name === 'untagged');
      expect(taggedTag.bookmarkCount).toBe(2);
      expect(untaggedTag.bookmarkCount).toBe(0);
    });

    it('should require authentication', async () => {
      const response = await request(app).get('/api/tags');
      expect(response.status).toBe(401);
    });

    it('should not return other user tags', async () => {
      const otherUser = await createTestUser('other', 'other@example.com');
      await createTestTag(otherUser.id, 'other-tag');
      await createTestTag(testUser.id, 'my-tag');

      const response = await request(app)
        .get('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('my-tag');
    });
  });

  describe('GET /api/tags/:id', () => {
    it('should return a specific tag', async () => {
      const tag = await createTestTag(testUser.id, 'test-tag');

      const response = await request(app)
        .get(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(tag.id);
      expect(response.body.data.name).toBe('test-tag');
      expect(response.body.data.bookmarkCount).toBe(0);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .get('/api/tags/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for other user tag', async () => {
      const otherUser = await createTestUser('other', 'other@example.com');
      const tag = await createTestTag(otherUser.id, 'other-tag');

      const response = await request(app)
        .get(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('POST /api/tags', () => {
    it('should create a tag', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'new-tag' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('new-tag');
      expect(response.body.data.bookmarkCount).toBe(0);
    });

    it('should trim whitespace from tag name', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: '  trimmed-tag  ' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('trimmed-tag');
    });

    it('should return validation error for empty name', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: '' });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return validation error for too long name', async () => {
      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'a'.repeat(51) });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return conflict for duplicate tag name', async () => {
      await createTestTag(testUser.id, 'existing-tag');

      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'existing-tag' });

      expect(response.status).toBe(409);
      expect(response.body.error.code).toBe('CONFLICT');
    });

    it('should allow same tag name for different users', async () => {
      const otherUser = await createTestUser('other', 'other@example.com');
      await createTestTag(otherUser.id, 'shared-name');

      const response = await request(app)
        .post('/api/tags')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'shared-name' });

      expect(response.status).toBe(201);
    });
  });

  describe('PUT /api/tags/:id', () => {
    it('should update a tag', async () => {
      const tag = await createTestTag(testUser.id, 'old-name');

      const response = await request(app)
        .put(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'new-name' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('new-name');
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .put('/api/tags/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'updated' });

      expect(response.status).toBe(404);
    });

    it('should return 403 for other user tag', async () => {
      const otherUser = await createTestUser('other2', 'other2@example.com');
      const tag = await createTestTag(otherUser.id, 'other-tag2');

      const response = await request(app)
        .put(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'hijacked' });

      expect(response.status).toBe(403);
    });

    it('should return conflict when renaming to existing name', async () => {
      const tag1 = await createTestTag(testUser.id, 'tag-1');
      await createTestTag(testUser.id, 'tag-2');

      const response = await request(app)
        .put(`/api/tags/${tag1.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'tag-2' });

      expect(response.status).toBe(409);
    });

    it('should allow updating to same name', async () => {
      const tag = await createTestTag(testUser.id, 'same-name');

      const response = await request(app)
        .put(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'same-name' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/tags/:id', () => {
    it('should delete a tag', async () => {
      const tag = await createTestTag(testUser.id, 'to-delete');

      const response = await request(app)
        .delete(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(204);

      // 削除確認
      const getResponse = await request(app)
        .get(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(getResponse.status).toBe(404);
    });

    it('should return 404 for non-existent tag', async () => {
      const response = await request(app)
        .delete('/api/tags/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 for other user tag', async () => {
      const otherUser = await createTestUser('other3', 'other3@example.com');
      const tag = await createTestTag(otherUser.id, 'other-tag3');

      const response = await request(app)
        .delete(`/api/tags/${tag.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(response.status).toBe(403);
    });
  });
});
