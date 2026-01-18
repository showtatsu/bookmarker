#!/bin/bash
# データベース復元スクリプト
# 使用方法: ./scripts/restore-db.sh <バックアップファイルパス>

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
BACKUP_FILE="${1:-}"

if [ -z "$BACKUP_FILE" ]; then
    echo "使用方法: ./scripts/restore-db.sh <バックアップファイルパス>"
    echo ""
    echo "利用可能なバックアップ:"
    ls -la "$BACKEND_DIR/prisma/data/backups/" 2>/dev/null || echo "  バックアップがありません"
    exit 1
fi

# 絶対パスに変換
if [[ "$BACKUP_FILE" != /* ]]; then
    BACKUP_FILE="$BACKEND_DIR/$BACKUP_FILE"
fi

if [ ! -f "$BACKUP_FILE" ]; then
    echo "❌ バックアップファイルが見つかりません: $BACKUP_FILE"
    exit 1
fi

# 環境を推測
if [[ "$BACKUP_FILE" == *".dev."* ]]; then
    ENV="dev"
elif [[ "$BACKUP_FILE" == *".test."* ]]; then
    ENV="test"
elif [[ "$BACKUP_FILE" == *".prod."* ]]; then
    ENV="prod"
else
    ENV="dev"
fi

DB_FILE="$BACKEND_DIR/prisma/data/bookmarker.${ENV}.db"

echo "⚠️  以下のデータベースを復元します:"
echo "   バックアップ: $BACKUP_FILE"
echo "   復元先: $DB_FILE"
echo ""
read -p "続行しますか？ (y/N): " confirm

if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
    echo "キャンセルしました"
    exit 0
fi

# 現在のDBをバックアップ
if [ -f "$DB_FILE" ]; then
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    cp "$DB_FILE" "$DB_FILE.before_restore.$TIMESTAMP"
    echo "📦 現在のDBをバックアップしました: $DB_FILE.before_restore.$TIMESTAMP"
fi

# 復元
cp "$BACKUP_FILE" "$DB_FILE"
echo "✅ 復元完了: $DB_FILE"

# Prisma Client再生成
echo "🔧 Prisma Clientを再生成中..."
cd "$BACKEND_DIR"
npx prisma generate

echo ""
echo "🎉 復元が完了しました！"
