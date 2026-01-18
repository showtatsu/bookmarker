# ===================================
# Backend Production Dockerfile
# ===================================

# ビルドステージ
FROM node:24-alpine AS builder

WORKDIR /app

# 依存関係のインストール（キャッシュ最適化）
COPY package*.json ./
RUN npm ci && \
    npm cache clean --force

# ソースコードのコピーとビルド
COPY . .
RUN npm run build

# プロダクションステージ
FROM node:24-alpine AS production

# セキュリティ: 非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# package.json を先にコピーして production 依存関係のみインストール
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
RUN npm ci --only=production && npm cache clean --force

# ビルド成果物のコピー
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# データディレクトリの作成（SQLite用）
RUN mkdir -p /app/data && \
    chown -R nodejs:nodejs /app/data

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

USER nodejs

EXPOSE 4000

# Prismaマイグレーション実行とサーバー起動
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
