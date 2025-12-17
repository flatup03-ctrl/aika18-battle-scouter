# Cloudflare Pages デプロイガイド

このガイドでは、AIKA18号バトルスカウターアプリケーションをCloudflare Pagesにデプロイする方法を説明します。

## 📋 目次

1. [前提条件](#前提条件)
2. [Cloudflareアカウントのセットアップ](#cloudflareアカウントのセットアップ)
3. [GitHubリポジトリの連携](#githubリポジトリの連携)
4. [ビルド設定の構成](#ビルド設定の構成)
5. [環境変数の設定](#環境変数の設定)
6. [デプロイの実行](#デプロイの実行)
7. [デプロイ後の確認](#デプロイ後の確認)
8. [カスタムドメインの設定（オプション）](#カスタムドメインの設定オプション)
9. [トラブルシューティング](#トラブルシューティング)

---

## 前提条件

- ✅ GitHubアカウント
- ✅ プロジェクトコードがGitHubリポジトリにプッシュ済み
- ✅ 必要な環境変数の値を準備済み（`.env.example`参照）

---

## Cloudflareアカウントのセットアップ

### ステップ1: アカウント作成

1. [Cloudflare](https://dash.cloudflare.com/sign-up)にアクセス
2. メールアドレスとパスワードを入力してアカウントを作成
3. メール認証を完了

### ステップ2: Pagesダッシュボードへアクセス

1. Cloudflareダッシュボードにログイン
2. 左側のメニューから「Pages」を選択
3. 「Create a project」をクリック

---

## GitHubリポジトリの連携

### ステップ1: GitHubとの接続

1. 「Connect to Git」を選択
2. 「GitHub」を選択
3. GitHubの認証画面で「Authorize Cloudflare Pages」をクリック
4. デプロイしたいリポジトリへのアクセスを許可

### ステップ2: リポジトリの選択

1. リポジトリ一覧から該当プロジェクトを選択
2. 「Begin setup」をクリック

---

## ビルド設定の構成

### プロジェクト名

```
aika18-battle-scouter
```

（または任意の名前を入力）

### プロダクションブランチ

```
main
```

（デフォルトブランチを選択）

### ビルド設定

| 設定項目 | 値 |
|---------|-----|
| **Framework preset** | Next.js |
| **Build command** | `npm install && npm run build` |
| **Build output directory** | `.next` |
| **Root directory** | `/` （プロジェクトルート） |

### Node.js バージョン

環境変数セクションで以下を追加：

```
NODE_VERSION = 20
```

---

## 環境変数の設定

### ⚠️ 重要: 環境変数の設定

環境変数を設定しないと、アプリケーションが正しく動作しません。

### アーキテクチャについて

このプロジェクトは以下の構成を使用しています：

- **フロントエンド**: Next.js (Cloudflare Pagesにデプロイ)
- **バックエンド**: Node.js + Express (XサーバーVPS - 162.43.30.218:8080)
- **ストレージ**: Cloudflare R2 (S3互換、VPS経由でアクセス)
- **AI解析**: Google Gemini API (VPS側で実行)
- **認証**: LINE LIFF
- **通知**: LINE Messaging API

> [!NOTE]
> **Firebase/Google Cloudは使用していません**。すべてのバックエンド機能はVPSで処理されます。

### ステップ1: 環境変数ページへ移動

1. プロジェクトの「Settings」タブを選択
2. 「Environment variables」を選択

### ステップ2: 必要な環境変数の追加

以下の環境変数を**Production**環境に追加：

| 変数名 | 説明 | 例 | 必須 |
|--------|------|-----|------|
| `NEXT_PUBLIC_LIFF_ID` | LINE LIFF ID | `2008276179-XxwM2QQD` | ✅ 必須 |
| `NEXT_PUBLIC_API_BASE_URL` | VPSバックエンドURL | `http://162.43.30.218:8080` | ✅ 必須 |
| `NEXT_PUBLIC_GOOGLE_SHEET_ID` | Google Spreadsheet ID（使用する場合） | `1abc...` | ⭕ オプション |

> [!IMPORTANT]
> **Firebase関連の環境変数は不要です**。Firebase/Google Cloudは使用していません。

### VPSバックエンドの環境変数（参考情報）

フロントエンドのデプロイには不要ですが、VPS側で以下の環境変数が設定されている必要があります：

**VPS（162.43.30.218）の`backend/.env`**:
```bash
# Cloudflare R2設定
R2_ACCOUNT_ID=your_cloudflare_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=your_bucket_name
R2_ENDPOINT=https://your_account_id.r2.cloudflarestorage.com

# Gemini API
GEMINI_API_KEY=your_gemini_api_key

# LINE Messaging API  
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret

# セーフティリミット
SAFETY_ENABLED=1
DAILY_REQUEST_LIMIT=100
DAILY_COST_LIMIT_YEN=500
```

### 📝 環境変数の追加方法

1. 「Add variable」ボタンをクリック
2. **Variable name**に変数名を入力（例: `NEXT_PUBLIC_FIREBASE_API_KEY`）
3. **Value**に値を入力
4. **Environment**で「Production」を選択（プレビュー環境でも使用する場合は「Preview」も選択）
5. 「Save」をクリック
6. すべての環境変数について繰り返し

---

## デプロイの実行

### 自動デプロイ

設定完了後、Cloudflare Pagesは自動的にデプロイを開始します。

1. 「Deployments」タブでデプロイの進行状況を確認
2. ビルドログを確認して、エラーがないことを確認
3. デプロイが完了すると「Success」ステータスが表示されます

### 手動デプロイ

GitHubに新しいコミットをプッシュすると、自動的に新しいデプロイがトリガーされます：

```bash
git add .
git commit -m "Update application"
git push origin main
```

---

## デプロイ後の確認

### ステップ1: サイトURLの確認

デプロイ成功後、以下のような形式のURLが発行されます：

```
https://aika18-battle-scouter.pages.dev
```

### ステップ2: 動作確認

以下の項目を確認：

- [ ] トップページ (`/`) が正しく表示される
- [ ] AIKA19ページ (`/aika19`) が正しく表示される
- [ ] LINEアプリ内から開いて認証が動作する
- [ ] 動画アップロード機能が動作する（VPS経由でCloudflare R2に保存）
- [ ] 動画解析結果がLINEで通知される

### ステップ3: 開発者ツールでエラー確認

1. ブラウザで開発者ツールを開く（F12）
2. Consoleタブでエラーがないか確認
3. Networkタブで`/api`リクエストが162.43.30.218:8080に正しくプロキシされているか確認

---

## カスタムドメインの設定（オプション）

独自ドメインを使用する場合：

### ステップ1: カスタムドメインの追加

1. プロジェクトの「Custom domains」タブを選択
2. 「Set up a custom domain」をクリック
3. ドメイン名を入力（例: `aika18.example.com`）
4. 「Continue」をクリック

### ステップ2: DNS設定

Cloudflareが提供するCNAMEレコードをDNSに追加：

```
CNAME   aika18   aika18-battle-scouter.pages.dev
```

### ステップ3: SSL証明書の発行

Cloudflareが自動的にSSL証明書を発行します（数分かかる場合があります）。

---

## トラブルシューティング

### 問題1: ビルドエラー "Module not found"

**原因**: 依存関係のインストールエラー

**解決方法**:
1. `package.json`の依存関係を確認
2. ローカルで`npm install`と`npm run build`を実行して確認
3. `package-lock.json`がリポジトリにコミットされているか確認

### 問題2: 環境変数が読み込まれない

**原因**: 環境変数の設定ミス

**解決方法**:
1. Cloudflare Pagesの「Settings」→「Environment variables」を確認
2. 変数名の先頭が`NEXT_PUBLIC_`になっているか確認（クライアント側の変数の場合）
3. 環境変数を追加/修正後、再デプロイを実行

### 問題3: API呼び出しが失敗する

**原因**: CORSエラーまたはAPI設定ミス

**解決方法**:
1. ブラウザの開発者ツールでエラーメッセージを確認
2. VPSバックエンド（162.43.30.218:8080）がCloudflare Pagesのドメインからのリクエストを許可しているか確認
3. `next.config.mjs`の`rewrites`設定を確認

### 問題4: 白画面が表示される

**原因**: JavaScriptエラーまたは環境変数の未設定

**解決方法**:
1. ブラウザの開発者ツール（F12）でコンソールエラーを確認
2. すべての必要な環境変数が設定されているか確認
3. ビルドログにエラーがないか確認

### 問題5: LINE LIFF認証が失敗する

**原因**: LIFF IDまたはエンドポイントURL設定ミス

**解決方法**:
1. LINE Developersコンソールで、LIFF IDが正しいか確認
2. LIFF設定のエンドポイントURLをCloudflare PagesのURLに更新
3. `NEXT_PUBLIC_LIFF_ID`環境変数が正しく設定されているか確認
4. VPSバックエンド（162.43.30.218:8080）が正常に動作しているか確認

---

## 高度な設定

### プレビューデプロイ

Cloudflare Pagesは、プルリクエストごとに自動的にプレビューデプロイを作成します。

- プレビューURL: `https://[commit-hash].aika18-battle-scouter.pages.dev`
- 本番環境に影響を与えずにテスト可能

### ビルドキャッシュの最適化

依存関係のキャッシュを有効化することで、ビルド時間を短縮できます（デフォルトで有効）。

### ロールバック

デプロイに問題がある場合、以前のバージョンにロールバック可能：

1. 「Deployments」タブを開く
2. ロールバックしたいデプロイを選択
3. 「Rollback to this deployment」をクリック

---

## さらに詳しい情報

- [Cloudflare Pages公式ドキュメント](https://developers.cloudflare.com/pages/)
- [Next.jsデプロイガイド](https://developers.cloudflare.com/pages/framework-guides/nextjs/)
- [環境変数の管理](https://developers.cloudflare.com/pages/platform/build-configuration/)

---

## サポート

問題が解決しない場合は、以下のドキュメントも参照してください：

- `PROJECT_STATUS_AND_REQUIREMENTS.md` - プロジェクト全体の情報
- `NETLIFY_ENV_VARS_SETUP.md` - 環境変数の詳細情報
- `.env.example` - 必要な環境変数の一覧

---

**作成日**: 2025-12-17  
**対象バージョン**: Next.js 14.2.4 / AIKA18号 v1.0.0
