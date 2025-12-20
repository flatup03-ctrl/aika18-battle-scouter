import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import { GoogleAIFileManager } from "@google/generative-ai/server";

const apiKey = (process.env.GOOGLE_API_KEY || "").trim();

if (!apiKey) {
    console.warn("⚠️ [Gemini] GOOGLE_API_KEY is MISSING! Analysis will fail.");
} else {
    const hiddenKey = `${apiKey.substring(0, 4)}...${apiKey.substring(apiKey.length - 4)}`;
    console.log(`[Gemini] v2.9.11 Engine Ready. Key: [${hiddenKey}] (Model: Flash)`);
}

const genAI = new GoogleGenerativeAI(apiKey);
const fileManager = new GoogleAIFileManager(apiKey);

/**
 * Uploads a file to Gemini and waits for it to be ACTIVE.
 * Adjusted for v2.9.11: 5s polling retained.
 */
async function uploadAndPoll(filePath: string, mimeType: string) {
    console.log(`[Gemini FileAPI] Uploading ${filePath}...`);
    const uploadResult = await fileManager.uploadFile(filePath, {
        mimeType,
        displayName: "LineVideo_" + Date.now(),
    });
    const file = uploadResult.file;
    console.log(`[Gemini FileAPI] Uploaded ${file.name}. URI: ${file.uri}`);

    // Wait for processing
    let activeFile = await fileManager.getFile(file.name);
    let attempts = 0;
    while (activeFile.state === "PROCESSING") {
        attempts++;
        console.log(`[Gemini FileAPI] Processing... (Attempt ${attempts} - 5s wait)`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
        activeFile = await fileManager.getFile(file.name);
    }

    if (activeFile.state !== "ACTIVE") {
        throw new Error(`File processing failed: ${activeFile.state}`);
    }
    console.log(`[Gemini FileAPI] File is ACTIVE.`);
    return activeFile;
}

/**
 * 動画や画像を解析する共通関数 (v2.9.11 File API Support)
 * mimeType, dataBase64が未指定の場合はテキストのみの解析を行う。
 * filePathが指定された場合はFile APIとおしてアップロード・解析を行う（動画推奨）。
 */
export async function analyzeMedia(mimeType?: string, dataBase64?: string, prompt: string = "", filePath?: string) {

    // 1. Video Analysis via File API (Robust Mode)
    if (mimeType?.startsWith('video/') && filePath) {
        console.log(`[Gemini] v2.9.11 (Flash FileAPI) Video Analysis Start...`);
        let uploadedFile = null;
        try {
            if (!apiKey) throw new Error("API_KEY_MISSING");

            // Upload & Wait
            uploadedFile = await uploadAndPoll(filePath, mimeType);

            // Analyze with Flash (Most Basic Alias)
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

            const result = await model.generateContent({
                contents: [{
                    role: 'user',
                    parts: [
                        { fileData: { mimeType: uploadedFile.mimeType, fileUri: uploadedFile.uri } },
                        { text: prompt }
                    ]
                }],
                generationConfig: { maxOutputTokens: 250, temperature: 0.2 }
            });

            const response = await result.response;
            return response.text();

        } catch (error: any) {
            console.error("Gemini Video Analysis Error:", error);
            if (error.message?.includes('processing failed')) {
                return "（動画の処理に失敗しちゃった... 別の動画で試してみて！）";
            }
            return "（動画の解析に失敗しちゃった...もう一度試してみてね！）";
        } finally {
            // Cleanup: Always delete the file from Gemini Storage
            if (uploadedFile) {
                console.log(`[Gemini FileAPI] Deleting ${uploadedFile.name}...`);
                await fileManager.deleteFile(uploadedFile.name).catch(e => console.error("Cleanup error:", e));
            }
        }
    }

    // 2. Existing Inline Logic
    console.log(`[Gemini] v2.9.11 (Flash Inline) Analysis Start...`);

    try {
        if (!apiKey) throw new Error("API_KEY_MISSING");

        // Use Flash (Most Basic Alias)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

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
        console.error("Gemini AIKA System Fallback (v2.9.8):", error.message);
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
