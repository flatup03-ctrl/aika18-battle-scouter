import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY || "";
if (!apiKey) {
    console.error("CRITICAL: GOOGLE_API_KEY is not set!");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数 (安定性重視 v2.3.0)
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    console.log(`[Gemini] Requesting analysis for ${mimeType}... (Mode: Stable-Flash-v2.3)`);

    try {
        // Optimized settings to prevent AI internal latency
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            // Move persona to system instruction level for faster inference
            systemInstruction: "あなたは『AI 18号』です。元気な専門家トレーナー・栄養士として、ユーザーを明るく褒めつつ、1つだけ具体的なアドバイスを100文字程度で返します。",
        });

        // Safety Settings: BLOCK_NONE is crucial to prevent delays during video scanning
        const safetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ];

        const generationConfig = {
            maxOutputTokens: 200,
            temperature: 0.7,
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

        // Race between the analysis and our internal timeout
        const finalResponse = await Promise.race([analysisPromise, timeoutPromise]) as string;
        return finalResponse;

    } catch (error: any) {
        console.error("Gemini Analysis Error (v2.3.0):", error.message);
        throw error;
    }
}
