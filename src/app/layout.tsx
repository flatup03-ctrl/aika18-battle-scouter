import type { Metadata } from "next";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export const metadata: Metadata = {
  title: "AIKA 19",
  description: "次世代AI格闘技フォーム解析",
};

export const viewport = "width=device-width, initial-scale=1.0";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // デバッグ: サーバーサイドで実行される
  if (typeof window === 'undefined') {
    console.log("🔵 RootLayout: サーバーサイドレンダリング");
  }

  return (
    <html lang="ja">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              console.log("✅ HTML head: スクリプト実行開始");
              console.log("✅ Document readyState:", document.readyState);
              if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', function() {
                  console.log("✅ DOMContentLoaded: DOM構築完了");
                });
              } else {
                console.log("✅ DOM: 既に読み込み済み");
              }
            `
          }}
        />
        <style dangerouslySetInnerHTML={{
          __html: `
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: 100%; height: 100%; }
            body { display: block; min-height: 100vh; }
          `
        }} />
      </head>
      <body style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                console.log("✅ Body script: 実行開始");
                console.log("✅ Body children count:", document.body.children.length);
                console.log("✅ Body innerHTML length:", document.body.innerHTML.length);
                
                // レンダリング確認
                setTimeout(function() {
                  const hasContent = document.body.children.length > 0;
                  console.log("✅ レンダリング確認 (1秒後):", hasContent ? "コンテンツあり" : "コンテンツなし");
                  if (!hasContent) {
                    console.error("❌ エラー: body要素にコンテンツがレンダリングされていません");
                    console.error("❌ body要素の詳細:", {
                      children: document.body.children.length,
                      innerHTML: document.body.innerHTML.substring(0, 200),
                      style: window.getComputedStyle(document.body)
                    });
                  }
                }, 1000);
              })();
            `
          }}
        />
      </body>
    </html>
  );
}