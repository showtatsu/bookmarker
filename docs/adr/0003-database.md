---
name: database
description: 'Database Selection for Bookmarker Application'
status: accepted
---

## タイトル
データベースの選定

## 概要
Bookmarkerアプリケーションで使用するデータベースの選定に関する決定事項です。

## 背景
マルチユーザー対応のブックマーク管理アプリとして、ユーザーデータ、ブックマーク、タグを永続化する必要があります。個人利用〜小規模チーム利用を想定し、セットアップの容易さと運用コストの低さを重視します。
ただし、将来的なスケーラビリティも考慮し、PostgreSQLにも移行可能な設計を目指します。

## 決定事項

### データベース: SQLite3 / PostgreSQL（環境変数で切替）

環境変数 `DATABASE_PROVIDER` で SQLite3 または PostgreSQL を切り替えます。

| 環境 | 推奨DB | 理由 |
|------|--------|------|
| 開発環境 | SQLite3 | セットアップ不要、軽量 |
| 本番環境（小規模） | SQLite3 | 運用シンプル、十分な性能 |
| 本番環境（中〜大規模） | PostgreSQL | 同時接続、スケーラビリティ |

### ORM: Prisma

- **選定理由**:
  - 型安全なデータアクセス（TypeScript統合）
  - SQLite3 / PostgreSQL 両対応
  - マイグレーション管理が容易
  - 直感的な API

### スキーマ設計

詳細なスキーマ定義は [データベーススキーマ仕様](../spec/database-schema.md) を参照してください。

**主要テーブル:**

| テーブル | 説明 |
|---------|------|
| users | ユーザー情報 |
| bookmarks | ブックマーク（URL/ファイル） |
| tags | タグ |
| bookmark_tags | ブックマーク-タグ中間テーブル |
| api_tokens | APIアクセストークン |
| audit_logs | 監査ログ |

### 環境変数

| 変数名 | 説明 |
|--------|------|
| DATABASE_URL | データベース接続URL（例: `file:./data/bookmarker.dev.db`） |

**注意**: Prisma 6 では `provider` に `env()` 関数を使用できないため、DBプロバイダ切替は `schema.prisma` の `provider` を直接変更する必要があります。

### マイグレーション戦略

- Prisma Migrate を使用（`npx prisma migrate dev` / `npx prisma migrate deploy`）
- マイグレーションファイルは `prisma/migrations/` に自動生成
- 本番デプロイ時は `npx prisma migrate deploy` で適用

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| Prisma（採用） | 型安全、マイグレーション管理、DB切替容易 | 学習コスト | TypeScript統合が優秀 |
| 生SQL（better-sqlite3等） | 軽量、シンプル | DB移行時に書き換え必要 | 保守性を考慮し不採用 |
| TypeORM | 機能豊富 | 設定が複雑、パフォーマンス | Prismaの方がシンプル |
| Drizzle | 軽量、SQL風 | エコシステムが小さい | 将来検討 |

## 結果
Prisma の採用により、SQLite3 と PostgreSQL を環境変数で切り替えられる柔軟な構成を実現。開発環境ではセットアップ不要の SQLite3、本番環境では要件に応じて SQLite3 または PostgreSQL を選択できます。

## 関連ドキュメント
- [データベーススキーマ仕様](../spec/database-schema.md)
- [ADR-0001: 開発フレームワークの選定](0001-framework.md)
- [ADR-0002: コード構成方針](0002-code-structure.md)
- [ADR-0010: セキュリティ対策方針](0010-security.md)
- [Prisma公式ドキュメント](https://www.prisma.io/docs/)
- [SQLite公式ドキュメント](https://www.sqlite.org/docs.html)
- [PostgreSQL公式ドキュメント](https://www.postgresql.org/docs/)
