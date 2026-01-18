---
name: logging-monitoring
description: 'Logging and Monitoring Strategy for Bookmarker Application'
status: accepted
---

## タイトル
ロギングとモニタリングの方針

## 概要
Bookmarkerアプリケーションにおけるログ出力とモニタリングに関する決定事項です。

## 背景
アプリケーションの運用・デバッグ・セキュリティ監査のために、適切なログ出力とモニタリング体制が必要です。個人〜小規模チーム利用を想定し、シンプルかつ効果的な方針を定めます。

## 決定事項

### ロギングライブラリ: pino

- **選定理由**:
  - 高速（JSON出力に最適化）
  - 構造化ログ対応
  - シンプルなAPI
  - Node.js エコシステムで広く普及

### ログレベル

| レベル | 用途 | 例 |
|--------|------|-----|
| fatal | アプリケーション停止が必要なエラー | データベース接続不可 |
| error | 処理失敗エラー | API呼び出し失敗 |
| warn | 潜在的な問題 | 非推奨機能の使用 |
| info | 重要なイベント | サーバー起動、ユーザーログイン |
| debug | デバッグ情報 | リクエスト詳細 |
| trace | 詳細なトレース | 関数呼び出しトレース |

### 環境別設定

| 環境 | ログレベル | 出力先 | フォーマット |
|------|-----------|--------|-------------|
| development | debug | stdout | pretty print |
| production | info | stdout + ファイル | JSON |
| test | warn | /dev/null | JSON |

### ログ出力内容

#### リクエストログ

```json
{
  "level": "info",
  "time": "2026-01-17T10:30:00.000Z",
  "req": {
    "method": "GET",
    "url": "/api/bookmarks",
    "headers": { "user-agent": "..." }
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 45,
  "userId": 1
}
```

#### エラーログ

```json
{
  "level": "error",
  "time": "2026-01-17T10:30:00.000Z",
  "err": {
    "type": "ValidationError",
    "message": "タイトルは必須です",
    "stack": "..."
  },
  "req": {
    "method": "POST",
    "url": "/api/bookmarks"
  },
  "userId": 1
}
```

### セキュリティログ

以下のイベントは必ずログに記録：

- ログイン成功/失敗
- ログアウト
- パスワード変更
- APIトークン発行/削除
- 認証エラー（401）
- 権限エラー（403）

### 機密情報の除外

以下はログに出力しない：

- パスワード
- JWTトークン（マスキング: `eyJ***...***`）
- APIトークン（マスキング）
- クレジットカード情報（該当なし）

### モニタリング

#### ヘルスチェックエンドポイント

```
GET /api/health
```

```json
{
  "status": "healthy",
  "timestamp": "2026-01-17T10:30:00.000Z",
  "version": "1.0.0",
  "uptime": 86400,
  "database": "connected"
}
```

#### メトリクス（将来拡張）

- リクエスト数/秒
- レスポンスタイム（p50, p95, p99）
- エラー率
- アクティブユーザー数

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| pino（採用） | 高速、構造化ログ | pretty printに追加設定必要 | 性能とシンプルさのバランス |
| winston | 多機能、トランスポート豊富 | 複雑、やや重い | オーバースペック |
| console.log | 設定不要 | 構造化困難、本番運用に不向き | 開発初期のみ |

## 結果
pino によるシンプルな構造化ログにより、デバッグと運用監視の両方に対応できます。

## 関連ドキュメント
- [ADR-0007: デプロイメント戦略](0007-deployment.md)
- [ADR-0010: セキュリティ対策方針](0010-security.md)
