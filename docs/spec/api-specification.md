# API仕様

## 概要

Bookmarkerアプリケーションの RESTful API 仕様です。

## 関連ADR

- [ADR-0004: 認証方式の選定](../adr/0004-authentication.md)
- [ADR-0005: API設計方針](../adr/0005-api-design.md)
- [ADR-0010: セキュリティ対策方針](../adr/0010-security.md)
- [ADR-0011: 監査ログの保存方針](../adr/0011-audit-logging.md)

---

## ベースURL

アプリケーションのベースURLは環境変数、`BASE_URL` に基づいて設定されます。
`BASE_URL` が未設定の場合、デフォルトで `http://localhost:4000` が使用されます。

APIは `${BASE_URL}/api` パスで提供されます。
例: `http://localhost:4000/api`

---

## 認証

### 認証方式

1. **Cookie認証（Web）**: HTTPOnly Cookie に JWT アクセストークンを格納
2. **Bearer認証（API）**: `Authorization: Bearer <token>` ヘッダー

### 認証が不要なエンドポイント

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/oidc/providers`
- `GET /api/auth/oidc/:provider/authorize`
- `GET /api/auth/oidc/:provider/callback`
- `GET /api/health`

---

## エンドポイント一覧

### 認証 API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| POST | `/api/auth/register` | ユーザー登録 | 不要 |
| POST | `/api/auth/login` | ログイン（パスワード認証） | 不要 |
| POST | `/api/auth/logout` | ログアウト | 必要 |
| POST | `/api/auth/refresh` | トークンリフレッシュ | Cookie |
| GET | `/api/auth/me` | 現在のユーザー情報 | 必要 |

### OpenID Connect API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/auth/oidc/providers` | 利用可能なOIDCプロバイダ一覧 | 不要 |
| GET | `/api/auth/oidc/:provider/authorize` | OIDC認証開始（リダイレクト） | 不要 |
| GET | `/api/auth/oidc/:provider/callback` | OIDCコールバック処理 | 不要 |
| DELETE | `/api/auth/oidc/:provider` | OIDCプロバイダ連携解除 | 必要 |

### ブックマーク API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/bookmarks` | ブックマーク一覧取得 | 必要 |
| GET | `/api/bookmarks/:id` | ブックマーク詳細取得 | 必要 |
| POST | `/api/bookmarks` | ブックマーク作成 | 必要 |
| PUT | `/api/bookmarks/:id` | ブックマーク更新 | 必要 |
| DELETE | `/api/bookmarks/:id` | ブックマーク削除 | 必要 |
| PUT | `/api/bookmarks/:id/favorite` | お気に入りトグル | 必要 |

### タグ API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/tags` | タグ一覧取得 | 必要 |
| POST | `/api/tags` | タグ作成 | 必要 |
| PUT | `/api/tags/:id` | タグ更新 | 必要 |
| DELETE | `/api/tags/:id` | タグ削除 | 必要 |

### APIトークン API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/tokens` | トークン一覧取得 | 必要 |
| POST | `/api/tokens` | トークン発行 | 必要 |
| DELETE | `/api/tokens/:id` | トークン削除 | 必要 |

### 監査ログ API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/audit-logs` | 監査ログ一覧取得（自分のみ） | 必要 |
| GET | `/api/audit-logs/:id` | 監査ログ詳細取得 | 必要 |

### 監査ログ API（管理者向け）

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/admin/audit-logs` | 監査ログ検索（全ユーザ対象） | 管理者 |
| GET | `/api/admin/audit-logs/export` | 監査ログエクスポート | 管理者 |

### システム API

| メソッド | パス | 説明 | 認証 |
|---------|------|------|------|
| GET | `/api/health` | ヘルスチェック | 不要 |

---

## クエリパラメータ

### ブックマーク一覧

```
GET /api/bookmarks?search=keyword&pathType=url&tags=tag1,tag2&favorite=true&page=1&limit=20&sort=created_at&order=desc
```

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| search | string | - | - | 全文検索キーワード |
| pathType | 'url' \| 'file' \| 'network' | - | - | パス種別（自動判定） |
| tags | string | - | - | カンマ区切りのタグ名 |
| favorite | boolean | - | - | お気に入りのみ |
| page | number | - | 1 | ページ番号（1始まり） |
| limit | number | - | 20 | 1ページあたりの件数（最大: 100） |
| sort | string | - | created_at | ソートフィールド |
| order | 'asc' \| 'desc' | - | desc | ソート順序 |

### 監査ログ一覧（管理者）

```
GET /api/admin/audit-logs?user_id=1&action=AUTH_LOGIN&severity=HIGH&from=2026-01-01&to=2026-01-31&page=1&limit=50
```

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| user_id | number | - | - | ユーザーID |
| action | string | - | - | アクション種別 |
| severity | 'LOW' \| 'MEDIUM' \| 'HIGH' | - | - | 重要度 |
| from | string | - | - | 開始日（ISO 8601形式） |
| to | string | - | - | 終了日（ISO 8601形式） |
| page | number | - | 1 | ページ番号 |
| limit | number | - | 50 | 1ページあたりの件数（最大: 100） |

---

## レスポンス形式

### 成功レスポンス（単一リソース）

```json
{
  "data": {
    "id": 1,
    "path": "https://example.com",
    "pathType": "url",
    "title": "Example Bookmark",
    "description": "説明文",
    "isFavorite": false,
    "tags": ["tech", "reference"],
    "createdAt": "2026-01-17T10:30:00.000Z",
    "updatedAt": "2026-01-17T10:30:00.000Z"
  }
}
```

### 成功レスポンス（リスト）

```json
{
  "data": [
    { "id": 1, "title": "...", ... },
    { "id": 2, "title": "...", ... }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

### エラーレスポンス

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "入力内容に誤りがあります",
    "details": [
      { "field": "title", "message": "タイトルは必須です" },
      { "field": "url", "message": "有効なURLを入力してください" }
    ]
  }
}
```

---

## HTTPステータスコード

| コード | 説明 | 使用場面 |
|--------|------|---------|
| 200 | OK | GET, PUT 成功 |
| 201 | Created | POST 成功（リソース作成） |
| 204 | No Content | DELETE 成功 |
| 400 | Bad Request | バリデーションエラー |
| 401 | Unauthorized | 認証エラー（未ログイン、トークン無効） |
| 403 | Forbidden | 権限エラー（他ユーザーのリソース等） |
| 404 | Not Found | リソース不存在 |
| 429 | Too Many Requests | レート制限超過 |
| 500 | Internal Server Error | サーバーエラー |

---

## エラーコード一覧

| コード | 説明 |
|--------|------|
| VALIDATION_ERROR | 入力バリデーションエラー |
| AUTHENTICATION_ERROR | 認証エラー |
| AUTHORIZATION_ERROR | 権限エラー |
| NOT_FOUND | リソース不存在 |
| CONFLICT | 重複エラー（ユーザー名、タグ名等） |
| RATE_LIMIT_EXCEEDED | レート制限超過 |
| INTERNAL_ERROR | サーバー内部エラー |

---

## リクエスト/レスポンス例

### POST /api/auth/register

**リクエスト**
```json
{
  "username": "testuser",
  "email": "test@example.com",
  "password": "SecurePass123"
}
```

**レスポンス** (201 Created)
```json
{
  "data": {
    "id": 1,
    "username": "testuser",
    "email": "test@example.com",
    "createdAt": "2026-01-17T10:30:00.000Z"
  }
}
```

### POST /api/auth/login

**リクエスト**
```json
{
  "username": "testuser",
  "password": "SecurePass123"
}
```

**レスポンス** (200 OK)
```json
{
  "data": {
    "user": {
      "id": 1,
      "username": "testuser",
      "email": "test@example.com"
    }
  }
}
```

※ アクセストークンは HTTPOnly Cookie に設定

### POST /api/bookmarks

**リクエスト**
```json
{
  "path": "https://example.com",
  "title": "Example Site",
  "description": "参考サイト",
  "tags": ["tech", "reference"]
}
```

**レスポンス** (201 Created)
```json
{
  "data": {
    "id": 1,
    "path": "https://example.com",
    "pathType": "url",
    "title": "Example Site",
    "description": "参考サイト",
    "isFavorite": false,
    "tags": ["tech", "reference"],
    "createdAt": "2026-01-17T10:30:00.000Z",
    "updatedAt": "2026-01-17T10:30:00.000Z"
  }
}
```

### GET /api/health

**レスポンス** (200 OK)
```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected"
}
```
