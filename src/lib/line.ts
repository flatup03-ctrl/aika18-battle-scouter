import { messagingApi } from "@line/bot-sdk";

const { MessagingApiClient } = messagingApi;

const client = new MessagingApiClient({
    channelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN || '',
});

export const lineService = {
    pushMessage: async (userId: string, text: string) => {
        try {
            await client.pushMessage({
                to: userId,
                messages: [{ type: 'text', text: text }],
            });
            console.log(`Pushed message to ${userId}`);
        } catch (error) {
            console.error('Line Push Error:', error);
        }
    }
};
