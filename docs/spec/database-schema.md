# データベーススキーマ仕様

## 概要

Bookmarkerアプリケーションのデータベーススキーマ定義です。
ORM として Prisma を使用し、SQLite3 / PostgreSQL の両方に対応しています。

## 関連ADR

- [ADR-0003: データベースの選定](../adr/0003-database.md)

---

## Prisma スキーマ

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "sqlite" // 本番環境では "postgresql" に変更
  url      = env("DATABASE_URL")
}

model User {
  id           Int        @id @default(autoincrement())
  username     String     @unique
  email        String     @unique
  passwordHash String     @map("password_hash")
  createdAt    DateTime   @default(now()) @map("created_at")
  updatedAt    DateTime   @updatedAt @map("updated_at")
  bookmarks    Bookmark[]
  tags         Tag[]
  apiTokens    ApiToken[]
  auditLogs    AuditLog[]

  @@map("users")
}

model Bookmark {
  id          Int           @id @default(autoincrement())
  userId      Int           @map("user_id")
  path        String        // URL or file path (unified) - max 2000 chars
  title       String
  description String?
  isFavorite  Boolean       @default(false) @map("is_favorite")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags        BookmarkTag[]

  @@map("bookmarks")
}

model Tag {
  id        Int           @id @default(autoincrement())
  userId    Int           @map("user_id")
  name      String
  createdAt DateTime      @default(now()) @map("created_at")
  user      User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  bookmarks BookmarkTag[]

  @@unique([userId, name])
  @@map("tags")
}

model BookmarkTag {
  bookmarkId Int      @map("bookmark_id")
  tagId      Int      @map("tag_id")
  bookmark   Bookmark @relation(fields: [bookmarkId], references: [id], onDelete: Cascade)
  tag        Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([bookmarkId, tagId])
  @@map("bookmark_tags")
}

model ApiToken {
  id         Int       @id @default(autoincrement())
  userId     Int       @map("user_id")
  tokenHash  String    @unique @map("token_hash")
  name       String
  lastUsedAt DateTime? @map("last_used_at")
  createdAt  DateTime  @default(now()) @map("created_at")
  expiresAt  DateTime? @map("expires_at")
  user       User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("api_tokens")
}

model AuditLog {
  id           Int      @id @default(autoincrement())
  timestamp    DateTime @default(now())
  userId       Int?     @map("user_id")
  action       String
  resourceType String?  @map("resource_type")
  resourceId   Int?     @map("resource_id")
  severity     String   @default("LOW") // 'LOW' | 'MEDIUM' | 'HIGH'
  ipAddress    String?  @map("ip_address")
  userAgent    String?  @map("user_agent")
  requestId    String?  @map("request_id")
  details      Json?
  outcome      String   // 'SUCCESS' | 'FAILURE'
  user         User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([timestamp])
  @@index([userId])
  @@index([action])
  @@index([severity])
  @@map("audit_logs")
}
```

---

## テーブル詳細

### users（ユーザー）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INT | PK, AUTO_INCREMENT | ユーザーID |
| username | VARCHAR | UNIQUE, NOT NULL | ユーザー名 |
| email | VARCHAR | UNIQUE, NOT NULL | メールアドレス |
| password_hash | VARCHAR | NOT NULL | パスワードハッシュ（bcrypt） |
| created_at | DATETIME | NOT NULL, DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | NOT NULL, AUTO UPDATE | 更新日時 |

### bookmarks（ブックマーク）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INT | PK, AUTO_INCREMENT | ブックマークID |
| user_id | INT | FK(users.id), NOT NULL | 所有ユーザーID |
| path | VARCHAR(2000) | NOT NULL | URLまたはファイルパス（統一フィールド） |
| title | VARCHAR(200) | NOT NULL | タイトル |
| description | TEXT | NULL | 説明（最大1000文字） |
| is_favorite | BOOLEAN | NOT NULL, DEFAULT FALSE | お気に入りフラグ |
| created_at | DATETIME | NOT NULL, DEFAULT NOW | 作成日時 |
| updated_at | DATETIME | NOT NULL, AUTO UPDATE | 更新日時 |

**pathフィールドのサポート形式**:
- URL: `http://`, `https://`, `ftp://`, `sftp://` 等
- ローカルファイル: `/path`, `~/path`, `C:\path`, `C:/path`
- UNCパス: `\\server\share`, `\\?\UNC\server\share`
- ネットワーク: `smb://`, `file://server/share`, `davs://`

詳細は [ADR-0014: ブックマークアイテムの定義](../adr/0014-bookmark-item.md) を参照。

### tags（タグ）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INT | PK, AUTO_INCREMENT | タグID |
| user_id | INT | FK(users.id), NOT NULL | 所有ユーザーID |
| name | VARCHAR | NOT NULL | タグ名 |
| created_at | DATETIME | NOT NULL, DEFAULT NOW | 作成日時 |

**複合ユニーク制約**: (user_id, name)

### bookmark_tags（ブックマーク-タグ中間テーブル）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| bookmark_id | INT | PK, FK(bookmarks.id) | ブックマークID |
| tag_id | INT | PK, FK(tags.id) | タグID |

### api_tokens（APIトークン）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INT | PK, AUTO_INCREMENT | トークンID |
| user_id | INT | FK(users.id), NOT NULL | 所有ユーザーID |
| token_hash | VARCHAR | UNIQUE, NOT NULL | トークンハッシュ |
| name | VARCHAR | NOT NULL | トークン名 |
| last_used_at | DATETIME | NULL | 最終使用日時 |
| created_at | DATETIME | NOT NULL, DEFAULT NOW | 作成日時 |
| expires_at | DATETIME | NULL | 有効期限 |

### audit_logs（監査ログ）

| カラム | 型 | 制約 | 説明 |
|--------|-----|------|------|
| id | INT | PK, AUTO_INCREMENT | ログID |
| timestamp | DATETIME | NOT NULL, DEFAULT NOW | 記録日時 |
| user_id | INT | FK(users.id), NULL | ユーザーID（未認証時はNULL） |
| action | VARCHAR | NOT NULL | アクション種別 |
| resource_type | VARCHAR | NULL | リソース種別 |
| resource_id | INT | NULL | リソースID |
| severity | VARCHAR | NOT NULL, DEFAULT 'LOW' | 重要度（LOW/MEDIUM/HIGH） |
| ip_address | VARCHAR | NULL | クライアントIPアドレス |
| user_agent | VARCHAR | NULL | ユーザーエージェント |
| request_id | VARCHAR | NULL | リクエスト追跡ID |
| details | JSON | NULL | 追加情報 |
| outcome | VARCHAR | NOT NULL | 結果（SUCCESS/FAILURE） |

**インデックス**: timestamp, user_id, action, severity

---

## ER図

```
┌──────────────┐       ┌──────────────┐
│    users     │       │  api_tokens  │
├──────────────┤       ├──────────────┤
│ id       PK  │───┬───│ user_id  FK  │
│ username     │   │   │ token_hash   │
│ email        │   │   │ name         │
│ password_hash│   │   │ expires_at   │
│ created_at   │   │   └──────────────┘
│ updated_at   │   │
└──────────────┘   │   ┌──────────────┐
       │           ├───│  audit_logs  │
       │           │   ├──────────────┤
       │           │   │ user_id  FK  │
       │           │   │ action       │
       │           │   │ severity     │
       │           │   │ outcome      │
       │           │   └──────────────┘
       │           │
       ▼           │   ┌──────────────┐
┌──────────────┐   └───│    tags      │
│  bookmarks   │       ├──────────────┤
├──────────────┤       │ user_id  FK  │
│ user_id  FK  │       │ name         │
│ path         │       └──────┬───────┘
│ title        │              │
│ description  │              │
│ is_favorite  │              │
└──────┬───────┘              │
       │                      │
       │    ┌──────────────┐  │
       └────│ bookmark_tags│──┘
            ├──────────────┤
            │ bookmark_id  │
            │ tag_id       │
            └──────────────┘
```

---

## 環境変数

| 変数名 | 説明 | 例 |
|--------|------|-----|
| DATABASE_URL | 接続URL | `file:./data/bookmarker.db`（SQLite）または `postgresql://user:pass@host:5432/db`（PostgreSQL） |

**注意**: DBプロバイダの切替は `prisma/schema.prisma` の `provider` を直接変更します。

---

## マイグレーション

### 開発環境

```bash
# マイグレーション作成・適用
npx prisma migrate dev --name <migration_name>

# クライアント生成
npx prisma generate
```

### 本番環境

```bash
# マイグレーション適用のみ
npx prisma migrate deploy
```
