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
            await logToSheet({
                userId,
                type: 'Text (LINE)',
                userContent: userMsg,
                aiResponse: 'N/A (Standard Guide)'
            });
            await replyMessage(replyToken, "画像か動画を送ってくれたら、AI 18号が解析しちゃうよ！🥊🥗\n今は格闘技のフォームや、食事の写真を待ってるね♪");
        }
        return;
    }

    try {
        // 3. Download Media Content from LINE
        const mediaBuffer = await downloadLineContent(message.id);
        const base64Data = mediaBuffer.toString('base64');
        const mimeType = message.type === 'image' ? 'image/jpeg' : 'video/mp4';

        // 4. Determine Analysis Type (Simple heuristic: image=food, video=combat)
        const type = message.type === 'image' ? 'image' : 'video';
        const prompt = type === 'image'
            ? "管理栄養士として、この食事画像を見て、推定カロリーとアドバイスを優しく簡潔に述べてください。"
            : "格闘技トレーナーとして、動画の動きに対するワンポイントアドバイスを専門的かつフレンドリーに伝えてください。";
        const userContext = type === 'image' ? "食事管理中" : "格闘技上達を目指すユーザー";

        // 5. ACTUAL Gemini Analysis
        const geminiAnalysis = await analyzeMedia(mimeType, base64Data, prompt);

        // 6. Persona Transformation via Dify
        const taskLabel = type === 'image' ? 'お食事' : 'トレーニング';
        const difyResponse = await sendToDify(
            {
                analysis_result: geminiAnalysis,
                user_context: userContext,
                task_type: type
            },
            userId,
            `あなたは「AI 18号」です。LINEのトーク画面で返信しています。
ユーザーが送ってくれた${taskLabel}を解析しました。褒めつつ、短く心に響くアドバイスを1つ送ってください。
解析結果: ${geminiAnalysis}`
        );

        const answer = difyResponse.answer || difyResponse.message || geminiAnalysis;

        // 7. Log to Google Sheets
        await logToSheet({
            userId,
            type: `${type} (LINE)`,
            userContent: `MediaID: ${message.id}`,
            aiResponse: answer
        });

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
