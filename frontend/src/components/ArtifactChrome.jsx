import { useState, useEffect } from 'react'
import TypewriterText from './TypewriterText.jsx'

export default function ArtifactChrome({ vector, title, content, riskIndicators = [], isChained = false }) {
    // Live call duration timer for voice-clone
    const [callSeconds, setCallSeconds] = useState(14)
    useEffect(() => {
        if (vector !== 'voice-clone') return
        const timer = setInterval(() => setCallSeconds(s => s + 1), 1000)
        return () => clearInterval(timer)
    }, [vector])

    const formattedCallTime = `00:${callSeconds < 10 ? '0' : ''}${callSeconds}`

    return (
        <div className="space-y-4 animate-fadeIn">
            {/* Prominent Synthetic Research Disclaimer */}
            <div className="flex items-center justify-between px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                    [SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]
                </span>
                <span className="font-mono text-[11px] opacity-80 uppercase">Modality: {vector || 'payment-vector'}</span>
            </div>

            {/* ── 1. Voice Clone: Phone Call UI Mock ────────────────── */}
            {vector === 'voice-clone' && (
                <div className="max-w-xl mx-auto rounded-3xl border border-border bg-slate-950/90 shadow-2xl overflow-hidden p-6 text-center space-y-5">
                    {/* Call Header */}
                    <div className="space-y-2">
                        <div className="w-16 h-16 mx-auto rounded-full bg-gradient-to-br from-indigo-500 to-rose-500 flex items-center justify-center text-2xl shadow-lg ring-4 ring-rose-500/20">
                            🎙️
                        </div>
                        <h3 className="text-base font-bold text-white">Executive CFO Impersonation</h3>
                        <p className="text-xs text-signal-green font-mono flex items-center justify-center gap-1.5 font-bold">
                            <span className="w-2 h-2 rounded-full bg-signal-green animate-ping" />
                            Connected · {formattedCallTime}
                        </p>
                    </div>

                    {/* Audio Waveform visualization */}
                    <div className="flex items-center justify-center gap-1 h-8">
                        {[40, 75, 100, 60, 85, 30, 90, 65, 45, 80, 95, 50, 70, 35].map((h, i) => (
                            <div
                                key={i}
                                className="w-1 bg-signal-cyan/70 rounded-full animate-pulse"
                                style={{ height: `${h}%`, animationDelay: `${i * 100}ms` }}
                            />
                        ))}
                    </div>

                    {/* Live Transcript Bubble */}
                    <div className="p-4 rounded-2xl bg-surface border border-border text-left space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Live Voice Synthesis Transcript:
                        </span>
                        <div className="text-xs text-slate-200 leading-relaxed font-sans">
                            <TypewriterText text={content} />
                        </div>
                    </div>

                    {/* Call Controls Mock */}
                    <div className="flex items-center justify-center gap-6 pt-2">
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">🔇</div>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">🔢</div>
                        <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-slate-300 text-sm">🔊</div>
                        <div className="w-12 h-12 rounded-full bg-rose-600 flex items-center justify-center text-white text-lg shadow-lg">📞</div>
                    </div>
                </div>
            )}

            {/* ── 2. BEC / Phishing / Email Chrome ──────────────────── */}
            {(vector === 'bec-email' || vector === 'llm-phishing') && (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl">
                    {/* Email Window Frame Header */}
                    <div className="px-4 py-3 bg-navy-950 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-rose-500/80" />
                            <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                            <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                            <span className="ml-2 text-xs font-semibold text-slate-300">Corporate Mail Client</span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                            ⚠️ High Threat Vector
                        </span>
                    </div>

                    {/* Email Headers */}
                    <div className="p-4 bg-black/20 border-b border-border space-y-1.5 text-xs font-mono">
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold w-16">FROM:</span>
                            <span className="text-rose-300 font-semibold">finance-desk@corp-secure-auth.com</span>
                            <span className="text-[10px] text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">External Domain</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold w-16">TO:</span>
                            <span className="text-slate-200">accounts.payable@enterprise.com</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-slate-400 font-bold w-16">SUBJECT:</span>
                            <span className="text-white font-bold">{title || 'URGENT: Outstanding Vendor Settlement Authorization'}</span>
                        </div>
                    </div>

                    {/* Email Body */}
                    <div className="p-6 text-xs text-slate-200 leading-relaxed font-sans">
                        <TypewriterText text={content} />
                    </div>
                </div>
            )}

            {/* ── 3. Fake E-Commerce Storefront Browser Frame ───────── */}
            {vector === 'fake-ecommerce' && (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl">
                    {/* Browser Address Bar */}
                    <div className="px-4 py-2.5 bg-navy-950 border-b border-border flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                            <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                        </div>
                        <div className="flex-1 px-3 py-1 rounded-lg bg-black/40 border border-border/80 text-[11px] font-mono text-slate-300 flex items-center gap-2">
                            <span className="text-rose-400">🔒 https://</span>
                            <span className="text-white">secure-checkout-flashdeal.store/cart/checkout</span>
                            <span className="ml-auto text-[10px] text-rose-400 bg-rose-950/80 px-1.5 py-0.2 rounded">Spoofed Certificate</span>
                        </div>
                    </div>

                    {/* Storefront Content */}
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between pb-3 border-b border-border">
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">🛍️</span>
                                <div>
                                    <h3 className="text-sm font-bold text-white">VIP Flash Sale Checkout Portal</h3>
                                    <p className="text-[11px] text-rose-400 font-bold">Limited Time: 90% Off Final Clearance</p>
                                </div>
                            </div>
                            <span className="px-3 py-1 rounded-lg bg-rose-600 text-white text-xs font-bold animate-pulse">
                                Expiring in 04:59
                            </span>
                        </div>

                        <div className="text-xs text-slate-200 leading-relaxed font-sans bg-black/20 p-4 rounded-xl border border-border">
                            <TypewriterText text={content} />
                        </div>
                    </div>
                </div>
            )}

            {/* ── 4. Fake Chatbot Scenario ──────────────────────────── */}
            {vector === 'fake-chatbot' && (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl max-w-2xl mx-auto">
                    <div className="px-4 py-3 bg-navy-950 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-sm shadow">🤖</div>
                            <div>
                                <h4 className="text-xs font-bold text-white">Mastercard Bank Support Bot (Spoofed)</h4>
                                <span className="text-[10px] text-signal-green flex items-center gap-1 font-semibold">
                                    <span className="w-1.5 h-1.5 rounded-full bg-signal-green animate-ping" />
                                    Active Live Session
                                </span>
                            </div>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">SESSION: #BOT-4921</span>
                    </div>

                    <div className="p-5 space-y-4">
                        <div className="flex gap-2.5">
                            <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center text-xs shrink-0">👤</div>
                            <div className="p-3 rounded-2xl rounded-tl-none bg-slate-800/80 text-xs text-slate-300 max-w-md">
                                Hi, I received a notification about an unauthorized charge on my card.
                            </div>
                        </div>

                        <div className="flex gap-2.5 flex-row-reverse">
                            <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-xs shrink-0">🤖</div>
                            <div className="p-3 rounded-2xl rounded-tr-none bg-indigo-950/80 border border-indigo-500/40 text-xs text-slate-100 max-w-md shadow-lg">
                                <TypewriterText text={content} />
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* ── 5. Synthetic Identity / Deepfake KYC Badge ─────────── */}
            {(vector === 'synthetic-identity' || vector === 'deepfake-kyc' || vector === 'deepfake-video') && (
                <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl max-w-xl mx-auto p-5 space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-border">
                        <div className="flex items-center gap-2">
                            <span className="text-xl">🪪</span>
                            <div>
                                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-mono">
                                    Synthetic KYC Identity Badge
                                </h3>
                                <span className="text-[10px] text-slate-400">ID: SYN-2026-9481 · SEEDED</span>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                            KYC VERIFIED
                        </span>
                    </div>

                    <div className="grid grid-cols-3 gap-4 items-center">
                        <div className="col-span-1 aspect-square rounded-xl bg-gradient-to-br from-purple-900 to-slate-900 border border-purple-500/40 flex flex-col items-center justify-center text-center p-2 shadow-inner">
                            <span className="text-3xl">👤</span>
                            <span className="text-[9px] font-mono text-purple-300 mt-1">AI Generated Face</span>
                        </div>
                        <div className="col-span-2 space-y-1.5 text-xs font-mono">
                            <div className="flex justify-between border-b border-border/40 pb-1">
                                <span className="text-slate-400">BIOMETRICS:</span>
                                <span className="text-signal-cyan font-bold">99.4% MATCH</span>
                            </div>
                            <div className="flex justify-between border-b border-border/40 pb-1">
                                <span className="text-slate-400">CREDENTIALS:</span>
                                <span className="text-amber-300 font-bold">FABRICATED</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-400">INJECTION:</span>
                                <span className="text-rose-400 font-bold">VIRTUAL CAM</span>
                            </div>
                        </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-navy-950 border border-border text-xs text-slate-200 leading-relaxed font-sans">
                        <TypewriterText text={content} />
                    </div>
                </div>
            )}

            {/* ── Animated Risk Indicators Detected (Milestone 4) ───── */}
            {riskIndicators && riskIndicators.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-5 space-y-3">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                            <span>🚨</span> Risk Indicators Detected Live:
                        </h4>
                        <span className="text-[10px] text-slate-400 font-mono">Sequential AI Scan</span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {riskIndicators.map((ind, i) => (
                            <span
                                key={i}
                                className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm animate-popIn"
                                style={{ animationDelay: `${i * 150}ms` }}
                            >
                                {ind}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
