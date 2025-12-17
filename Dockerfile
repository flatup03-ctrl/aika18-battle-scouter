# ステージ1: ビルダー
FROM node:20-alpine AS builder

WORKDIR /app

# キャッシュを改善するために、package.json をコピーして最初に依存関係をインストールします
COPY package*.json ./
RUN npm install

# すべての環境変数に対してビルド引数を宣言します
# これらは cloudbuild.yaml の --build-arg で使用されている名前と一致している必要があります
ARG LINE_CHANNEL_ID
ARG GOOGLE_CREDENTIALS_JSON
ARG NEXT_PUBLIC_GOOGLE_SHEET_ID
ARG LINE_CHANNEL_SECRET
ARG VertexAIAPI
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# それらをDockerイメージのコンテキスト内で環境変数として設定します。
# Next.jsビルド (および実行中のアプリ) は、これらをENV変数として探します。
ENV LINE_CHANNEL_ID=$LINE_CHANNEL_ID \
    GOOGLE_CREDENTIALS_JSON=$GOOGLE_CREDENTIALS_JSON \
    NEXT_PUBLIC_GOOGLE_SHEET_ID=$NEXT_PUBLIC_GOOGLE_SHEET_ID \
    LINE_CHANNEL_SECRET=$LINE_CHANNEL_SECRET \
    VertexAIAPI=$VertexAIAPI \
    NEXT_PUBLIC_FIREBASE_API_KEY=$NEXT_PUBLIC_FIREBASE_API_KEY \
    NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=$NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN \
    NEXT_PUBLIC_FIREBASE_PROJECT_ID=$NEXT_PUBLIC_FIREBASE_PROJECT_ID \
    NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=$NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET \
    NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=$NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID \
    NEXT_PUBLIC_FIREBASE_APP_ID=$NEXT_PUBLIC_FIREBASE_APP_ID \
    NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=$NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID

# アプリケーションの残りのコードをコピーします
COPY . .

# Next.jsのビルドコマンドを実行します
RUN npm run build

# ステージ2: 本番
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production

# ビルド成果物と実行に必要なファイルをコピー
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs

# Cloud Runが提供するPORT環境変数でリッスンすることを示す
EXPOSE 8080

# アプリケーションを起動
CMD ["npm", "start"]
