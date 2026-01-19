# ===================================
# Frontend Production Dockerfile
# ===================================

# 依存関係ステージ
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat

WORKDIR /app

# 依存関係のインストール（キャッシュ最適化）
COPY package*.json ./
RUN npm ci

# ビルドステージ
FROM node:24-alpine AS builder

WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Ensure public dir exists so production stage COPY won't fail when repository has no public/
RUN mkdir -p public

# Next.js のビルド
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Normalize standalone/static output: some Next versions place static files under
# `.next/standalone/app/.next/static`. Copy them into the standard `.next/static`
# location so the production image always contains `./.next/static`.
RUN if [ -d ".next/standalone/app/.next/static" ]; then \
            mkdir -p .next/static && cp -a .next/standalone/app/.next/static/. .next/static/ ; \
        fi

# プロダクションステージ
FROM node:24-alpine AS production

# セキュリティ: 非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 必要なファイルのみコピー（builder で public を作成済み）
COPY --from=builder --chown=nextjs:nodejs /app/public/ ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/static/ ./.next/static/
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone/app/ ./

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

USER nextjs

EXPOSE 3000

CMD ["node", "server.js"]
