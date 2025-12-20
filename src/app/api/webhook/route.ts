import { NextResponse } from 'next/server';
import crypto from 'crypto';
import axios from 'axios';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';
import { logToSheet } from '@/lib/sheets';

/**
 * LINE Messaging API Webhook
 * Handles Image/Video messages sent directly in the LINE talk screen.
 */

const CHANNEL_SECRET = process.env.LINE_CHANNEL_SECRET || '';
const CHANNEL_ACCESS_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN || '';

export async function POST(request: Request) {
    try {
        const body = await request.text();
        const signature = request.headers.get('x-line-signature') || '';

        // 1. Signature Verification
        if (!verifySignature(body, signature)) {
            return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
        }

        const data = JSON.parse(body);
        const events = data.events || [];

        // 2. Process Events
        for (const event of events) {
            if (event.type === 'message') {
                await handleMessageEvent(event);
            }
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error('Webhook Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

async function handleMessageEvent(event: any) {
    const { message, replyToken, source } = event;
    const userId = source.userId;

    // Handle Text, Image and Video
    if (message.type !== 'text' && message.type !== 'image' && message.type !== 'video') {
        return; // Ignore other message types
    }

    try {
        let visualRawData = "";
        let type = message.type;
        let taskLabel = "";

        if (message.type === 'text') {
            const userMsg = message.text;
            console.log(`[LINE] Starting Text Analysis with Gemini...`);
            visualRawData = await analyzeMedia(undefined, undefined, `ユーザーからのメッセージを分析し、意図や重要なキーワードを抽出してください。\nメッセージ: ${userMsg}`);
            taskLabel = "メッセージ";
        } else {
            // Determine media type
            type = message.type === 'image' ? 'image' : 'video';
            taskLabel = message.type === 'image' ? 'お食事' : 'トレーニング';

            // 3. Download Media Content from LINE
            const mediaBuffer = await downloadLineContent(message.id);
            const mimeType = message.type === 'image' ? 'image/jpeg' : 'video/mp4';

            if (message.type === 'video') {
                // Video: Save to temp file for File API
                const fs = require('fs/promises');
                const path = require('path');
                const os = require('os');
                const tempFilePath = path.join(os.tmpdir(), `video_${message.id}.mp4`);

                await fs.writeFile(tempFilePath, mediaBuffer);
                console.log(`[LINE] Video saved to ${tempFilePath}`);

                try {
                    // Pass filePath to analyzeMedia (File API Flow)
                    console.log(`[LINE] Starting Video Analysis (File API)...`);
                    visualRawData = await analyzeMedia(mimeType, undefined, "専門的な観点（フォームや食材）から、客観的な事実と改善点を1つだけ簡潔に。", tempFilePath);
                } finally {
                    // Clean up temp file (though analyzeMedia tries to delete, good to ensure)
                    await fs.unlink(tempFilePath).catch(() => { });
                }
            } else {
                // Image: Keep existing Inline Base64 (Faster for images)
                const base64Data = mediaBuffer.toString('base64');
                console.log(`[LINE] Starting Visual Extraction with Gemini (Inline)...`);
                visualRawData = await analyzeMedia(mimeType, base64Data, "専門的な観点（フォームや食材）から、客観的な事実と改善点を1つだけ簡潔に。");
            }
        }

        console.log(`[LINE] Gemini Analysis Complete. Sending to Dify...`);

        // 5. Dify Transformation (Persona & Centralized Logging)
        const difyPrompt = `
あなたはFLATUPGYMの公式トレーナー「AIKA（アイカ）」です。
【キャラクター】自信満々で情熱的。女性には優しく、男性には厳しくも愛のある指導を。
【返答の基本】LINEトークでのメッセージ・${taskLabel}に対して、ファンを増やすような魅力的で元気な返答をしてください。
【予約への案内】
体験予約や見学、申し込みに関する話題が出た場合は、必ず以下のリンクを案内してください。
👉 https://liff.line.me/2008276179-41Dz3bbJ
解析/分析データ: ${visualRawData}
ユーザー発言: ${message.type === 'text' ? message.text : '(メディア投稿)'}
        `.trim();

        let difyResponse;
        try {
            difyResponse = await sendToDify(
                {
                    analysis_result: visualRawData,
                    task_type: type,
                    user_context: "LINEトーク画面からの投稿",
                    user_name: userId || 'LINE_USER',
                    User_Name: userId || 'LINE_USER',
                    userName: userId || 'LINE_USER',
                    user_gender: '不明',
                    user_text: message.type === 'text' ? message.text : ''
                },
                userId || 'LINE_USER',
                difyPrompt
            );
        } catch (err: any) {
            console.error(`[LINE] Dify Error (Fallback):`, err.message);
            difyResponse = {
                answer: `${visualRawData}\n\n（※通信状況により、AIKAからの特別メッセージが届きにくいみたい。でも内容はしっかり確認したわよ！🔥）`
            };
        }

        const answer = difyResponse.answer || difyResponse.message || visualRawData;
        console.log(`[LINE] Dify Response Received`);

        // 7. Log to Google Sheets (Non-blocking)
        logToSheet({
            userId,
            type: `${type} (LINE)`,
            userContent: message.type === 'text' ? message.text : `MediaID: ${message.id}`,
            aiResponse: answer
        }).catch(err => console.error('Webhook Logging Error:', err));

        // 8. Reply to LINE
        await replyMessage(replyToken, answer);

    } catch (error) {
        console.error('Handle Message Error:', error);
        await replyMessage(replyToken, "ごめんね、うまくお返事できなかったみたい…💦\nもう一度送ってみてくれるかな？");
    }
}

function verifySignature(body: string, signature: string): boolean {
    if (!CHANNEL_SECRET) return true; // Skip if not set (for initial setup)
    const hash = crypto
        .createHmac('sha256', CHANNEL_SECRET)
        .update(body)
        .digest('base64');
    return hash === signature;
}

async function downloadLineContent(messageId: string): Promise<Buffer> {
    const response = await axios.get(`https://api-data.line.me/v2/bot/message/${messageId}/content`, {
        headers: { Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}` },
        responseType: 'arraybuffer'
    });
    return Buffer.from(response.data);
}

async function replyMessage(replyToken: string, text: string) {
    if (!CHANNEL_ACCESS_TOKEN) {
        console.warn('CHANNEL_ACCESS_TOKEN is missing. Cannot reply.');
        return;
    }
    await axios.post('https://api.line.me/v2/bot/message/reply', {
        replyToken,
        messages: [{ type: 'text', text }]
    }, {
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${CHANNEL_ACCESS_TOKEN}`
        }
    });
}
