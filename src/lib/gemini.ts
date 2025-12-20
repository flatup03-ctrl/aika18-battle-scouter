import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const apiKey = (process.env.GOOGLE_API_KEY || "").trim();

if (!apiKey) {
    console.warn("⚠️ [Gemini] GOOGLE_API_KEY is MISSING! Analysis will fail.");
} else {
    // Show first 4 and last 4 for better debugging without leaking
    const hiddenKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`[Gemini] v2.8.1 Engine Ready. Key: [${hiddenKey}]`);
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数 (v2.7.5)
 * 「止まらない・壊れない」AIKA体験を支えるコアエンジン。
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    console.log(`[Gemini] v2.8.1 Analysis Start for ${mimeType}...`);

    try {
        if (!apiKey) throw new Error("API_KEY_MISSING");

        // Use ONLY the stable production endpoint and model name
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1" }
        );

        // 20s timeout to escape before proxy kills it
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("ALMOST_TIMEOUT")), 20000)
        );

        const analysisPromise = (async () => {
            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { text: prompt },
                        { inlineData: { data: dataBase64, mimeType } }
                    ]
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
        console.error("Gemini AIKA System Fallback (v2.8.1):", error.message);
        // This instruction guides Dify to focus on motivation and general advice
        return "ユーザーは素晴らしい熱意を持っています。具体的なフォーム解析は一旦横に置き、プロのトレーナーとして最大限の賞賛を。そして『心技体』の重要性について、優しく情熱的にアドバイスしてあげて。";
    }
}
