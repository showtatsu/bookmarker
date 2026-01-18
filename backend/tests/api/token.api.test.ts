import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index.js';
import { createTestUser, type TestUser } from '../helpers.js';

describe('Token API', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    // 各テスト前にユーザーとトークンを新規作成
    testUser = await createTestUser(
      `tokenuser_${Date.now()}`,
      `tokenuser_${Date.now()}@example.com`
    );
  });

  describe('GET /api/tokens', () => {
    it('should return empty list when no tokens', async () => {
      const res = await request(app)
        .get('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/tokens');

      expect(res.status).toBe(401);
    });

    it('should list tokens with metadata (no tokenHash)', async () => {
      // トークンを作成
      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Test Token 1' });

      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Test Token 2' });

      const res = await request(app)
        .get('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);

      // トークンハッシュや生トークンが含まれないことを確認
      res.body.data.forEach((token: Record<string, unknown>) => {
        expect(token).toHaveProperty('id');
        expect(token).toHaveProperty('name');
        expect(token).toHaveProperty('createdAt');
        expect(token).toHaveProperty('expiresAt');
        expect(token).toHaveProperty('lastUsedAt');
        expect(token).not.toHaveProperty('token');
        expect(token).not.toHaveProperty('tokenHash');
      });
    });

    it('should sort by name ascending', async () => {
      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Zebra Token' });

      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Alpha Token' });

      const res = await request(app)
        .get('/api/tokens?sort=name&order=asc')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data[0].name).toBe('Alpha Token');
      expect(res.body.data[1].name).toBe('Zebra Token');
    });

    it('should not return tokens from other users', async () => {
      const otherUser = await createTestUser('otheruser4', 'otheruser4@example.com');

      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ name: 'Other User Token' });

      const res = await request(app)
        .get('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('POST /api/tokens', () => {
    it('should create a token and return raw token', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'My API Token' });

      expect(res.status).toBe(201);
      expect(res.body.data).toHaveProperty('id');
      expect(res.body.data.name).toBe('My API Token');
      expect(res.body.data).toHaveProperty('token');
      expect(res.body.data.token).toMatch(/^bkmk_[a-f0-9]{64}$/);
      expect(res.body.data.expiresAt).toBeNull();
    });

    it('should create a token with expiration', async () => {
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({
          name: 'Expiring Token',
          expiresAt,
        });

      expect(res.status).toBe(201);
      expect(res.body.data.expiresAt).not.toBeNull();
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .send({ name: 'Test Token' });

      expect(res.status).toBe(401);
    });

    it('should return 400 with empty name', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with missing name', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 400 with name too long', async () => {
      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'a'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 409 with duplicate name', async () => {
      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Duplicate Token' });

      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Duplicate Token' });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('should allow same name for different users', async () => {
      const otherUser = await createTestUser('otheruser5', 'otheruser5@example.com');

      await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Shared Name Token' });

      const res = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ name: 'Shared Name Token' });

      expect(res.status).toBe(201);
    });
  });

  describe('DELETE /api/tokens/:id', () => {
    it('should delete a token', async () => {
      const createRes = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`)
        .send({ name: 'Token to Delete' });

      const tokenId = createRes.body.data.id;

      const deleteRes = await request(app)
        .delete(`/api/tokens/${tokenId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(deleteRes.status).toBe(204);

      // 削除されたことを確認
      const listRes = await request(app)
        .get('/api/tokens')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(listRes.body.data).toHaveLength(0);
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).delete('/api/tokens/1');

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent token', async () => {
      const res = await request(app)
        .delete('/api/tokens/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid id', async () => {
      const res = await request(app)
        .delete('/api/tokens/invalid')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for other user token', async () => {
      const otherUser = await createTestUser('otheruser6', 'otheruser6@example.com');

      const createRes = await request(app)
        .post('/api/tokens')
        .set('Authorization', `Bearer ${otherUser.accessToken}`)
        .send({ name: 'Other User Token' });

      const tokenId = createRes.body.data.id;

      const res = await request(app)
        .delete(`/api/tokens/${tokenId}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });
});
