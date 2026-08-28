import { useState } from 'react'
import ExplainTerm from './ExplainTerm.jsx'

export default function PrevalenceSimulator() {
    // Volume & Rate parameters
    const [monthlyVolume, setMonthlyVolume] = useState(1000000) // 1M transactions
    const [prevalenceBps, setPrevalenceBps] = useState(15) // 15 basis points = 0.15% fraud rate (typical banking average)
    const [modelRecall, setModelRecall] = useState(78) // 78% true fraud capture rate
    const [falsePositiveRate, setFalsePositiveRate] = useState(0.8) // 0.8% false positive rate on legitimate transactions
    const [costPerReview, setCostPerReview] = useState(6.50) // $6.50 cost per manual tier-2 analyst investigation

    // Mathematical calculations
    const fraudRate = prevalenceBps / 10000 // 15 bps = 0.0015
    const totalFraudTxns = Math.round(monthlyVolume * fraudRate)
    const totalLegitTxns = monthlyVolume - totalFraudTxns

    const truePositives = Math.round(totalFraudTxns * (modelRecall / 100))
    const falseNegatives = totalFraudTxns - truePositives
    const falsePositives = Math.round(totalLegitTxns * (falsePositiveRate / 100))
    const trueNegatives = totalLegitTxns - falsePositives

    const totalAlerts = truePositives + falsePositives
    const effectivePrecision = totalAlerts > 0 ? (truePositives / totalAlerts) * 100 : 0
    const alertRate = (totalAlerts / monthlyVolume) * 100
    const dailyAlerts = Math.round(totalAlerts / 30)
    const monthlyReviewCost = totalAlerts * costPerReview
    const fteRequired = (dailyAlerts / 65).toFixed(1) // Assuming 65 alert reviews per analyst per day

    // Base-rate ratio (Legit to Fraud)
    const legitToFraudRatio = Math.round((1 - fraudRate) / fraudRate)

    return (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-2xl">
            {/* Top banner */}
            <div className="p-6 border-b border-border bg-surface-hover/30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            BASE RATE MATHEMATICS
                        </span>
                        <h2 className="text-lg font-bold text-text-primary">
                            Interactive Low-Prevalence Alert Queue & Base Rate Simulator
                        </h2>
                    </div>
                    <p className="text-xs text-text-secondary">
                        Simulate how extreme class imbalance in real-world payment streams transforms a 99%+ specific classifier into thousands of false positive investigations.
                    </p>
                </div>
                <div className="text-right">
                    <span className="text-[10px] text-text-muted uppercase font-mono block">Class Imbalance Ratio</span>
                    <span className="text-base font-extrabold font-mono text-amber-300">
                        1 Fraud : {legitToFraudRatio.toLocaleString()} Legit
                    </span>
                </div>
            </div>

            <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Sliders on Left */}
                <div className="lg:col-span-6 space-y-6">
                    {/* Monthly Volume */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                            <span className="text-text-secondary">Monthly Payment Volume</span>
                            <span className="font-mono font-bold text-text-primary">{monthlyVolume.toLocaleString()} txns/mo</span>
                        </div>
                        <input
                            type="range"
                            min={50000}
                            max={10000000}
                            step={50000}
                            value={monthlyVolume}
                            onChange={e => setMonthlyVolume(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                            <span>50K</span>
                            <span>2.5M</span>
                            <span>5.0M</span>
                            <span>10.0M</span>
                        </div>
                    </div>

                    {/* Fraud Prevalence (Basis Points) */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                            <span className="text-text-secondary">Real-World Fraud Prevalence</span>
                            <span className="font-mono font-bold text-amber-300">
                                {prevalenceBps} bps ({(fraudRate * 100).toFixed(3)}%)
                            </span>
                        </div>
                        <input
                            type="range"
                            min={1}
                            max={200}
                            step={1}
                            value={prevalenceBps}
                            onChange={e => setPrevalenceBps(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                        />
                        <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                            <span>1 bps (0.01%)</span>
                            <span>15 bps (Retail Banking)</span>
                            <span>80 bps (Crypto/Remittance)</span>
                            <span>200 bps (2.0%)</span>
                        </div>
                    </div>

                    {/* Classifier Recall */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                            <span className="text-text-secondary">Defender Fraud Recall Rate <ExplainTerm term="Recall" context="Base rate simulator" /></span>
                            <span className="font-mono font-bold text-emerald-400">{modelRecall}% Capture</span>
                        </div>
                        <input
                            type="range"
                            min={30}
                            max={98}
                            step={1}
                            value={modelRecall}
                            onChange={e => setModelRecall(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                        />
                        <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                            <span>30% (Weak)</span>
                            <span>70% (Baseline)</span>
                            <span>85% (Augmented)</span>
                            <span>98% (Aggressive)</span>
                        </div>
                    </div>

                    {/* False Positive Rate */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                            <span className="text-text-secondary">False Positive Rate on Clean Payments</span>
                            <span className="font-mono font-bold text-rose-300">{falsePositiveRate.toFixed(2)}% of legit</span>
                        </div>
                        <input
                            type="range"
                            min={0.05}
                            max={3.0}
                            step={0.05}
                            value={falsePositiveRate}
                            onChange={e => setFalsePositiveRate(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
                        />
                        <div className="flex justify-between text-[10px] text-text-muted mt-1 font-mono">
                            <span>0.05% (Frictionless)</span>
                            <span>0.80% (Standard)</span>
                            <span>2.0% (Strict)</span>
                            <span>3.0% (Noisy)</span>
                        </div>
                    </div>

                    {/* Cost per investigation */}
                    <div>
                        <div className="flex justify-between items-center text-xs mb-1.5 font-medium">
                            <span className="text-text-secondary">Analyst Cost per Investigation ($)</span>
                            <span className="font-mono font-bold text-text-primary">${costPerReview.toFixed(2)} / review</span>
                        </div>
                        <input
                            type="range"
                            min={1.0}
                            max={25.0}
                            step={0.5}
                            value={costPerReview}
                            onChange={e => setCostPerReview(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                    </div>
                </div>

                {/* Live Output Matrix on Right */}
                <div className="lg:col-span-6 space-y-5">
                    {/* Primary Calculated Impact Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-amber-500/40 bg-amber-500/10">
                            <div className="text-[11px] font-bold text-amber-300 uppercase tracking-wider mb-1">
                                Effective Precision <ExplainTerm term="Precision" context="Base rate simulator" />
                            </div>
                            <div className="text-2xl font-extrabold font-mono text-white">
                                {effectivePrecision.toFixed(1)}%
                            </div>
                            <div className="text-[10px] text-slate-300 mt-1">
                                {effectivePrecision < 20 ? '⚠️ High False-Alarm Fatigue' : 'Balanced Review Queue'}
                            </div>
                        </div>

                        <div className="p-4 rounded-xl border border-border bg-surface-hover/40">
                            <div className="text-[11px] font-bold text-text-muted uppercase tracking-wider mb-1">
                                Daily Alert Volume
                            </div>
                            <div className="text-2xl font-extrabold font-mono text-text-primary">
                                {dailyAlerts.toLocaleString()} <span className="text-xs font-normal text-text-muted">/ day</span>
                            </div>
                            <div className="text-[10px] text-text-secondary mt-1">
                                Requires ~<strong className="text-text-primary">{fteRequired} Full-Time Analysts</strong>
                            </div>
                        </div>
                    </div>

                    {/* Operational Confusion Matrix Breakdown */}
                    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
                        <div className="text-xs font-bold text-text-primary mb-2 flex items-center justify-between">
                            <span>Monthly Queue Breakdown (Total: {totalAlerts.toLocaleString()} Alerts)</span>
                            <span className="font-mono text-[11px] text-slate-400">Total Fraud: {totalFraudTxns.toLocaleString()}</span>
                        </div>

                        {/* Visual Proportion Bar */}
                        <div className="w-full h-4 rounded-full overflow-hidden flex bg-slate-800 border border-border">
                            <div
                                style={{ width: `${effectivePrecision}%` }}
                                className="bg-emerald-500 h-full transition-all"
                                title={`True Positives: ${truePositives.toLocaleString()}`}
                            />
                            <div
                                style={{ width: `${100 - effectivePrecision}%` }}
                                className="bg-rose-500/80 h-full transition-all"
                                title={`False Positives: ${falsePositives.toLocaleString()}`}
                            />
                        </div>

                        <div className="flex justify-between text-[11px] font-mono pt-1">
                            <span className="flex items-center gap-1.5 text-emerald-400">
                                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500" />
                                True Fraud Caught: <strong>{truePositives.toLocaleString()}</strong> ({effectivePrecision.toFixed(1)}%)
                            </span>
                            <span className="flex items-center gap-1.5 text-rose-300">
                                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/80" />
                                False Alarms: <strong>{falsePositives.toLocaleString()}</strong> ({(100 - effectivePrecision).toFixed(1)}%)
                            </span>
                        </div>
                    </div>

                    {/* Cost of False Positives */}
                    <div className="p-4 rounded-xl border border-border bg-surface-hover/30 flex items-center justify-between">
                        <div>
                            <div className="text-xs font-bold text-text-primary">Monthly Alert Operational Overhead</div>
                            <div className="text-[11px] text-text-secondary mt-0.5">Analyst triage + customer friction cost</div>
                        </div>
                        <div className="text-right">
                            <div className="text-lg font-bold font-mono text-rose-300">
                                ${Math.round(monthlyReviewCost).toLocaleString()}
                            </div>
                            <div className="text-[10px] text-text-muted">/ month in operational review</div>
                        </div>
                    </div>

                    {/* Takeaway Insight */}
                    <div className="p-3.5 rounded-xl border border-indigo-500/30 bg-indigo-500/10 text-xs text-slate-200 leading-relaxed font-sans shadow-md">
                        💡 <strong className="text-indigo-300">Why Closed-Loop Precision Matters: </strong>
                        At real-world prevalence (15 bps), a mere 0.8% false positive rate produces <strong>{(falsePositives / (truePositives || 1)).toFixed(1)}x more false alarms than genuine fraud catches</strong>. This is why FraudForge's multi-round adversarial retrainer focuses on tightening decision margins without blowing out false positive queues.
                    </div>
                </div>
            </div>
        </div>
    )
}
