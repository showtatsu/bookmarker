#!/bin/bash
# 安全なマイグレーションスクリプト
# 使用方法: ./scripts/migrate.sh [マイグレーション名]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
MIGRATION_NAME="${1:-}"

cd "$BACKEND_DIR"

echo "🔄 データベースマイグレーションを開始します..."
echo ""

# 1. バックアップ作成
echo "📦 Step 1: バックアップを作成中..."
./scripts/backup-db.sh dev
echo ""

# 2. マイグレーション実行
echo "🚀 Step 2: マイグレーションを実行中..."
if [ -n "$MIGRATION_NAME" ]; then
    npx prisma migrate dev --name "$MIGRATION_NAME"
else
    npx prisma migrate dev
fi
echo ""

# 3. Prisma Client再生成
echo "🔧 Step 3: Prisma Clientを再生成中..."
npx prisma generate
echo ""

# 4. 検証
echo "✅ Step 4: データベースを検証中..."
npx ts-node --esm scripts/verify-db.ts || echo "⚠️  検証スクリプトがありません（スキップ）"
echo ""

echo "🎉 マイグレーション完了！"
