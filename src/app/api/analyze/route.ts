import { NextResponse } from 'next/server';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';
import { logToSheet } from '@/lib/sheets';

/**
 * AI 18 Analyze API - Implementation Level
 * This route handles real-time media analysis using Gemini 1.5 Flash.
 */

export const maxDuration = 300;

export async function POST(request: Request) {
    let stage = "INIT";
    try {
        const startTime = Date.now();
        console.log(`[${startTime}] --- Start Analyze Request ---`);

        stage = "UPLOAD_PARSING";
        const formData = await request.formData();
        console.log(`[${Date.now()}] Form data parsed`);

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
        stage = "FILE_PREPARATION";
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString('base64');
        console.log(`[${Date.now()}] Base64 prep complete`);

        // 2. Determine Prompt
        // 1.5 Concise Prompt for Video/Mobile
        let prompt = "格闘技フォーム分析：動きの正確さと改善点を1点、短く専門的に。";
        let userContext = "格闘技初心者";
        let systemSummary = "戦闘力分析結果";

        if (type === 'image') {
            prompt = "食事解析：主な食材と推定カロリー、健康アドバイスを1つ簡潔に。";
            userContext = "健康意識の高いユーザー";
            systemSummary = "食事・カロリー診断結果";
        }

        // 3. ACTUAL Gemini Analysis
        stage = "GEMINI_ANALYSIS";
        console.log(`[${Date.now()}] Starting Gemini Analysis for ${file.type}...`);
        const geminiAnalysis = await analyzeMedia(file.type, base64Data, prompt);
        console.log(`[${Date.now()}] Gemini Analysis Complete`);

        // 4. Persona Transformation via Dify
        stage = "DIFY_TRANSFORMATION";
        console.log(`[${Date.now()}] Starting Dify Transformation...`);
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
        console.log("Dify Transformation Complete");

        const result = {
            summary: systemSummary,
            details: difyResponse.answer || difyResponse.message || geminiAnalysis,
            raw_analysis: geminiAnalysis
        };

        // 5. Log to Google Sheets (Non-blocking)
        stage = "LOGGING";
        logToSheet({
            userId,
            type: `${type || 'video'} (UI)`,
            userContent: file.name,
            aiResponse: result.details
        }).catch(err => console.error('Logging Error:', err));

        console.log(`[${Date.now()}] Request Success at stage: ${stage}`);
        return NextResponse.json({
            success: true,
            result: result,
        });

    } catch (error: any) {
        console.error(`Analyze API Error at Stage [${stage}]:`, {
            message: error.message,
            stack: error.stack
        });

        if (error.message?.includes('fetch') || error.message?.includes('timeout') || error.message?.includes('AbortError')) {
            return NextResponse.json({
                error: `🚨 通信タイムアウト (Stage: ${stage})\n動画が長すぎる（目安10秒以内）か、ネット接続が途切れちゃったかも。少し短くして再挑戦してね♪`
            }, { status: 504 });
        }

        return NextResponse.json(
            { error: `解析中にエラーが発生しました [${stage}]: ${error.message || 'Unknown Error'}` },
            { status: 500 }
        );
    }
}
