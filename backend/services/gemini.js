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

const getMimeType = (extension) => {
    const mimeTypeMap = {
        'mp4': 'video/mp4',
        'mov': 'video/quicktime',
        'mpeg': 'video/mpeg',
        'mpg': 'video/mpeg',
        'avi': 'video/x-msvideo',
        'wmv': 'video/x-ms-wmv',
        'webm': 'video/webm',
        'flv': 'video/x-flv',
    };
    return mimeTypeMap[extension?.toLowerCase().replace('.', '')] || 'video/mp4';
};

export const geminiService = {
    // filePath is local path to the video file
    analyzeVideo: async (filePath, extension = 'mp4') => {
        const mimeType = getMimeType(extension);
        try {
            // 1. Upload to Gemini
            console.log(`[Gemini] Uploading with MIME: ${mimeType}...`);
            const uploadResponse = await fileManager.uploadFile(filePath, {
                mimeType: mimeType,
                displayName: 'AIKA_Video_' + Date.now(),
            });

            console.log(`[Gemini] Uploaded file as: ${uploadResponse.file.uri}`);

            // 2. Wait for processing
            let file = await fileManager.getFile(uploadResponse.file.name);
            let attempts = 0;
            while (file.state === "PROCESSING") {
                if (attempts > 30) {
                    console.error('[Gemini] Timeout: Video processing taking too long.');
                    throw new Error("Timeout waiting for video processing");
                }
                process.stdout.write(".");
                await new Promise((resolve) => setTimeout(resolve, 5000));
                file = await fileManager.getFile(uploadResponse.file.name);
                attempts++;
            }

            if (file.state === "FAILED") {
                console.error('[Gemini] Processing FAILED. Details:', JSON.stringify(file, null, 2));
                throw new Error("Video processing failed on Gemini side. Please check video codec/format.");
            }

            console.log('\n[Gemini] Video processed successfully. Generating analysis...');

            // 3. Generate Content
            // Note: gemini-2.0-flash is used here. 
            // If Dify fails to recognize it, ensure Dify is configured with the same model name.
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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
            console.log('[Gemini] Analysis generated.');

            // 4. Cleanup (Async, don't wait)
            fileManager.deleteFile(uploadResponse.file.name).catch(err =>
                console.warn(`[Gemini] Cleanup Warning (Non-critical): ${err.message}`)
            );

            return responseText;
        } catch (error) {
            console.error('[Gemini] Service Error:', error);
            throw error;
        }
    }
};
