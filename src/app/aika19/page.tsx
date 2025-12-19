'use client';

import { useEffect, useState, useRef } from 'react';
import liff from '@line/liff';
import Image from "next/image";

// Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '';

export default function AI18Page() {
    const [status, setStatus] = useState<'initializing' | 'ready' | 'uploading' | 'processing' | 'complete' | 'error'>('initializing');
    const [profile, setProfile] = useState<any>(null);
    const [errorMsg, setErrorMsg] = useState('');
    const [progress, setProgress] = useState(0);
    const [analysisResult, setAnalysisResult] = useState<any>(null);
    const [analysisType, setAnalysisType] = useState<'video' | 'image' | 'chat'>('video');
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
                console.error('LIFF Init Error', e);
                setErrorMsg(`AI 18号、ちょっと困っちゃったみたい…！\n通信環境を確認して、もう一度開いてみてね♪`);
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
            let fileToSend = file;

            // 1. Client-side Image Compression (Optimization for large phone photos)
            if (analysisType === 'image' && file.type.startsWith('image/')) {
                setProgress(15);
                try {
                    fileToSend = await compressImage(file);
                } catch (err) {
                    console.warn('Compression failed, sending original:', err);
                }
            }

            // 2. Final Size Check (Limit to 50MB after compression attempt)
            if (fileToSend.size > 50 * 1024 * 1024) {
                throw new Error('ファイルが大きすぎます（50MB上限）。もう少し短くするか、画質を落としてみてね♪');
            }

            // Generate preview for UI
            const url = URL.createObjectURL(fileToSend);
            setPreviewUrl(url);

            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const analyzeUrl = `${origin}/api/analyze`;

            const formData = new FormData();
            formData.append('file', fileToSend);
            formData.append('userId', profile?.userId || 'GUEST_USER');
            formData.append('type', analysisType);

            // Track progress manually (simulated for Fetch, but real for the flow)
            const interval = setInterval(() => {
                setProgress(prev => (prev < 90 ? prev + 5 : prev));
            }, 500);

            const analyzeRes = await fetch(analyzeUrl, {
                method: 'POST',
                body: formData,
            });

            clearInterval(interval);

            if (!analyzeRes.ok) {
                const errData = await analyzeRes.json().catch(() => ({}));
                throw new Error(errData.error || `解析エラーが発生しました（Status: ${analyzeRes.status}）`);
            }

            const data = await analyzeRes.json();
            setAnalysisResult(data.result);
            setProgress(100);
            setStatus('complete');

        } catch (err: any) {
            console.error('Flow Error:', err);
            setErrorMsg(err.message || '通信エラーが発生しました。インターネット接続を確認してね♪');
            setStatus('error');
        } finally {
            // Clean up the object URL after some time or on next select
            // For now, we keep it for the result view if we want to show it there too
        }
    };

    const triggerAction = async (type: 'video' | 'image' | 'chat') => {
        setAnalysisType(type);
        if (type === 'chat') {
            const promptContent = window.prompt("AI 18号に相談したいことを入力してね♪\n（例：トレーニングのコツは？、今日の食事の評価は？）");
            if (!promptContent) return;

            setStatus('processing');
            setProgress(50);
            try {
                const origin = typeof window !== 'undefined' ? window.location.origin : '';
                const analyzeUrl = `${origin}/api/analyze`;

                const formData = new FormData();
                formData.append('type', 'chat');
                formData.append('text', promptContent);
                formData.append('userId', profile?.userId || 'GUEST_USER');

                const res = await fetch(analyzeUrl, {
                    method: 'POST',
                    body: formData,
                });

                if (!res.ok) throw new Error('通信エラーが発生しました');
                const data = await res.json();
                setAnalysisResult(data.result);
                setStatus('complete');
            } catch (err: any) {
                setErrorMsg(err.message || 'エラーが発生しました');
                setStatus('error');
            }
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*';
            fileInputRef.current.click();
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
                        <p className="text-[#64748B] text-sm font-bold mb-10 leading-relaxed">
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
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            {[
                                { id: 'video', label: '戦闘力分析', desc: '10秒以内の動画でチェック！', icon: '🥊', bg: 'bg-[#B0E0E6]/90', text: 'text-[#4682B4]' },
                                { id: 'image', label: 'カロリー計算', desc: '今日のごはんは何かな？', icon: '🥗', bg: 'bg-[#C8F0C8]/90', text: 'text-[#2E8B57]' },
                                { id: 'chat', label: 'お悩み相談', desc: 'なんでもはなしてね♪', icon: '🌸', bg: 'bg-[#FFD1DC]/90', text: 'text-[#DB7093]' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => triggerAction(item.id as any)}
                                    className={`relative w-full p-5 rounded-[2.8rem] ${item.bg} group transition-all duration-300 hover:scale-[1.03] active:scale-[0.96] shadow-sm hover:shadow-md flex items-center gap-4 border-b-4 border-black/5`}
                                >
                                    <div className="w-14 h-14 bg-white/70 rounded-[1.8rem] flex items-center justify-center text-3xl shadow-sm group-hover:rotate-12 transition-transform duration-500">
                                        {item.icon}
                                    </div>
                                    <div className="text-left">
                                        <h3 className={`font-black text-xl ${item.text}`}>{item.label}</h3>
                                        <p className="text-[10px] font-bold opacity-60">{item.desc}</p>
                                    </div>
                                    <div className="ml-auto opacity-20">
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}

                    {status === 'uploading' && (
                        <div className="w-full py-4 space-y-5 flex flex-col items-center">
                            {previewUrl && (
                                <div className="w-full h-48 relative rounded-2xl overflow-hidden shadow-inner bg-black/5 flex items-center justify-center">
                                    {analysisType === 'video' ? (
                                        <video src={previewUrl} className="w-full h-full object-cover" muted playsInline />
                                    ) : (
                                        <img src={previewUrl} className="w-full h-full object-cover" alt="preview" />
                                    )}
                                    <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px]"></div>
                                </div>
                            )}
                            <div className="w-full px-2">
                                <div className="flex justify-between items-end mb-2">
                                    <span className="text-xs font-black text-[#FF8DA1] tracking-widest uppercase">情報をとどけ中...</span>
                                    <span className="text-3xl font-black text-[#FF8DA1] italic">{progress}%</span>
                                </div>
                                <div className="h-5 w-full bg-[#F1F5F9] rounded-full overflow-hidden border-2 border-white shadow-inner">
                                    <div className="h-full bg-gradient-to-r from-[#FFB6C1] to-[#FF8DA1] transition-all duration-500 rounded-full" style={{ width: `${progress}%` }}></div>
                                </div>
                            </div>
                            <p className="text-[10px] font-bold text-[#94A3B8]">わくわくして待っててね♪</p>
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
                                onClick={handleReset}
                                className="w-full py-5 bg-[#FFD1DC] text-[#DB7093] font-black rounded-[2.5rem] hover:bg-[#FFB6C1] hover:text-white transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
                            >
                                <span>🏠</span> メニューに戻る
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
                                <p className="mt-4 text-[9px] font-bold text-[#FF8DA1]/30 tracking-widest uppercase">System v2.6.4 Optimized</p>
                            </div>
                        </div>
                    )}

                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
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
