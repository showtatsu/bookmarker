FROM mcr.microsoft.com/devcontainers/typescript-node:24

# 追加パッケージのインストール
RUN apt-get update && apt-get install -y \
    sqlite3 \
    zsh \
    && rm -rf /var/lib/apt/lists/*

# Oh My Zsh のインストール（オプション）
RUN sh -c "$(curl -fsSL https://raw.githubusercontent.com/ohmyzsh/ohmyzsh/master/tools/install.sh)" "" --unattended || true

# Playwright の依存関係（E2Eテスト用）
RUN npx playwright install-deps

# 作業ディレクトリ
WORKDIR /workspace

# node ユーザーで実行
USER node
