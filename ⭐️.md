# AIKA App (v2) コスト安全なシステム構築ガイド

このプロジェクトは、リクエスト通り**コスト破産を防ぐ安全なアーキテクチャ (Cost-Safe Architecture)** を採用するように更新されました。
バックエンドはVPS（ConoHa, Xserver等）上でDocker運用することを想定し、ストレージには転送量（Egress）無料のCloudflare R2を使用します。AI解析には無料枠が利用可能なGemini APIを使用します。

## 1. アーキテクチャ概要

- **Frontend (LIFF)**: Next.js (クライアントサイド) -> Cloudflare R2へ直接アップロード -> VPSバックエンドへ解析リクエスト送信
- **Backend (VPS)**: Node.js/Express。認証、レート制限（サーキットブレーカー）、AI処理を担当。
- **Circuit Breaker**: ローカルSQLiteデータベースで使用量をカウントし、Google APIの制限超過や予期せぬ課金を防ぎます。

## 2. バックエンドのセットアップ (VPS / ローカル)

`backend/` ディレクトリにVPS用アプリケーションが含まれています。

### 必須要件
- Node.js v18以上
- Cloudflare R2 バケット & キー
- Google AI Studio APIキー (Gemini)
- LINE Messaging API チャネルアクセストークン

### 設定
1. `backend/.env.example` を `backend/.env` にリネームしてください。
2. 以下の値を設定してください:
   ```env
   # サーバー設定
   PORT=8080
   
   # Cloudflare R2 設定
   R2_ACCOUNT_ID=...
   R2_ACCESS_KEY_ID=...
   R2_SECRET_ACCESS_KEY=...
   R2_BUCKET_NAME=...
   R2_ENDPOINT=https://<account>.r2.cloudflarestorage.com
   
   # Google Gemini API
   GEMINI_API_KEY=...
   
   # LINE Bot 設定
   LINE_CHANNEL_ACCESS_TOKEN=...
   
   # 安全装置 (1:有効, 0:無効)
   SAFETY_ENABLED=1
   # 1日のリクエスト上限回数
   DAILY_REQUEST_LIMIT=100
   ```

### ローカルでの実行
```bash
cd backend
npm install
npm start
```
サーバーは `http://localhost:8080` で起動します。

### Dockerでの実行 (VPS推奨)
```bash
cd backend
docker build -t aika-backend .
docker run -d -p 8080:8080 --env-file .env aika-backend
```

## 3. フロントエンドのセットアップ

フロントエンド (Next.js) にVPSバックエンドのURLを教える必要があります。

1. `frontend/.env.local` を開きます（無ければ作成）。
2. 以下を追加してください:
   ```env
   # VPSのURL (ローカル開発の場合は localhost)
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8080
   
   # 既存の環境変数
   NEXT_PUBLIC_LIFF_ID=...
   ```
3. フロントエンドを起動:
   ```bash
   cd frontend
   npm run dev
   ```
   `http://localhost:3000/aika19` にアクセスしてLIFFアプリをテストしてください。

## 4. デプロイ時の重要チェックポイント

- **Cloudflare R2 CORS**: クライアントから直接アップロードを行うため、R2バケットのCORS設定で、あなたのドメイン（またはlocalhost）からの `PUT` リクエストを許可する**必要があります**。
  
  R2のCORSポリシー設定例:
  ```json
  [
    {
      "AllowedOrigins": ["http://localhost:3000", "https://your-app-domain.com"],
      "AllowedMethods": ["PUT", "GET"],
      "AllowedHeaders": ["*"],
      "ExposeHeaders": ["ETag"],
      "MaxAgeSeconds": 3000
    }
  ]
  ```

- **LINE Webhook**: メッセージを*送信*するだけなら必須ではありませんが、ユーザーからの返信を受け取りたい場合はLINE DevelopersコンソールでWebhook URLを `https://your-vps.com/api/webhook` に設定する必要があります（要実装）。現在のアーキテクチャでは、解析完了後に「プッシュメッセージ」で結果を通知します。

## 5. サーキットブレーカー（安全装置）のロジック
安全装置のロジックは `backend/circuitBreaker.js` にあります。
- 毎日（UTC時間）リセットされます。
- `DAILY_REQUEST_LIMIT` に達すると、即座に `429 Too Many Requests` エラーを返し、Google APIへの通信を物理的に遮断します。
- 手動でリセットしたい場合は、`backend/usage.db` ファイルを削除してください。
