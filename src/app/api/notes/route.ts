import { NextResponse } from 'next/server';
import { dbService } from '@/lib/database';
import { sendToDify } from '@/lib/dify';
import { lineService } from '@/lib/line';

export async function POST(request: Request) {
    try {
        const { content, userId, userName } = await request.json();

        if (!content || !userId) {
            return NextResponse.json({ error: 'Missing content or userId' }, { status: 400 });
        }

        // 1. ユーザーの取得・作成
        await dbService.getOrCreateUser(userId, userName || 'ゲスト');

        // 2. 非同期的にAI回答とプッシュ通知（Next.jsではResponseを返した後にBackgroundで動かすのが少しトリッキーですが、
        // Vercel/RenderなどのNode環境では処理を待たずにレスポンスを返すことが可能です）

        // --- 実際の処理（ここではawaitせずに走らせる手法もありますが、安定のため順次行います） ---
        const history = await dbService.getRecentConversations(userId, 5);
        // @ts-ignore
        const context = history.map(h => `${h.sender === 'user' ? 'User' : 'AI'}: ${h.message}`).join('\n');

        // Dify連携 (練習ノートとして処理)
        const taskType = content.includes('食事') ? 'image_analysis' : 'normal_chat';
        const aikaResponse = await sendToDify(
            { analysis_result: content, task_type: taskType },
            userId,
            `あなたはFLATUPGYMのトレーナー「AIKA」。会話履歴:\n${context}\n\n相談内容: ${content}`
        );

        const answer = aikaResponse.answer || aikaResponse.message;

        // DB永続化
        await dbService.saveNote(userId, content, answer);
        await dbService.saveConversation(userId, content, 'user');
        await dbService.saveConversation(userId, answer, 'ai');
        await dbService.addPoints(userId, 5); // 5pt

        // LINEプッシュ
        await lineService.pushMessage(userId, answer);

        return NextResponse.json({ success: true, message: 'Note processed' });

    } catch (error: any) {
        console.error('Notes API Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
