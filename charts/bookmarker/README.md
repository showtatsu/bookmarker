# Bookmarker Helm Chart

Helmチャートを使用してKubernetesクラスタにBookmarkerアプリケーションをデプロイします。

## 前提条件

- Kubernetes 1.24+
- Helm 3.0+
- PersistentVolume provisioner（PostgreSQL用）

## インストール

### プロダクション環境へのデプロイ

```bash
# Secretsは必ず設定してください
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --values ./charts/bookmarker/values.yaml \
  --set secrets.jwtSecret="your-jwt-secret-key-here" \
  --set secrets.dbPassword="your-db-password-here"
```

### カスタム設定でのデプロイ

```bash
# values.yamlをカスタマイズして使用
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --values ./my-custom-values.yaml
```

## アップグレード

```bash
# チャートの更新
helm upgrade bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --values ./charts/bookmarker/values-prod.yaml \
  --set secrets.jwtSecret="your-jwt-secret-key-here" \
  --set secrets.dbPassword="your-db-password-here"
```

## アンインストール

```bash
# リリースの削除
helm uninstall bookmarker --namespace bookmarker

# Namespace全体を削除（オプション）
kubectl delete namespace bookmarker
```

## 設定項目

### 必須設定

| パラメータ | 説明 | デフォルト値 |
|-----------|------|------------|
| `secrets.jwtSecret` | JWT署名用シークレット（最低32文字） | `""` |
| `secrets.dbPassword` | PostgreSQLパスワード | `""` |

### アプリケーション設定

| パラメータ | 説明 | デフォルト値 |
|-----------|------|------------|
| `config.nodeEnv` | 実行環境 | `production` |
| `config.databaseProvider` | データベース種別 | `postgresql` |
| `config.jwtExpiresIn` | JWTアクセストークン有効期限 | `15m` |
| `config.refreshTokenExpiresIn` | リフレッシュトークン有効期限 | `7d` |

### PostgreSQL設定

| パラメータ | 説明 | デフォルト値 |
|-----------|------|------------|
| `postgresql.enabled` | PostgreSQLを有効化 | `true` |
| `postgresql.persistence.size` | ストレージサイズ | `10Gi` |
| `postgresql.resources.requests.memory` | メモリ要求量 | `256Mi` |
| `postgresql.resources.requests.cpu` | CPU要求量 | `250m` |

### Backend設定

| パラメータ | 説明 | デフォルト値 |
|-----------|------|------------|
| `backend.enabled` | Backendを有効化 | `true` |
| `backend.replicaCount` | レプリカ数 | `2` |
| `backend.image.repository` | イメージリポジトリ | `bookmarker-backend` |
| `backend.image.tag` | イメージタグ | `latest` |
| `backend.autoscaling.enabled` | HPAを有効化 | `true` |
| `backend.autoscaling.minReplicas` | 最小レプリカ数 | `2` |
| `backend.autoscaling.maxReplicas` | 最大レプリカ数 | `10` |

### Frontend設定

| パラメータ | 説明 | デフォルト値 |
|-----------|------|------------|
| `frontend.enabled` | Frontendを有効化 | `true` |
| `frontend.replicaCount` | レプリカ数 | `2` |
| `frontend.image.repository` | イメージリポジトリ | `bookmarker-frontend` |
| `frontend.image.tag` | イメージタグ | `latest` |
| `frontend.autoscaling.enabled` | HPAを有効化 | `true` |
| `frontend.autoscaling.minReplicas` | 最小レプリカ数 | `2` |
| `frontend.autoscaling.maxReplicas` | 最大レプリカ数 | `10` |

### Ingress設定

| パラメータ | 説明 | デフォルト値 |
|-----------|------|------------|
| `ingress.enabled` | Ingressを有効化 | `true` |
| `ingress.className` | Ingress class名 | `nginx` |
| `ingress.hosts[0].host` | ホスト名 | `bookmarker.example.com` |

## 確認コマンド

```bash
# デプロイ状態の確認
helm status bookmarker --namespace bookmarker

# リソースの確認
kubectl get all -n bookmarker

# Podのログ確認
kubectl logs -n bookmarker -l app=backend --tail=100

# HPAの確認
kubectl get hpa -n bookmarker
```

## トラブルシューティング

### Podが起動しない

```bash
# Pod詳細を確認
kubectl describe pod <pod-name> -n bookmarker

# イベントを確認
kubectl get events -n bookmarker --sort-by='.lastTimestamp'
```

### データベース接続エラー

```bash
# PostgreSQLの状態確認
kubectl get statefulset postgres -n bookmarker
kubectl logs -n bookmarker postgres-0

# 接続テスト
kubectl exec -it postgres-0 -n bookmarker -- psql -U bookmarker -d bookmarker
```

### Secretsが設定されていない

```bash
# Secretsの確認
kubectl get secret -n bookmarker
kubectl describe secret bookmarker-secrets -n bookmarker
```

## カスタマイズ例

### イメージリポジトリの変更

```bash
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --set backend.image.repository="myregistry/bookmarker-backend" \
  --set frontend.image.repository="myregistry/bookmarker-frontend"
```

### リソース制限の変更

```bash
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --set backend.resources.requests.memory="512Mi" \
  --set backend.resources.limits.memory="1Gi"
```

### ストレージクラスの指定

```bash
helm install bookmarker ./charts/bookmarker \
  --namespace bookmarker \
  --create-namespace \
  --set postgresql.persistence.storageClass="fast-ssd"
```
