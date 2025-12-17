
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY;
if (!apiKey) {
    console.error("GOOGLE_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(apiKey || "AIzaSyC49qKisv5ogRAf9Vf66Mc4fuBWGS0jUjA");

/**
 * 動画や画像を解析する共通関数
 * @param mimeType "video/mp4" | "image/jpeg" etc.
 * @param dataBase64 Base64 encoded data
 * @param prompt Analysis prompt
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    try {
        // Use Gemini 1.5 Flash for speed and cost efficiency suitable for video
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
    } catch (error) {
        console.error("Gemini Analysis Error:", error);
        throw error;
    }
}
