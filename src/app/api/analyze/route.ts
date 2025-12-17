import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileKey, userId } = body;

        // モック実装: AI解析のシミュレーション
        // 実際にはここでGemini Pro Vision APIを呼び出す

        // 少し待機させて解析感を出す（実際の処理時間はGemini次第だが数秒かかる）
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 60点版: 固定だが前向きなフィードバックを返す
        const feedback = {
            summary: "ナイスファイト！",
            details: "その調子です。フォームのブレが少なく、体幹が安定していますね。継続することでさらにキレが増すでしょう。",
            score: 85, // 内部的なスコア（表示するかわからないがデータとして持つ）
            advice: "次はもう少し脱力を意識してみましょう。"
        };

        return NextResponse.json({
            success: true,
            result: feedback,
        });

    } catch (error) {
        console.error('Analyze Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
