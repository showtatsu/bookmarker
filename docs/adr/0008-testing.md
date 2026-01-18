---
name: testing
description: 'Testing Strategy for Bookmarker Application'
status: accepted
---

## タイトル
テスト戦略

## 概要
Bookmarkerアプリケーションにおけるテスト戦略に関する決定事項です。

## 背景
アプリケーションの品質を担保し、リファクタリングや機能追加を安全に行うために、適切なテスト戦略が必要です。

## 決定事項

### テストフレームワーク

| 領域 | フレームワーク | 用途 |
|------|---------------|------|
| バックエンド | Vitest | ユニットテスト、統合テスト |
| フロントエンド | Vitest + React Testing Library | コンポーネントテスト |
| E2E | Playwright | エンドツーエンドテスト |

### テストピラミッド

```
        /\
       /  \  E2E（少数）
      /----\  
     /      \  統合テスト（中程度）
    /--------\  
   /          \  ユニットテスト（多数）
  --------------
```

### ディレクトリ構成

```
backend/
├── src/
│   └── services/
│       ├── bookmark-service.ts
│       └── bookmark-service.test.ts  # コロケーション
├── tests/
│   ├── integration/                   # 統合テスト
│   │   └── api/
│   │       └── bookmarks.test.ts
│   └── fixtures/                      # テストデータ
│       └── bookmarks.json

frontend/
├── src/
│   └── components/
│       ├── bookmark-list.tsx
│       └── bookmark-list.test.tsx    # コロケーション
└── tests/
    └── e2e/                          # E2Eテスト
        └── bookmarks.spec.ts
```

### テスト種別と方針

#### ユニットテスト

- **対象**: Service、Repository、ユーティリティ関数
- **方針**:
  - 外部依存はモック化
  - 1テストケース1アサーション（原則）
  - AAA パターン（Arrange-Act-Assert）

```typescript
// bookmark-service.test.ts
describe('BookmarkService', () => {
  describe('create', () => {
    it('should create a new bookmark with valid data', async () => {
      // Arrange
      const mockRepo = { create: vi.fn().mockResolvedValue({ id: 1 }) };
      const service = new BookmarkService(mockRepo);
      
      // Act
      const result = await service.create({ title: 'Test', url: 'https://example.com' });
      
      // Assert
      expect(result.id).toBe(1);
    });
  });
});
```

#### 統合テスト

- **対象**: API エンドポイント
- **方針**:
  - 実際のデータベース（テスト用SQLite）を使用
  - 各テスト前にデータベースをリセット
  - supertest でHTTPリクエストをテスト

```typescript
// tests/integration/api/bookmarks.test.ts
describe('POST /api/bookmarks', () => {
  beforeEach(async () => {
    await resetDatabase();
  });

  it('should create a bookmark and return 201', async () => {
    const res = await request(app)
      .post('/api/bookmarks')
      .set('Authorization', `Bearer ${testToken}`)
      .send({ title: 'Test', url: 'https://example.com' });
    
    expect(res.status).toBe(201);
    expect(res.body.data.title).toBe('Test');
  });
});
```

#### E2Eテスト

- **対象**: 主要なユーザーフロー
- **方針**:
  - クリティカルパスのみ（ログイン、ブックマーク作成/削除、検索）
  - 実際のブラウザで実行
  - CI環境ではヘッドレスモード

```typescript
// tests/e2e/bookmarks.spec.ts
test('user can create and delete a bookmark', async ({ page }) => {
  await page.goto('/');
  await page.fill('[data-testid="login-username"]', 'testuser');
  await page.fill('[data-testid="login-password"]', 'password123');
  await page.click('[data-testid="login-submit"]');
  
  // ブックマーク作成
  await page.click('[data-testid="add-bookmark"]');
  await page.fill('[data-testid="bookmark-title"]', 'Test Bookmark');
  await page.fill('[data-testid="bookmark-url"]', 'https://example.com');
  await page.click('[data-testid="bookmark-save"]');
  
  await expect(page.locator('text=Test Bookmark')).toBeVisible();
});
```

### テストカバレッジ目標

| 領域 | 目標カバレッジ |
|------|---------------|
| Service | 80% 以上 |
| Repository | 70% 以上 |
| Controller | 60% 以上 |
| コンポーネント | 70% 以上 |
| 全体 | 70% 以上 |

### テスト実行コマンド

```bash
# ユニットテスト
npm run test

# ウォッチモード
npm run test:watch

# カバレッジ
npm run test:coverage

# E2Eテスト
npm run test:e2e

# E2Eテスト（UIモード）
npm run test:e2e:ui
```

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| Vitest（採用） | 高速、Vite互換、Jest互換API | 比較的新しい | モダンで高速 |
| Jest | 広く普及、情報豊富 | やや遅い、ESM対応に難あり | Vitestの方が軽量 |
| Playwright（採用） | クロスブラウザ、高速 | 学習コスト | E2Eに最適 |
| Cypress | 直感的、デバッグしやすい | やや遅い、クロスブラウザ制限 | Playwrightの方が高速 |

## 結果
Vitest + Playwright の組み合わせにより、高速なフィードバックループと信頼性の高いE2Eテストを実現できます。

## 関連ドキュメント
- [ADR-0009: CI/CDパイプラインの設計](0009-ci-cd.md)
