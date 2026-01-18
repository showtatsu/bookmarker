---
name: security
description: 'Security Measures for Bookmarker Application'
status: accepted
---

## タイトル
セキュリティ対策方針

## 概要
Bookmarkerアプリケーションにおけるセキュリティ対策に関する決定事項です。

## 背景
マルチユーザー対応のWebアプリケーションとして、ユーザーデータの保護、不正アクセスの防止、一般的なWeb脆弱性への対策が必要です。

## 決定事項

### 認証・認可

| 対策 | 実装 |
|------|------|
| パスワードハッシュ化 | bcryptjs（コストファクター: 12） |
| トークン認証 | JWT（アクセストークン + リフレッシュトークン） |
| トークン保存 | HTTPOnly Cookie（XSS対策） |
| セッション無効化 | リフレッシュトークンのDB管理 |

### パスワードポリシー

```typescript
const passwordPolicy = {
  minLength: 8,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecialChar: false,  // 推奨だが必須ではない
};
```

### HTTPセキュリティヘッダー（Helmet）

```typescript
import helmet from 'helmet';

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // TailwindCSS用
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));
```

### CORS設定

```typescript
import cors from 'cors';

app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,  // Cookie送信を許可
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
```

### 入力バリデーション

- **ライブラリ**: zod
- **方針**:
  - すべてのAPIエンドポイントで入力バリデーション
  - 型安全なスキーマ定義
  - エラーメッセージは日本語対応

```typescript
import { z } from 'zod';

export const createBookmarkSchema = z.object({
  title: z.string()
    .min(1, 'タイトルは必須です')
    .max(200, 'タイトルは200文字以内で入力してください'),
  type: z.enum(['url', 'file'], {
    errorMap: () => ({ message: 'タイプはurlまたはfileを指定してください' }),
  }),
  url: z.string().url('有効なURLを入力してください').optional(),
  filePath: z.string().optional(),
  description: z.string().max(1000).optional(),
  tags: z.array(z.string()).max(10, 'タグは10個まで設定できます').optional(),
}).refine(
  (data) => (data.type === 'url' && data.url) || (data.type === 'file' && data.filePath),
  { message: 'URLまたはファイルパスを指定してください' }
);
```

### SQLインジェクション対策

- **方針**: Prisma を使用し、パラメータ化クエリを自動適用
- 生SQLを使用する場合は `$queryRaw` でプレースホルダーを使用

```typescript
// Prisma による型安全なクエリ（推奨）
const user = await prisma.user.findUnique({
  where: { username },
});

// 生SQLが必要な場合（プレースホルダー使用）
const users = await prisma.$queryRaw`
  SELECT * FROM users WHERE username = ${username}
`;
```

### XSS対策

| 層 | 対策 |
|---|---|
| フロントエンド | React/Next.js のデフォルトエスケープ |
| バックエンド | レスポンスの Content-Type 明示 |
| Cookie | HTTPOnly フラグ |
| CSP | script-src 'self' |

### CSRF対策

- **SameSite Cookie**: `Strict` または `Lax`
- **カスタムヘッダー**: API呼び出し時に `X-Requested-With` ヘッダー検証（オプション）

```typescript
app.use(cookieParser());
app.use((req, res, next) => {
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 60 * 60 * 1000,  // 1時間
  });
  next();
});
```

### 依存関係のセキュリティ

- **npm audit**: CI で定期実行
- **Dependabot**: GitHub で有効化し、自動PR作成

```yaml
# .github/dependabot.yml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/backend"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/frontend"
    schedule:
      interval: "weekly"
```

### セキュリティチェックリスト

開発時に確認すべき項目：

- [ ] パスワードはbcryptでハッシュ化されているか
- [ ] SQLクエリはパラメータ化されているか
- [ ] ユーザー入力はバリデーションされているか
- [ ] 認証が必要なエンドポイントにミドルウェアが設定されているか
- [ ] 他ユーザーのリソースにアクセスできないか
- [ ] 機密情報がログに出力されていないか
- [ ] HTTPSが有効か（本番環境）

## 代替案

| 対策 | 採用ライブラリ | 代替案 | 判断理由 |
|------|--------------|--------|----------|
| パスワードハッシュ | bcryptjs | argon2 | bcryptjs は広く使われ、純粋JSで依存が少ない |
| バリデーション | zod | joi, yup | TypeScript との親和性が高い |
| セキュリティヘッダー | helmet | 手動設定 | helmet は包括的で設定が容易 |

## 結果
多層防御アプローチにより、一般的なWeb脆弱性（OWASP Top 10）に対応したセキュアなアプリケーションを実現できます。

## 関連ドキュメント
- [ADR-0004: 認証方式の選定](0004-authentication.md)
- [ADR-0005: API設計方針](0005-api-design.md)
- [ADR-0006: ロギングとモニタリングの方針](0006-logging-monitoring.md)
