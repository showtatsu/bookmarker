#!/bin/bash
# データベースバックアップスクリプト
# 使用方法: ./scripts/backup-db.sh [環境名]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(dirname "$SCRIPT_DIR")"
ENV="${1:-dev}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# データベースファイルのパス
DB_FILE="$BACKEND_DIR/prisma/data/bookmarker.${ENV}.db"
BACKUP_DIR="$BACKEND_DIR/prisma/data/backups"
BACKUP_FILE="$BACKUP_DIR/bookmarker.${ENV}.db.backup.${TIMESTAMP}"

# バックアップディレクトリの作成
mkdir -p "$BACKUP_DIR"

if [ -f "$DB_FILE" ]; then
    cp "$DB_FILE" "$BACKUP_FILE"
    echo "✅ バックアップ作成完了: $BACKUP_FILE"

    # 古いバックアップの削除（30日以上前）
    find "$BACKUP_DIR" -name "*.backup.*" -mtime +30 -delete 2>/dev/null || true
    echo "🧹 30日以上前のバックアップを削除しました"
else
    echo "⚠️  データベースファイルが見つかりません: $DB_FILE"
    exit 0
fi
