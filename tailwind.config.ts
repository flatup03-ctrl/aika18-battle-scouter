import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gold: "#FFD700",
        "brand-black": "#121212",
        "primary-blue": "#0057FF", // メインのブランドカラー
        "accent-orange": "#FF7A00", // アクセントカラー（ボタンなど）
        "sporty-green": "#00C48C", // ポジティブな要素を強調
        "light-gray": "#F3F4F6", // 背景色
        "dark-text": "#1F2937", // 基本のテキストカラー
      },
      fontFamily: {
        sans: ["var(--font-orbitron)", "var(--font-noto-sans-jp)", "sans-serif"],
      },
      boxShadow: {
        gold: "0 0 15px 5px rgba(255, 215, 0, 0.4)",
      },
    },
  },
  plugins: [],
};
export default config;

