import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAttackContext } from '../context/AttackContext.jsx'
import AnimatedCounter from '../components/AnimatedCounter.jsx'

const VECTORS = [
    { id: 'voice-clone', name: 'Voice Cloning', icon: '🎙️', desc: 'AI-cloned CEO executive audio call requesting urgent wire transfer', category: 'Audio' },
    { id: 'deepfake-video', name: 'Deepfake Video Calls', icon: '📹', desc: 'Real-time face-swap video authorization during video KYC', category: 'Video' },
    { id: 'synthetic-identity', name: 'Synthetic KYC Fraud', icon: '🪪', desc: 'Fabricated identity combining real SSN with fake biometric data', category: 'Identity' },
    { id: 'bec-email', name: 'AI Business Email Compromise', icon: '✉️', desc: 'Context-aware phishing email hijacking an active supplier invoice thread', category: 'Text' },
    { id: 'fake-ecommerce', name: 'AI Fake E-Commerce Store', icon: '🛍️', desc: 'Autonomous scam merchant site with zero delivery fulfillment', category: 'Merchant' },
    { id: 'fake-chatbot', name: 'Fake AI Support Bot', icon: '💬', desc: 'Malicious banking chatbot harvesting one-time authorization tokens', category: 'Chatbot' },
]

const TARGET_PERSONAS = [
    { id: 'C0001', name: 'Aarav Mehta (Mumbai)', segment: 'High Net Worth', avgSpend: '$2,028', usualChannel: 'UPI / Wire', riskTolerance: 'Low' },
    { id: 'C0042', name: 'Priya Sharma (Bangalore)', segment: 'Tech Professional', avgSpend: '$450', usualChannel: 'Credit Card', riskTolerance: 'Medium' },
    { id: 'C0108', name: 'Vikram Patel (Ahmedabad)', segment: 'Enterprise Merchant', avgSpend: '$12,500', usualChannel: 'RTGS / ACH', riskTolerance: 'High' },
]

export default function UnifiedLiveCockpit() {
    const { selectedVector, setSelectedVector } = useAttackContext()
    const [activeVectorId, setActiveVectorId] = useState(selectedVector || 'voice-clone')
    const [activePersona, setActivePersona] = useState(TARGET_PERSONAS[0])
    const [simulating, setSimulating] = useState(false)
    const [stepPhase, setStepPhase] = useState(0)
    const [attackPayload, setAttackPayload] = useState(null)
    const [defenseVerdict, setDefenseVerdict] = useState(null)
    const [retrained, setRetrained] = useState(false)

    const currentVector = VECTORS.find(v => v.id === activeVectorId) || VECTORS[0]

    useEffect(() => {
        handleGenerateAttack(activeVectorId, activePersona)
    }, [activeVectorId, activePersona])

    function handleGenerateAttack(vectorId, persona) {
        const v = VECTORS.find(x => x.id === vectorId) || VECTORS[0]
        const amount = vectorId === 'synthetic-identity' ? 8450 : vectorId === 'bec-email' ? 24500 : 3850
        const isVoice = vectorId === 'voice-clone'

        const payload = {
            vector: v,
            target: persona,
            timestamp: new Date().toLocaleTimeString(),
            lureTitle: isVoice ? 'Urgent CFO Wire Request Audio Stream' : `AI-Generated ${v.name} Payload`,
            script: isVoice
                ? `Caller (Cloned Voice of CFO): "Aarav, I am in an urgent vendor board meeting. Please authorize the $${amount.toLocaleString()} supplier invoice to Apex Global immediately before cutoff."`
                : `Synthetic Attack Vector active against ${persona.name}. Model synthesized realistic credentials, urgent authority cues, and abnormal destination routing to bypass static rule thresholds.`,
            transaction: {
                id: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
                amount,
                payee: 'Apex Meridian Global Escrow Ltd.',
                channel: 'Wire / Instant UPI',
                velocity1h: 4,
                isNewPayee: 1,
                isOffHours: 1,
                isInternational: 1,
            },
            riskScore: 0.94,
        }
        setAttackPayload(payload)
        setStepPhase(1)
        setRetrained(false)

        setDefenseVerdict({
            baselineRecall: 0.182,
            baselineVerdict: 'EVADED (False Negative)',
            baselineAction: 'ALLOW PAYMENT ❌',
            baselineConfidence: 0.32,
            championRecall: 0.794,
            championVerdict: 'BLOCKED (Adversarially Intercepted)',
            championAction: 'FREEZE & AUDIT ✓',
            championConfidence: 0.94,
            shapFactors: [
                { feature: 'Velocity Anomaly (4 txns/hr)', impact: '+0.38', color: 'rose' },
                { feature: 'Unverified International Payee', impact: '+0.28', color: 'rose' },
                { feature: 'Off-Hours Execution (02:45 AM)', impact: '+0.19', color: 'amber' },
                { feature: 'Amount Deviation (+320% vs baseline)', impact: '+0.15', color: 'amber' },
            ]
        })
    }

    const [simulationStage, setSimulationStage] = useState(null) // null | 'synthesizing' | 'evaluating' | 'hardening' | 'complete'
    const [simProgress, setSimProgress] = useState(0)
    const [simLogs, setSimLogs] = useState([])

    async function runCompleteSimulation() {
        if (simulating) return
        setSimulating(true)
        setStepPhase(1)
        setRetrained(false)
        setSimLogs([])

        // Step 1: Synthesizing attack
        setSimulationStage('synthesizing')
        setSimProgress(15)
        setSimLogs([`[00:00.50] 🔴 RED TEAM: Synthesizing Generative ${currentVector.name} attack against ${activePersona.name}...`])
        handleGenerateAttack(activeVectorId, activePersona)
        
        await new Promise(r => setTimeout(r, 1200))
        setSimProgress(45)
        setSimLogs(prev => [...prev, `[00:01.70] 💳 PAYMENT: Generated $${(activeVectorId === 'synthetic-identity' ? 8450 : activeVectorId === 'bec-email' ? 24500 : 3850).toLocaleString()} anomalous transaction payload.`])

        // Step 2: Evaluating baseline model
        setStepPhase(2)
        setSimulationStage('evaluating')
        setSimProgress(70)
        setSimLogs(prev => [...prev, `[00:02.50] ⚖️ BASELINE ML: Traditional Rule & Tree model evaluated -> ❌ EVADED (False Negative, 18.2% Recall).`])
        
        await new Promise(r => setTimeout(r, 1300))

        // Step 3: Hardening Champion & SHAP
        setStepPhase(3)
        setSimulationStage('hardening')
        setSimProgress(90)
        setSimLogs(prev => [...prev, `[00:03.80] 🛡️ DEFENDER ML: Retrained Champion Model deployed -> ✓ BLOCKED (79.4% Recall, +61.2% Recovery).`])
        
        await new Promise(r => setTimeout(r, 1200))
        setRetrained(true)
        setSimulationStage('complete')
        setSimProgress(100)
        setSimLogs(prev => [...prev, `[00:04.60] 🎉 COMPLETE: $745,000 monthly fraud prevented with 0.00% customer friction.`])
        setSimulating(false)
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-slate-100 font-sans">
            {/* ── Top Hero & One-Click Master Execution ── */}
            <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-navy-950 via-slate-900 to-amber-950/30 border-2 border-amber-500/50 shadow-2xl space-y-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
                    <div>
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="px-3 py-1 rounded-md text-xs font-black font-mono bg-gradient-to-r from-emerald-500 to-amber-500 text-slate-950 shadow-sm">
                                ⚡ ALL-IN-ONE COMMAND COCKPIT
                            </span>
                            <span className="text-xs text-amber-300 font-bold">
                                Entire Red Team Attack & Blue Team Defense in 1 Screen
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-white">
                            Generative AI Fraud & Adversarial ML Hardening
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={runCompleteSimulation}
                        disabled={simulating}
                        className="group px-6 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 via-amber-500 to-orange-500 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-95"
                    >
                        {simulating ? (
                            <>
                                <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                <span>Running Simulation ({simProgress}%)…</span>
                            </>
                        ) : (
                            <>
                                <span className="text-base">▶</span>
                                <span>Run Complete End-to-End Simulation</span>
                                <span className="group-hover:translate-x-1 transition-transform">→</span>
                            </>
                        )}
                    </button>
                </div>

                {/* Live Simulation Progress Banner */}
                {simulationStage && (
                    <div className="p-4 rounded-2xl bg-slate-900 border-2 border-amber-400 text-xs space-y-3 animate-popIn">
                        <div className="flex items-center justify-between">
                            <span className="font-mono font-bold text-amber-300 flex items-center gap-2">
                                {simulationStage === 'synthesizing' && '🔴 STEP 1/3: Synthesizing GenAI Threat Payload…'}
                                {simulationStage === 'evaluating' && '⚖️ STEP 2/3: Testing Traditional Rule & ML Baseline…'}
                                {simulationStage === 'hardening' && '🛡️ STEP 3/3: Retraining Champion with Adversarial Hardening…'}
                                {simulationStage === 'complete' && '🎉 COMPLETE: Threat Successfully Neutralized in 0.04s!'}
                            </span>
                            <span className="font-mono font-black text-emerald-400">{simProgress}%</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-slate-950 overflow-hidden border border-slate-800">
                            <div
                                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 transition-all duration-300"
                                style={{ width: `${simProgress}%` }}
                            />
                        </div>

                        {/* Live Event Stream Logs */}
                        {simLogs.length > 0 && (
                            <div className="p-3 rounded-xl bg-slate-950/90 border border-slate-800 font-mono text-[11px] space-y-1">
                                {simLogs.map((log, idx) => (
                                    <div key={idx} className="text-slate-300 flex items-start gap-2">
                                        <span className="text-emerald-400 font-bold shrink-0">❯</span>
                                        <span className="leading-tight">{log}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* Quick Selectors */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Vector Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                            <span>🎯</span> 1. Select AI Threat Vector:
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {VECTORS.map(v => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => {
                                        setActiveVectorId(v.id)
                                        setSelectedVector(v.id)
                                    }}
                                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                                        activeVectorId === v.id
                                            ? 'bg-amber-500/20 text-amber-200 border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)] ring-1 ring-amber-400'
                                            : 'bg-slate-900/80 text-slate-400 border-border hover:text-white hover:border-slate-600'
                                    }`}
                                >
                                    <span className="text-base">{v.icon}</span>
                                    <span className="truncate">{v.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Persona Selector */}
                    <div className="space-y-2">
                        <label className="text-xs font-mono font-bold uppercase tracking-wider text-orange-300 flex items-center gap-1.5">
                            <span>👤</span> 2. Select Target Victim Profile:
                        </label>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {TARGET_PERSONAS.map(p => (
                                <button
                                    key={p.id}
                                    type="button"
                                    onClick={() => setActivePersona(p)}
                                    className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                                        activePersona.id === p.id
                                            ? 'bg-orange-500/20 text-orange-200 border-orange-400 shadow-[0_0_15px_rgba(249,115,22,0.3)] ring-1 ring-orange-400'
                                            : 'bg-slate-900/80 text-slate-400 border-border hover:text-white hover:border-slate-600'
                                    }`}
                                >
                                    <div className="font-bold text-white truncate">{p.name}</div>
                                    <div className="text-[10px] text-text-muted mt-0.5">{p.segment} · {p.avgSpend} avg</div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── 2-COLUMN COCKPIT: ATTACK STUDIO (LEFT) vs DEFENDER (RIGHT) ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* ── LEFT PANEL: RED TEAM ATTACK STUDIO (Col 6) ── */}
                <div className="lg:col-span-6 rounded-3xl border-2 border-rose-500/40 bg-gradient-to-b from-rose-950/20 via-surface to-slate-950 p-6 shadow-xl space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-rose-500/20">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-500/20 text-rose-300 border border-rose-500/40 text-base">
                                🔴
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-white">
                                    Red Team: Synthetic Attack Generation
                                </h3>
                                <p className="text-xs text-rose-300 font-mono">
                                    Vector: {currentVector.name}
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            STEP 1: ATTACK
                        </span>
                    </div>

                    {/* Synthesized Social Engineering Lure */}
                    {attackPayload && (
                        <div className="space-y-4">
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-rose-500/30 space-y-2">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-rose-300 flex items-center gap-1.5">
                                        <span>💬</span> Synthesized Scam Script / Lure:
                                    </span>
                                    <span className="text-[10px] font-mono text-text-muted">AI-Generated</span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-200 font-serif italic bg-slate-900 p-3 rounded-xl border border-border leading-relaxed">
                                    "{attackPayload.script}"
                                </p>
                            </div>

                            {/* Generated Anomalous Payment Row */}
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-border space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                                        <span>💳</span> Synthetic Payment Payload:
                                    </span>
                                    <span className="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold">
                                        Anomalous Deviation
                                    </span>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2.5 rounded-xl bg-slate-900 border border-border">
                                        <span className="text-[10px] text-text-muted block">Amount</span>
                                        <span className="font-mono font-black text-rose-400 text-sm">
                                            ${attackPayload.transaction.amount.toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-900 border border-border">
                                        <span className="text-[10px] text-text-muted block">Velocity (1h)</span>
                                        <span className="font-mono font-bold text-amber-300 text-sm">
                                            {attackPayload.transaction.velocity1h} txns
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-900 border border-border">
                                        <span className="text-[10px] text-text-muted block">Payee</span>
                                        <span className="font-mono font-bold text-white text-xs truncate block">
                                            New Payee
                                        </span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-slate-900 border border-border">
                                        <span className="text-[10px] text-text-muted block">Location</span>
                                        <span className="font-mono font-bold text-rose-300 text-xs truncate block">
                                            International
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── RIGHT PANEL: BLUE TEAM DEFENSE & ML VERDICT (Col 6) ── */}
                <div className="lg:col-span-6 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-950/20 via-surface to-slate-950 p-6 shadow-xl space-y-5">
                    {/* Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                        <div className="flex items-center gap-2.5">
                            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-base">
                                🛡️
                            </div>
                            <div>
                                <h3 className="text-base font-extrabold text-white">
                                    Blue Team: ML Classifier Verdict
                                </h3>
                                <p className="text-xs text-emerald-300 font-mono">
                                    Model: Baseline vs Augmented Champion
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            STEP 2: DEFENSE
                        </span>
                    </div>

                    {/* Model Verdict Comparison */}
                    {defenseVerdict && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {/* Baseline Model */}
                                <div className="p-4 rounded-2xl bg-slate-950 border border-border space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-mono font-bold text-text-muted uppercase">
                                            Baseline Model
                                        </span>
                                        <span className="text-xs text-rose-400 font-bold">18.2% Recall</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/40">
                                        <span className="text-xs font-black text-rose-300 block">
                                            ❌ {defenseVerdict.baselineVerdict}
                                        </span>
                                        <span className="text-[10px] text-slate-300 block mt-0.5">
                                            Action: {defenseVerdict.baselineAction}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-text-muted leading-tight">
                                        Traditional bank model failed to detect generative prompt markers.
                                    </p>
                                </div>

                                {/* Augmented Champion Model */}
                                <div className="p-4 rounded-2xl bg-slate-950 border-2 border-emerald-500/60 shadow-[0_0_20px_rgba(16,185,129,0.15)] space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-mono font-extrabold text-emerald-400 uppercase">
                                            Retrained Champion
                                        </span>
                                        <span className="text-xs text-emerald-300 font-extrabold">79.4% Recall</span>
                                    </div>
                                    <div className="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/50">
                                        <span className="text-xs font-black text-emerald-300 block">
                                            ✓ {defenseVerdict.championVerdict}
                                        </span>
                                        <span className="text-[10px] text-emerald-200 block mt-0.5">
                                            Action: {defenseVerdict.championAction}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-emerald-400 font-bold leading-tight">
                                        +{((0.794 - 0.182) * 100).toFixed(1)}% Recall Recovery via Adversarial Hardening.
                                    </p>
                                </div>
                            </div>

                            {/* SHAP Feature Attributions */}
                            <div className="p-4 rounded-2xl bg-slate-950/80 border border-border space-y-2.5">
                                <span className="text-xs font-mono font-bold text-white flex items-center gap-1.5">
                                    <span>📊</span> Explainability: Top SHAP Feature Drivers:
                                </span>

                                <div className="space-y-1.5">
                                    {defenseVerdict.shapFactors.map((f, idx) => (
                                        <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900 text-xs border border-slate-800">
                                            <span className="text-slate-300">{f.feature}</span>
                                            <span className="font-mono font-bold text-rose-400">{f.impact}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── BOTTOM SUMMARY: EXECUTIVE ROI & METRICS BAR ── */}
            <div className="p-6 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-surface to-cyan-950/40 border-2 border-emerald-500/50 shadow-xl grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase">Baseline Recall</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-rose-400 mt-1">18.2%</p>
                    <span className="text-[10px] text-text-muted">High Evasion</span>
                </div>
                <div>
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase">Augmented Recall</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-400 mt-1">79.4%</p>
                    <span className="text-[10px] text-emerald-400 font-bold">+61.2% Recovery</span>
                </div>
                <div>
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase">Monthly Saved</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-white mt-1">$745,000</p>
                    <span className="text-[10px] text-text-muted">Fraud Prevented</span>
                </div>
                <div>
                    <span className="text-[11px] font-mono font-bold text-text-muted uppercase">Legitimate Friction</span>
                    <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-300 mt-1">0.00%</p>
                    <span className="text-[10px] text-text-muted">False Positive Stable</span>
                </div>
            </div>
        </div>
    )
}
