
// Dify API Client
const DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-wgsX1tHoe5SQZkIkmlYB5ED7';
const DIFY_API_URL = process.env.DIFY_API_URL || 'https://api.dify.ai/v1';

export async function sendToDify(
    inputs: Record<string, any>,
    userId: string,
    query: string = "解析結果に基づき返答してください"
) {
    if (!DIFY_API_KEY) {
        console.warn("DIFY_API_KEY is not set. Returning mock response.");
        return {
            answer: "（Dify連携未設定）解析結果：\n" + JSON.stringify(inputs, null, 2)
        };
    }

    try {
        const response = await fetch(`${DIFY_API_URL}/chat-messages`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${DIFY_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                inputs: inputs,
                query: query,
                response_mode: "blocking",
                user: userId,
                conversation_id: "" // We can implement conversation history later if needed
            })
        });

        if (!response.ok) {
            const errorText = await response.text();

            // Helpful logging for Model/Connection errors
            if (response.status === 404 || response.status === 400) {
                console.error(`[Dify] Model/Connection Error (${response.status}):`, errorText);
            }

            throw new Error(`Dify API Error: ${response.status} ${errorText}`);
        }

        const data = await response.json();
        return data; // contains 'answer' field
    } catch (error) {
        console.error("Dify Client Error:", error);
        throw error;
    }
}
