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

    // テキスト、画像、動画のいずれか
    if (message.type !== 'text' && message.type !== 'image' && message.type !== 'video') {
        return;
    }

    try {
        if (message.type === 'image' || message.type === 'video') {
            // メディア投稿時はLIFFへ誘導（サーバー負荷軽減）
            const guidingMsg = "動画や写真の投稿ありがとう！ AI 18号のアドバイスが欲しい時は、リッチメニューの「相棒（AIBO）」アプリから練習ノートを書いてみてね♪ 待ってるわ！🔥";
            await replyMessage(replyToken, guidingMsg);
            return;
        }

        // テキストメッセージの場合はDifyで回答（Geminiを介さず直接）
        const userMsg = message.text;
        const difyPrompt = `
あなたはFLATUPGYMの公式トレーナー「AIKA（アイカ）」です。
【キャラクター】自信満々で情熱的。女性には優しく、男性には厳しくも愛のある指導を。
【返答の基本】LINEトークでのメッセージに対して、ファンを増やすような魅力的で元気な返答をしてください。
【予約への案内】体験や予約の話題が出たら以下のリンクを案内して。
👉 https://liff.line.me/2008276179-41Dz3bbJ
ユーザー発言: ${userMsg}
        `.trim();

        let difyResponse;
        try {
            difyResponse = await sendToDify(
                {
                    analysis_result: userMsg,
                    task_type: 'normal_chat',
                    user_context: "LINEトークからの直接メッセージ",
                    user_name: userId || 'LINE_USER',
                },
                userId || 'LINE_USER',
                difyPrompt
            );
        } catch (err: any) {
            difyResponse = { answer: "熱血指導中だけど、ちょっと通信が混み合ってるみたい！後でまた話しかけてね♪" };
        }

        const answer = difyResponse.answer || difyResponse.message;
        await replyMessage(replyToken, answer);

    } catch (error) {
        console.error('Handle Message Error:', error);
        await replyMessage(replyToken, "ごめんね、うまくお返事できなかったみたい…💦");
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
