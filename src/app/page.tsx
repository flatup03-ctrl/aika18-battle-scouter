'use client';

import { useEffect, useState, useRef } from 'react';
import liff from '@line/liff';

// Configuration
// In production, this should be an environment variable
// Use relative path to leverage Next.js rewrites (keeps traffic on same origin)
const API_BASE_URL = '';

export default function AIKA19Page() {
    const [status, setStatus] = useState<'initializing' | 'ready' | 'uploading' | 'processing' | 'complete' | 'error'>('initializing');
    const [profile, setProfile] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const initLiff = async () => {
            try {
                // Hardcoded LIFF ID to bypass environment variable issues
                const liffId = '2008276179-XxwM2QQD';

                await liff.init({ liffId });

                if (liff.isLoggedIn()) {
                    const p = await liff.getProfile();
                    setProfile(p);
                    setStatus('ready');
                } else {
                    // Forcing login for LIFF app usage
                    if (process.env.NODE_ENV === 'development') {
                        console.warn('Dev Mode: Skipping LINE Login');
                        setProfile({ userId: 'DEV_USER_ID', displayName: 'Dev User' });
                        setStatus('ready');
                    } else {
                        liff.login();
                    }
                }
            } catch (e: any) {
                console.error('LIFF Init Error', e);
                // Fallback for local testing if not in LIFF browser
                if (process.env.NODE_ENV === 'development') {
                    setProfile({ userId: 'dev_user', displayName: 'Developer' });
                    setStatus('ready');
                } else {
                    setStatus('error');
                    setErrorMsg('LIFF初期化に失敗しました: ' + e.message);
                }
            }
        };
        initLiff();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        console.log('Selected file:', file.name, file.type, file.size);
        console.log('API Base URL:', API_BASE_URL);

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            alert('動画サイズが大きすぎます（50MB以下にしてください）');
            return;
        }

        setStatus('uploading');
        setProgress(10);
        setErrorMsg('');

        try {
            // 1. Get Presigned URL
            console.log('Requesting upload URL...');
            const reqRes = await fetch(`${API_BASE_URL}/api/upload-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fileName: file.name, contentType: file.type })
            });

            console.log('Upload Request Status:', reqRes.status);

            if (!reqRes.ok) {
                const errText = await reqRes.text();
                let errMsg = `サーバー通信エラー: ${reqRes.status}`;
                try {
                    const errJson = JSON.parse(errText);
                    if (errJson.error) errMsg += ` (${errJson.error})`;
                } catch (e) {
                    errMsg += ` ${reqRes.statusText}`;
                }

                console.error('Upload Request Error Body:', errText);
                if (reqRes.status === 429) throw new Error('本日の利用枠が上限に達しました。');
                throw new Error(errMsg);
            }

            const { uploadUrl, fileKey } = await reqRes.json();
            console.log('Got upload URL for key:', fileKey);
            setProgress(30);

            // 2. Upload to R2
            console.log('Uploading to R2...');
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            console.log('R2 Upload Status:', uploadRes.status);

            if (!uploadRes.ok) {
                const errText = await uploadRes.text().catch(() => 'No body');
                console.error('R2 Error Body:', errText);
                throw new Error(`動画アップロードに失敗しました (R2 Status: ${uploadRes.status})`);
            }
            setProgress(70);

            setStatus('processing');

            // 3. Trigger Analysis
            console.log('Triggering analysis...');
            const analyzeRes = await fetch(`${API_BASE_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileKey,
                    userId: profile?.userId || 'GUEST_USER' // Fallback for debugging
                })
            });

            console.log('Analyze Request Status:', analyzeRes.status);

            if (!analyzeRes.ok) {
                const errText = await analyzeRes.text();
                console.error('Analyze Error Body:', errText);
                if (analyzeRes.status === 429) throw new Error('本日の利用枠が上限に達しました。');
                throw new Error(`解析開始エラー: ${analyzeRes.status}`);
            }

            setProgress(100);
            setStatus('complete');

        } catch (err: any) {
            console.error('Full Error Object:', err);
            setStatus('error');
            setErrorMsg(err.message || '予期せぬエラーが発生しました');
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-[#0f172a] text-white font-sans">
            {process.env.NODE_ENV === 'development' && (
                <div className="absolute top-0 left-0 w-full bg-red-600 text-white text-xs font-bold text-center py-1 z-50">
                    🚀 DEV MODE: NEW ARCHITECTURE (Cloudflare R2 + Gemini)
                </div>
            )}
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-purple-600 blur-[120px] opacity-30 animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[120px] opacity-30 animate-pulse delay-1000"></div>

            <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">

                <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl flex flex-col items-center text-center">

                    <h1 className="text-3xl font-black mb-2 bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
                        AIKA 19
                    </h1>
                    <p className="text-gray-300 mb-8 text-sm">
                        次世代AI格闘技フォーム解析
                    </p>

                    {status === 'initializing' && (
                        <div className="animate-pulse text-gray-400">Loading LIFF...</div>
                    )}

                    {status === 'ready' && (
                        <>
                            <div className="mb-8 relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-full blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                                <button
                                    onClick={triggerFileInput}
                                    className="relative px-8 py-4 bg-black rounded-full leading-none flex items-center divide-x divide-gray-600"
                                >
                                    <span className="flex items-center space-x-3">
                                        <svg className="w-6 h-6 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
                                        <span className="text-gray-100 font-bold">動画を選択して解析</span>
                                    </span>
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 max-w-xs">
                                ※ 動画は1分以内のものをアップロードしてください。<br />
                                ※ 解析結果はLINEトークに送信されます。
                            </p>
                        </>
                    )}

                    {status === 'uploading' && (
                        <div className="w-full">
                            <p className="mb-2 text-pink-400 font-bold animate-pulse">Uploading...</p>
                            <div className="w-full bg-gray-700 rounded-full h-2.5">
                                <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="flex flex-col items-center">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mb-4"></div>
                            <p className="text-lg font-bold">解析リクエスト送信中...</p>
                        </div>
                    )}

                    {status === 'complete' && (
                        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-4 w-full">
                            <svg className="w-12 h-12 text-green-400 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <h3 className="text-xl font-bold text-green-300 mb-1">受付完了！</h3>
                            <p className="text-sm text-gray-200">
                                AIが動画を解析中です。<br />
                                完了次第、LINE通知をお送りしますので<br />
                                この画面を閉じてお待ちください。
                            </p>
                            <button
                                onClick={() => liff.closeWindow()}
                                className="mt-4 text-xs underline text-gray-400 hover:text-white"
                            >
                                [閉じる]
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-4 w-full">
                            <h3 className="text-lg font-bold text-red-400 mb-1">エラーが発生しました</h3>
                            <p className="text-sm text-gray-200 mb-4">{errorMsg}</p>
                            <button
                                onClick={() => setStatus('ready')}
                                className="px-4 py-2 bg-red-600 rounded-lg text-sm font-bold hover:bg-red-500 transition"
                            >
                                もう一度試す
                            </button>
                        </div>
                    )}

                    <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                    />

                </div>

                <div className="mt-8 text-xs text-gray-500 font-mono">
                    Powered by Gemini Pro 1.5 & Cloudflare R2
                </div>

            </main>
        </div>
    );
}
