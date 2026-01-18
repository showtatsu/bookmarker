---
name: development-environment
description: 'Development Environment Selection for Bookmarker Application'
status: accepted
---

## タイトル
開発環境の選定

## 概要
Bookmarkerアプリケーションの開発環境に関する決定事項です。Dev Containers と VS Code を使用した統一された開発環境を構築します。

## 背景
チーム開発や複数マシンでの開発において、環境構築の手間を最小化し、「自分の環境では動く」問題を防ぐために、コンテナベースの統一された開発環境が必要です。

## 決定事項

### 開発環境: Dev Containers + VS Code

- **選定理由**:
  - 環境構築がワンクリック（`Reopen in Container`）
  - 開発環境をコードとして管理（Infrastructure as Code）
  - ホストマシンを汚さない
  - チーム全員が同一環境で開発可能
  - GitHub Codespaces との互換性

### ディレクトリ構成

```
.devcontainer/
├── devcontainer.json          # Dev Container設定
├── docker-compose.yml         # 開発用Docker Compose
├── Dockerfile                 # 開発用Dockerfile
└── post-create.sh            # コンテナ作成後スクリプト
```

### devcontainer.json

```json
{
  "name": "Bookmarker Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  
  "features": {
    "ghcr.io/devcontainers/features/node:1": {
      "version": "24"
    },
    "ghcr.io/devcontainers/features/git:1": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "bradlc.vscode-tailwindcss",
        "prisma.prisma",
        "ms-azuretools.vscode-docker",
        "eamodio.gitlens",
        "usernamehw.errorlens",
        "christian-kohler.path-intellisense",
        "streetsidesoftware.code-spell-checker",
        "vitest.explorer",
        "ms-playwright.playwright"
      ],
      "settings": {
        "editor.formatOnSave": true,
        "editor.defaultFormatter": "esbenp.prettier-vscode",
        "editor.codeActionsOnSave": {
          "source.fixAll.eslint": "explicit"
        },
        "typescript.preferences.importModuleSpecifier": "relative",
        "files.eol": "\n",
        "terminal.integrated.defaultProfile.linux": "zsh"
      }
    }
  },
  
  "forwardPorts": [3000, 4000],
  "portsAttributes": {
    "3000": { "label": "Frontend (Next.js)", "onAutoForward": "notify" },
    "4000": { "label": "Backend (API)", "onAutoForward": "notify" }
  },
  
  "postCreateCommand": "bash .devcontainer/post-create.sh",
  "postStartCommand": "npm run dev",
  
  "remoteUser": "node"
}
```

### docker-compose.yml（開発用）

```yaml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
      - node_modules_frontend:/workspace/frontend/node_modules
      - node_modules_backend:/workspace/backend/node_modules
    environment:
      - NODE_ENV=development
      - DATABASE_PATH=/workspace/data/bookmarker.dev.db
      - JWT_SECRET=dev-secret-key-do-not-use-in-production
      - CORS_ORIGIN=http://localhost:3000
    ports:
      - "3000:3000"
      - "4000:4000"
    command: sleep infinity

volumes:
  node_modules_frontend:
  node_modules_backend:
```

### Dockerfile（開発用）

```dockerfile
FROM mcr.microsoft.com/devcontainers/typescript-node:24

# 追加パッケージのインストール
RUN apt-get update && apt-get install -y \
    sqlite3 \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# Oh My Zsh のインストール（オプション）
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended

# Playwright の依存関係（E2Eテスト用）
RUN npx playwright install-deps

# 作業ディレクトリ
WORKDIR /workspace

# node ユーザーで実行
USER node
```

### post-create.sh

```bash
#!/bin/bash
set -e

echo "🚀 Setting up Bookmarker development environment..."

# フロントエンド依存関係のインストール
echo "📦 Installing frontend dependencies..."
cd /workspace/frontend
npm install

# バックエンド依存関係のインストール
echo "📦 Installing backend dependencies..."
cd /workspace/backend
npm install

# データベース初期化
echo "🗄️ Initializing database..."
cd /workspace/backend
npm run db:init || true

# Playwright ブラウザのインストール
echo "🎭 Installing Playwright browsers..."
npx playwright install

# Git設定（コンテナ内用）
git config --global --add safe.directory /workspace

echo "✅ Development environment is ready!"
echo ""
echo "📝 Quick Start:"
echo "   Frontend: cd frontend && npm run dev"
echo "   Backend:  cd backend && npm run dev"
echo "   Both:     npm run dev (from root)"
```

### VS Code 推奨拡張機能

| 拡張機能 | 用途 |
|---------|------|
| ESLint | コードリント |
| Prettier | コードフォーマット |
| Tailwind CSS IntelliSense | TailwindCSS補完 |
| GitLens | Git履歴・blame表示 |
| Error Lens | エラーのインライン表示 |
| Vitest | テストランナー統合 |
| Playwright Test | E2Eテスト統合 |
| Docker | Dockerファイル編集 |
| Path Intellisense | パス補完 |
| Code Spell Checker | スペルチェック |

### VS Code 設定（.vscode/settings.json）

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit",
    "source.organizeImports": "explicit"
  },
  
  "typescript.preferences.importModuleSpecifier": "relative",
  "typescript.updateImportsOnFileMove.enabled": "always",
  
  "files.eol": "\n",
  "files.trimTrailingWhitespace": true,
  "files.insertFinalNewline": true,
  
  "eslint.workingDirectories": [
    { "directory": "frontend", "changeProcessCWD": true },
    { "directory": "backend", "changeProcessCWD": true }
  ],
  
  "tailwindCSS.includeLanguages": {
    "typescript": "javascript",
    "typescriptreact": "javascript"
  },
  
  "testing.automaticallyOpenPeekView": "failureInVisibleDocument"
}
```

### VS Code タスク（.vscode/tasks.json）

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Dev: All",
      "type": "shell",
      "command": "npm run dev",
      "group": { "kind": "build", "isDefault": true },
      "presentation": { "reveal": "always", "panel": "new" }
    },
    {
      "label": "Dev: Frontend",
      "type": "shell",
      "command": "npm run dev",
      "options": { "cwd": "${workspaceFolder}/frontend" },
      "presentation": { "reveal": "always", "panel": "dedicated" }
    },
    {
      "label": "Dev: Backend",
      "type": "shell",
      "command": "npm run dev",
      "options": { "cwd": "${workspaceFolder}/backend" },
      "presentation": { "reveal": "always", "panel": "dedicated" }
    },
    {
      "label": "Test: All",
      "type": "shell",
      "command": "npm run test",
      "group": "test"
    },
    {
      "label": "Test: E2E",
      "type": "shell",
      "command": "npm run test:e2e",
      "group": "test"
    },
    {
      "label": "Lint: Fix",
      "type": "shell",
      "command": "npm run lint:fix"
    },
    {
      "label": "DB: Reset",
      "type": "shell",
      "command": "npm run db:reset",
      "options": { "cwd": "${workspaceFolder}/backend" }
    }
  ]
}
```

### VS Code デバッグ設定（.vscode/launch.json）

```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "Backend: Debug",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/backend",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    },
    {
      "name": "Frontend: Debug (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:3000",
      "webRoot": "${workspaceFolder}/frontend"
    },
    {
      "name": "Backend: Debug Current Test",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}/backend",
      "program": "${workspaceFolder}/backend/node_modules/vitest/vitest.mjs",
      "args": ["run", "${relativeFile}"],
      "console": "integratedTerminal"
    },
    {
      "name": "E2E: Debug Playwright",
      "type": "node",
      "request": "launch",
      "cwd": "${workspaceFolder}",
      "program": "${workspaceFolder}/node_modules/@playwright/test/cli.js",
      "args": ["test", "--ui"],
      "console": "integratedTerminal"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack: Debug",
      "configurations": ["Backend: Debug", "Frontend: Debug (Chrome)"]
    }
  ]
}
```

### 開発ワークフロー

```
1. リポジトリをクローン
   git clone https://github.com/username/bookmarker.git

2. VS Code で開く
   code bookmarker

3. Dev Container で開く
   - コマンドパレット (Cmd/Ctrl + Shift + P)
   - "Dev Containers: Reopen in Container" を選択
   - 初回は数分かかる（Dockerイメージのビルド）

4. 開発開始
   - 自動的に依存関係がインストールされる
   - ポート 3000 (Frontend) と 4000 (Backend) が転送される
   - npm run dev で開発サーバー起動
```

### GitHub Codespaces 対応

Dev Container 設定は GitHub Codespaces と完全互換です：

1. GitHub リポジトリページで「Code」→「Codespaces」→「Create codespace」
2. ブラウザまたは VS Code で開発環境が起動
3. ローカル開発と同一の環境で作業可能

### トラブルシューティング

| 問題 | 解決策 |
|------|--------|
| コンテナが起動しない | Docker Desktop が起動しているか確認 |
| node_modules が同期されない | Docker ボリュームを削除して再ビルド |
| ポートが使用中 | ホスト側の同ポートを使用しているプロセスを停止 |
| Git認証エラー | VS Code の Git 拡張機能で認証を設定 |
| 動作が遅い | Docker Desktop のリソース割り当てを増やす |

## 代替案

| 案 | 利点 | 欠点 | 判断 |
|---|---|---|---|
| Dev Containers（採用） | 環境統一、IaC、Codespaces互換 | Docker必須、初回起動時間 | 最適 |
| ローカル直接開発 | 起動が速い | 環境差異、ホスト汚染 | チーム開発に不向き |
| Vagrant | VM単位で隔離 | 重い、起動が遅い | オーバースペック |
| Docker Compose のみ | 軽量 | VS Code統合が弱い | 開発体験が劣る |

## 結果
Dev Containers と VS Code の組み合わせにより、環境構築の手間を最小化し、チーム全員が同一の開発環境で作業できます。

## 関連ドキュメント
- [ADR-0002: コード構成方針](0002-code-structure.md)
- [ADR-0007: デプロイメント戦略](0007-deployment.md)
- [ADR-0008: テスト戦略](0008-testing.md)
- [ADR-0009: CI/CDパイプラインの設計](0009-ci-cd.md)
