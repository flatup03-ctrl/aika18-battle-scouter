import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY || "";
if (!apiKey) {
    console.error("CRITICAL: GOOGLE_API_KEY is not set!");
} else {
    console.log(`Gemini SDK initialized with key starting with: ${apiKey.substring(0, 3)}...`);
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数
 * @param mimeType "video/mp4" | "image/jpeg" etc.
 * @param dataBase64 Base64 encoded data
 * @param prompt Analysis prompt
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    console.log(`[Gemini] Starting analysis for ${mimeType}... (Mode: Fast-8B)`);

    try {
        // Use gemini-1.5-flash-8b: The fastest model currently available
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-8b" });

        // Force a 25-second timeout to return before the 30s Render gateway timeout
        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Gemini API request timed out (25s limit)")), 25000)
        );

        const analysisPromise = (async () => {
            const result = await model.generateContent([
                prompt,
                {
                    inlineData: {
                        data: dataBase64,
                        mimeType: mimeType
                    }
                }
            ]);
            const response = await result.response;
            return response.text();
        })();

        // Race between the analysis and our internal timeout
        const finalResponse = await Promise.race([analysisPromise, timeoutPromise]) as string;
        return finalResponse;

    } catch (error: any) {
        console.error("Gemini Analysis Error:", error.message);
        throw error;
    }
}
