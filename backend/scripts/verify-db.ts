/**
 * データベース検証スクリプト
 * マイグレーション後のデータ整合性を確認
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface VerificationResult {
  table: string;
  status: 'ok' | 'warning' | 'error';
  message: string;
  count?: number;
}

async function verifyDatabase(): Promise<void> {
  console.log('🔍 データベース検証を開始します...\n');

  const results: VerificationResult[] = [];

  try {
    // Users テーブル検証
    const userCount = await prisma.user.count();
    results.push({
      table: 'users',
      status: 'ok',
      message: `${userCount} ユーザー`,
      count: userCount,
    });

    // Bookmarks テーブル検証
    const bookmarkCount = await prisma.bookmark.count();
    const bookmarksWithoutTitle = await prisma.bookmark.count({
      where: { title: '' },
    });
    results.push({
      table: 'bookmarks',
      status: bookmarksWithoutTitle > 0 ? 'warning' : 'ok',
      message:
        bookmarksWithoutTitle > 0
          ? `${bookmarkCount} ブックマーク (${bookmarksWithoutTitle} 件のタイトルなし)`
          : `${bookmarkCount} ブックマーク`,
      count: bookmarkCount,
    });

    // Tags テーブル検証
    const tagCount = await prisma.tag.count();
    const favoriteTags = await prisma.tag.count({
      where: { isFavorite: true },
    });
    results.push({
      table: 'tags',
      status: 'ok',
      message: `${tagCount} タグ (${favoriteTags} 件がお気に入り)`,
      count: tagCount,
    });

    // BookmarkTags 関連検証
    const bookmarkTagCount = await prisma.bookmarkTag.count();
    results.push({
      table: 'bookmark_tags',
      status: 'ok',
      message: `${bookmarkTagCount} 関連`,
      count: bookmarkTagCount,
    });

    // ApiTokens テーブル検証
    const tokenCount = await prisma.apiToken.count();
    results.push({
      table: 'api_tokens',
      status: 'ok',
      message: `${tokenCount} トークン`,
      count: tokenCount,
    });

    // AuditLogs テーブル検証
    const auditLogCount = await prisma.auditLog.count();
    results.push({
      table: 'audit_logs',
      status: 'ok',
      message: `${auditLogCount} ログ`,
      count: auditLogCount,
    });

    // 結果出力
    console.log('検証結果:');
    console.log('─'.repeat(50));

    for (const result of results) {
      const icon =
        result.status === 'ok'
          ? '✅'
          : result.status === 'warning'
            ? '⚠️'
            : '❌';
      console.log(`${icon} ${result.table}: ${result.message}`);
    }

    console.log('─'.repeat(50));

    const hasErrors = results.some((r) => r.status === 'error');
    const hasWarnings = results.some((r) => r.status === 'warning');

    if (hasErrors) {
      console.log('\n❌ 検証に失敗しました。エラーを確認してください。');
      process.exit(1);
    } else if (hasWarnings) {
      console.log('\n⚠️  検証完了（警告あり）');
    } else {
      console.log('\n✅ すべての検証が成功しました！');
    }
  } catch (error) {
    console.error('❌ 検証中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

verifyDatabase();
