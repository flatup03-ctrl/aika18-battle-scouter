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
        const VERSION = "2.2.0";
        console.log(`[${startTime}] --- Start Analyze Request v${VERSION} ---`);
        console.log(`Debug: GOOGLE_API_KEY length is ${process.env.GOOGLE_API_KEY?.length || 0}`);

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

            logToSheet({
                userId,
                type: 'Chat (UI)',
                userContent: userText,
                aiResponse: result.details
            }).catch(err => console.error('Chat Logging Error:', err));

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

        // 2. Determine Prompt (Ultra-Minimal for Latency)
        const taskLabel = type === 'image' ? 'お食事' : 'トレーニング';
        const personaPrompt = `
あなたは AI 18号。元気な専門家です。
${taskLabel}を解析し、褒め＋改善点1つを120文字以内で親しみやすく回答。
`.trim();

        let systemSummary = type === 'image' ? "食事・カロリー診断結果" : "戦闘力分析結果";

        // 3. ACTUAL Gemini Analysis (Persona Integrated)
        stage = "GEMINI_ANALYSIS_PERSONA";
        console.log(`[${Date.now()}] Starting Fast Analysis (v2.1.0)...`);
        const aiResponse = await analyzeMedia(file.type, base64Data, personaPrompt);
        console.log(`[${Date.now()}] Analysis Complete`);

        const result = {
            summary: systemSummary,
            details: aiResponse,
            raw_analysis: aiResponse
        };

        // 4. Log to Google Sheets (Non-blocking)
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

        if (error.message?.includes('fetch') || error.message?.includes('timeout') || error.message?.includes('AbortError') || error.message?.includes('25s limit')) {
            return NextResponse.json({
                error: `🚨 通信タイムアウト (Stage: ${stage})\nAIが5秒動画でも30秒以上悩んでしまったか、APIキーが正しくない可能性があります。\n動画を5秒以内に短くして、それでもダメなら管理者にお問い合わせください♪`
            }, { status: 504 });
        }

        return NextResponse.json(
            { error: `解析中にエラーが発生しました [${stage}]: ${error.message || 'Unknown Error'}` },
            { status: 500 }
        );
    }
}
