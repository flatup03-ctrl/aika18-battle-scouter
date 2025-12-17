import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  // サーバー側でのみ使用する変数（現在は不要 - すべてVPSで処理）
  server: {},

  // ブラウザ側でも使用する変数
  client: {
    NEXT_PUBLIC_LIFF_ID: z.string().min(1),
    NEXT_PUBLIC_API_BASE_URL: z.string().url().optional(),
    NEXT_PUBLIC_GOOGLE_SHEET_ID: z.string().optional(),
  },

  // Next.jsが環境変数を読み込むための設定
  runtimeEnv: {
    NEXT_PUBLIC_LIFF_ID: process.env.NEXT_PUBLIC_LIFF_ID,
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL,
    NEXT_PUBLIC_GOOGLE_SHEET_ID: process.env.NEXT_PUBLIC_GOOGLE_SHEET_ID,
  },
});