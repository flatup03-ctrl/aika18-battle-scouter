import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY || "";
if (!apiKey) {
    console.error("CRITICAL: GOOGLE_API_KEY is not set!");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数 (安定性重視 v2.5.0)
 * 高性能モデル(Pro等)への切り替え時も、安全性フィルタによるフリーズを防ぐ設定。
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    console.log(`[Gemini] Analysis Request: ${mimeType} (Engine: v2.5.0)`);

    try {
        // NOTE: Standard Flash for speed. Can be changed to "gemini-1.5-pro" if needed.
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash"
        });

        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const generationConfig = {
            maxOutputTokens: 500,
            temperature: 0.2, // Lower temp for more accurate visual description
            topP: 0.8,
            topK: 40,
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Gemini API request timed out (25s limit)")), 25000)
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
                safetySettings,
                generationConfig
            });
            const response = await result.response;
            return response.text();
        })();

        return await Promise.race([analysisPromise, timeoutPromise]) as string;

    } catch (error: any) {
        console.error("Gemini Analysis Error (v2.5.0):", error.message);
        throw error;
    }
}
