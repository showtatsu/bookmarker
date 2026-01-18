---
name: deployment
description: 'Deployment Strategy for Bookmarker Application'
status: accepted
---

## タイトル
デプロイメント戦略

## 概要
Bookmarkerアプリケーションのデプロイメント戦略に関する決定事項です。

## 背景
個人〜小規模チーム向けのブックマーク管理アプリとして、開発環境でのセットアップの容易さと、プロダクション環境でのスケーラビリティ・可用性を両立したデプロイメント戦略が必要です。

## 決定事項

### プロダクション要件

#### 1. コンテナ化

- **要件**: プロダクション環境でコンテナ（Docker）として稼働できること
- **理由**:
  - 環境の再現性と移植性の確保
  - デプロイメントの標準化と自動化
  - 依存関係の明確化とバージョン管理
  - ロールバックの容易性

#### 2. 負荷分散対応

- **要件**: 複数のコンテナインスタンスに負荷分散しても処理を継続できること
- **設計方針**:
  - **ステートレスアーキテクチャ**: バックエンドはステートレスに設計（JWT認証により実現）
  - **セッション管理**: Cookie ベースのJWT認証（サーバー側でセッション状態を保持しない）
  - **データベース**: 単一のデータベースインスタンスを複数バックエンドで共有
  - **ファイルストレージ**: 将来的にファイルアップロード機能を追加する場合は、共有ストレージ（S3等）を使用

### デプロイメント方式

#### プロダクション環境: Kubernetes（Helm Chart）

- **選定理由**:
  - **自動スケーリング**: HPA（Horizontal Pod Autoscaler）による需要に応じた自動スケール
  - **高可用性**: 複数レプリカによる冗長性とローリングアップデート
  - **負荷分散**: Service/Ingressによる組み込みのロードバランシング
  - **セルフヒーリング**: 異常なPodの自動再起動・再配置
  - **宣言的管理**: Infrastructure as Codeによる環境の再現性
  - **エコシステム**: 豊富なツール群（monitoring, logging, CI/CD連携）
  - **Helm Chart**: パッケージ管理とバージョニング、環境別設定の容易性

#### 開発/ローカル環境: Docker Compose

- **選定理由**:
  - フロントエンド・バックエンドを一括管理
  - 環境の再現性が高い
  - セットアップが簡単で学習コストが低い
  - 単一マシンでの開発に最適

---

## Kubernetes構成（プロダクション環境）

### アーキテクチャ概要

```
Internet
    ↓
[Ingress Controller]
    ↓
┌─────────────────────────────────────────┐
│  Kubernetes Cluster (bookmarker ns)    │
│                                         │
│  [Frontend Pods] ←→ [Frontend Service]  │
│       (2-10)            (ClusterIP)     │
│                              ↓          │
│  [Backend Pods]  ←→ [Backend Service]   │
│       (2-10)            (ClusterIP)     │
│                              ↓          │
│  [PostgreSQL]    ←→ [Postgres Service]  │
│  (StatefulSet)         (Headless)       │
│       ↓                                 │
│  [Persistent Volume]                    │
└─────────────────────────────────────────┘
```

### リソース構成

#### 1. Namespace
- `bookmarker`: アプリケーション専用の名前空間

#### 2. ConfigMap
- 環境変数の一元管理
- アプリケーション設定の外部化

#### 3. Secrets
- JWT_SECRET: JWT署名用シークレット
- DB_PASSWORD: PostgreSQLパスワード
- OIDC設定（オプション）

#### 4. PostgreSQL（StatefulSet）
- **レプリカ数**: 1（単一インスタンス）
- **ストレージ**: PersistentVolumeClaim（10Gi）
- **ヘルスチェック**: pg_isready による監視
- **リソース**:
  - Request: 256Mi RAM, 250m CPU
  - Limit: 512Mi RAM, 500m CPU

#### 5. Backend（Deployment）
- **初期レプリカ数**: 2
- **自動スケーリング（HPA）**: 2-10 pods
  - CPU使用率 70% でスケールアウト
  - メモリ使用率 80% でスケールアウト
- **ヘルスチェック**:
  - Liveness: `/api/health` (30秒間隔)
  - Readiness: `/api/health` (5秒間隔)
- **リソース**:
  - Request: 256Mi RAM, 250m CPU
  - Limit: 512Mi RAM, 500m CPU
- **InitContainer**: PostgreSQL待機

#### 6. Frontend（Deployment）
- **初期レプリカ数**: 2
- **自動スケーリング（HPA）**: 2-10 pods
  - CPU使用率 70% でスケールアウト
  - メモリ使用率 80% でスケールアウト
- **ヘルスチェック**:
  - Liveness: `/` (30秒間隔)
  - Readiness: `/` (5秒間隔)
- **リソース**:
  - Request: 256Mi RAM, 250m CPU
  - Limit: 512Mi RAM, 500m CPU

#### 7. Services
- **backend-service**: ClusterIP（内部通信用）
- **frontend-service**: ClusterIP（内部通信用）
- **postgres-service**: Headless Service（StatefulSet用）

#### 8. Ingress
- NGINX Ingress Controller使用
- パスベースルーティング:
  - `/api/*` → backend-service
  - `/*` → frontend-service
- TLS/SSL対応（cert-manager連携）
- レート制限: 100 req/sec

### デプロイメントフロー

#### Helm Chartを使用したデプロイ（推奨）

**開発環境**

```bash
# Helm Chartで開発環境へデプロイ
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --values ./charts/bookmarker/values-dev.yaml

# 状態確認
helm status bookmarker --namespace bookmarker
kubectl get all -n bookmarker
```

**プロダクション環境**

```bash
# Secretsを設定してデプロイ
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --values ./charts/bookmarker/values-prod.yaml \
  --set secrets.jwtSecret="your-jwt-secret-32-chars-min" \
  --set secrets.dbPassword="your-secure-db-password"

# アップグレード
helm upgrade bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --values ./charts/bookmarker/values-prod.yaml \
  --set secrets.jwtSecret="your-jwt-secret" \
  --set secrets.dbPassword="your-db-password"

# ロールバック
helm rollback bookmarker --namespace bookmarker
```

**カスタマイズ例**

```bash
# イメージタグとレプリカ数を変更
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --set backend.image.tag="v1.2.0" \
  --set frontend.image.tag="v1.2.0" \
  --set backend.replicaCount=5 \
  --set frontend.replicaCount=5
```

#### kubectl直接適用（レガシー）

初回デプロイ

```bash
# 1. Namespaceの作成
kubectl apply -f k8s/namespace.yaml

# 2. Secretsの設定（base64エンコード済みの値を設定）
kubectl apply -f k8s/secrets.yaml

# 3. ConfigMapの適用
kubectl apply -f k8s/configmap.yaml

# 4. PostgreSQLのデプロイ
kubectl apply -f k8s/postgres/

# 5. バックエンドのデプロイ
kubectl apply -f k8s/backend/

# 6. フロントエンドのデプロイ
kubectl apply -f k8s/frontend/

# 7. Ingressの設定
kubectl apply -f k8s/ingress.yaml

# 8. 状態確認
kubectl get all -n bookmarker
```

#### 更新デプロイ

```bash
# イメージのビルドとプッシュ
docker build -t your-registry/bookmarker-backend:v1.1.0 ./backend
docker push your-registry/bookmarker-backend:v1.1.0

# ローリングアップデート
kubectl set image deployment/backend backend=your-registry/bookmarker-backend:v1.1.0 -n bookmarker

# 更新状態の監視
kubectl rollout status deployment/backend -n bookmarker

# 問題があればロールバック
kubectl rollout undo deployment/backend -n bookmarker
```

### 高可用性とスケーラビリティ

#### 自動スケーリング
- **HPA（Horizontal Pod Autoscaler）**: CPU/メモリ使用率に基づいて自動的にPod数を調整
- **スケールダウン安定化**: 300秒のクールダウン期間で急激な縮小を防止
- **スケールアップポリシー**: 負荷急増時に即座に対応（最大100%増加）

#### セルフヒーリング
- **Liveness Probe**: 異常なPodを自動再起動
- **Readiness Probe**: 準備が整ったPodのみトラフィックを受信
- **Node障害時**: 自動的に他のNodeへPodを再配置

#### ローリングアップデート
- **ゼロダウンタイム**: 新旧バージョンが共存しながら段階的に更新
- **即座にロールバック**: 問題発生時は即座に前バージョンへ復元

### 監視とロギング

```bash
# Podの状態確認
kubectl get pods -n bookmarker -o wide

# ログの確認
kubectl logs -n bookmarker -l app=backend --tail=100 -f

# リソース使用量の確認
kubectl top pods -n bookmarker

# HPAの状態確認
kubectl get hpa -n bookmarker

# イベントの確認
kubectl get events -n bookmarker --sort-by='.lastTimestamp'
```

---

## Docker Compose構成（開発/ローカル環境）

### コンテナ構成（SQLite版）

```yaml
# docker-compose.yml（SQLite版 - 開発・小規模向け）
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_PROVIDER=sqlite
      - DATABASE_URL=file:/data/bookmarker.db
      - JWT_SECRET=${JWT_SECRET}
    volumes:
      - db-data:/data

volumes:
  db-data:
```

### コンテナ構成（PostgreSQL版）

```yaml
# docker-compose.postgres.yml（PostgreSQL版 - 中〜大規模向け）
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - NODE_ENV=production
      - DATABASE_PROVIDER=postgresql
      - DATABASE_URL=postgresql://bookmarker:${DB_PASSWORD}@postgres:5432/bookmarker
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=bookmarker
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=bookmarker
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bookmarker"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

### プロダクション向け Dockerfile

#### バックエンド Dockerfile (`backend/Dockerfile`)

マルチステージビルドを活用したプロダクション最適化：

```dockerfile
# ビルドステージ
FROM node:24-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
RUN npm run build

# プロダクションステージ
FROM node:24-alpine AS production

# セキュリティ: 非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

WORKDIR /app

# 必要なファイルのみコピー
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/package*.json ./
COPY --from=builder --chown=nodejs:nodejs /app/prisma ./prisma

# データディレクトリの作成（SQLite用）
RUN mkdir -p /app/data && chown -R nodejs:nodejs /app/data

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD node -e "require('http').get('http://localhost:4000/api/health', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

USER nodejs
EXPOSE 4000

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
```

**最適化ポイント：**
- マルチステージビルドでイメージサイズを削減
- 非rootユーザー（nodejs:1001）で実行してセキュリティ強化
- npm cacheをクリーンアップして不要なファイル削除
- ヘルスチェックを設定してコンテナの健全性を監視
- Prismaマイグレーションを起動時に自動実行

#### フロントエンド Dockerfile (`frontend/Dockerfile`)

Next.js スタンドアロン出力を活用した最小構成：

```dockerfile
# 依存関係ステージ
FROM node:24-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package*.json ./
RUN npm ci

# ビルドステージ
FROM node:24-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# プロダクションステージ
FROM node:24-alpine AS production

# セキュリティ: 非rootユーザーで実行
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nextjs -u 1001

WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# 必要なファイルのみコピー
COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# ヘルスチェック
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD node -e "require('http').get('http://localhost:3000', (r) => r.statusCode === 200 ? process.exit(0) : process.exit(1))"

USER nextjs
EXPOSE 3000

CMD ["node", "server.js"]
```

**最適化ポイント：**
- Next.js の `output: 'standalone'` を使用して必要最小限のファイルのみ含める
- 3ステージビルドで依存関係を分離してキャッシュ効率を向上
- 非rootユーザー（nextjs:1001）でセキュリティ強化
- テレメトリを無効化してプライバシー保護

#### .dockerignore

不要なファイルをイメージから除外：

```
# Dependencies
node_modules
npm-debug.log*

# Build outputs
dist
.next
out

# Development
.env.local
.env.development

# Documentation
docs
*.md
!README.md

# Database
*.db
data/
prisma/migrations

# Logs
logs
*.log
```

### 環境変数管理

| 変数名 | 説明 | デフォルト |
|--------|------|-----------|
| NODE_ENV | 実行環境 | development |
| PORT | バックエンドポート | 4000 |
| DATABASE_PROVIDER | データベース種別 | sqlite |
| DATABASE_URL | データベース接続URL | file:./data/bookmarker.db |
| DB_PASSWORD | PostgreSQLパスワード | （PostgreSQL使用時必須） |
| JWT_SECRET | JWT署名シークレット | （必須） |
| JWT_EXPIRES_IN | アクセストークン有効期限 | 15m |
| REFRESH_TOKEN_EXPIRES_IN | リフレッシュトークン有効期限 | 7d |
| CORS_ORIGIN | 許可するオリジン | http://localhost:3000 |
| OIDC_ISSUER | OIDCプロバイダURL | （OIDC使用時必須） |
| OIDC_CLIENT_ID | OIDCクライアントID | （OIDC使用時必須） |
| OIDC_CLIENT_SECRET | OIDCクライアントシークレット | （OIDC使用時必須） |

### デプロイメントフロー

#### 開発環境

```bash
# Docker Composeで起動
docker-compose up -d

# アクセス
# Frontend: http://localhost:3000
# Backend API: http://localhost:4000
```

#### プロダクション環境の構築手順

**1. イメージのビルド**

```bash
# バックエンド
cd backend
docker build -t bookmarker-backend:latest .

# フロントエンド
cd frontend
docker build -t bookmarker-frontend:latest .
```

**2. 環境変数の設定**

`.env.production` を作成：

```bash
# 必須設定
JWT_SECRET=your-secret-key-here-min-32-chars
DB_PASSWORD=secure-database-password

# オプション
DATABASE_PROVIDER=postgresql
CORS_ORIGIN=https://yourdomain.com
```

**3. デプロイ実行**

```bash
# SQLite版（シンプル構成）
docker-compose -f docker-compose.yml up -d

# PostgreSQL版（推奨）
docker-compose -f docker-compose.postgres.yml up -d

# 負荷分散構成
docker-compose -f docker-compose.production.yml up -d
```

**4. HTTPS化**

リバースプロキシ（nginx/Caddy）を設定してHTTPS化します。

#### イメージの最適化確認

```bash
# イメージサイズの確認
docker images | grep bookmarker

# 期待されるサイズ:
# bookmarker-backend:  ~150MB
# bookmarker-frontend: ~180MB
```

### バックアップ戦略

#### SQLite版

```bash
#!/bin/bash
# backup-sqlite.sh
DATE=$(date +%Y%m%d)
cp /data/bookmarker.db /backup/bookmarker_${DATE}.db
find /backup -name "bookmarker_*.db" -mtime +7 -delete
```

#### PostgreSQL版

```bash
#!/bin/bash
# backup-postgres.sh
DATE=$(date +%Y%m%d)
docker exec postgres pg_dump -U bookmarker bookmarker > /backup/bookmarker_${DATE}.sql
find /backup -name "bookmarker_*.sql" -mtime +7 -delete
```

### スケーリング考慮事項

現時点では単一サーバー構成を想定。将来的なスケーリングが必要な場合：

1. **水平スケーリング**: バックエンドをステートレス化（JWT認証により対応済み）
2. **データベース**: PostgreSQL版を使用（環境変数で切替可能）
3. **キャッシュ**: Redis導入

### 負荷分散構成例（プロダクション）

```yaml
# docker-compose.production.yml（負荷分散構成）
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    depends_on:
      - backend-1
      - backend-2
      - frontend

  frontend:
    build: ./frontend
    environment:
      - NEXT_PUBLIC_API_URL=http://nginx/api
    expose:
      - "3000"

  backend-1:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_PROVIDER=postgresql
      - DATABASE_URL=postgresql://bookmarker:${DB_PASSWORD}@postgres:5432/bookmarker
      - JWT_SECRET=${JWT_SECRET}
    expose:
      - "4000"
    depends_on:
      postgres:
        condition: service_healthy

  backend-2:
    build: ./backend
    environment:
      - NODE_ENV=production
      - DATABASE_PROVIDER=postgresql
      - DATABASE_URL=postgresql://bookmarker:${DB_PASSWORD}@postgres:5432/bookmarker
      - JWT_SECRET=${JWT_SECRET}
    expose:
      - "4000"
    depends_on:
      postgres:
        condition: service_healthy

  postgres:
    image: postgres:16-alpine
    environment:
      - POSTGRES_USER=bookmarker
      - POSTGRES_PASSWORD=${DB_PASSWORD}
      - POSTGRES_DB=bookmarker
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U bookmarker"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres-data:
```

#### nginx.conf 例（ロードバランサー設定）

```nginx
upstream backend {
    least_conn;  # 最小接続数でバランシング
    server backend-1:4000;
    server backend-2:4000;
}

server {
    listen 80;
    server_name example.com;

    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        proxy_pass http://frontend:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 関連ドキュメント
- [ADR-0003: データベースの選定](0003-database.md)
- [ADR-0004: 認証方式の選定](0004-authentication.md)
- [ADR-0009: CI/CDパイプラインの設計](0009-ci-cd.md)
- [Helm Chart](../../charts/bookmarker/)
- [Kubernetes マニフェスト（レガシー）](../../k8s/)

## 代替案

### プロダクション環境

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| **Kubernetes + Helm（採用）** | 自動スケーリング、高可用性、パッケージ管理、環境別設定が容易 | 学習曲線、初期セットアップコスト | プロダクション要件を満たす最適解 |
| Kubernetes（素のマニフェスト） | Helmより軽量、シンプル | 環境管理が煩雑、再利用性低い | Helm Chart採用により改善 |
| Docker Swarm | Dockerネイティブ、シンプル | エコシステムが限定的、採用事例少ない | Kubernetesの方が将来性あり |
| マネージドサービス（ECS/App Engine） | 運用負荷低い | ベンダーロックイン、カスタマイズ制限 | 移植性の観点で不採用 |
| Serverless（Lambda/Cloud Functions） | 完全マネージド | ステートフル処理に不向き、コールドスタート | アーキテクチャに不適合 |

### 開発/ローカル環境

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| **Docker Compose（採用）** | シンプル、学習コスト低い、本番に近い環境 | 単一ホスト前提 | 開発環境に最適 |
| Minikube/Kind | Kubernetes環境を完全再現 | リソース消費大、セットアップ複雑 | 開発には過剰 |
| 素のNode.js | 最軽量 | 環境差異が発生しやすい | 再現性の観点で不採用 |

## 環境ごとの使い分け
 コマンド例 |
|------|-------------|------|---------|
| **ローカル開発** | Docker Compose（SQLite） | 個人開発、機能開発、デバッグ | `docker-compose up -d` |
| **ステージング** | Helm Chart（PostgreSQL） | プロダクション環境の検証 | `helm install -f values-dev.yaml` |
| **プロダクション** | Helm Chart（PostgreSQL） | 本番サービス、負荷分散、高可用性 | `helm install -f values-prod.yaml`
| **プロダクション** | Kubernetes（PostgreSQL） | 本番サービス、負荷分散、高可用性 |

## 結果
Docker Composeにより、開発環境から本番環境まで一貫した環境でアプリケーションを運用できます。SQLite / PostgreSQL の切替も環境変数で柔軟に対応可能です。
