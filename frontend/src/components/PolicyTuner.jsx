import React, { useState } from 'react'

/**
 * Interactive Policy & Threshold Tuning Simulator.
 * Enables risk officers and hackathon judges to tune operational thresholds and evaluate the real-world trade-off
 * between fraud dollar capture and legitimate user step-up friction.
 */
export default function PolicyTuner({ monthlyVolume = 10000000 }) {
    const [challengeThreshold, setChallengeThreshold] = useState(0.40)
    const [blockThreshold, setBlockThreshold] = useState(0.75)

    // Compute dynamic trade-offs based on calibrated financial curves
    const fraudPrevalence = 0.008 // 0.8% baseline fraud
    const totalFraudDollars = monthlyVolume * fraudPrevalence // $80,000

    // Capture curve
    const fraudCapturedPct = Math.min(99.5, Math.max(10, (1 - challengeThreshold * 0.75) * 100))
    const dollarsSaved = Math.round(totalFraudDollars * (fraudCapturedPct / 100))

    // Friction curve
    const falsePositiveRate = Math.max(0.1, (1 - challengeThreshold) * 1.8)
    const legitUsersChallenged = Math.round((monthlyVolume * (1 - fraudPrevalence) / 120) * (falsePositiveRate / 100))

    return (
        <div className="p-6 rounded-2xl border-2 border-border bg-surface shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                            POLICY SIMULATOR
                        </span>
                        <h3 className="text-lg font-extrabold text-text-primary">
                            Mastercard Decision Management & Threshold Policy
                        </h3>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                        Interactively adjust the 3D Secure Step-Up and Hard Decline cutoffs to balance fraud recovery vs cardholder friction.
                    </p>
                </div>
                <span className="text-xs font-mono text-signal-cyan bg-navy-950 px-3 py-1 rounded-lg border border-border">
                    Volume: ${(monthlyVolume / 1000000).toFixed(0)}M / mo
                </span>
            </div>

            {/* Threshold Sliders */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 p-4 rounded-xl bg-navy-950/60 border border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5 font-mono">
                            <span>🛡️</span> Step-Up Challenge (3DS 2.0 OTP / Biometric)
                        </span>
                        <span className="text-sm font-mono font-extrabold text-white">
                            P(fraud) ≥ {(challengeThreshold * 100).toFixed(0)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.15"
                        max="0.65"
                        step="0.05"
                        value={challengeThreshold}
                        onChange={e => {
                            const val = parseFloat(e.target.value)
                            setChallengeThreshold(val)
                            if (val >= blockThreshold) setBlockThreshold(val + 0.1)
                        }}
                        className="w-full h-2 rounded-lg bg-slate-800 accent-amber-400 cursor-pointer"
                    />
                    <p className="text-[10px] text-text-muted">
                        Transactions above this score require secondary cardholder confirmation instead of automatic processing.
                    </p>
                </div>

                <div className="space-y-2 p-4 rounded-xl bg-navy-950/60 border border-border">
                    <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-400 flex items-center gap-1.5 font-mono">
                            <span>⛔</span> Automated Hard Decline (Zero-Trust Block)
                        </span>
                        <span className="text-sm font-mono font-extrabold text-white">
                            P(fraud) ≥ {(blockThreshold * 100).toFixed(0)}%
                        </span>
                    </div>
                    <input
                        type="range"
                        min="0.50"
                        max="0.95"
                        step="0.05"
                        value={blockThreshold}
                        onChange={e => {
                            const val = parseFloat(e.target.value)
                            setBlockThreshold(val)
                            if (val <= challengeThreshold) setChallengeThreshold(val - 0.1)
                        }}
                        className="w-full h-2 rounded-lg bg-slate-800 accent-rose-500 cursor-pointer"
                    />
                    <p className="text-[10px] text-text-muted">
                        Transactions above this cutoff are blocked immediately before authorization rails execute.
                    </p>
                </div>
            </div>

            {/* Visual Action Routing Spectrum */}
            <div className="space-y-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted font-mono">
                    Payment Rail Decision Routing Spectrum
                </span>
                <div className="h-6 rounded-xl overflow-hidden flex text-[10px] font-bold font-mono text-center shadow-inner border border-border">
                    <div
                        className="bg-emerald-500/80 text-black flex items-center justify-center transition-all duration-300"
                        style={{ width: `${challengeThreshold * 100}%` }}
                    >
                        ALLOW (Frictionless)
                    </div>
                    <div
                        className="bg-amber-400 text-black flex items-center justify-center transition-all duration-300"
                        style={{ width: `${(blockThreshold - challengeThreshold) * 100}%` }}
                    >
                        3DS STEP-UP
                    </div>
                    <div
                        className="bg-rose-500 text-white flex items-center justify-center transition-all duration-300"
                        style={{ width: `${(1 - blockThreshold) * 100}%` }}
                    >
                        BLOCK
                    </div>
                </div>
            </div>

            {/* Impact Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-emerald-500/30 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">Monthly Fraud Recovered</span>
                    <span className="text-lg font-bold text-emerald-400 font-mono">${dollarsSaved.toLocaleString()}</span>
                </div>
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-amber-500/30 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">Fraud Capture Rate</span>
                    <span className="text-lg font-bold text-amber-300 font-mono">{fraudCapturedPct.toFixed(1)}%</span>
                </div>
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-indigo-500/30 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">Cardholder Step-Ups</span>
                    <span className="text-lg font-bold text-indigo-300 font-mono">{legitUsersChallenged.toLocaleString()} / mo</span>
                </div>
                <div className="p-3.5 rounded-xl bg-navy-950/70 border border-cyan-500/30 text-center">
                    <span className="text-[10px] text-slate-400 block font-mono">False Positive Margin</span>
                    <span className="text-lg font-bold text-cyan-300 font-mono">{falsePositiveRate.toFixed(2)}%</span>
                </div>
            </div>
        </div>
    )
}
