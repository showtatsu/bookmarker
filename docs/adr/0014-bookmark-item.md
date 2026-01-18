---
name: bookmark-item
description: 'Bookmark Item Definition for Bookmarker Application'
status: accepted
---

## タイトル
ブックマークアイテムの定義

## 概要
Bookmarkerアプリケーションで管理するブックマークアイテムの構成要素と仕様を定義します。

## 背景
ブックマーク管理アプリとして、URLだけでなくローカルファイルパスも一元管理できることが特徴です。ユーザーが効率的にリソースを整理・検索できるよう、ブックマークアイテムに含めるべき要素を明確に定義する必要があります。

## 決定事項

### パス（path）の統一管理

URLとファイルパスを区別せず、単一の `path` フィールドで管理します。パスの種類は `path` の形式から自動判定します。

### サポートするパス形式

| 種別 | パターン | 例 |
|------|----------|-----|
| HTTP/HTTPS | `http://`, `https://` | `https://example.com/docs` |
| ローカルファイル（Unix系） | `/` で始まる絶対パス | `/Users/user/docs/file.md` |
| ローカルファイル（Windows） | ドライブレター + `:` | `C:\Users\user\docs\file.md` |
| ホームディレクトリ | `~` で始まる | `~/Documents/project/README.md` |
| UNCパス（標準） | `\\server\share` | `\\fileserver\shared\docs\file.txt` |
| UNCパス（Long UNC） | `\\?\UNC\server\share` | `\\?\UNC\fileserver\shared\longpath\file.txt` |
| UNCパス（デバイスパス） | `\\.\` | `\\.\PhysicalDrive0` |
| UNCパス（Long Path） | `\\?\` | `\\?\C:\very\long\path\file.txt` |
| SMB（ネットワーク共有） | `smb://` | `smb://server/share/folder/file.txt` |
| file URI | `file://` | `file:///C:/Users/user/file.txt` |
| file URI（UNC） | `file://server/share` | `file://fileserver/shared/docs/file.txt` |
| FTP | `ftp://`, `ftps://` | `ftp://ftp.example.com/pub/file.zip` |
| SSH/SFTP | `ssh://`, `sftp://` | `sftp://user@server/path/to/file` |
| WebDAV | `dav://`, `davs://` | `davs://server.com/webdav/folder/` |
| カスタムプロトコル | `{protocol}://` | `vscode://file/path/to/file` |

### パス種別の自動判定ロジック

```typescript
type PathType = 'url' | 'file' | 'network';

function getPathType(path: string): PathType {
  // URL schemes
  if (/^https?:\/\//i.test(path)) return 'url';
  if (/^(ftp|ftps|ssh|sftp|smb|dav|davs|nfs):\/\//i.test(path)) return 'network';

  // file:// URI - check if it's a network path (file://server/share)
  if (/^file:\/\/[^/]/i.test(path)) return 'network'; // file://server/share
  if (/^file:\/\//i.test(path)) return 'file';        // file:///C:/path

  // Windows UNC paths (various forms)
  // Standard UNC: \\server\share
  if (/^\\\\[^?\\.]/.test(path)) return 'network';
  // Long UNC: \\?\UNC\server\share
  if (/^\\\\\?\\UNC\\/i.test(path)) return 'network';
  // Device path: \\.\
  if (/^\\\\\.\\/.test(path)) return 'file';
  // Long path: \\?\C:\
  if (/^\\\\\?\\[A-Za-z]:/.test(path)) return 'file';

  // Windows drive letter (C:\, D:\, C:/)
  if (/^[A-Za-z]:[\\\/]/.test(path)) return 'file';

  // Unix absolute path or home directory
  if (/^[\/~]/.test(path)) return 'file';

  // Custom protocol (vscode://, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return 'url';

  // Default to file
  return 'file';
}

// UNCパスかどうかを判定
function isUNCPath(path: string): boolean {
  // Standard UNC: \\server\share
  if (/^\\\\[^?\\.][^\\]*\\/.test(path)) return true;
  // Long UNC: \\?\UNC\server\share
  if (/^\\\\\?\\UNC\\/i.test(path)) return true;
  // file:// with server: file://server/share
  if (/^file:\/\/[^/]/i.test(path)) return true;
  return false;
}

// UNCパスからサーバー名を抽出
function extractUNCServer(path: string): string | null {
  // Standard UNC: \\server\share
  const standardMatch = path.match(/^\\\\([^\\?][^\\]*)\\/)
  if (standardMatch) return standardMatch[1];

  // Long UNC: \\?\UNC\server\share
  const longMatch = path.match(/^\\\\\?\\UNC\\([^\\]+)\\/i);
  if (longMatch) return longMatch[1];

  // file://server/share
  const fileMatch = path.match(/^file:\/\/([^/]+)\//i);
  if (fileMatch) return fileMatch[1];

  return null;
}
```

---

### 必須要素

| 要素 | 型 | 説明 | 制約 |
|------|-----|------|------|
| id | number | ブックマークの一意識別子 | 自動採番 |
| userId | number | 所有ユーザーID | 外部キー |
| path | string | URL またはファイルパス | 1-2000文字、必須 |
| title | string | 表示タイトル | 1-200文字、必須 |
| createdAt | datetime | 作成日時 | 自動設定 |
| updatedAt | datetime | 更新日時 | 自動更新 |

### オプション要素

| 要素 | 型 | 説明 | 制約 | デフォルト |
|------|-----|------|------|-----------|
| description | string | 説明文、メモ | 最大1000文字 | null |
| isFavorite | boolean | お気に入りフラグ | - | false |
| tags | Tag[] | 紐づけられたタグ | 0個以上 | [] |

### メタデータ（将来拡張）

以下の要素は将来的な拡張として検討：

| 要素 | 型 | 説明 | 優先度 |
|------|-----|------|--------|
| favicon | string | サイトのファビコンURL | 低 |
| thumbnail | string | サムネイル画像URL | 低 |
| lastAccessedAt | datetime | 最終アクセス日時 | 中 |
| accessCount | number | アクセス回数 | 低 |
| isArchived | boolean | アーカイブフラグ | 中 |
| color | string | カスタムカラー | 低 |
| priority | number | 優先度（1-5） | 低 |
| expiresAt | datetime | 有効期限 | 低 |
| sourceUrl | string | 元のインポート元URL | 低 |

---

## データモデル

### Prisma スキーマ

```prisma
model Bookmark {
  id          Int           @id @default(autoincrement())
  userId      Int           @map("user_id")
  path        String        // URL or file path (unified)
  title       String
  description String?
  isFavorite  Boolean       @default(false) @map("is_favorite")
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  user        User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  tags        BookmarkTag[]

  @@map("bookmarks")
}
```

### バリデーションルール

```typescript
// Zod スキーマ
const bookmarkSchema = z.object({
  path: z.string()
    .min(1, 'パスは必須です')
    .max(2000, 'パスは2000文字以内にしてください')
    .refine(isValidPath, 'パスの形式が正しくありません'),
  title: z.string().min(1).max(200),
  description: z.string().max(1000).optional(),
  isFavorite: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

// パス形式のバリデーション
function isValidPath(path: string): boolean {
  // URL (http, https, ftp, etc.)
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(path)) return true;

  // Windows UNC paths
  // Standard UNC: \\server\share (minimum: \\s\s)
  if (/^\\\\[^\\?]+\\[^\\]+/.test(path)) return true;
  // Long UNC: \\?\UNC\server\share
  if (/^\\\\\?\\UNC\\[^\\]+\\[^\\]+/i.test(path)) return true;
  // Device path: \\.\ (e.g., \\.\PhysicalDrive0)
  if (/^\\\\\.\\/.test(path)) return true;
  // Long path: \\?\C:\ (for paths > 260 chars)
  if (/^\\\\\?\\[A-Za-z]:\\/.test(path)) return true;

  // Windows drive letter (C:\, D:/, etc.)
  if (/^[A-Za-z]:[\\\/]/.test(path)) return true;

  // Unix absolute path
  if (path.startsWith('/')) return true;

  // Home directory
  if (path.startsWith('~')) return true;

  return false;
}
```

---

## パス形式の詳細

### URL形式

| スキーム | 例 | 用途 |
|---------|-----|------|
| `https://` | `https://example.com/page` | Webページ（推奨） |
| `http://` | `http://example.com/page` | Webページ（非推奨） |
| `ftp://` | `ftp://ftp.example.com/file.zip` | FTPサーバー |
| `ftps://` | `ftps://ftp.example.com/file.zip` | セキュアFTP |
| `ssh://` | `ssh://user@server/path` | SSH接続 |
| `sftp://` | `sftp://user@server/path/file` | SFTPファイル |

### ファイルパス形式

| 形式 | 例 | プラットフォーム |
|------|-----|-----------------|
| Unix絶対パス | `/home/user/docs/file.md` | macOS, Linux |
| Windowsドライブ | `C:\Users\user\docs\file.md` | Windows |
| Windowsフォワードスラッシュ | `C:/Users/user/docs/file.md` | Windows（互換） |
| ホームディレクトリ | `~/Documents/file.md` | macOS, Linux |
| file URI | `file:///C:/Users/file.md` | クロスプラットフォーム |

### ネットワークパス形式

#### UNCパス（Universal Naming Convention）

Windowsネットワーク共有で使用される標準的なパス形式です。

| 形式 | パターン | 例 | 説明 |
|------|----------|-----|------|
| 標準UNC | `\\server\share\path` | `\\fileserver\shared\docs\file.docx` | 最も一般的な形式 |
| Long UNC | `\\?\UNC\server\share\path` | `\\?\UNC\fileserver\shared\very\long\path\file.txt` | 260文字制限を超えるパス用 |
| デバイスパス | `\\.\device` | `\\.\PhysicalDrive0`, `\\.\COM1` | 物理デバイスへのアクセス |
| Long Path | `\\?\driveletter:\path` | `\\?\C:\very\long\path\file.txt` | ローカルの長いパス用 |
| Admin共有 | `\\server\c$\path` | `\\fileserver\c$\Users\admin\file.txt` | 管理共有（ドライブ全体） |
| IPC共有 | `\\server\IPC$` | `\\fileserver\IPC$` | プロセス間通信用 |

#### UNCパスの構成要素

```
\\server\share\folder\file.txt
│  │      │     │      └── ファイル名
│  │      │     └── サブフォルダ（オプション）
│  │      └── 共有名
│  └── サーバー名（ホスト名 or IPアドレス）
└── UNCプレフィックス
```

#### その他のネットワークパス形式

| 形式 | 例 | 用途 |
|------|-----|------|
| SMB URL | `smb://fileserver/share/docs/file.docx` | macOS/Linuxからの共有アクセス |
| file URI（ネットワーク） | `file://fileserver/share/file.txt` | クロスプラットフォームのネットワークファイル参照 |
| WebDAV | `davs://server.com/webdav/folder/file.txt` | WebDAVサーバー（HTTPS） |
| NFS | `nfs://server/export/path` | NFSマウント |

### パスの正規化ルール

- **保存時は入力をそのまま保存**（正規化しない）
- バックスラッシュ `\` とフォワードスラッシュ `/` は変換しない
- 末尾スラッシュは保持
- クエリパラメータ、フラグメントは保持
- エンコーディングは保持（デコードしない）

---

## タグとの関連

### 多対多リレーション

- 1つのブックマークに複数のタグを紐づけ可能
- 1つのタグは複数のブックマークに紐づけ可能
- 中間テーブル `bookmark_tags` で管理

### タグの仕様

| 要素 | 型 | 説明 | 制約 |
|------|-----|------|------|
| id | number | タグID | 自動採番 |
| userId | number | 所有ユーザーID | 外部キー |
| name | string | タグ名 | 1-50文字、ユーザー内で一意 |
| createdAt | datetime | 作成日時 | 自動設定 |

---

## 検索対象フィールド

全文検索の対象となるフィールド：

| フィールド | 重み | 備考 |
|-----------|------|------|
| title | 高 | 主要な検索対象 |
| description | 中 | 補助的な検索対象 |
| path | 中 | URL、ファイル名、ディレクトリ名での検索 |
| tags | 高 | タグ名での完全一致・部分一致 |

---

## API レスポンス形式

### 単一ブックマーク

```json
{
  "data": {
    "id": 1,
    "path": "https://nextjs.org/docs",
    "title": "Next.js公式ドキュメント",
    "description": "Next.jsの公式ドキュメント",
    "isFavorite": true,
    "tags": ["JavaScript", "React", "フレームワーク"],
    "createdAt": "2026-01-15T08:00:00.000Z",
    "updatedAt": "2026-01-15T08:00:00.000Z"
  }
}
```

### ブックマーク一覧

```json
{
  "data": [
    { "id": 1, "path": "https://nextjs.org/docs", "title": "Next.js Docs", ... },
    { "id": 2, "path": "C:\\Projects\\design.md", "title": "設計書", ... },
    { "id": 3, "path": "\\\\fileserver\\share\\report.xlsx", "title": "月次レポート", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "totalPages": 3
  }
}
```

---

## セキュリティ考慮

### パストラバーサル対策

- 入力されたパスはそのまま保存（実行しない）
- クライアント側でパスを開く際はOS標準の方法を使用
- サーバー側でファイルシステムにアクセスしない

### 機密情報

- 認証情報を含むURL（`https://user:pass@host`）は警告を表示
- 保存は許可するが、表示時にマスキングを検討

---

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| URL/ファイルを別フィールドで管理 | 型安全、明確な分離 | 冗長、相互排他の制約が必要 | 統一pathを採用 |
| typeフィールドで明示的に分類 | 確実な判定 | 入力時の手間、不整合リスク | 自動判定を採用 |
| パスを正規化して保存 | 検索の一貫性 | 元の形式が失われる | 元形式を保持 |

## 結果

URLとファイルパスを統一の `path` フィールドで管理することで、シンプルなデータ構造を実現します。パスの種類は形式から自動判定し、Windows/Unix/ネットワークパスなど多様な形式をサポートします。

## 関連ドキュメント

- [ADR-0003: データベースの選定](0003-database.md)
- [ADR-0005: API設計方針](0005-api-design.md)
- [データベーススキーマ仕様](../spec/database-schema.md)
- [ブックマークページ仕様](../spec/webpages/bookmarks.md)
