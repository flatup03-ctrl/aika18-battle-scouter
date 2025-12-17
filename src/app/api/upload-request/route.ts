import { NextResponse } from 'next/server';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { fileName, contentType } = body;

        // モック実装: 本来はR2の署名付きURLを発行するが、
        // まずはアプリの動作確認のため、自前のモックアップロードURLを返す

        // 注意: 本番環境のドメインを動的に取得するか、相対パスで返すが、
        // フロントエンドのfetchが絶対URLを期待する可能性があるため、
        // リクエストURLからoriginを取得して構築する
        const url = new URL(request.url);
        const origin = url.origin;

        const fileKey = `uploads/${Date.now()}_${fileName}`;
        const uploadUrl = `${origin}/api/mock-upload?key=${fileKey}`;

        return NextResponse.json({
            uploadUrl: uploadUrl,
            fileKey: fileKey,
        });
    } catch (error) {
        console.error('Upload Request Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
