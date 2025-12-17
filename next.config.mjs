/** @type {import('next').NextConfig} */
const nextConfig = {
  // 静的HTMLエクスポートを有効化（最高のパフォーマンス）
  // output: 'export', // Disabled to allow API routes (Node.js runtime)

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

  // トレーリングスラッシュを追加（静的ホスティング用）
  trailingSlash: true,

  // ページ拡張子
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],

  // Proxy API requests to VPS backend to avoid Mixed Content (https -> http) errors
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://162.43.30.218:8080/api/:path*',
      },
    ];
  },
};

export default nextConfig;