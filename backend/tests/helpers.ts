import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../src/lib/prisma.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key-do-not-use-in-production';

export interface TestUser {
  id: number;
  username: string;
  email: string;
  accessToken: string;
}

/**
 * テスト用ユーザーを作成
 */
export async function createTestUser(
  username = 'testuser',
  email = 'test@example.com',
  password = 'TestPassword123'
): Promise<TestUser> {
  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.user.create({
    data: {
      username,
      email,
      passwordHash,
    },
  });

  const accessToken = jwt.sign(
    { userId: user.id, username: user.username },
    JWT_SECRET,
    { expiresIn: '1h' }
  );

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    accessToken,
  };
}

/**
 * テスト用ブックマークを作成
 */
export async function createTestBookmark(
  userId: number,
  data: {
    path?: string;
    title?: string;
    description?: string;
    isFavorite?: boolean;
    tags?: string[];
  } = {}
) {
  const {
    path = 'https://example.com',
    title = 'Test Bookmark',
    description = 'Test description',
    isFavorite = false,
    tags = [],
  } = data;

  // タグを作成
  const tagRecords = await Promise.all(
    tags.map(async (tagName) => {
      let tag = await prisma.tag.findUnique({
        where: {
          userId_name: {
            userId,
            name: tagName,
          },
        },
      });

      if (!tag) {
        tag = await prisma.tag.create({
          data: {
            userId,
            name: tagName,
          },
        });
      }

      return tag;
    })
  );

  const bookmark = await prisma.bookmark.create({
    data: {
      userId,
      path,
      title,
      description,
      isFavorite,
      tags: {
        create: tagRecords.map((tag) => ({
          tagId: tag.id,
        })),
      },
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return bookmark;
}

/**
 * テスト用タグを作成（既存の場合は既存を返す）
 */
export async function createTestTag(userId: number, name: string) {
  const existing = await prisma.tag.findUnique({
    where: {
      userId_name: {
        userId,
        name,
      },
    },
  });

  if (existing) {
    return existing;
  }

  return prisma.tag.create({
    data: {
      userId,
      name,
    },
  });
}
