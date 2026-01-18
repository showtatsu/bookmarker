# GitHub Actions Workflows

## Docker Build and Push Workflow

### 概要

`docker-build.yml` ワークフローは、backend と frontend のプロダクション向け Docker イメージを自動的にビルドし、GitHub Container Registry (ghcr.io) に公開します。

### トリガー条件

- **Push**: `main` または `develop` ブランチへのプッシュ
- **Tags**: `v*.*.*` 形式のタグ（例: v1.0.0）
- **Pull Request**: `main` または `develop` ブランチへの PR（ビルドのみ、プッシュなし）
- **Manual**: GitHub UI から手動実行

### イメージタグ戦略

| トリガー | 生成されるタグ例 |
|---------|---------------|
| `main` ブランチ | `latest`, `main`, `main-abc1234` |
| `develop` ブランチ | `develop`, `develop-abc1234` |
| タグ `v1.2.3` | `1.2.3`, `1.2`, `1`, `latest` |
| PR | `pr-123` |

### 生成されるイメージ

- Backend: `ghcr.io/<owner>/<repo>/backend:tag`
- Frontend: `ghcr.io/<owner>/<repo>/frontend:tag`

### セキュリティスキャン

Trivy による脆弱性スキャンを実行し、結果を GitHub Security タブに送信します。
- スキャン対象: CRITICAL, HIGH の脆弱性
- 実行タイミング: イメージビルド後（PR以外）

### マルチプラットフォームビルド

以下のアーキテクチャに対応:
- `linux/amd64` (x86_64)
- `linux/arm64` (ARM64/Apple Silicon)

### Helm Chart での使用例

```yaml
# values.yaml
backend:
  image:
    repository: ghcr.io/<owner>/<repo>/backend
    tag: "1.0.0"  # または "latest"
    pullPolicy: IfNotPresent

frontend:
  image:
    repository: ghcr.io/<owner>/<repo>/frontend
    tag: "1.0.0"
    pullPolicy: IfNotPresent
```

### ローカルでのイメージ取得

```bash
# GitHub Container Registry から pull（認証が必要な場合）
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin

# イメージの取得
docker pull ghcr.io/<owner>/<repo>/backend:latest
docker pull ghcr.io/<owner>/<repo>/frontend:latest
```

### 必要な権限

ワークフローには以下の権限が自動的に付与されます:
- `contents: read` - リポジトリの読み取り
- `packages: write` - GitHub Packages への書き込み
- `security-events: write` - セキュリティスキャン結果のアップロード

### トラブルシューティング

#### イメージがプライベートで取得できない

GitHub Container Registry のイメージは、デフォルトでリポジトリの可視性を継承します。
パブリックにするには:
1. GitHub の Packages ページに移動
2. イメージを選択
3. "Package settings" → "Change visibility" → "Public"

#### Kubernetes での認証

プライベートイメージを使用する場合は、ImagePullSecret を作成:

```bash
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=<github-username> \
  --docker-password=<github-token> \
  --namespace=bookmarker
```

Helm values.yaml に追加:

```yaml
imagePullSecrets:
  - name: ghcr-secret
```

### リリースフロー例

```bash
# 1. 変更をコミット
git add .
git commit -m "feat: new feature"

# 2. タグを作成してプッシュ
git tag v1.0.0
git push origin main --tags

# 3. GitHub Actions が自動的にイメージをビルド・プッシュ
# 4. イメージタグを確認
# https://github.com/<owner>/<repo>/pkgs/container/backend
# https://github.com/<owner>/<repo>/pkgs/container/frontend

# 5. Helm でデプロイ
helm upgrade bookmarker ./charts/bookmarker \
  --set backend.image.tag=1.0.0 \
  --set frontend.image.tag=1.0.0
```
