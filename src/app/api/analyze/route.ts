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
        const VERSION = "2.7.5";
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
                {
                    task_type: 'chat',
                    user_name: userId || 'GUEST',
                    User_Name: userId || 'GUEST',
                    userName: userId || 'GUEST',
                    user_gender: '不明',
                    userGender: '不明'
                },
                userId || 'GUEST',
                `あなたは「AIKA（アイカ）」として、ユーザーの悩みや相談に親密に乗ってください。
FLATUPGYMの看板トレーナーとして、明るく情熱的にユーザーをサポートするキャラクターです。
相談内容: ${userText}`
            );

            const result = {
                summary: "AIKAからのメッセージ",
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

        const taskLabel = type === 'image' ? 'お食事' : 'トレーニング';
        const personaPrompt = `以下の${taskLabel}を分析して褒め＋アドバイスを。`.trim();

        let systemSummary = type === 'image' ? "食事・カロリー診断結果" : "戦闘力分析結果";

        // 3. ACTUAL Gemini Analysis (Visual Extraction Only)
        stage = "GEMINI_ANALYSIS";
        console.log(`[${Date.now()}] Starting Visual Extraction for ${file.type}...`);
        const visualRawData = await analyzeMedia(file.type, base64Data, "専門的な観点（フォームや食材）から、客観的な事実と改善点を1つだけ。");

        // 4. Dify Transformation (Persona & Final Response)
        stage = "DIFY_TRANSFORMATION";
        console.log(`[${Date.now()}] Sending to Dify for AI 18 persona...`);
        const difyPrompt = `
あなたはFLATUPGYMの公式トレーナー「AIKA（アイカ）」です。
【キャラクター】自信満々で情熱的。女性には優しく、男性には厳しくも愛のある指導を。
【絶対遵守】「解析不可」「エラー」等のシステム用語は理由を問わず一切禁止。プロらしく「あなたの情熱が凄すぎて画面が熱いわ！」等とボカして自然に激励しなさい。
【リンクの完全指定】
体験予約の案内をする際は、以前のリンク(-XxwM2QQD)は【絶対に】使わず、以下のリンクのみを使用してください。
👉 https://liff.line.me/2008276179-41Dz3bbJ
解析データ: ${visualRawData}
        `.trim();

        const difyResponse = await sendToDify(
            {
                analysis_result: visualRawData,
                task_type: type,
                user_context: "アプリUIからの投稿",
                user_name: userId || 'GUEST',
                User_Name: userId || 'GUEST',
                userName: userId || 'GUEST',
                user_gender: '不明',
                userGender: '不明'
            },
            userId || 'GUEST',
            difyPrompt
        );

        const result = {
            summary: systemSummary,
            details: difyResponse.answer || difyResponse.message || visualRawData,
            raw_analysis: visualRawData
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
                error: `🚨 通信環境により解析に時間がかかっています。動画を3〜5秒に短くすると確実に成功します♪`
            }, { status: 504 });
        }

        return NextResponse.json(
            { error: `解析中にエラーが発生しました [${stage}]: ${error.message || 'Unknown Error'}` },
            { status: 500 }
        );
    }
}
