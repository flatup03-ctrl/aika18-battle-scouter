'use client';

import { useEffect, useState, useRef } from 'react';
import liff from '@line/liff';
import Image from "next/image";

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function AIKAPage() {
    const [status, setStatus] = useState<'initializing' | 'ready' | 'processing' | 'complete' | 'error'>('initializing');
    const [profile, setProfile] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [noteContent, setNoteContent] = useState('');
    const [userData, setUserData] = useState<any>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);

    const handleReset = () => {
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
        setAnalysisResult(null);
        setStatus('ready');
        setErrorMsg('');
    };

    const BG_IMAGE_URL = "https://ik.imagekit.io/FLATUPGYM/TOPTOP.png?updatedAt=1756897198425";

    // Helper: Compress image to avoid "Payload Too Large"
    const compressImage = (file: File): Promise<File> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new (window as any).Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;

                    // リミット 1600px (Gemini解析には十分な解像度)
                    const MAX_SIZE = 1600;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);

                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                        } else {
                            reject(new Error('Blob creation failed'));
                        }
                    }, 'image/jpeg', 0.8); // 80% quality
                };
                img.onerror = reject;
            };
            reader.onerror = reject;
        });
    };

    useEffect(() => {
        let isMounted = true;
        const startTime = Date.now();
        const VERSION = "2.8.3";
        console.log(`[${startTime}] --- AIKA UI v${VERSION} Init ---`);
        const startApp = async () => {
            try {
                const liffId = process.env.NEXT_PUBLIC_LIFF_ID || '2008276179-XxwM2QQD';

                // Initial LIFF Init with 400/403 recovery
                try {
                    await liff.init({ liffId });
                } catch (err: any) {
                    const errStr = (err.message || err.toString() || '').toLowerCase();
                    // Handle common LIFF init / code_verifier issues
                    if (errStr.includes('code_verifier') || errStr.includes('400') || errStr.includes('403')) {
                        console.warn('LIFF: Configuration or session error detected. Redirecting to clean state...');
                        const url = new URL(window.location.href);
                        if (url.searchParams.has('code')) {
                            url.searchParams.delete('code');
                            url.searchParams.delete('state');
                            window.location.replace(url.toString());
                            return;
                        }
                    }
                    throw err;
                }

                if (!isMounted) return;

                if (liff.isLoggedIn()) {
                    const p = await liff.getProfile();
                    if (isMounted) setProfile(p);
                    if (isMounted) setStatus('ready');
                } else {
                    if (process.env.NODE_ENV === 'development') {
                        setProfile({ userId: 'DEV_USER_ID', displayName: 'ふんわりユーザー' });
                        setStatus('ready');
                    } else {
                        const urlParams = new URLSearchParams(window.location.search);
                        if (!urlParams.has('code')) {
                            liff.login({ redirectUri: window.location.href.split('?')[0] });
                        }
                    }
                }
            } catch (e: any) {
                console.error('LIFF Init Error (Recovered with Guest):', e);
                if (isMounted) {
                    setProfile({ userId: 'GUEST_USER', displayName: 'ゲスト' });
                    setStatus('ready');
                }
            }
        };
        startApp();
        return () => { isMounted = false; };
    }, []);
    const fetchUserData = async (userId: string) => {
        try {
            const res = await fetch(`/api/user/${userId}`);
            if (res.ok) {
                const data = await res.json();
                setUserData(data);
            }
        } catch (err) {
            console.error('Fetch User Data Error:', err);
        }
    };

    useEffect(() => {
        if (profile?.userId) {
            fetchUserData(profile.userId);
        }
    }, [profile]);

    // Media logic removed for server efficiency (AIBO Phase)

    const submitNote = async (text?: string) => {
        const content = text || noteContent;
        if (!content.trim()) return;

        setStatus('processing');
        setErrorMsg('');
        try {
            const res = await fetch(`/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: content,
                    userId: profile?.userId || 'GUEST_USER',
                    userName: profile?.displayName || 'ゲスト'
                }),
            });

            if (!res.ok) throw new Error('通信エラーが発生しました。時間を置いて試してね♪');

            // 非同期処理のため、一旦「受付完了」の状態にする
            setStatus('complete');
            setAnalysisResult({ details: "練習ノートを受け付けたよ！まもなくAIKAからLINEでアドバイスが届くから、楽しみにしててね♪" });
            setNoteContent('');

            // ポイントが加算されるので数秒後に再フェッチ
            setTimeout(() => {
                if (profile?.userId) fetchUserData(profile.userId);
            }, 3000);
        } catch (err: any) {
            setErrorMsg(err.message || 'エラーが発生しました');
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-white text-[#4A4A4A] font-sans selection:bg-pink-100/50">
            {/* Background Image Layer */}
            <div
                className="fixed inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-40 grayscale-[20%]"
                style={{ backgroundImage: `url(${BG_IMAGE_URL})`, backgroundAttachment: 'fixed' }}
            ></div>

            {/* Ambient Overlays */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-white/20 backdrop-blur-[2px]">
                <div className="absolute top-0 inset-x-0 h-40 bg-gradient-to-b from-white to-transparent"></div>
                <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-white to-transparent"></div>
            </div>

            <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
                <div className="w-full max-w-md md:max-w-lg bg-white/70 backdrop-blur-2xl border-[6px] border-white/80 rounded-[3.5rem] md:rounded-[4.5rem] p-8 md:p-10 shadow-[0_40px_100px_rgba(0,0,0,0.08)] flex flex-col items-center text-center relative overflow-hidden transition-all duration-700">

                    {/* Header Decoration */}
                    <div className="mb-6 flex space-x-2 opacity-30">
                        <span className="w-2 h-2 rounded-full bg-pink-300"></span>
                        <span className="w-2 h-2 rounded-full bg-blue-300"></span>
                        <span className="w-2 h-2 rounded-full bg-yellow-300"></span>
                    </div>

                    <div className="z-10 relative animate-in fade-in zoom-in duration-1000">
                        <p className="text-[10px] font-black text-[#FF8DA1] tracking-[0.6em] mb-2 uppercase">AI 18 Mos.</p>
                        <h1 className="text-4xl font-black mb-1 bg-gradient-to-r from-[#FF8DA1] to-[#FFB6C1] bg-clip-text text-transparent tracking-tighter drop-shadow-sm">
                            AI 18号
                        </h1>

                        {/* 称号・ポイント表示 */}
                        {userData && (
                            <div className="mt-4 flex items-center gap-3 bg-pink-50/50 px-6 py-2 rounded-full border border-pink-100 animate-in fade-in zoom-in duration-700">
                                <span className="text-[10px] font-black text-pink-500 uppercase">称号: {userData.title}</span>
                                <span className="w-1 h-1 bg-pink-200 rounded-full"></span>
                                <span className="text-[10px] font-black text-pink-500 uppercase">{userData.points} PT</span>
                            </div>
                        )}

                        <p className="text-[#64748B] text-sm font-bold mt-6 mb-10 leading-relaxed">
                            AI 18号が、あなたの毎日を<br />
                            <span className="text-[#FF8DA1] relative group">
                                そっとサポートしちゃうよ♪
                                <span className="absolute -bottom-1 left-0 w-full h-1 bg-pink-100 rounded-full scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></span>
                            </span>
                        </p>
                    </div>

                    {status === 'initializing' && (
                        <div className="py-10 flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-4 border-[#FFDDE4] border-t-[#FF8DA1] rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-[#FF8DA1] tracking-[0.2em] uppercase animate-pulse">システム起動中...</span>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            {/* 練習ノート入力エリア */}
                            <div className="bg-white/50 p-6 rounded-[2.5rem] shadow-inner border-2 border-pink-50">
                                <h3 className="text-sm font-black text-[#FF8DA1] mb-3 text-left pl-2">📝 今日の練習ノート</h3>
                                <textarea
                                    className="w-full h-32 p-4 rounded-[1.8rem] border-none focus:ring-2 focus:ring-pink-200 outline-none text-sm font-bold bg-white/80 resize-none shadow-sm"
                                    placeholder="今日意識したこと、できたこと、課題などを書いてね♪"
                                    value={noteContent}
                                    onChange={(e) => setNoteContent(e.target.value)}
                                />
                                <button
                                    onClick={() => submitNote()}
                                    disabled={!noteContent.trim()}
                                    className="w-full mt-4 py-4 bg-gradient-to-r from-[#FF8DA1] to-[#FFB6C1] text-white font-black rounded-[2rem] shadow-lg disabled:opacity-50 active:scale-95 transition-all"
                                >
                                    記録する ＋ AIKAに相談
                                </button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => submitNote('今日の食事を評価して！')}
                                    className="p-4 rounded-[2rem] bg-[#C8F0C8]/80 group transition-all hover:scale-105 active:scale-95 shadow-sm border-b-4 border-green-200"
                                >
                                    <div className="text-2xl mb-1">🥗</div>
                                    <h3 className="font-black text-xs text-[#2E8B57]">食事の相談</h3>
                                </button>
                                <button
                                    onClick={() => submitNote('おすすめのプロテインは？')}
                                    className="p-4 rounded-[2rem] bg-[#FFD1DC]/80 group transition-all hover:scale-105 active:scale-95 shadow-sm border-b-4 border-pink-200"
                                >
                                    <div className="text-2xl mb-1">🌸</div>
                                    <h3 className="font-black text-xs text-[#DB7093]">お悩み相談</h3>
                                </button>
                            </div>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="py-10 flex flex-col items-center">
                            <div className="relative w-28 h-28 mb-8">
                                <div className="absolute inset-0 bg-pink-100/40 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 border-4 border-dashed border-[#FFB6C1]/50 rounded-full animate-spin duration-[3000ms]"></div>
                                <div className="absolute inset-4 bg-white/60 backdrop-blur-sm rounded-full flex items-center justify-center text-4xl animate-bounce">
                                    🔮
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-[#FF8DA1] italic">解析開始！</h2>
                            <p className="text-xs text-[#64748B] mt-2 font-bold uppercase tracking-wider">Scaning the high context...</p>
                        </div>
                    )}

                    {status === 'complete' && (
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#F0FDF4] border-4 border-white p-8 rounded-[3.5rem] shadow-lg relative overflow-hidden group">
                                <h3 className="text-2xl font-black text-[#166534] mb-4 flex items-center justify-center gap-2">
                                    ✨ 結果が出たよ！ ✨
                                </h3>
                                <div className="text-sm text-[#334155] leading-relaxed font-bold bg-white/60 p-6 rounded-[2.2rem] border border-white/80 text-left max-h-[300px] overflow-y-auto scrollbar-thin scrollbar-thumb-pink-200 scrollbar-track-transparent">
                                    {analysisResult?.details || '素晴らしい成果を検知しました♪'}
                                </div>
                            </div>
                            <button
                                onClick={() => {
                                    // Transition to Trial Application (Secondary LIFF)
                                    window.location.href = "https://liff.line.me/2008276179-41Dz3bbJ";
                                }}
                                className="w-full py-5 bg-gradient-to-r from-[#FF8DA1] to-[#FFB6C1] text-white font-black rounded-[2.5rem] shadow-[0_10px_30px_rgba(255,141,161,0.3)] hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 border-b-4 border-pink-600/20"
                            >
                                <span className="text-xl">🥋</span> 無料体験を申し込む
                            </button>

                            <button
                                onClick={handleReset}
                                className="w-full py-4 text-[#94A3B8] font-bold rounded-[2.5rem] hover:bg-black/5 transition-all text-sm"
                            >
                                🏠 メニューに戻る
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="w-full py-8 space-y-6 animate-in zoom-in duration-300">
                            <div className="bg-white border-4 border-[#FFF1F2] p-8 rounded-[3.8rem] shadow-xl relative mt-4">
                                <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 bg-white rounded-full border-4 border-[#FFF1F2] flex items-center justify-center text-5xl shadow-sm">
                                    {errorMsg.includes('準備中') ? "🛠️" : "💦"}
                                </div>
                                <h3 className="text-2xl font-black text-[#FF8DA1] mt-8 mb-2 tracking-tight">
                                    {errorMsg.includes('準備中') ? "もう少しだけ待ってて！" : "あれれ、ごめんなさい…！"}
                                </h3>
                                <div className="text-xs text-[#64748B] bg-[#FFF9FB] p-6 rounded-[2.2rem] font-bold leading-relaxed mb-6 text-left whitespace-pre-wrap border border-white">
                                    {errorMsg}
                                </div>
                                <button
                                    onClick={handleReset}
                                    className="w-full py-5 bg-[#FF8DA1] text-white font-black rounded-[2.2rem] hover:bg-[#FF7A91] transition-all shadow-md active:scale-95 flex items-center justify-center gap-2"
                                >
                                    🏠 メニューに戻る
                                </button>
                                <p className="mt-4 text-[9px] font-bold text-[#FF8DA1]/30 tracking-widest uppercase">System v2.8.3 Optimized</p>
                            </div>
                        </div>
                    )}

                    {/* Hidden inputs removed */}
                </div>

                <div className="mt-12 flex flex-col items-center gap-3 opacity-20">
                    <div className="flex gap-2">
                        <span className="w-1.5 h-1.5 bg-pink-400 rounded-full animate-pulse"></span>
                        <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse delay-200"></span>
                        <span className="w-1.5 h-1.5 bg-yellow-400 rounded-full animate-pulse delay-500"></span>
                    </div>
                </div>
            </main>
        </div>
    );
}
