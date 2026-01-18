/**
 * データエクスポートスクリプト
 * ブックマークとタグをCSV形式でエクスポート
 *
 * 使用方法:
 *   npm run db:export -- --type bookmarks --output ./export/bookmarks.csv
 *   npm run db:export -- --type tags --output ./export/tags.csv
 *   npm run db:export -- --type all --output ./export/
 */

import { PrismaClient } from '@prisma/client';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';

const prisma = new PrismaClient();

interface ExportOptions {
  type: 'bookmarks' | 'tags' | 'all';
  output: string;
  userId?: number;
}

function parseArgs(): ExportOptions {
  const args = process.argv.slice(2);
  const options: ExportOptions = {
    type: 'all',
    output: './export/',
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      options.type = args[i + 1] as ExportOptions['type'];
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      options.output = args[i + 1];
      i++;
    } else if (args[i] === '--user' && args[i + 1]) {
      options.userId = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

function escapeCSV(value: string | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

async function exportBookmarks(output: string, userId?: number): Promise<void> {
  console.log('📚 ブックマークをエクスポート中...');

  const where = userId ? { userId } : {};
  const bookmarks = await prisma.bookmark.findMany({
    where,
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  });

  const header = 'path,title,description,isFavorite,tags,createdAt';
  const rows = bookmarks.map((b) => {
    const tags = b.tags.map((t) => t.tag.name).join(',');
    return [
      escapeCSV(b.path),
      escapeCSV(b.title),
      escapeCSV(b.description),
      b.isFavorite ? 'true' : 'false',
      escapeCSV(tags),
      b.createdAt.toISOString(),
    ].join(',');
  });

  const csv = [header, ...rows].join('\n');

  const dir = dirname(output);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(output, csv, 'utf-8');
  console.log(
    `✅ ${bookmarks.length} 件のブックマークをエクスポートしました: ${output}`
  );
}

async function exportTags(output: string, userId?: number): Promise<void> {
  console.log('🏷️  タグをエクスポート中...');

  const where = userId ? { userId } : {};
  const tags = await prisma.tag.findMany({
    where,
    orderBy: { name: 'asc' },
  });

  const header = 'name,isFavorite';
  const rows = tags.map((t) => {
    return [escapeCSV(t.name), t.isFavorite ? 'true' : 'false'].join(',');
  });

  const csv = [header, ...rows].join('\n');

  const dir = dirname(output);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  writeFileSync(output, csv, 'utf-8');
  console.log(`✅ ${tags.length} 件のタグをエクスポートしました: ${output}`);
}

async function main(): Promise<void> {
  const options = parseArgs();
  const timestamp = new Date().toISOString().split('T')[0];

  console.log('🔄 データエクスポートを開始します...\n');

  try {
    if (options.type === 'bookmarks' || options.type === 'all') {
      const bookmarkOutput =
        options.type === 'all'
          ? join(options.output, `bookmarks_${timestamp}.csv`)
          : options.output;
      await exportBookmarks(bookmarkOutput, options.userId);
    }

    if (options.type === 'tags' || options.type === 'all') {
      const tagOutput =
        options.type === 'all'
          ? join(options.output, `tags_${timestamp}.csv`)
          : options.output;
      await exportTags(tagOutput, options.userId);
    }

    console.log('\n🎉 エクスポート完了！');
  } catch (error) {
    console.error('❌ エクスポート中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
