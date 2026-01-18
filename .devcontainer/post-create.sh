#!/bin/bash
set -e

echo "🚀 Setting up Bookmarker development environment..."

# データディレクトリの作成
mkdir -p /workspace/data

# フロントエンド依存関係のインストール
if [ -d "/workspace/frontend" ]; then
  echo "📦 Installing frontend dependencies..."
  cd /workspace/frontend
  npm install
fi

# バックエンド依存関係のインストール
if [ -d "/workspace/backend" ]; then
  echo "📦 Installing backend dependencies..."
  cd /workspace/backend
  npm install

  # Prisma クライアント生成
  echo "🗄️ Generating Prisma client..."
  npx prisma generate || true

  # データベース初期化（マイグレーション）
  echo "🗄️ Running database migrations..."
  npx prisma migrate dev --name init || true
fi

# ルートの依存関係のインストール
if [ -f "/workspace/package.json" ]; then
  echo "📦 Installing root dependencies..."
  cd /workspace
  npm install
fi

# Playwright ブラウザのインストール
echo "🎭 Installing Playwright browsers..."
npx playwright install || true

# Git設定（コンテナ内用）
git config --global --add safe.directory /workspace

echo ""
echo "✅ Development environment is ready!"
echo ""
echo "📝 Quick Start:"
echo "   Frontend: cd frontend && npm run dev"
echo "   Backend:  cd backend && npm run dev"
echo "   Both:     npm run dev (from root)"
echo ""
