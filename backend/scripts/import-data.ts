/**
 * データインポートスクリプト
 * CSVファイルからブックマークとタグをインポート
 *
 * 使用方法:
 *   npm run db:import -- --type bookmarks --file ./import/bookmarks.csv --preview
 *   npm run db:import -- --type bookmarks --file ./import/bookmarks.csv
 *   npm run db:import -- --type tags --file ./import/tags.csv
 */

import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const prisma = new PrismaClient();

interface ImportOptions {
  type: 'bookmarks' | 'tags';
  file: string;
  preview: boolean;
  mode: 'skip' | 'update' | 'duplicate';
  userId: number;
}

interface ImportResult {
  imported: number;
  skipped: number;
  updated: number;
  errors: string[];
  tagsCreated: string[];
}

function parseArgs(): ImportOptions {
  const args = process.argv.slice(2);
  const options: ImportOptions = {
    type: 'bookmarks',
    file: '',
    preview: false,
    mode: 'skip',
    userId: 1, // デフォルトユーザー
  };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--type' && args[i + 1]) {
      options.type = args[i + 1] as ImportOptions['type'];
      i++;
    } else if (args[i] === '--file' && args[i + 1]) {
      options.file = args[i + 1];
      i++;
    } else if (args[i] === '--preview') {
      options.preview = true;
    } else if (args[i] === '--mode' && args[i + 1]) {
      options.mode = args[i + 1] as ImportOptions['mode'];
      i++;
    } else if (args[i] === '--user' && args[i + 1]) {
      options.userId = parseInt(args[i + 1], 10);
      i++;
    }
  }

  return options;
}

function parseCSV(content: string): Record<string, string>[] {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: Record<string, string>[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCSVLine(lines[i]);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header.trim()] = values[index]?.trim() || '';
    });
    rows.push(row);
  }

  return rows;
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        current += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
  }
  result.push(current);

  return result;
}

async function getOrCreateTag(
  userId: number,
  tagName: string,
  createdTags: Set<string>,
  preview: boolean
): Promise<number> {
  const existing = await prisma.tag.findUnique({
    where: { userId_name: { userId, name: tagName } },
  });

  if (existing) {
    return existing.id;
  }

  // プレビューモードの場合は作成せずにダミーIDを返す
  if (preview) {
    createdTags.add(tagName);
    return -1; // ダミーID
  }

  const newTag = await prisma.tag.create({
    data: {
      userId,
      name: tagName,
      isFavorite: false,
    },
  });

  createdTags.add(tagName);
  return newTag.id;
}

async function importBookmarks(options: ImportOptions): Promise<ImportResult> {
  const content = readFileSync(options.file, 'utf-8');
  const rows = parseCSV(content);

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: [],
    tagsCreated: [],
  };

  const createdTags = new Set<string>();

  console.log(`\n📋 ${rows.length} 件のブックマークを処理中...\n`);

  if (options.preview) {
    console.log('--- プレビューモード ---\n');
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2; // ヘッダー行 + 0-indexed

    try {
      // 必須フィールドのチェック
      if (!row.path || !row.title) {
        result.errors.push(`行 ${lineNum}: path と title は必須です`);
        continue;
      }

      // 既存チェック
      const existing = await prisma.bookmark.findFirst({
        where: { userId: options.userId, path: row.path },
      });

      if (existing) {
        if (options.mode === 'skip') {
          console.log(`⏭️  スキップ: ${row.title} (既に存在)`);
          result.skipped++;
          continue;
        } else if (options.mode === 'update') {
          if (!options.preview) {
            // タグの処理
            const tagNames = row.tags
              ? row.tags
                  .split(',')
                  .map((t) => t.trim())
                  .filter(Boolean)
              : [];
            const tagIds: number[] = [];
            for (const tagName of tagNames) {
              const tagId = await getOrCreateTag(
                options.userId,
                tagName,
                createdTags,
                false // 実際に更新するのでプレビューではない
              );
              tagIds.push(tagId);
            }

            // 既存のタグ関連を削除
            await prisma.bookmarkTag.deleteMany({
              where: { bookmarkId: existing.id },
            });

            // ブックマーク更新
            await prisma.bookmark.update({
              where: { id: existing.id },
              data: {
                title: row.title,
                description: row.description || null,
                isFavorite: row.isFavorite === 'true',
                tags: {
                  create: tagIds.map((tagId) => ({ tagId })),
                },
              },
            });
          }
          console.log(`🔄 更新: ${row.title}`);
          result.updated++;
          continue;
        }
        // mode === 'duplicate' の場合は新規作成に進む
      }

      // タグの処理
      const tagNames = row.tags
        ? row.tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean)
        : [];
      const tagIds: number[] = [];

      for (const tagName of tagNames) {
        const tagId = await getOrCreateTag(
          options.userId,
          tagName,
          createdTags,
          options.preview
        );
        tagIds.push(tagId);
      }

      if (!options.preview) {
        // ブックマーク作成
        await prisma.bookmark.create({
          data: {
            userId: options.userId,
            path: row.path,
            title: row.title,
            description: row.description || null,
            isFavorite: row.isFavorite === 'true',
            createdAt: row.createdAt ? new Date(row.createdAt) : undefined,
            tags: {
              create: tagIds.map((tagId) => ({ tagId })),
            },
          },
        });
      }

      console.log(
        `✅ インポート: ${row.title}${tagNames.length > 0 ? ` [${tagNames.join(', ')}]` : ''}`
      );
      result.imported++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`行 ${lineNum}: ${message}`);
      console.log(`❌ エラー (行 ${lineNum}): ${message}`);
    }
  }

  result.tagsCreated = Array.from(createdTags);

  return result;
}

async function importTags(options: ImportOptions): Promise<ImportResult> {
  const content = readFileSync(options.file, 'utf-8');
  const rows = parseCSV(content);

  const result: ImportResult = {
    imported: 0,
    skipped: 0,
    updated: 0,
    errors: [],
    tagsCreated: [],
  };

  console.log(`\n📋 ${rows.length} 件のタグを処理中...\n`);

  if (options.preview) {
    console.log('--- プレビューモード ---\n');
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const lineNum = i + 2;

    try {
      if (!row.name) {
        result.errors.push(`行 ${lineNum}: name は必須です`);
        continue;
      }

      const existing = await prisma.tag.findUnique({
        where: { userId_name: { userId: options.userId, name: row.name } },
      });

      if (existing) {
        if (options.mode === 'skip') {
          console.log(`⏭️  スキップ: ${row.name} (既に存在)`);
          result.skipped++;
          continue;
        } else if (options.mode === 'update') {
          if (!options.preview) {
            await prisma.tag.update({
              where: { id: existing.id },
              data: {
                isFavorite: row.isFavorite === 'true',
              },
            });
          }
          console.log(`🔄 更新: ${row.name}`);
          result.updated++;
          continue;
        }
      }

      if (!options.preview) {
        await prisma.tag.create({
          data: {
            userId: options.userId,
            name: row.name,
            isFavorite: row.isFavorite === 'true',
          },
        });
      }

      console.log(`✅ インポート: ${row.name}`);
      result.imported++;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`行 ${lineNum}: ${message}`);
      console.log(`❌ エラー (行 ${lineNum}): ${message}`);
    }
  }

  return result;
}

async function main(): Promise<void> {
  const options = parseArgs();

  if (!options.file) {
    console.error(
      '使用方法: npm run db:import -- --type <bookmarks|tags> --file <path> [--preview] [--mode <skip|update|duplicate>] [--user <id>]'
    );
    process.exit(1);
  }

  console.log('🔄 データインポートを開始します...');
  console.log(`   タイプ: ${options.type}`);
  console.log(`   ファイル: ${options.file}`);
  console.log(`   モード: ${options.mode}`);
  console.log(`   ユーザーID: ${options.userId}`);
  if (options.preview) {
    console.log('   ⚠️  プレビューモード（実際のインポートは行われません）');
  }

  try {
    let result: ImportResult;

    if (options.type === 'bookmarks') {
      result = await importBookmarks(options);
    } else {
      result = await importTags(options);
    }

    console.log('\n' + '─'.repeat(50));
    console.log('📊 インポート結果:');
    console.log(`   ✅ インポート: ${result.imported} 件`);
    console.log(`   ⏭️  スキップ: ${result.skipped} 件`);
    console.log(`   🔄 更新: ${result.updated} 件`);
    if (result.tagsCreated.length > 0) {
      console.log(
        `   🏷️  自動作成されたタグ: ${result.tagsCreated.join(', ')}`
      );
    }
    if (result.errors.length > 0) {
      console.log(`   ❌ エラー: ${result.errors.length} 件`);
      result.errors.forEach((e) => console.log(`      - ${e}`));
    }
    console.log('─'.repeat(50));

    if (options.preview) {
      console.log(
        '\n⚠️  これはプレビューです。実際にインポートするには --preview を外して再実行してください。'
      );
    } else {
      console.log('\n🎉 インポート完了！');
    }
  } catch (error) {
    console.error('❌ インポート中にエラーが発生しました:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
