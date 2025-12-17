```typescript
import { NextResponse } from 'next/server';
import { analyzeMedia } from '@/lib/gemini';
import { sendToDify } from '@/lib/dify';
import { sendToDify }
 from '@/lib/dify';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileKey, userId } = body; // In real implementation, we download file from fileKey

        console.log(`Processing anaylsis for ${ fileKey }(User: ${ userId })`);

        // 1. Download File (Placeholder)
        // In "60 point" version, we might skip actual R2 download if we can pass a public URL,
        // or we need to fetch the file content here.
        // For now, assuming we have a way to get file content or URL.
        // Let's assume for this step we have a placeholder "image/video" analysis prompt.
        
        // TODO: Implement actual R2 file fetch -> base64 conversion here.
        // For the sake of "architecture flow", we will simulate the Gemini result 
        // if we can't actually download without R2 credentials yet.
        
        // Mocking Gemini Result aimed at Dify
        // In real impl: const geminiResult = await analyzeMedia(mimeType, base64Data, "Describe this video form in detail");
        const geminiResultMock = "ユーザーはシャドーボクシングをしています。ワンツーの際のガードが下がっています。全体的にリズムは良いです。";

        // 2. Send to Dify
        const difyResponse = await sendToDify(
            { 
                analysis_result: geminiResultMock,
                user_context: "格闘技初心者、褒められて伸びるタイプ" 
            }, 
            userId
        );

        return NextResponse.json({
            success: true,
            result: {
                summary: "AI 18号からの分析結果",
                details: difyResponse.answer || difyResponse.message, // Difyからの返答
                raw_analysis: geminiResultMock
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
