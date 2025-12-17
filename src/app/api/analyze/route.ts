import { NextResponse } from 'next/server';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileKey, userId, type } = body;

        console.log(`Processing ${type || 'media'} analysis for ${fileKey} (User: ${userId})`);

        // Check for required API keys
        if (!process.env.GOOGLE_API_KEY) {
            return NextResponse.json({ error: 'GOOGLE_API_KEY is not configured on the server.' }, { status: 501 });
        }

        // --- Prompt Selection Logic ---
        let prompt = "格闘技のフォーム分析をするトレーナーとして、動画（または画像）を見て、動きの正確さや改善点を1つ専門的にアドバイスしてください。";
        let userContext = "格闘技初心者、褒められて伸びるタイプ";
        let systemSummary = "戦闘力分析結果";

        if (type === 'image') {
            prompt = "管理栄養士として、この食事画像を見て、含まれる主な食材を推測し、推定カロリーと健康へのアドバイスを優しく簡潔に述べてください。";
            userContext = "健康に気を使っている、具体的なアドバイスが欲しいタイプ";
            systemSummary = "食事・カロリー診断結果";
        } else if (type === 'chat') {
            // Placeholder for chat if it ever hits this route
            prompt = "ライフアドバイザーとして、ユーザーの悩みに対して共感し、前向きなアドバイスをしてください。";
            userContext = "癒やしを求めているユーザー";
            systemSummary = "お悩み相談の結果";
        }

        // --- Gemini Call ---
        // Note: In a real implementation with R2/S3, we would first download the file from 'fileKey'
        // Since we are currently in a transition/mock stage, we simulate the Gemini vision response 
        // with a high-quality analysis if the real media parsing isn't yet fully wired with R2.

        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // For a TRULY functional app, we'd pass the media here. 
        // For now, we generate a high-quality contextual response that Dify will refine.
        const result = await model.generateContent(prompt);
        const geminiAnalysis = result.response.text();

        // --- Dify Call (Persona Transformation) ---
        const difyResponse = await sendToDify(
            {
                analysis_result: geminiAnalysis,
                user_context: userContext,
                task_type: type || 'video'
            },
            userId,
            `あなたはAI 18号という親しみやすいキャラクターです。以下の解析結果を基に、ユーザーへ話しかけてください。\n解析内容: ${geminiAnalysis}`
        );

        return NextResponse.json({
            success: true,
            result: {
                summary: systemSummary,
                details: difyResponse.answer || difyResponse.message || "解析が完了しました！",
                raw_analysis: geminiAnalysis
            },
        });

    } catch (error: any) {
        console.error('Analyze Error:', error);
        return NextResponse.json(
            { error: error.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
