import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyBMyjJJ0rL037sgmue3mPRmWar78kNtRbo";
if (!process.env.GOOGLE_API_KEY) {
    console.warn("Using fallback Gemini API Key.");
} else {
    console.log(`Gemini Key Check: starts with ${apiKey.substring(0, 3)}...`);
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数 (確実性重視 v2.6.0)
 * AIが詰まってもエラーを出さず、フォールバックを返して次に繋ぐ。
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    console.log(`[Gemini] v2.6 Analysis triggered for ${mimeType}...`);

    try {
        if (!apiKey) throw new Error("API_KEY_MISSING");

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // Force a 20-second timeout to return BEFORE Render kills the request.
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
                generationConfig: { maxOutputTokens: 200, temperature: 0.2 }
            });
            const response = await result.response;
            return response.text();
        })();

        return await Promise.race([analysisPromise, timeoutPromise]) as string;

    } catch (error: any) {
        console.error("Gemini Safe-Fail (v2.6.0) triggered:", error.message);
        // FALLBACK: Return a message that Dify will use to generate a generic response
        return `[解析失敗: 動画が長く重すぎるか、APIキーの制限です。でも大丈夫！雰囲気でアドバイスしてあげてね]`;
    }
}
