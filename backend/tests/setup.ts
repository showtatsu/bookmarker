import { afterAll, afterEach, beforeAll } from 'vitest';
import prisma from '../src/lib/prisma.js';

// テスト前にデータベースをセットアップ
beforeAll(async () => {
  // テスト用データベースを使用していることを確認
  if (!process.env.DATABASE_URL?.includes('test')) {
    console.warn('Warning: Not using test database. Setting up test DB...');
  }
});

// 各テスト後にデータをクリーンアップ
afterEach(async () => {
  // 依存関係の順序に注意してデータを削除
  await prisma.bookmarkTag.deleteMany();
  await prisma.bookmark.deleteMany();
  await prisma.tag.deleteMany();
  await prisma.apiToken.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.user.deleteMany();
});

// テスト終了後にデータベース接続を閉じる
afterAll(async () => {
  await prisma.$disconnect();
});
