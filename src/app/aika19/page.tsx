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
    const fileInputRef = useRef<HTMLInputElement>(null);

    // mascot image placeholder - ideally user uploads the generated image to ImageKit
    const MASCOT_URL = "https://ik.imagekit.io/FLATUPGYM/b9d4a676-0903-444c-91d2-222dc3294f.png?updatedAt=1760340781490";

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
                            liff.login({ redirectUri: window.location.href });
                        }
                    }
                }
            } catch (e: any) {
                console.error('LIFF Init Error', e);
                setErrorMsg(`AI 18号、ちょっと困っちゃったみたい…！\n${e.message}`);
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
            const reqRes = await fetch(`${API_BASE_URL}/api/upload-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: file.name,
                    contentType: file.type,
                    analysisType
                })
            });

            if (!reqRes.ok) throw new Error(`準備中…うまくつながらなかったみたい`);
            const { uploadUrl, fileKey } = await reqRes.json();
            setProgress(30);

            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: { 'Content-Type': file.type }
            });

            if (!uploadRes.ok) throw new Error('情報をとどけられなかったみたい…');
            setProgress(70);
            setStatus('processing');

            const analyzeRes = await fetch(`${API_BASE_URL}/api/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileKey,
                    userId: profile?.userId || 'GUEST_USER',
                    type: analysisType
                })
            });

            if (!analyzeRes.ok) throw new Error('解析中にエラーが発生しちゃった');
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
            setErrorMsg('AI 18号、ただいま準備中なの♪\nあなたがもっと使いやすくて楽しいと感じられるように、一生懸命パワーアップしているところなんだ！\n完成まで、ワクワクしながら待っててくれると嬉しいな！きっと素敵な機能になるはずだよ♪');
            setStatus('error'); // Using error UI style for the "WIP" message
            return;
        }
        if (fileInputRef.current) {
            fileInputRef.current.accept = type === 'video' ? 'video/*' : 'image/*';
            fileInputRef.current.click();
        }
    };

    return (
        <div className="min-h-screen relative overflow-hidden bg-white text-[#4A4A4A] font-sans selection:bg-pink-100/50">
            {/* Ambient Patterns & Background */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[5%] left-[10%] w-32 h-32 bg-pink-100 rounded-full blur-3xl opacity-40"></div>
                <div className="absolute bottom-[10%] right-[5%] w-48 h-48 bg-blue-100 rounded-full blur-3xl opacity-40"></div>
                <div className="absolute top-[30%] right-[15%] w-24 h-24 bg-yellow-100 rounded-full blur-2xl opacity-30 animate-pulse"></div>
                {/* Subtle Dotted Pattern */}
                <div className="absolute inset-0 opacity-[0.05]" style={{ backgroundImage: 'radial-gradient(#C4C4C4 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
            </div>

            <main className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
                <div className="w-full max-w-md bg-white/90 backdrop-blur-xl border-4 border-white rounded-[4rem] p-10 shadow-[0_25px_60px_rgba(0,0,0,0.05)] flex flex-col items-center text-center relative overflow-hidden transition-all duration-700">

                    {/* Interior Glow */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-4/5 h-32 bg-pink-50/50 blur-[60px] rounded-full"></div>

                    {/* Mascot Section */}
                    <div className="mb-6 z-10 transition-transform duration-700 hover:scale-105 cursor-pointer">
                        <div className="absolute inset-0 bg-pink-200/20 rounded-full blur-2xl opacity-50"></div>
                        <Image
                            src={MASCOT_URL}
                            alt="AI 18号 Mascot"
                            width={160}
                            height={160}
                            className="rounded-full relative border-[8px] border-white shadow-xl"
                            unoptimized
                        />
                    </div>

                    <div className="z-10 relative">
                        <h1 className="text-3xl font-black mb-1 bg-gradient-to-r from-[#FF8DA1] to-[#FFB6C1] bg-clip-text text-transparent tracking-tighter">
                            AI 18号
                        </h1>
                        <p className="text-[#8B8B8B] text-sm font-bold mb-10 leading-relaxed">
                            AI 18号が、あなたの毎日を<br />
                            <span className="text-[#FF8DA1]">そっとサポートしちゃうよ♪</span>
                        </p>
                    </div>

                    {status === 'initializing' && (
                        <div className="py-10 flex flex-col items-center space-y-4">
                            <div className="w-8 h-8 border-4 border-[#FFDDE4] border-t-[#FF8DA1] rounded-full animate-spin"></div>
                            <span className="text-[10px] font-black text-[#FF8DA1] tracking-[0.2em] uppercase animate-pulse">準備中だよ、まっててね♪</span>
                        </div>
                    )}

                    {status === 'ready' && (
                        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-5 duration-700">
                            {[
                                { id: 'video', label: '戦闘力分析', desc: 'かっこいい自分をチェック！', icon: '✨', bg: 'bg-[#B0E0E6]', text: 'text-[#4682B4]' },
                                { id: 'image', label: 'カロリー計算', desc: '今日のごはんは何かな？', icon: '🍎', bg: 'bg-[#C8F0C8]', text: 'text-[#2E8B57]' },
                                { id: 'chat', label: 'お悩み相談', desc: 'なんでもおはなししてね♪', icon: '💖', bg: 'bg-[#FFD1DC]', text: 'text-[#DB7093]' },
                            ].map((item) => (
                                <button
                                    key={item.id}
                                    onClick={() => triggerAction(item.id as any)}
                                    className={`relative w-full p-5 rounded-[2.5rem] ${item.bg} group transition-all duration-300 hover:scale-[1.03] active:scale-[0.96] shadow-md flex items-center gap-4 border-b-4 border-black/5`}
                                >
                                    <div className="w-14 h-14 bg-white/60 rounded-[1.5rem] flex items-center justify-center text-2xl shadow-sm group-hover:rotate-12 transition-transform">
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
                        <div className="w-full py-8 space-y-4">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-xs font-black text-[#FF8DA1] tracking-widest uppercase">情報をとどけ中...</span>
                                <span className="text-3xl font-black text-[#FF8DA1] italic">{progress}%</span>
                            </div>
                            <div className="h-4 w-full bg-[#FFF0F3] rounded-full overflow-hidden border-2 border-white">
                                <div className="h-full bg-gradient-to-r from-[#FFB6C1] to-[#FF8DA1] transition-all duration-300 rounded-full" style={{ width: `${progress}%` }}></div>
                            </div>
                            <p className="text-[10px] text-[#A0A0A0]">わくわくして待っててね♪</p>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="py-10 flex flex-col items-center">
                            <div className="relative w-24 h-24 mb-6">
                                <div className="absolute inset-0 bg-pink-100/50 rounded-full animate-ping"></div>
                                <div className="absolute inset-0 border-4 border-dashed border-[#FFB6C1] rounded-full animate-spin"></div>
                                <div className="absolute inset-4 bg-white/40 backdrop-blur-sm rounded-full flex items-center justify-center text-3xl animate-bounce">
                                    🔍
                                </div>
                            </div>
                            <h2 className="text-2xl font-black text-[#FF8DA1] italic">解析開始！</h2>
                            <p className="text-xs text-[#8B8B8B] mt-2 font-bold">AI 18号が、一生懸命みてるよ！</p>
                        </div>
                    )}

                    {status === 'complete' && (
                        <div className="w-full space-y-6 animate-in fade-in slide-in-from-bottom-8 duration-700">
                            <div className="bg-[#E6F9F3] border-4 border-white p-8 rounded-[3.5rem] shadow-lg relative overflow-hidden group">
                                <h3 className="text-2xl font-black text-[#2E8B57] mb-4 flex items-center justify-center gap-2">
                                    ✨ できたよ！ ✨
                                </h3>
                                <div className="text-sm text-[#4A4A4A] leading-relaxed font-bold bg-white/50 p-6 rounded-[2rem] border border-white/50 text-left">
                                    {analysisResult?.details || '素晴らしい成果を検知しました♪'}
                                </div>
                            </div>
                            <button
                                onClick={() => setStatus('ready')}
                                className="w-full py-5 bg-[#FFD1DC] text-[#DB7093] font-black rounded-[2.5rem] hover:bg-[#FFB6C1] hover:text-white transition-all shadow-xl active:scale-95"
                            >
                                もっとあそぶ？
                            </button>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="w-full py-8 space-y-6">
                            <div className="bg-white border-4 border-[#FFF0F3] p-8 rounded-[3.5rem] shadow-xl relative">
                                <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-4 border-[#FFF0F3] flex items-center justify-center text-4xl shadow-md">
                                    {errorMsg.includes('準備中') ? "🛠️" : "😢"}
                                </div>
                                <h3 className="text-xl font-black text-[#FF8DA1] mt-4 mb-2">
                                    {errorMsg.includes('準備中') ? "もう少しだけ待っていてね！" : "あれれ、ごめんなさい…！"}
                                </h3>
                                <div className="text-xs text-[#8B8B8B] bg-[#FFF9FB] p-6 rounded-[2rem] font-bold leading-relaxed mb-4 text-left whitespace-pre-wrap">
                                    {errorMsg}
                                </div>
                                <button
                                    onClick={() => setStatus('ready')}
                                    className="w-full py-5 bg-[#FFB6C1] text-white font-black rounded-[2rem] hover:bg-[#FF8DA1] transition-all shadow-md active:scale-95"
                                >
                                    {errorMsg.includes('準備中') ? "わかった！楽しみに待ってるね！" : "優しく再チャレンジ！"}
                                </button>
                            </div>
                        </div>
                    )}

                    <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileSelect} />
                </div>

                <div className="mt-12 flex flex-col items-center gap-2 opacity-30">
                    <p className="text-[9px] font-black text-[#FFB6C1] tracking-[0.6em] uppercase">AI 18 HEART CORE</p>
                    <div className="flex gap-2">
                        <span className="w-1 h-1 bg-pink-300 rounded-full animate-bounce"></span>
                        <span className="w-1 h-1 bg-blue-300 rounded-full animate-bounce delay-100"></span>
                        <span className="w-1 h-1 bg-green-300 rounded-full animate-bounce delay-200"></span>
                    </div>
                </div>
            </main>
        </div>
    );
}
