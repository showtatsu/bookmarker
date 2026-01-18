---
name: framework
description: 'Development Framework for Architectural Decision Records (ADR)'
status: accepted
---

## 概要
使用する言語、開発フレームワーク、および主要なライブラリの選定に関するアーキテクチャ決定記録 (ADR) です。
## 決定事項
- **言語**: TypeScript を採用。型安全性と開発効率の向上を目的としています。
- **フレームワーク**: Next.js を選定。サーバーサイドレンダリングと静的サイト生成の両方に対応できるため、柔軟な開発が可能です。
- **主要ライブラリ**:
  - **バックエンド**:
    - SQLite3: 軽量でセットアップが容易なデータベースソリューション。
    - JWT: セキュアな認証を実現するためのトークンベース認証。
    - bcryptjs: パスワードの安全なハッシュ化に使用。
  - **フロントエンド**:
    - TailwindCSS: ユーティリティファーストのCSSフレームワークで、迅速なUI開発を支援。
- **URL設計**: RESTful API設計を採用し、リソース指向のエンドポイントを提供します。
  - **ベースURL**: 環境変数 `BASE_URL` に基づいて設定されます。
  - **エンドポイント例**:
    - トップページ: `${BASE_URL}/`
    - API: `${BASE_URL}/api/*`
    - コンテンツ: `${BASE_URL}/assets/*`
