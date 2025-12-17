/** @type {import('next').NextConfig} */
const nextConfig = {
  // output: 'export', // Disabled for API Routes support

  // 画像最適化設定（静的エクスポート用）
  images: {
    unoptimized: true, // 静的エクスポート時は必須
  },

  // ESLintをビルド時にスキップ
  eslint: {
    ignoreDuringBuilds: true,
  },

  // TypeScriptエラーをビルド時にスキップ
  typescript: {
    ignoreBuildErrors: true,
  },

  // 本番環境ではソースマップを無効化
  productionBrowserSourceMaps: false,

  // 圧縮を有効化
  compress: true,

  // トレーリングスラッシュを無効化（API Webhookの308エラー防止）
  trailingSlash: false,

  // ページ拡張子
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
};

export default nextConfig;