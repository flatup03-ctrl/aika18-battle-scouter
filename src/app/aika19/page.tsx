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
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [analysisType, setAnalysisType] = useState<'video' | 'image' | 'chat'>('video');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const initLiff = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2008276179-XxwM2QQD';
                await liff.init({ liffId });

                if (liff.isLoggedIn()) {
                    const p = await liff.getProfile();
                    setProfile(p);
                    setStatus('ready');
                } else {
                    if (process.env.NODE_ENV === 'development') {
                        setProfile({ userId: 'DEV_USER_ID', displayName: 'Dev User' });
                        setStatus('ready');
                    } else {
                        const urlParams = new URLSearchParams(window.location.search);
                        if (!urlParams.has('code')) {
                            liff.login({ redirectUri: window.location.href });
                        }
                    }
                }
            } catch (e: any) {
                console.error('LIFF Init Error', e);
                setErrorMsg(`LIFF初期化エラー: ${e.message}`);
                setStatus('error');
            }
        };
        initLiff();
    }, []);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setStatus('uploading');
        setProgress(10);
        setErrorMsg('');

        try {
            // 1. Get Presigned URL
            const reqRes = await fetch(`${API_BASE_URL}/api/upload-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                    analysisType // Pass what we're doing
                })
            });

            if (!reqRes.ok) throw new Error(`アップロード準備失敗: ${reqRes.status}`);
            const { uploadUrl, fileKey } = await reqRes.json();
            setProgress(30);

            // 2. Upload
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            if (!uploadRes.ok) throw new Error('ファイルの転送に失敗しました。');
            setProgress(70);
            setStatus('processing');

            // 3. Analyze
            const analyzeRes = await fetch(`${API_BASE_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileKey,
                    userId: profile?.userId || 'GUEST_USER',
                    type: analysisType
                })
            });

            if (!analyzeRes.ok) throw new Error('解析中にエラーが発生しました。');
            const data = await analyzeRes.json();
            setAnalysisResult(data.result);
            setProgress(100);
            setStatus('complete');

        } catch (err: any) {
            console.error('Flow Error:', err);
            setErrorMsg(err.message || '予期せぬエラーが発生しました');
            setStatus('error');
        }
    };

    const triggerAction = (type: 'video' | 'image' | 'chat') => {
        setAnalysisType(type);
        if (type === 'chat') {
            alert('チャット相談機能は近日公開予定のアップデートをお待ちください！今は動画・画像解析をお試しください。');
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*';
            fileInputRef.current.click();
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-slate-950 text-white font-sans selection:bg-pink-500/30">
            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-20%] left-[-20%] w-[60%] h-[60%] rounded-full bg-indigo-600 blur-[150px] opacity-20"></div>
                <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-rose-600 blur-[150px] opacity-10"></div>
            </div>

            <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
                <div className="w-full max-w-md bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl flex flex-col items-center text-center relative overflow-hidden transition-all duration-500">

                    {/* Interior Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-32 bg-pink-500/10 blur-[80px] rounded-full"></div>

                    {/* Character Section */}
                    <div className="mb-6 z-10 group">
                        <div className="absolute inset-0 bg-gradient-to-tr from-pink-500 to-indigo-500 rounded-full blur opacity-20 group-hover:opacity-40 transition-opacity"></div>
                        <Image
                            src="https://ik.imagekit.io/FLATUPGYM/b9d4a676-0903-444c-91d2-222dc3294f.png?updatedAt=1760340781490"
                            alt="AI 18号"
                            width={130}
                            height={130}
                            className="rounded-full relative border border-white/10 shadow-xl transition-transform duration-700 hover:scale-105"
                            unoptimized
                        />
                    </div>

                    <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-white via-pink-100 to-indigo-200 bg-clip-text text-transparent italic tracking-tighter">
                        AI 18号
                    </h1>
                    <p className="text-slate-400 text-[10px] font-bold tracking-[0.4em] uppercase mb-10 opacity-60">
                        The Master Mind
                    </p>

                    {status === 'initializing' && (
                        <div className="py-10 flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-2 border-pink-500/20 border-t-pink-500 rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-pink-500 tracking-widest uppercase animate-pulse">Scanning System...</span>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="w-full space-y-4 animate-in fade-in zoom-in duration-500">
                            {[
                                { id: 'video', label: '戦闘力分析', desc: '格闘技の分析データを取得', glow: 'from-pink-500 to-purple-600', dot: 'bg-pink-500' },
                                { id: 'image', label: 'カロリー計算', desc: '食事内容からエネルギーを算出', glow: 'from-cyan-500 to-blue-600', dot: 'bg-cyan-400' },
                                { id: 'chat', label: 'お悩み相談', desc: '戦略的カウンセリングと対話', glow: 'from-emerald-500 to-teal-600', dot: 'bg-emerald-400' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => triggerAction(item.id as any)}
                                    className="relative w-full p-[1px] rounded-2xl group transition-all duration-300 hover:scale-[1.03] active:scale-[0.98]"
                                >
                                    <div className={`absolute inset-0 bg-gradient-to-r ${item.glow} rounded-2xl opacity-10 group-hover:opacity-40 transition-opacity blur-sm`}></div>
                                    <div className="relative bg-slate-900/60 backdrop-blur-xl p-5 rounded-2xl border border-white/5 flex flex-col items-start text-left">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <span className={`w-1.5 h-1.5 rounded-full ${item.dot} shadow-[0_0_10px_rgba(255,255,255,0.4)]`}></span>
                                            <h3 className="font-bold text-lg text-slate-100">{item.label}</h3>
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-medium opacity-80">{item.desc}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {status === 'uploading' && (
                        <div className="w-full py-8 text-left space-y-4">
                            <div className="flex justify-between items-end">
                                <span className="text-[10px] font-black text-pink-500 tracking-widest uppercase">Uploading Data</span>
                                <span className="text-3xl font-black text-white italic">{progress}%</span>
                            </div>
                            <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-gradient-to-r from-pink-500 to-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="py-12 flex flex-col items-center">
                            <div className="relative w-20 h-20 mb-6">
                                <div className="absolute inset-0 border-2 border-pink-500/20 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 border-2 border-pink-500 border-t-transparent rounded-full animate-spin"></div>
                            </div>
                            <h2 className="text-xl font-black tracking-[0.2em] text-white italic uppercase">Analyzing</h2>
                            <p className="text-[10px] text-slate-500 mt-2 font-bold">データを高次元スキャンしています</p>
                        </div>
                    )}

                    {status === 'complete' && (
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-emerald-500/20 border border-emerald-500/30 p-8 rounded-[2.5rem] relative overflow-hidden group">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-30 transition-opacity">
                                    <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" /></svg>
                                </div>
                                <h3 className="text-2xl font-black text-emerald-400 italic mb-4 uppercase tracking-tighter">Results</h3>
                                <p className="text-sm text-emerald-100 leading-relaxed font-medium">
                                    {analysisResult?.details || '素晴らしい成果を検知しました。解析を終了します。'}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatus('ready')}
                                className="w-full py-4 bg-white text-slate-950 font-black rounded-2xl hover:bg-pink-100 transition-colors shadow-2xl active:scale-95"
                            >
                                BACK TO MENU
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="w-full py-8 space-y-6">
                            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
                                <span className="text-3xl font-black text-red-500 italic">!</span>
                            </div>
                            <div className="space-y-3">
                                <h3 className="text-lg font-black text-red-400 uppercase tracking-widest">Error Occurred</h3>
                                <p className="text-[10px] text-slate-500 max-h-24 overflow-y-auto bg-black/40 p-4 rounded-xl font-mono leading-relaxed border border-white/5">
                                    {errorMsg}
                                </p>
                            </div>
                            <button
                                onClick={() => setStatus('ready')}
                                className="px-12 py-3 bg-red-600 text-white font-black rounded-full hover:bg-red-500 transition-all hover:scale-105 active:scale-95"
                            >
                                SYSTEM REBOOT
                            </button>
                        </div>
                    )}

                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>

                <div className="mt-10 flex items-center space-x-3 text-[9px] text-slate-700 font-black tracking-[0.4em] uppercase">
                    <span>AI18 OS ver 2.0.4</span>
                    <span className="w-1 h-1 bg-pink-500 rounded-full"></span>
                    <span>Gemini Core</span>
                </div>
            </main>
        </div>
    );
}
