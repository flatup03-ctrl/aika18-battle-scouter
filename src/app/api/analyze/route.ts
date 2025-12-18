import { NextResponse } from 'next/server';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';
import { logToSheet } from '@/lib/sheets';

/**
 * AI 18 Analyze API - Implementation Level
 * This route handles real-time media analysis using Gemini 1.5 Flash.
 */

export async function POST(request: Request) {
    try {
        // Parse the incoming multipart form data (real implementation)
        const formData = await request.formData();
        const type = formData.get('type') as string || 'video';
        const userId = formData.get('userId') as string || 'GUEST';

        // --- Branch 1: Chat/Counseling (Text Only) ---
        if (type === 'chat') {
            const userText = formData.get('text') as string;
            if (!userText) {
                return NextResponse.json({ error: '相談内容を入力してください。' }, { status: 400 });
            }

            const difyResponse = await sendToDify(
                { task_type: 'chat' },
                userId,
                `あなたは「AI 18号」として、ユーザーの悩みや相談に親身に乗ってあげてください。
格闘技や食事のアドバイスも得意ですが、基本的には明るく元気にユーザーをサポートするキャラクターです。
相談内容: ${userText}`
            );

            const result = {
                summary: "AI 18号からのメッセージ",
                details: difyResponse.answer || difyResponse.message,
                raw_analysis: userText
            };

            await logToSheet({
                userId,
                type: 'Chat (UI)',
                userContent: userText,
                aiResponse: result.details
            });

            return NextResponse.json({ success: true, result });
        }

        // --- Branch 2: Media Analysis (File Required) ---
        const file = formData.get('file') as File | null;
        if (!file) {
            return NextResponse.json({ error: 'ファイルが見つかりません。' }, { status: 400 });
        }

        console.log(`Analyzing: ${file.name} (Type: ${type}, Size: ${file.size})`);

        // 1. Process File to Base64
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');

        // 2. Determine Prompt
        let prompt = "格闘技のフォーム分析をするトレーナーとして、動画（または画像）を見て、動きの正確さや改善点を1つ専門的にアドバイスしてください。";
        let userContext = "格闘技初心者、褒められて伸びるタイプ";
        let systemSummary = "戦闘力分析結果";

        if (type === 'image') {
            prompt = "管理栄養士として、この食事画像を見て、含まれる主な食材を推測し、推定カロリーと健康へのアドバイスを優しく簡潔に述べてください。";
            userContext = "健康に気を使っています。具体的で前向きなアドバイスが欲しいです。";
            systemSummary = "食事・カロリー診断結果";
        }

        // 3. ACTUAL Gemini Analysis
        const geminiAnalysis = await analyzeMedia(file.type, base64Data, prompt);

        // 4. Persona Transformation via Dify
        const taskLabel = type === 'image' ? 'お食事' : 'トレーニング';
        const difyResponse = await sendToDify(
            {
                analysis_result: geminiAnalysis,
                user_context: userContext,
                task_type: type
            },
            userId,
            `あなたは「AI 18号」として、親しみやすく、かつ専門的なトレーナー（または栄養士）の顔も持つキャラクターです。
ユーザーが送ってくれた${taskLabel}の解析結果をもとに、褒めつつも役に立つアドバイスを1つ伝えてください。
解析内容: ${geminiAnalysis}`
        );

        const result = {
            summary: systemSummary,
            details: difyResponse.answer || difyResponse.message || geminiAnalysis,
            raw_analysis: geminiAnalysis
        };

        // 5. Log to Google Sheets
        await logToSheet({
            userId,
            type: `${type || 'video'} (UI)`,
            userContent: file.name,
            aiResponse: result.details
        });

        return NextResponse.json({
            success: true,
            result: result,
        });

    } catch (error: any) {
        console.error('Analyze API Error Details:', {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });

        // Handle specific fetch errors (like timeouts or payload too large)
        if (error.message?.includes('fetch') || error.message?.includes('timeout')) {
            return NextResponse.json({
                error: '解析サーバーとの通信がタイムアウトしました。動画が長すぎるか、ファイルサイズが大きすぎる可能性があります。少し短めにするか、リトライしてみてね♪'
            }, { status: 502 });
        }

        return NextResponse.json(
            { error: `解析中にエラーが発生しました: ${error.message || 'Unknown Error'}` },
            { status: 500 }
        );
    }
}
