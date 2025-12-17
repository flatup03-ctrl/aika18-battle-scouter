# Dockerfile (リポジトリのルートに置く)
FROM node:20-alpine

# 作業ディレクトリ
WORKDIR /app

# 依存関係を先にインストール（キャッシュ最適化）
COPY package*.json ./
RUN npm ci && npm cache clean --force

# アプリ本体をコピー
COPY . .

# 本番ビルド
RUN npm run build

# Cloud Runは8080固定
ENV PORT=8080
EXPOSE 8080

# Next.jsを8080で起動
CMD ["npm", "run", "start"]
