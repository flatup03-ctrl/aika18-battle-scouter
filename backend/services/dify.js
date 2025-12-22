import dotenv from 'dotenv';
dotenv.config();

const DIFY_API_KEY = process.env.DIFY_API_KEY;
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

export const difyService = {
    /**
     * Sends the analysis result to Dify to get the persona response.
     * @param {string} analysisResult - The raw text result from Gemini.
     * @param {string} userId - The LINE User ID.
     * @returns {Promise<string>} The response from Dify (AIKA's persona message).
     */
    sendToDify: async (content, userId, userName = "ゲスト", taskType = "normal_chat") => {
        if (!DIFY_API_KEY) {
            console.warn("DIFY_API_KEY is not set. Returning content.");
            return "（Dify連携未設定）内容：\n" + content;
        }

        try {
            console.log(`Sending to Dify for User: ${userId} (Task: ${taskType})...`);
            const inputs = {
                analysis_result: content, // Geminiの代わりにユーザー入力を入れる
                user_name: userName,
                task_type: taskType
            };

            const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${DIFY_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    inputs: inputs,
                    query: content, // 直接入力をクエリにする
                    response_mode: "blocking",
                    user: userId,
                    conversation_id: ""
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                // Special handling for 404/400 (Model errors)
                if (response.status === 404 || response.status === 400) {
                    console.error(`[Dify] Model/Connection Error (${response.status}):`, errorText);
                }
                throw new Error(`Dify API Error: ${response.status} ${errorText}`);
            }

            const data = await response.json();
            return data.answer; // Dify returns { answer: "..." }

        } catch (error) {
            console.error("Dify Service Error:", error);
            // Fallback if Dify fails
            return `（Difyとの連携に失敗しました...）\n\n【提供内容】\n${content}`;
        }
    }
};
