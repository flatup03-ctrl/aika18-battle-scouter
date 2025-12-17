import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const outfit = Outfit({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AIKA 19 | 次世代AI格闘技フォーム解析",
  description: "あなたの格闘技フォームをAIが瞬時に解析。AIKA 19で新たな高みへ。",
  openGraph: {
    title: "AIKA 19",
    description: "プロ級のフォーム解析を、あなたの手元で。",
    type: "website",
    locale: "ja_JP",
    siteName: "AIKA 19",
  },
  twitter: {
    card: "summary_large_image",
    title: "AIKA 19",
    description: "次世代AI格闘技フォーム解析",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className={outfit.className}>
      <body className="antialiased text-slate-50 bg-slate-900">
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  );
}