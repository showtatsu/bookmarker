---
name: audit-logging
description: 'Audit Logging Strategy for Bookmarker Application'
status: accepted
---

## タイトル
監査ログの保存方針

## 概要
Bookmarkerアプリケーションにおける監査ログ（Audit Log）の保存・管理方針に関する決定事項です。

## 背景
マルチユーザー対応アプリケーションとして、セキュリティインシデントの追跡、ユーザー行動の分析、コンプライアンス対応のために、重要な操作の監査ログを記録・保存する必要があります。通常のアプリケーションログ（ADR-0006）とは別に、長期保存と検索性を重視した監査ログ専用の仕組みを設けます。

## 決定事項

### 監査ログの定義

監査ログは、**誰が**、**いつ**、**何を**、**どのように** 操作したかを記録するログです。通常のデバッグログやエラーログとは異なり、ビジネス上・セキュリティ上重要なイベントを長期間保存します。

### 記録対象イベント

| カテゴリ | イベント | 重要度 |
|---------|---------|--------|
| **認証** | ログイン成功 | HIGH |
| | ログイン失敗 | HIGH |
| | ログアウト | MEDIUM |
| | パスワード変更 | HIGH |
| | パスワードリセット要求 | HIGH |
| **APIトークン** | トークン発行 | HIGH |
| | トークン削除 | HIGH |
| | トークン使用 | LOW |
| **ユーザー管理** | ユーザー登録 | HIGH |
| | プロフィール更新 | MEDIUM |
| | アカウント削除 | HIGH |
| **ブックマーク** | 作成 | LOW |
| | 更新 | LOW |
| | 削除 | MEDIUM |
| | 一括削除 | HIGH |
| **システム** | 設定変更 | HIGH |
| | データエクスポート | HIGH |
| | データインポート | HIGH |

### 監査ログスキーマ

監査ログのスキーマは Prisma で定義されています。詳細は [ADR-0003: データベースの選定](0003-database.md) の `AuditLog` モデルを参照してください。

```prisma
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

### ログエントリ例

```json
{
  "id": 12345,
  "timestamp": "2026-01-17T10:30:00.000Z",
  "user_id": 1,
  "action": "AUTH_LOGIN",
  "resource_type": null,
  "resource_id": null,
  "severity": "HIGH",
  "ip_address": "192.168.1.100",
  "user_agent": "Mozilla/5.0 ...",
  "request_id": "req_abc123",
  "details": {
    "username": "testuser",
    "method": "password"
  },
  "outcome": "SUCCESS"
}
```

### アクション種別一覧

```typescript
enum AuditAction {
  // 認証
  AUTH_LOGIN = 'AUTH_LOGIN',
  AUTH_LOGIN_FAILED = 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT = 'AUTH_LOGOUT',
  AUTH_PASSWORD_CHANGE = 'AUTH_PASSWORD_CHANGE',
  AUTH_PASSWORD_RESET_REQUEST = 'AUTH_PASSWORD_RESET_REQUEST',
  
  // APIトークン
  TOKEN_CREATE = 'TOKEN_CREATE',
  TOKEN_DELETE = 'TOKEN_DELETE',
  TOKEN_USE = 'TOKEN_USE',
  
  // ユーザー管理
  USER_REGISTER = 'USER_REGISTER',
  USER_PROFILE_UPDATE = 'USER_PROFILE_UPDATE',
  USER_DELETE = 'USER_DELETE',
  
  // ブックマーク
  BOOKMARK_CREATE = 'BOOKMARK_CREATE',
  BOOKMARK_UPDATE = 'BOOKMARK_UPDATE',
  BOOKMARK_DELETE = 'BOOKMARK_DELETE',
  BOOKMARK_BULK_DELETE = 'BOOKMARK_BULK_DELETE',
  
  // システム
  SYSTEM_CONFIG_CHANGE = 'SYSTEM_CONFIG_CHANGE',
  DATA_EXPORT = 'DATA_EXPORT',
  DATA_IMPORT = 'DATA_IMPORT',
}
```

### 実装方針

#### 監査ログサービス

```typescript
// services/audit-log-service.ts
interface AuditLogEntry {
  userId?: number;
  action: AuditAction;
  resourceType?: string;
  resourceId?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH';
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  details?: Record<string, unknown>;
  outcome: 'SUCCESS' | 'FAILURE';
}

class AuditLogService {
  async log(entry: AuditLogEntry): Promise<void> {
    // 非同期でDBに書き込み（リクエスト処理をブロックしない）
    await this.repository.create({
      ...entry,
      timestamp: new Date(),
    });
  }
}
```

#### ミドルウェア統合

```typescript
// middlewares/audit-middleware.ts
export const auditMiddleware = (auditService: AuditLogService) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // リクエストIDを生成
    req.requestId = `req_${nanoid()}`;
    
    // レスポンス完了後に監査ログを記録
    res.on('finish', () => {
      if (shouldAudit(req)) {
        auditService.log({
          userId: req.user?.id,
          action: mapRouteToAction(req),
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          requestId: req.requestId,
          outcome: res.statusCode < 400 ? 'SUCCESS' : 'FAILURE',
        });
      }
    });
    
    next();
  };
};
```

### 保存期間とアーカイブ

| 重要度 | 保存期間 | アーカイブ |
|--------|---------|-----------|
| HIGH | 3年 | 1年後にアーカイブ |
| MEDIUM | 1年 | 6ヶ月後にアーカイブ |
| LOW | 90日 | アーカイブなし |

### アーカイブ戦略

アーカイブは Prisma を経由して実行します。データベース種別（SQLite/PostgreSQL）に依存しない形式で処理します。

```typescript
// scripts/archive-audit-logs.ts
import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

async function archiveOldLogs() {
  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
  
  // HIGHの古いログを取得
  const logsToArchive = await prisma.auditLog.findMany({
    where: {
      severity: 'HIGH',
      timestamp: { lt: oneYearAgo },
    },
  });
  
  // JSONファイルに出力
  const date = new Date().toISOString().split('T')[0];
  fs.writeFileSync(
    `/backup/audit_logs_${date}.json`,
    JSON.stringify(logsToArchive, null, 2)
  );
  
  // アーカイブ済みログを削除
  await prisma.auditLog.deleteMany({
    where: {
      severity: 'HIGH',
      timestamp: { lt: oneYearAgo },
    },
  });
  
  console.log(`Archived ${logsToArchive.length} logs`);
}

archiveOldLogs();
```

#### 監査ログ API

監査ログAPIの詳細は [ADR-0005: API設計方針](0005-api-design.md) を参照してください。

### プライバシー考慮事項

- **ユーザーエージェント**: ブラウザ/OS情報のみ保持、詳細は省略
- **details フィールド**: 機密情報（パスワード、トークン）は含めない

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| SQLiteテーブル（採用） | シンプル、既存DBと統合 | 大量ログ時の性能懸念 | 小〜中規模に十分 |
| 別ファイル（JSON Lines） | 追記が高速 | 検索が困難 | 検索性を重視して不採用 |
| 外部サービス（Elasticsearch等） | 高性能検索、スケーラブル | 運用コスト増 | オーバースペック |

## 結果
SQLiteの専用テーブルで監査ログを管理することで、シンプルな構成を維持しながら、セキュリティ監査とコンプライアンス要件に対応できます。

## 関連ドキュメント
- [ADR-0003: データベースの選定](0003-database.md)
- [ADR-0004: 認証方式の選定](0004-authentication.md)
- [ADR-0005: API設計方針](0005-api-design.md)
- [ADR-0006: ロギングとモニタリングの方針](0006-logging-monitoring.md)
- [ADR-0010: セキュリティ対策方針](0010-security.md)
