import { NextResponse } from 'next/server';

export async function PUT(request: Request) {
    // モック用のアップロードエンドポイント
    // 実際にはファイルを保存せず、成功レスポンスだけを返す
    // これにより、フロントエンドはアップロードが成功したと判断する

    // 必要であればここでリクエストボディを読んで捨てる処理を入れるが、
    // Next.jsのRoute Handlerでは何もしなくてもOK

    return NextResponse.json({ success: true, message: 'Mock upload successful' });
}

export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'PUT, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        },
    });
}
