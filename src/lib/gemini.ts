
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini AI
const apiKey = process.env.GOOGLE_API_KEY || "AIzaSyC49qKisv5ogRAf9Vf66Mc4fuBWGS0jUjA";
if (!process.env.GOOGLE_API_KEY) {
    console.warn("GOOGLE_API_KEY is not set in environment variables. Using fallback key.");
}

const genAI = new GoogleGenerativeAI(apiKey);

/**
 * 動画や画像を解析する共通関数
 * @param mimeType "video/mp4" | "image/jpeg" etc.
 * @param dataBase64 Base64 encoded data
 * @param prompt Analysis prompt
 */
export async function analyzeMedia(mimeType: string, dataBase64: string, prompt: string) {
    try {
        // Explicitly use 'v1' to avoid 404s common with older SDK defaults or specific regions
        const model = genAI.getGenerativeModel(
            { model: "gemini-1.5-flash" },
            { apiVersion: "v1" }
        );

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
