# データインポート・エクスポート仕様

## 概要

ブックマークとタグのCSVインポート・エクスポート機能を提供します。
データ移行、バックアップ、一括編集などの用途に使用できます。

## CSVフォーマット

### ブックマーク (bookmarks.csv)

```csv
path,title,description,isFavorite,tags,createdAt
https://example.com,Example Site,サンプルサイト,true,"tag1,tag2,tag3",2026-01-18T00:00:00.000Z
/Users/docs/readme.md,README,説明書,false,"docs",2026-01-17T00:00:00.000Z
```

| カラム      | 必須 | 説明                                        |
| ----------- | ---- | ------------------------------------------- |
| path        | ○    | URL またはファイルパス                      |
| title       | ○    | タイトル                                    |
| description | -    | 説明（省略可）                              |
| isFavorite  | -    | お気に入り（true/false、デフォルト: false） |
| tags        | -    | タグ名（カンマ区切り、ダブルクォート囲み）  |
| createdAt   | -    | 作成日時（ISO 8601形式、省略時は現在時刻）  |

### タグ (tags.csv)

```csv
name,isFavorite
work,true
personal,false
docs,true
```

| カラム     | 必須 | 説明                                        |
| ---------- | ---- | ------------------------------------------- |
| name       | ○    | タグ名                                      |
| isFavorite | -    | お気に入り（true/false、デフォルト: false） |

## エクスポート

### API エンドポイント

```
GET /api/bookmarks/export?format=csv
GET /api/tags/export?format=csv
```

### レスポンス

- Content-Type: `text/csv; charset=utf-8`
- Content-Disposition: `attachment; filename="bookmarks_YYYY-MM-DD.csv"`

## インポート

### API エンドポイント

```
POST /api/bookmarks/import
POST /api/tags/import
```

### リクエスト

- Content-Type: `multipart/form-data`
- Body: `file` フィールドにCSVファイル

### インポート動作

#### ブックマークインポート

1. CSVファイルを読み込み、各行をパース
2. 重複チェック: 同じ `path` が既に存在する場合
   - `mode=skip` (デフォルト): スキップ
   - `mode=update`: 既存データを更新
   - `mode=duplicate`: 新規として追加
3. タグ処理:
   - 指定されたタグが存在しない場合は**自動作成**
   - 自動作成されたタグは `isFavorite: false` で作成
4. 結果をレスポンスとして返す

#### タグインポート

1. CSVファイルを読み込み、各行をパース
2. 重複チェック: 同じ `name` が既に存在する場合
   - `mode=skip` (デフォルト): スキップ
   - `mode=update`: 既存データを更新
3. 結果をレスポンスとして返す

### レスポンス

```json
{
  "data": {
    "imported": 10,
    "skipped": 2,
    "updated": 0,
    "errors": [],
    "tagsCreated": ["new-tag1", "new-tag2"]
  }
}
```

## CLIスクリプト

### エクスポート

```bash
# ブックマークをエクスポート
npm run db:export -- --type bookmarks --output ./export/bookmarks.csv

# タグをエクスポート
npm run db:export -- --type tags --output ./export/tags.csv

# 全データをエクスポート
npm run db:export -- --type all --output ./export/
```

### インポート

```bash
# ブックマークをインポート（プレビュー）
npm run db:import -- --type bookmarks --file ./import/bookmarks.csv --preview

# ブックマークをインポート（実行）
npm run db:import -- --type bookmarks --file ./import/bookmarks.csv

# タグをインポート
npm run db:import -- --type tags --file ./import/tags.csv
```

## 注意事項

1. **文字エンコーディング**: UTF-8 のみサポート
2. **タグの自動作成**: インポート時に存在しないタグは自動作成される
3. **パス検証**: URL/ファイルパスの形式検証は通常のブックマーク作成と同じルールを適用
4. **大量データ**: 1000件以上の場合はバッチ処理で実行
5. **バックアップ推奨**: インポート前にデータベースのバックアップを推奨

## 関連ドキュメント

- [ADR-0016: データマイグレーション戦略](../adr/0016-data-migration-strategy.md)
- [API仕様書](./api-specification.md)
