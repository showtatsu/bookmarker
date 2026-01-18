import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import app from '../../src/index.js';
import prisma from '../../src/lib/prisma.js';
import { createTestUser, type TestUser } from '../helpers.js';

describe('Audit Log API', () => {
  let testUser: TestUser;

  beforeEach(async () => {
    testUser = await createTestUser(
      `audituser_${Date.now()}`,
      `audituser_${Date.now()}@example.com`
    );
  });

  describe('GET /api/audit-logs', () => {
    it('should return empty list when no logs', async () => {
      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 0,
        totalPages: 0,
      });
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/audit-logs');

      expect(res.status).toBe(401);
    });

    it('should list own audit logs', async () => {
      // テスト用監査ログを作成
      await prisma.auditLog.createMany({
        data: [
          {
            userId: testUser.id,
            action: 'AUTH_LOGIN',
            severity: 'HIGH',
            outcome: 'SUCCESS',
          },
          {
            userId: testUser.id,
            action: 'BOOKMARK_CREATE',
            severity: 'LOW',
            outcome: 'SUCCESS',
          },
        ],
      });

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination.total).toBe(2);
    });

    it('should filter by action', async () => {
      await prisma.auditLog.createMany({
        data: [
          {
            userId: testUser.id,
            action: 'AUTH_LOGIN',
            severity: 'HIGH',
            outcome: 'SUCCESS',
          },
          {
            userId: testUser.id,
            action: 'BOOKMARK_CREATE',
            severity: 'LOW',
            outcome: 'SUCCESS',
          },
        ],
      });

      const res = await request(app)
        .get('/api/audit-logs?action=AUTH_LOGIN')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].action).toBe('AUTH_LOGIN');
    });

    it('should paginate results', async () => {
      // 5件の監査ログを作成
      await prisma.auditLog.createMany({
        data: Array.from({ length: 5 }, (_, i) => ({
          userId: testUser.id,
          action: `ACTION_${i}`,
          severity: 'LOW',
          outcome: 'SUCCESS',
        })),
      });

      const res = await request(app)
        .get('/api/audit-logs?page=1&limit=2')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
      expect(res.body.pagination).toEqual({
        page: 1,
        limit: 2,
        total: 5,
        totalPages: 3,
      });
    });

    it('should not return logs from other users', async () => {
      const otherUser = await createTestUser(
        `other_${Date.now()}`,
        `other_${Date.now()}@example.com`
      );

      await prisma.auditLog.create({
        data: {
          userId: otherUser.id,
          action: 'AUTH_LOGIN',
          severity: 'HIGH',
          outcome: 'SUCCESS',
        },
      });

      const res = await request(app)
        .get('/api/audit-logs')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(0);
    });
  });

  describe('GET /api/audit-logs/:id', () => {
    it('should get a specific audit log', async () => {
      const log = await prisma.auditLog.create({
        data: {
          userId: testUser.id,
          action: 'AUTH_LOGIN',
          severity: 'HIGH',
          ipAddress: '192.168.1.1',
          outcome: 'SUCCESS',
          details: { method: 'password' },
        },
      });

      const res = await request(app)
        .get(`/api/audit-logs/${log.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(log.id);
      expect(res.body.data.action).toBe('AUTH_LOGIN');
      expect(res.body.data.severity).toBe('HIGH');
      expect(res.body.data.ipAddress).toBe('192.168.1.1');
      expect(res.body.data.details).toEqual({ method: 'password' });
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/audit-logs/1');

      expect(res.status).toBe(401);
    });

    it('should return 404 for non-existent log', async () => {
      const res = await request(app)
        .get('/api/audit-logs/99999')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(404);
      expect(res.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 400 for invalid id', async () => {
      const res = await request(app)
        .get('/api/audit-logs/invalid')
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('should return 403 for other user log', async () => {
      const otherUser = await createTestUser(
        `other2_${Date.now()}`,
        `other2_${Date.now()}@example.com`
      );

      const log = await prisma.auditLog.create({
        data: {
          userId: otherUser.id,
          action: 'AUTH_LOGIN',
          severity: 'HIGH',
          outcome: 'SUCCESS',
        },
      });

      const res = await request(app)
        .get(`/api/audit-logs/${log.id}`)
        .set('Authorization', `Bearer ${testUser.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });
  });
});

describe('Admin Audit Log API', () => {
  let adminUser: TestUser;
  let normalUser: TestUser;

  beforeEach(async () => {
    // 環境変数で管理者を設定
    process.env.ADMIN_USERS = 'admin';

    adminUser = await createTestUser('admin', `admin_${Date.now()}@example.com`);
    normalUser = await createTestUser(
      `normaluser_${Date.now()}`,
      `normaluser_${Date.now()}@example.com`
    );
  });

  describe('GET /api/admin/audit-logs', () => {
    it('should list all audit logs for admin', async () => {
      await prisma.auditLog.createMany({
        data: [
          {
            userId: adminUser.id,
            action: 'AUTH_LOGIN',
            severity: 'HIGH',
            outcome: 'SUCCESS',
          },
          {
            userId: normalUser.id,
            action: 'BOOKMARK_CREATE',
            severity: 'LOW',
            outcome: 'SUCCESS',
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${adminUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs')
        .set('Authorization', `Bearer ${normalUser.accessToken}`);

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('AUTHORIZATION_ERROR');
    });

    it('should return 401 without authentication', async () => {
      const res = await request(app).get('/api/admin/audit-logs');

      expect(res.status).toBe(401);
    });

    it('should filter by userId', async () => {
      await prisma.auditLog.createMany({
        data: [
          {
            userId: adminUser.id,
            action: 'AUTH_LOGIN',
            severity: 'HIGH',
            outcome: 'SUCCESS',
          },
          {
            userId: normalUser.id,
            action: 'BOOKMARK_CREATE',
            severity: 'LOW',
            outcome: 'SUCCESS',
          },
        ],
      });

      const res = await request(app)
        .get(`/api/admin/audit-logs?userId=${normalUser.id}`)
        .set('Authorization', `Bearer ${adminUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].userId).toBe(normalUser.id);
    });

    it('should filter by severity', async () => {
      await prisma.auditLog.createMany({
        data: [
          {
            userId: adminUser.id,
            action: 'AUTH_LOGIN',
            severity: 'HIGH',
            outcome: 'SUCCESS',
          },
          {
            userId: normalUser.id,
            action: 'BOOKMARK_CREATE',
            severity: 'LOW',
            outcome: 'SUCCESS',
          },
        ],
      });

      const res = await request(app)
        .get('/api/admin/audit-logs?severity=HIGH')
        .set('Authorization', `Bearer ${adminUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.data[0].severity).toBe('HIGH');
    });
  });

  describe('GET /api/admin/audit-logs/export', () => {
    it('should export audit logs as JSON', async () => {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'AUTH_LOGIN',
          severity: 'HIGH',
          outcome: 'SUCCESS',
        },
      });

      const res = await request(app)
        .get('/api/admin/audit-logs/export')
        .set('Authorization', `Bearer ${adminUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/json');
      expect(res.body.count).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.exportedAt).toBeDefined();
    });

    it('should export audit logs as CSV', async () => {
      await prisma.auditLog.create({
        data: {
          userId: adminUser.id,
          action: 'AUTH_LOGIN',
          severity: 'HIGH',
          outcome: 'SUCCESS',
        },
      });

      const res = await request(app)
        .get('/api/admin/audit-logs/export?format=csv')
        .set('Authorization', `Bearer ${adminUser.accessToken}`);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('id,timestamp,userId');
      expect(res.text).toContain('AUTH_LOGIN');
    });

    it('should return 403 for non-admin user', async () => {
      const res = await request(app)
        .get('/api/admin/audit-logs/export')
        .set('Authorization', `Bearer ${normalUser.accessToken}`);

      expect(res.status).toBe(403);
    });
  });
});
