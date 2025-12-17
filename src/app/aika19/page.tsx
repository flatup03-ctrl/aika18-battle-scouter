'use client';

import { useEffect, useState, useRef } from 'react';
import liff from '@line/liff';
import Image from "next/image";

// Configuration
// In production, this should be an environment variable
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function AI18Page() {
    const [status, setStatus] = useState<'initializing' | 'ready' | 'uploading' | 'processing' | 'complete' | 'error'>('initializing');
    const [profile, setProfile] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const initLiff = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
                if (!liffId) {
                    console.warn('LIFF ID not found in env, using mock if local');
                    // For local dev without LIFF ID, we might skip or fail.
                    // Assuming user has set it up as per requirements.
                }

                await liff.init({ liffId: liffId || '2008276179-XxwM2QQD' });

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
                console.error('Upload Request Error Body:', errText);
                if (reqRes.status === 429) throw new Error('本日の利用枠が上限に達しました。');
                throw new Error(`サーバー通信エラー: ${reqRes.status} ${reqRes.statusText}`);
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
                    🚀 DEV MODE
                </div>
            )}
            {/* Background Effects */}
            <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] rounded-full bg-purple-600 blur-[120px] opacity-30 animate-pulse"></div>
            <div className="absolute bottom-[-20%] right-[-20%] w-[50%] h-[50%] rounded-full bg-blue-600 blur-[120px] opacity-30 animate-pulse delay-1000"></div>

            <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">

                <div className="w-full max-w-md bg-white/5 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">

                    {/* Interior Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-pink-500/20 blur-[60px] rounded-full pointer-events-none"></div>

                    {/* Character Image */}
                    <div className="mb-4 z-10">
                        <Image
                            src="https://ik.imagekit.io/FLATUPGYM/b9d4a676-0903-444c-91d2-222dc3294f.png?updatedAt=1760340781490"
                            alt="AI 18号 Character"
                            width={150}
                            height={150}
                            className="rounded-full mx-auto shadow-lg border-2 border-purple-500"
                            unoptimized={true} // Use unoptimized for external images without domain config
                        />
                    </div>

                    <h1 className="text-4xl font-extrabold mb-2 tracking-tight bg-gradient-to-r from-teal-400 via-pink-500 to-purple-500 bg-clip-text text-transparent drop-shadow-sm z-10">
                        AI 18号
                    </h1>
                    <p className="text-pink-100/70 mb-10 text-sm font-medium tracking-wide z-10">
                        戦闘力分析から、ジム・ダイエット相談、そして恋愛・人生相談まで<br />どんな悩みもAI 18号がサポートします。
                    </p>

                    {status === 'initializing' && (
                        <div className="flex flex-col items-center space-y-3 z-10 text-pink-200/60 animate-pulse">
                            <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin"></div>
                            <span className="text-xs tracking-wider">SYSTEM INITIALIZING...</span>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="z-10 w-full animate-in fade-in zoom-in duration-500 space-y-4">

                            {/* Pillar 1: Battle Power */}
                            <div className="relative group cursor-pointer" onClick={triggerFileInput}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-75 group-hover:opacity-100 transition duration-500 group-hover:duration-200 opacity-60"></div>
                                <button className="relative w-full px-6 py-4 bg-slate-900/90 rounded-lg leading-none flex flex-col items-start text-left hover:bg-slate-800/90 transition-colors border border-white/5">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-pink-500 animate-pulse"></span>
                                        <h3 className="text-lg font-bold text-pink-400">戦闘力分析</h3>
                                    </div>
                                    <p className="text-xs text-slate-300">格闘技の動画をアップロードして戦闘力を測定</p>
                                </button>
                            </div>

                            {/* Pillar 2: Calorie Calculation */}
                            <div className="relative group cursor-pointer" onClick={() => alert('画像解析機能は現在準備中です。')}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500 group-hover:duration-200 opacity-30"></div>
                                <button className="relative w-full px-6 py-4 bg-slate-900/90 rounded-lg leading-none flex flex-col items-start text-left hover:bg-slate-800/90 transition-colors border border-white/5">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                                        <h3 className="text-lg font-bold text-cyan-400">カロリー計算</h3>
                                    </div>
                                    <p className="text-xs text-slate-300">食事の画像をアップロードしてカロリーを計算</p>
                                </button>
                            </div>

                            {/* Pillar 3: Counseling */}
                            <div className="relative group cursor-pointer" onClick={() => alert('お悩み相談機能は現在準備中です。')}>
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg blur opacity-50 group-hover:opacity-100 transition duration-500 group-hover:duration-200 opacity-30"></div>
                                <button className="relative w-full px-6 py-4 bg-slate-900/90 rounded-lg leading-none flex flex-col items-start text-left hover:bg-slate-800/90 transition-colors border border-white/5">
                                    <div className="flex items-center space-x-2 mb-1">
                                        <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                                        <h3 className="text-lg font-bold text-emerald-400">お悩み相談</h3>
                                    </div>
                                    <p className="text-xs text-slate-300">テキストであなたの悩みや話を聞きます</p>
                                </button>
                            </div>

                        </div>
                    )}

                    {status === 'uploading' && (
                        <div className="w-full z-10 py-4">
                            <p className="mb-3 text-pink-300 text-sm font-bold tracking-widest animate-pulse flex justify-between">
                                <span>UPLOADING</span>
                                <span>{progress}%</span>
                            </p>
                            <div className="w-full bg-slate-800/50 rounded-full h-1.5 overflow-hidden">
                                <div className="bg-gradient-to-r from-pink-500 to-purple-500 h-1.5 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(236,72,153,0.5)]" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="flex flex-col items-center z-10 py-6">
                            <div className="relative w-16 h-16 mb-6">
                                <div className="absolute inset-0 border-4 border-pink-500/20 rounded-full"></div>
                                <div className="absolute inset-0 border-4 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-4 bg-pink-500 rounded-full animate-ping opacity-20"></div>
                            </div>
                            <p className="text-lg font-bold text-white tracking-widest">ANALYZING</p>
                            <p className="text-pink-200/50 text-xs mt-2">AIが映像を解析しています...</p>
                        </div>
                    )}

                    {status === 'complete' && (
                        <div className="bg-gradient-to-b from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-2xl p-6 w-full z-10 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-xl font-bold text-emerald-300 mb-2 tracking-wide">REQUEST ACCEPTED</h3>
                            <p className="text-sm text-emerald-100/70 leading-relaxed mb-6">
                                解析リクエストを受け付けました。<br />
                                完了次第、LINE通知をお送りします。
                            </p>
                            <button
                                onClick={() => liff.closeWindow()}
                                className="text-xs font-bold text-white bg-emerald-600/80 hover:bg-emerald-500 px-6 py-2 rounded-full transition-colors"
                            >
                                閉じる
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-6 w-full z-10 animate-in fade-in slide-in-from-bottom-4">
                            <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-6 h-6 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            </div>
                            <h3 className="text-lg font-bold text-red-400 mb-2">ERROR</h3>
                            <p className="text-sm text-red-200/70 mb-6 font-mono bg-black/20 p-2 rounded text-left overflow-x-auto whitespace-nowrap">
                                {errorMsg}
                            </p>
                            <button
                                onClick={() => setStatus('ready')}
                                className="px-6 py-2 bg-red-500/80 hover:bg-red-500 rounded-full text-sm font-bold text-white transition-colors"
                            >
                                RETRY
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

                <div className="mt-8 flex items-center space-x-2 text-[10px] text-pink-200/20 font-mono tracking-widest uppercase">
                    <span>AI Analysis Core v2.0</span>
                    <span className="w-1 h-1 bg-pink-500 rounded-full"></span>
                    <span>Gemini Pro Vision</span>
                </div>

            </main>
        </div>
    );
}
