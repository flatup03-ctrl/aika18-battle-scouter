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

    // Handle only Image and Video
    if (message.type !== 'image' && message.type !== 'video') {
        if (message.type === 'text') {
            const userMsg = message.text;
            logToSheet({
                userId,
                type: 'Text (LINE)',
                userContent: userMsg,
                aiResponse: 'N/A (Standard Guide)'
            }).catch(err => console.error('Text Logging Error:', err));
            await replyMessage(replyToken, "画像か動画を送ってくれたら、公式トレーナーのAIKA（アイカ）が解析しちゃうわよ！🥊🥗\n今は格闘技のフォームや、食事の写真を待ってるわね♪");
        }
        return;
    }

    try {
        // Determine media type
        const type = message.type === 'image' ? 'image' : 'video';

        // 3. Download Media Content from LINE
        const mediaBuffer = await downloadLineContent(message.id);
        const base64Data = mediaBuffer.toString('base64');
        const mimeType = message.type === 'image' ? 'image/jpeg' : 'video/mp4';

        // 4. One-Shot Persona & Analysis for LINE (Ultra Fast)
        const taskLabel = message.type === 'image' ? 'お食事' : 'トレーニング';
        const personaPrompt = `
あなたはFLATUPGYMの公式トレーナー「AIKA（アイカ）」です。LINEのトーク画面で返信しています。
ユーザーが送ってくれた${taskLabel}のメディアを解析し、以下のルールで回答してください：
1. 最初は情熱的に褒めること（「あなたの情熱で画面が熱いわ！」等）。
2. プロのアドバイス（${type === 'image' ? '栄養・カロリー' : '格闘技の動き'}）を1つ、具体的かつ短く伝えること。
3. 最後に必ず「無料体験」のご案内を添えること。
【重要】予約リンクは必ず https://liff.line.me/2008276179-41Dz3bbJ を使用してください。
4. 全体で100〜150文字程度。
        `.trim();

        console.log(`[LINE] Starting Single-Step Gemini Analysis for ${mimeType}...`);
        const answer = await analyzeMedia(mimeType, base64Data, personaPrompt);
        console.log(`[LINE] Analysis Complete`);

        // 7. Log to Google Sheets (Non-blocking)
        logToSheet({
            userId,
            type: `${type} (LINE)`,
            userContent: `MediaID: ${message.id}`,
            aiResponse: answer
        }).catch(err => console.error('Webhook Logging Error:', err));

        // 8. Reply to LINE
        await replyMessage(replyToken, answer);

    } catch (error) {
        console.error('Handle Message Error:', error);
        await replyMessage(replyToken, "ごめんね、うまく解析できなかったみたい…💦\nもう一度送ってみてくれるかな？");
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
