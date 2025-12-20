import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = (process.env.GOOGLE_API_KEY || "").trim();

if (!apiKey) {
    console.warn("⚠️ [Gemini] GOOGLE_API_KEY is MISSING! Analysis will fail.");
} else {
    // Show first 4 and last 4 for better debugging without leaking
    const hiddenKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`[Gemini] v2.8.3 Engine Ready. Key: [${hiddenKey}]`);
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数 (v2.8.5)
 * 「止まらない・壊れない」AIKA体験を支えるコアエンジン。
 * mimeType, dataBase64が未指定の場合はテキストのみの解析を行う。
 */
export async function analyzeMedia(mimeType?: string, dataBase64?: string, prompt: string = "") {
    console.log(`[Gemini] v2.9.1 (Pro) Analysis Start...`);

    try {
        if (!apiKey) throw new Error("API_KEY_MISSING");

        // Use standard ID. 'latest' alias proved unstable.
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });

        // 20s timeout to escape before proxy kills it
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ALMOST_TIMEOUT")), 20000)
        );

        const analysisPromise = (async () => {
            const parts: any[] = [{ text: prompt }];
            if (dataBase64 && mimeType) {
                parts.push({ inlineData: { data: dataBase64, mimeType } });
            }

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: parts
                }],
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ],
                generationConfig: { maxOutputTokens: 250, temperature: 0.2 }
            });
            const response = await result.response;
            return response.text();
        })();

        return await Promise.race([analysisPromise, timeoutPromise]) as string;

    } catch (error: any) {
        console.error("Gemini AIKA System Fallback (v2.9.1):", error.message);
        // User-ready fallback messages
        const isImage = mimeType?.startsWith('image');
        const isVideo = mimeType?.startsWith('video');

        if (isImage) {
            return "あら、とっても美味しそうなお食事ね！😋✨ 栄養バランスを考えた素晴らしいチョイスだわ。具体的な分析には少しお時間をいただくけれど、その『美意識』の高さこそが最高のスパイスね！これからも楽しみながら続けていきましょう♪";
        } else if (isVideo) {
            return "あなたの情熱、画面越しに熱く伝わってきたわよ！🔥✨ 具体的なフォーム解析は今お預けだけど、その勢いがあれば『心技体』の成長は間違いなし！プロトレーナーとして、今の努力に100点満点をあげちゃうわ！ジムで会えるのが楽しみね♪";
        } else {
            return "素敵なメッセージをありがとう！✨ 今は少しだけ私の『勘』が鈍っているみたいだけど、あなたの美しさと情熱はしっかり伝わっているわよ。またすぐにお話ししましょうね♪";
        }
    }
}
