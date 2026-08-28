import { useState } from 'react'
import ExplainTerm from './ExplainTerm.jsx'

export default function BusinessImpactCalculator({ baselineMetrics, augmentedMetrics }) {
    const [monthlyVolume, setMonthlyVolume] = useState(10_000_000) // $10M default
    const [fraudPrevalenceBps, setFraudPrevalenceBps] = useState(15) // 15 bps = 0.15%

    // Metrics defaults if not yet trained
    const baseRecall = baselineMetrics?.recall ?? 0.18
    const basePrecision = baselineMetrics?.precision ?? 0.91
    const augRecall = augmentedMetrics?.recall ?? 0.72
    const augPrecision = augmentedMetrics?.precision ?? 0.88

    const fraudPrevalence = fraudPrevalenceBps / 10_000
    const totalFraudDollars = monthlyVolume * fraudPrevalence
    const totalLegitDollars = monthlyVolume * (1 - fraudPrevalence)

    // Baseline calculations
    const baseFraudCaught = totalFraudDollars * baseRecall
    const baseFraudMissed = totalFraudDollars * (1 - baseRecall)
    const baseLegitAffected = basePrecision > 0
        ? baseFraudCaught * ((1 - basePrecision) / basePrecision)
        : totalLegitDollars * 0.05

    // Augmented calculations
    const augFraudCaught = totalFraudDollars * augRecall
    const augFraudMissed = totalFraudDollars * (1 - augRecall)
    const augLegitAffected = augPrecision > 0
        ? augFraudCaught * ((1 - augPrecision) / augPrecision)
        : totalLegitDollars * 0.05

    const netIncrementalFraudSaved = augFraudCaught - baseFraudCaught
    const annualizedIncrementalSaved = netIncrementalFraudSaved * 12

    function fmtMoney(amount) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            maximumFractionDigits: 0,
        }).format(amount)
    }

    return (
        <div className="rounded-sm border border-cyan-500/30 bg-[#060a12] p-6 lg:p-8 space-y-6 shadow-[0_0_30px_rgba(0,0,0,0.8)] font-mono">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
                <div>
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2.5 py-0.5 rounded-sm text-[10px] font-bold uppercase tracking-widest bg-emerald-500/10 text-emerald-400 border border-emerald-500/40">
                            [RISK_EXPOSURE_MODEL]
                        </span>
                        <span className="text-xs text-cyan-400 font-mono font-semibold">PRECISION & RECALL ROI</span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 font-mono">
                        <span className="text-cyan-400">&gt;</span> FINANCIAL LOSS PREVENTION SIMULATOR
                        <ExplainTerm term="Precision" context="Business impact fraud cost calculator" />
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-sans max-w-xl">
                        Translates measured model precision and recall into projected fraud dollar savings vs false positive review friction.
                    </p>
                </div>
                <div className="text-left sm:text-right bg-emerald-950/40 border border-emerald-500/40 p-4 rounded-sm shadow-[0_0_20px_rgba(0,255,102,0.1)]">
                    <p className="text-[10px] uppercase font-bold text-emerald-400 font-mono">[NET_MONTHLY_FRAUD_PREVENTED]</p>
                    <p className="text-2xl sm:text-3xl font-extrabold font-mono text-emerald-400">
                        +{fmtMoney(netIncrementalFraudSaved)}<span className="text-xs text-emerald-500 font-normal">/MO</span>
                    </p>
                    <p className="text-[11px] text-cyan-300 font-mono mt-0.5">+{fmtMoney(annualizedIncrementalSaved)}/YR ANNUALIZED</p>
                </div>
            </div>

            {/* Adjustable Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 p-5 rounded-sm bg-black/80 border border-slate-800 shadow-inner font-mono">
                <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
                        <span className="text-cyan-400 font-mono">[PROCESSING_VOLUME]:</span>
                        <span className="font-mono text-white text-base font-bold">{fmtMoney(monthlyVolume)}</span>
                    </div>
                    <input
                        type="range"
                        min={1_000_000}
                        max={50_000_000}
                        step={1_000_000}
                        value={monthlyVolume}
                        onChange={e => setMonthlyVolume(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-none"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
                        <span>$1M/mo</span>
                        <span>$25M/mo</span>
                        <span>$50M/mo</span>
                    </div>
                </div>

                <div>
                    <div className="flex justify-between items-center text-xs font-semibold text-slate-300 mb-2">
                        <span className="text-cyan-400 font-mono">[FRAUD_PREVALENCE]:</span>
                        <span className="font-mono text-white text-base font-bold">{(fraudPrevalence * 100).toFixed(2)}% ({fraudPrevalenceBps} BPS)</span>
                    </div>
                    <input
                        type="range"
                        min={5}
                        max={100}
                        step={5}
                        value={fraudPrevalenceBps}
                        onChange={e => setFraudPrevalenceBps(Number(e.target.value))}
                        className="w-full accent-cyan-400 cursor-pointer h-1.5 bg-slate-800 rounded-none"
                    />
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-1.5">
                        <span>0.05% (5 bps)</span>
                        <span>0.50% (50 bps)</span>
                        <span>1.00% (100 bps)</span>
                    </div>
                </div>
            </div>

            {/* Comparative Breakdown Table */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono">
                {/* Baseline card */}
                <div className="rounded-sm border border-slate-800 bg-black/60 p-5 space-y-3.5">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                        <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono">[BASE_MODEL: REAL_DATA_ONLY]</h3>
                        <span className="text-xs font-mono font-bold text-slate-400 bg-slate-900 px-2 py-0.5 rounded-sm border border-slate-700">RECALL: {(baseRecall * 100).toFixed(0)}%</span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-500">TOTAL EXPOSURE ({fmtMoney(monthlyVolume)} @ {(fraudPrevalence * 100).toFixed(2)}%)</span>
                            <span className="font-mono text-slate-300">{fmtMoney(totalFraudDollars)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-slate-300">ESTIMATED FRAUD CAUGHT</span>
                            <span className="font-mono font-bold text-white">{fmtMoney(baseFraudCaught)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-900">
                            <span className="text-red-400">FRAUD MISSED (FALSE NEGATIVES)</span>
                            <span className="font-mono font-bold text-red-400">{fmtMoney(baseFraudMissed)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-amber-400">FALSE POSITIVE FRICTION (REVIEW)</span>
                            <span className="font-mono text-amber-300">{fmtMoney(baseLegitAffected)}</span>
                        </div>
                    </div>
                </div>

                {/* Augmented card */}
                <div className="cyber-card-defense rounded-sm p-5 space-y-3.5 bg-[#050e11] border border-emerald-500/50 shadow-[0_0_20px_rgba(0,255,102,0.1)]">
                    <div className="flex justify-between items-center pb-2 border-b border-emerald-500/20">
                        <h3 className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider font-mono">[AUGMENTED: ADVERSARIAL_HARDENED]</h3>
                        <span className="text-xs font-mono font-extrabold text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded-sm border border-emerald-500/40">RECALL: {(augRecall * 100).toFixed(0)}%</span>
                    </div>
                    <div className="space-y-2.5 text-xs">
                        <div className="flex justify-between py-1 border-b border-emerald-500/10">
                            <span className="text-slate-400">TOTAL EXPOSURE ({fmtMoney(monthlyVolume)} @ {(fraudPrevalence * 100).toFixed(2)}%)</span>
                            <span className="font-mono text-slate-300">{fmtMoney(totalFraudDollars)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-emerald-500/10">
                            <span className="text-emerald-400 font-bold">ESTIMATED FRAUD CAUGHT</span>
                            <span className="font-mono font-extrabold text-emerald-400 text-sm">{fmtMoney(augFraudCaught)}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-emerald-500/10">
                            <span className="text-slate-500">FRAUD MISSED (FALSE NEGATIVES)</span>
                            <span className="font-mono text-slate-400">{fmtMoney(augFraudMissed)}</span>
                        </div>
                        <div className="flex justify-between py-1">
                            <span className="text-amber-300">FALSE POSITIVE FRICTION (REVIEW)</span>
                            <span className="font-mono text-amber-200">{fmtMoney(augLegitAffected)}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Reality Check Note */}
            <div className="rounded-sm border border-slate-800 bg-black/60 p-4 text-xs text-slate-400 leading-relaxed font-mono">
                <p className="font-bold text-cyan-400 mb-1 flex items-center gap-1.5">
                    <span>[NOTICE]:</span> RESEARCH SIMULATION PROJECTION
                </p>
                Applies measured test-set precision ({(augPrecision * 100).toFixed(1)}%) and recall ({(augRecall * 100).toFixed(1)}%) against simulated monthly volume.
            </div>
        </div>
    )
}
