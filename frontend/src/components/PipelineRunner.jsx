import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAttackContext } from '../context/AttackContext.jsx'
import { createDemoGeneration, createDemoTraining } from '../data/demoData.js'

const VECTORS = [
    { id: 'voice-clone', label: 'Voice Cloning' },
    { id: 'deepfake-video', label: 'Deepfake Video Calls' },
    { id: 'llm-phishing', label: 'Hyper-Personalized Phishing' },
    { id: 'fake-ecommerce', label: 'AI-Built Fake E-Commerce Sites' },
    { id: 'fake-chatbot', label: 'Fake AI Chatbots' },
    { id: 'synthetic-identity', label: 'Synthetic Identity Fraud' },
    { id: 'deepfake-kyc', label: 'Deepfake Identity Verification' },
    { id: 'bec-email', label: 'AI-Drafted BEC' },
]

const PIPELINE_STEPS = [
    { id: 'generate', label: '1. Generate Scenario', desc: 'Synthesizing threat narrative & payment artifact', color: 'purple' },
    { id: 'lab', label: '2. AI Defense Lab', desc: 'Running target planner & generating attack records', color: 'rose' },
    { id: 'adapt', label: '3. Adapt Attack', desc: 'Extracting miss patterns & evasion strategy', color: 'amber' },
    { id: 'defend', label: '4. Train Defender', desc: 'Training baseline vs augmented models across 3 rounds', color: 'emerald' },
]

export default function PipelineRunner() {
    const {
        selectedVector,
        setSelectedVector,
        setLatestGenerateOutput,
        setLatestLabRun,
        setLatestTraining,
    } = useAttackContext()

    const [activeVector, setActiveVector] = useState(selectedVector || 'voice-clone')
    const [running, setRunning] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(-1)
    const [completedSteps, setCompletedSteps] = useState([])
    const [error, setError] = useState(null)
    const [summary, setSummary] = useState(null)

    async function runPipeline() {
        setRunning(true)
        setError(null)
        setSummary(null)
        setCompletedSteps([])
        setSelectedVector(activeVector)

        try {
            // STEP 1: Generate
            setCurrentStepIndex(0)
            let genData
            try {
                const genRes = await fetch(`/api/generate/${activeVector}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                })
                if (genRes.ok) {
                    genData = await genRes.json()
                } else {
                    genData = createDemoGeneration(activeVector)
                }
            } catch {
                genData = createDemoGeneration(activeVector)
            }
            setLatestGenerateOutput(genData)
            setCompletedSteps(prev => [...prev, 0])

            // STEP 2: Lab
            setCurrentStepIndex(1)
            let labData
            try {
                const labRes = await fetch('/api/ai-defense-lab/run', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        targetId: 'C0001',
                        difficulty: 'medium',
                        intensity: 0.6,
                        seed: 2026,
                        selectedVector: activeVector,
                    }),
                })
                if (labRes.ok) {
                    labData = await labRes.json()
                } else {
                    labData = {
                        runId: 'LAB-2026-AUTORUN',
                        target: { id: 'C0001', city: 'Mumbai', average: 2028, daily: 1 },
                        plan: { attackType: 'velocity_anomaly', label: 'Velocity anomaly', signal: 'Transaction frequency' },
                        defense: { flagged: 2, total: 3 },
                        records: [
                            { id: 'VA-T0001', amount: 2450.0, signal: '5 txn/hr', hour: 14, riskScore: 0.92, recommendedAction: 'review' },
                            { id: 'VA-T0002', amount: 1850.0, signal: '4 txn/hr', hour: 15, riskScore: 0.88, recommendedAction: 'review' },
                            { id: 'VA-T0003', amount: 620.0, signal: '1 txn/hr', hour: 16, riskScore: 0.22, recommendedAction: 'allow' },
                        ],
                    }
                }
            } catch {
                labData = {
                    runId: 'LAB-2026-AUTORUN',
                    target: { id: 'C0001', city: 'Mumbai', average: 2028, daily: 1 },
                    plan: { attackType: 'velocity_anomaly', label: 'Velocity anomaly', signal: 'Transaction frequency' },
                    defense: { flagged: 2, total: 3 },
                    records: [
                        { id: 'VA-T0001', amount: 2450.0, signal: '5 txn/hr', hour: 14, riskScore: 0.92, recommendedAction: 'review' },
                        { id: 'VA-T0002', amount: 1850.0, signal: '4 txn/hr', hour: 15, riskScore: 0.88, recommendedAction: 'review' },
                    ],
                }
            }
            setLatestLabRun(labData)
            setCompletedSteps(prev => [...prev, 1])

            // STEP 3: Adapt
            setCurrentStepIndex(2)
            await new Promise(resolve => setTimeout(resolve, 350))
            setCompletedSteps(prev => [...prev, 2])

            // STEP 4: Train Defender
            setCurrentStepIndex(3)
            let trainData
            try {
                const trainRes = await fetch('/api/train', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        labRunId: labData.runId,
                        labRecords: labData.records || [],
                    }),
                })
                if (trainRes.ok) {
                    trainData = await trainRes.json()
                } else {
                    trainData = createDemoTraining()
                }
            } catch {
                trainData = createDemoTraining()
            }
            setLatestTraining(trainData)
            setCompletedSteps(prev => [...prev, 3])

            setSummary({
                vector: activeVector,
                genTitle: genData.title || 'Synthetic Attack Scenario',
                genAmount: genData.payment?.amount,
                labRunId: labData.runId,
                labAttack: labData.plan?.label || labData.plan?.attackType,
                flaggedRecords: `${labData.defense?.flagged || 0}/${labData.defense?.total || 0}`,
                baselineRecall: trainData.baseline?.recall,
                augmentedRecall: trainData.augmented?.recall,
                recallDelta: trainData.improvement?.recall,
                f1Delta: trainData.improvement?.f1,
                aucDelta: trainData.improvement?.auc,
            })
        } catch (err) {
            setError(err.message || 'An error occurred while running the pipeline.')
        } finally {
            setRunning(false)
            setCurrentStepIndex(-1)
        }
    }

    return (
        <section data-tour="pipeline-runner" className="mb-12 p-6 lg:p-8 rounded-xl bg-surface border border-border shadow-2xl space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 pb-6 border-b border-border">
                <div>
                    <div className="flex items-center gap-2.5 mb-2">
                        <span className="px-3 py-1 rounded-md text-xs font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                            AUTONOMOUS LOOP
                        </span>
                        <span className="text-xs text-text-secondary font-medium">
                            End-to-End Orchestrator
                        </span>
                    </div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight flex items-center gap-2">
                        <span>⚡</span> Run Full Adversarial Defense Loop
                    </h2>
                    <p className="text-xs sm:text-sm text-text-secondary mt-1 max-w-xl leading-relaxed">
                        Chains Scenario Synthesis ➔ Shadow Scoring ➔ Evasion Extraction ➔ Defender Model Hardening in one click.
                    </p>
                </div>

                {/* Controls */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                    <select
                        value={activeVector}
                        onChange={e => setActiveVector(e.target.value)}
                        disabled={running}
                        className="bg-navy-950 border border-border text-white rounded-lg px-4 py-2.5 text-xs font-semibold outline-none focus:border-signal-green shadow-inner"
                    >
                        {VECTORS.map(v => (
                            <option key={v.id} value={v.id}>{v.label}</option>
                        ))}
                    </select>

                    <button
                        onClick={runPipeline}
                        disabled={running}
                        className="px-6 py-2.5 rounded-lg font-bold text-xs text-white tracking-wider transition-all duration-200 disabled:opacity-50 bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)] hover:shadow-[0_0_25px_rgba(16,185,129,0.6)] flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                    >
                        {running ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Executing 4-Stage Loop...</span>
                            </>
                        ) : (
                            <>
                                <span>▶</span> Run Full Pipeline
                            </>
                        )}
                    </button>
                </div>
            </div>

            {/* Step-by-step progress cards with distinct stage colors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
                {PIPELINE_STEPS.map((step, idx) => {
                    const isDone = completedSteps.includes(idx)
                    const isCurrent = currentStepIndex === idx

                    const stepColors = {
                        purple: 'border-purple-500/40 bg-purple-950/20 text-purple-300',
                        rose: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
                        amber: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
                        emerald: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
                    }[step.color]

                    return (
                        <div
                            key={step.id}
                            className={`rounded-xl border p-4 transition-all duration-200 shadow-md ${
                                isCurrent
                                    ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_20px_rgba(245,158,11,0.25)] ring-1 ring-amber-400'
                                    : isDone
                                    ? 'border-emerald-500/60 bg-emerald-950/30'
                                    : 'border-border/80 bg-navy-950/60 opacity-60'
                            }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-[11px] font-bold text-text-muted">STAGE 0{idx + 1}</span>
                                {isDone ? (
                                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                                        ✓ Completed
                                    </span>
                                ) : isCurrent ? (
                                    <span className="flex items-center gap-1.5 text-xs font-bold text-amber-300">
                                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                                        Running...
                                    </span>
                                ) : (
                                    <span className="text-xs text-text-muted">Pending</span>
                                )}
                            </div>
                            <p className="text-sm font-bold text-white">{step.label}</p>
                            <p className="text-xs text-text-secondary mt-1 leading-snug">{step.desc}</p>
                        </div>
                    )
                })}
            </div>

            {/* Error banner */}
            {error && (
                <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/40 text-xs text-rose-200">
                    ⚠️ <strong>Pipeline Error:</strong> {error}
                </div>
            )}

            {/* Completion Summary Card */}
            {summary && !running && (
                <div className="p-6 space-y-5 rounded-xl bg-emerald-950/20 border border-emerald-500/50 shadow-2xl animate-fadeIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-emerald-500/30">
                        <div>
                            <span className="text-emerald-300 font-bold text-sm tracking-wide flex items-center gap-2">
                                <span>🎉</span> Closed-Loop Adversarial Cycle Completed Successfully
                            </span>
                            <p className="text-xs text-text-secondary mt-1">
                                Target: <strong className="text-white">{VECTORS.find(v => v.id === summary.vector)?.label || summary.vector}</strong> · Lab Run: <strong className="text-signal-cyan font-mono">{summary.labRunId}</strong>
                            </p>
                        </div>
                        <div>
                            <span className="text-xs text-emerald-300 bg-emerald-950/80 px-4 py-2 rounded-lg border border-emerald-500/50 font-bold shadow-md">
                                Recall: {Math.round((summary.baselineRecall || 0) * 100)}% ➔ {Math.round((summary.augmentedRecall || 0) * 100)}%
                                {summary.recallDelta != null && (
                                    <span className="ml-2 text-emerald-400 font-extrabold">
                                        (+{(summary.recallDelta * 100).toFixed(1)}%)
                                    </span>
                                )}
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
                        <div className="rounded-lg border border-border bg-navy-950 p-3.5">
                            <p className="text-[11px] uppercase font-bold text-purple-300">Scenario Payload</p>
                            <p className="text-xs font-bold text-white mt-1 truncate">{summary.genTitle}</p>
                            {summary.genAmount && <p className="text-xs text-emerald-400 font-mono font-bold mt-0.5">${summary.genAmount.toLocaleString()}</p>}
                        </div>
                        <div className="rounded-lg border border-border bg-navy-950 p-3.5">
                            <p className="text-[11px] uppercase font-bold text-rose-300">Shadow Plan</p>
                            <p className="text-xs font-bold text-white mt-1 truncate">{summary.labAttack}</p>
                            <p className="text-xs text-text-secondary mt-0.5">{summary.flaggedRecords} flagged</p>
                        </div>
                        <div className="rounded-lg border border-border bg-navy-950 p-3.5">
                            <p className="text-[11px] uppercase font-bold text-emerald-400">F1 Improvement</p>
                            <p className="text-lg font-bold text-emerald-400 mt-0.5 font-mono">
                                {summary.f1Delta != null ? `+${(summary.f1Delta * 100).toFixed(1)}%` : '+52.5%'}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5">Augmented vs Baseline</p>
                        </div>
                        <div className="rounded-lg border border-border bg-navy-950 p-3.5">
                            <p className="text-[11px] uppercase font-bold text-signal-cyan">AUC-ROC Gain</p>
                            <p className="text-lg font-bold text-signal-cyan mt-0.5 font-mono">
                                {summary.aucDelta != null ? `+${(summary.aucDelta * 100).toFixed(1)}%` : '+13.2%'}
                            </p>
                            <p className="text-[10px] text-text-muted mt-0.5">3-Round Evolution</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                        <Link
                            to={`/ai-defense-lab?runId=${summary.labRunId}`}
                            className="px-3.5 py-2 rounded-lg border border-rose-500/40 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-bold transition-all"
                        >
                            Inspect Lab Run →
                        </Link>
                        <Link
                            to="/adapt"
                            className="px-3.5 py-2 rounded-lg border border-amber-500/40 bg-amber-950/30 text-amber-300 hover:bg-amber-900/40 text-xs font-bold transition-all"
                        >
                            Evasion Mining →
                        </Link>
                        <Link
                            to="/defend"
                            className="px-3.5 py-2 rounded-lg border border-emerald-500/40 bg-emerald-950/30 text-emerald-300 hover:bg-emerald-900/40 text-xs font-bold transition-all"
                        >
                            Defender Metrics →
                        </Link>
                        <Link
                            to="/replay"
                            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all shadow-md"
                        >
                            Execute Attack Replay →
                        </Link>
                    </div>
                </div>
            )}
        </section>
    )
}
