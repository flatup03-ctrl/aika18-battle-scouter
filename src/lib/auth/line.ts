// VPS API経由でのLINE認証
// Firebase削除 - すべてVPS (162.43.30.218:8080) で処理

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://162.43.30.218:8080';

/**
 * LINE IDトークンをVPSバックエンドに送信してセッションを取得
 */
export async function authenticateWithLineViaVPS(lineIdToken: string): Promise<{ userId: string; sessionToken: string }> {
    try {
        const response = await fetch(`${API_BASE_URL}/api/auth/line`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ idToken: lineIdToken }),
        });

        if (!response.ok) {
            throw new Error(`LINE authentication failed: ${response.statusText}`);
        }

        const data = await response.json();

        // セッション情報をlocalStorageに保存
        if (typeof window !== 'undefined') {
            localStorage.setItem('sessionToken', data.sessionToken);
            localStorage.setItem('userId', data.userId);
        }

        return data;
    } catch (error) {
        console.error('LINE authentication error:', error);
        throw error;
    }
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

/**
 * ログアウト - セッション情報をクリア
 */
export function logout(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem('sessionToken');
        localStorage.removeItem('userId');
    }
}

/**
 * 現在のセッション情報を取得
 */
export function getCurrentSession(): { sessionToken: string | null; userId: string | null } {
    if (typeof window === 'undefined') {
        return { sessionToken: null, userId: null };
    }

    return {
        sessionToken: localStorage.getItem('sessionToken'),
        userId: localStorage.getItem('userId'),
    };
}
