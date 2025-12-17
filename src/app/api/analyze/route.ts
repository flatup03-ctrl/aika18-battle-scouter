import { NextResponse } from 'next/server';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';

/**
 * AI 18 Analyze API - Implementation Level
 * This route handles real-time media analysis using Gemini 1.5 Flash.
 */

export async function POST(request: Request) {
    try {
        // Parse the incoming multipart form data (real implementation)
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const userId = formData.get('userId') as string || 'GUEST';
        const type = formData.get('type') as string || 'video';

        if (!file) {
            return NextResponse.json({ error: 'ファイルが見つかりません。' }, { status: 400 });
        }

        console.log(`Analyzing: ${file.name} (Type: ${type}, Size: ${file.size})`);

        // Check for required configuration
        const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
        if (!GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'GOOGLE_API_KEYが設定されていません。' }, { status: 501 });
        }

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
        const difyResponse = await sendToDify(
            {
                analysis_result: geminiAnalysis,
                user_context: userContext,
                task_type: type
            },
            userId,
            `あなたはAI 18号という親しみやすいキャラクターです。以下の解析結果を基に、ユーザーへ癒やしと元気を与える口調でアドバイスしてください。\n解析結果: ${geminiAnalysis}`
        );

        return NextResponse.json({
            success: true,
            result: {
                summary: systemSummary,
                details: difyResponse.answer || difyResponse.message || geminiAnalysis,
                raw_analysis: geminiAnalysis
            },
        });

    } catch (error: any) {
        console.error('Analyze API Error:', error);

        // Handle specific fetch errors (like timeouts or payload too large)
        if (error.message?.includes('fetch')) {
            return NextResponse.json({ error: '通信エラーが発生しました。ファイルのサイズが大きすぎる可能性があります。' }, { status: 502 });
        }

        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
