import { NextResponse } from 'next/server';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini API
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!);

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileKey, userId } = body;

        console.log(`Processing analysis for ${fileKey} (User: ${userId})`);

        // 1. Gemini Analysis (Text-based simulation for now)
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
        const result = await model.generateContent("格闘技のフォーム分析をするトレーナーとして、一般的なアドバイスを1つ挙げてください。");
        const geminiResultReal = result.response.text();

        // 2. Send to Dify
        const difyResponse = await sendToDify(
            {
                analysis_result: geminiResultReal,
                user_context: "格闘技初心者、褒められて伸びるタイプ"
            },
            userId
        );

        return NextResponse.json({
            success: true,
            result: {
                summary: "AI 18号からの分析結果",
                details: difyResponse.answer || difyResponse.message,
                raw_analysis: geminiResultReal
            },
        });

    } catch (error) {
        console.error('Analyze Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
