// VPS API経由での認証ヘルパー
// VPSバックエンド (162.43.30.218:8080) を使用

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://162.43.30.218:8080';

/**
 * LINE認証を実行
 * VPSバックエンドにLINE IDトークンを送信し、セッション情報を取得
 */
export async function authenticateWithLine(lineIdToken: string): Promise<{ userId: string; sessionToken: string }> {
    const response = await fetch(`${API_BASE_URL}/api/auth/line`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ idToken: lineIdToken }),
    });

    if (!response.ok) {
        throw new Error('LINE authentication failed');
    }

    return response.json();
}

/**
 * セッション検証
 */
export async function validateSession(sessionToken: string): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/validate`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionToken}`,
            },
        });

        return response.ok;
    } catch {
        return false;
    }
}
