import { GoogleGenerativeAI } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";
import fs from 'fs';
import dotenv from 'dotenv';
dotenv.config();

// Fix: Force set GOOGLE_PROJECT_ID to prevent GoogleAuth error in certain environments
if (!process.env.GOOGLE_PROJECT_ID) {
    process.env.GOOGLE_PROJECT_ID = 'dummy-project-id';
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);

export const geminiService = {
    // filePath is local path to the video file
    analyzeVideo: async (filePath, mimeType = "video/mp4") => {
        try {
            // 1. Upload to Gemini
            console.log('Uploading to Gemini...');
            const uploadResponse = await fileManager.uploadFile(filePath, {
                mimeType: mimeType,
                displayName: 'UserVideo_' + Date.now(),
            });

            console.log(`Uploaded file as: ${uploadResponse.file.uri}`);

            // 2. Wait for processing
            let file = await fileManager.getFile(uploadResponse.file.name);
            let attempts = 0;
            while (file.state === "PROCESSING") {
                if (attempts > 30) throw new Error("Timeout waiting for video processing"); // 60s timeout
                process.stdout.write(".");
                await new Promise((resolve) => setTimeout(resolve, 2000));
                file = await fileManager.getFile(uploadResponse.file.name);
                attempts++;
            }

            if (file.state === "FAILED") {
                throw new Error("Video processing failed on Gemini side.");
            }

            console.log('Video processed. Generating content...');

            // 3. Generate Content
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const prompt = "あなたはプロの格闘技トレーナーです。この動画のフォームを解析し、良い点と改善点を具体的にアドバイスしてください。危険な動きがあれば指摘してください。";

            const result = await model.generateContent([
                {
                    fileData: {
                        mimeType: file.mimeType,
                        fileUri: file.uri
                    }
                },
                { text: prompt }
            ]);

            const responseText = result.response.text();

            // 4. Cleanup (Async, don't wait)
            fileManager.deleteFile(uploadResponse.file.name).catch(console.error);

            return responseText;
        } catch (error) {
            console.error('Gemini Service Error:', error);
            throw error;
        }
    }
};
