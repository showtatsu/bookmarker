---
name: api-design
description: 'API Design Guidelines for Bookmarker Application'
status: accepted
---

## タイトル
API設計方針

## 概要
BookmarkerアプリケーションのRESTful API設計に関する決定事項です。

## 背景
フロントエンド（Next.js）とバックエンド（Node.js）間の通信、および外部ツールからのAPI利用のために、一貫性のあるAPI設計が必要です。

## 決定事項

### API設計原則

- **RESTful**: リソース指向のURL設計
- **JSON**: リクエスト/レスポンスはJSON形式
- **HTTPメソッド**: GET（取得）、POST（作成）、PUT（更新）、DELETE（削除）
- **ステータスコード**: HTTPステータスコードを適切に使用

### エンドポイント設計

詳細なエンドポイント仕様は [API仕様書](../spec/api-specification.md) を参照してください。

**APIカテゴリ:**

| カテゴリ | 主要エンドポイント |
|---------|-------------------|
| 認証 API | `/api/auth/*` - ログイン、登録、トークン管理 |
| OpenID Connect API | `/api/auth/oidc/*` - 外部プロバイダ認証 |
| ブックマーク API | `/api/bookmarks/*` - CRUD操作、お気に入り |
| タグ API | `/api/tags/*` - タグ管理 |
| APIトークン API | `/api/tokens/*` - アクセストークン管理 |
| 監査ログ API | `/api/audit-logs/*`, `/api/admin/audit-logs/*` |
| システム API | `/api/health` - ヘルスチェック |

### レスポンス形式

**成功レスポンス構造:**
- 単一リソース: `{ "data": { ... } }`
- リスト: `{ "data": [...], "pagination": { ... } }`

**エラーレスポンス構造:**
- `{ "error": { "code": "...", "message": "...", "details": [...] } }`

### HTTPステータスコード

| コード | 用途 |
|--------|------|
| 200 | 成功（GET, PUT） |
| 201 | 作成成功（POST） |
| 204 | 削除成功（DELETE） |
| 400 | バリデーションエラー |
| 401 | 認証エラー |
| 403 | 権限エラー |
| 404 | リソース不存在 |
| 429 | レート制限超過 |
| 500 | サーバーエラー |

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| REST（採用） | シンプル、広く普及 | オーバーフェッチの可能性 | 十分シンプルなデータ構造 |
| GraphQL | 柔軟なクエリ、型安全 | 学習コスト、複雑性 | 個人開発には過剰 |

## 結果
RESTful API設計により、直感的で一貫性のあるAPIインターフェースを提供できます。

## 関連ドキュメント
- [API仕様書](../spec/api-specification.md)
- [ADR-0004: 認証方式の選定](0004-authentication.md)
- [ADR-0010: セキュリティ対策方針](0010-security.md)
- [ADR-0011: 監査ログの保存方針](0011-audit-logging.md)
