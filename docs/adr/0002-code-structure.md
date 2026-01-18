---
name: code-structure
description: 'Code Structure for Bookmarker Application'
status: accepted
---

## タイトル
コード構成方針

## 概要
Bookmarkerアプリケーションのディレクトリ構成とコード構造に関する決定事項です。

## 背景
マルチユーザー対応のブックマーク管理アプリとして、フロントエンド（Next.js）とバックエンド（Node.js API）を明確に分離し、保守性と拡張性を確保する必要があります。

## 決定事項

### ルートディレクトリ構成

```
bookmarker/
├── docs/                  # ドキュメント（DocDD）
│   ├── adr/              # アーキテクチャ決定記録
│   ├── spec/             # 仕様書
│   ├── api/              # APIドキュメント
│   ├── user-guide/       # ユーザーガイド
│   └── dev-guide/        # 開発者ガイド
├── frontend/             # Next.js フロントエンド
│   ├── src/
│   │   ├── app/          # App Router
│   │   ├── components/   # UIコンポーネント
│   │   ├── hooks/        # カスタムフック
│   │   ├── lib/          # ユーティリティ
│   │   └── types/        # 型定義
│   └── public/           # 静的ファイル
├── backend/              # Node.js バックエンド
│   ├── src/
│   │   ├── controllers/  # リクエストハンドラ
│   │   ├── services/     # ビジネスロジック
│   │   ├── repositories/ # データアクセス層
│   │   ├── middlewares/  # Express ミドルウェア
│   │   ├── routes/       # ルート定義
│   │   ├── types/        # 型定義
│   │   └── utils/        # ユーティリティ
│   └── db/               # データベース関連
└── .github/              # GitHub設定・エージェント
```

### コーディング規約

- **命名規則**:
  - ファイル名: kebab-case（例: `bookmark-list.tsx`）
  - コンポーネント: PascalCase（例: `BookmarkList`）
  - 関数・変数: camelCase（例: `getBookmarks`）
  - 定数: SCREAMING_SNAKE_CASE（例: `MAX_TAGS_PER_BOOKMARK`）

- **インポート順序**:
  1. 外部ライブラリ
  2. 内部モジュール（絶対パス）
  3. 相対パスのインポート
  4. 型インポート

### レイヤードアーキテクチャ（バックエンド）

```
Controller → Service → Repository → Database
```

- **Controller**: HTTPリクエスト/レスポンスの処理
- **Service**: ビジネスロジックの実装
- **Repository**: データアクセスの抽象化

## 代替案

| 案 | 説明 | 採用理由 |
|---|---|---|
| モノリポ（採用） | frontend/backend を1リポジトリで管理 | 小〜中規模プロジェクトに最適、開発効率が高い |
| マイクロサービス | 各サービスを独立リポジトリで管理 | 個人開発には過剰な複雑性 |
| フルスタックNext.js | API Routes のみでバックエンド実装 | 将来的な分離の柔軟性を確保するため不採用 |

## 結果
モノリポ構成により、フロントエンドとバックエンドの型定義を共有しやすく、開発効率が向上します。

## 関連ドキュメント
- [ADR-0001: 開発フレームワークの選定](0001-framework.md)
