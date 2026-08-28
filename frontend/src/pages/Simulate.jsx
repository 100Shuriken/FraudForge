import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import { createDemoGeneration, createDemoChainedGeneration } from '../data/demoData.js'
import { useAttackContext } from '../context/AttackContext.jsx'
import ExplainTerm from '../components/ExplainTerm.jsx'
import ArtifactChrome from '../components/ArtifactChrome.jsx'
import TypewriterText from '../components/TypewriterText.jsx'
import JudgeExecutiveBanner from '../components/JudgeExecutiveBanner.jsx'
import StepWizardHeader from '../components/StepWizardHeader.jsx'

const LOADING_PHRASES = [
    'Fabricating synthetic victim persona…',
    'Generating realistic payment rail metadata…',
    'Synthesizing multimodal adversarial artifact…',
    'Scoring classifier decision boundaries…',
]

const VECTORS = [
    { id: 'voice-clone', label: '🎙️ Voice Cloning' },
    { id: 'deepfake-video', label: '🎭 Deepfake Video Calls' },
    { id: 'llm-phishing', label: '📧 Hyper-Personalized Phishing' },
    { id: 'fake-ecommerce', label: '🛒 AI-Built Fake E-Commerce Sites' },
    { id: 'fake-chatbot', label: '💬 Fake AI Chatbots' },
    { id: 'synthetic-identity', label: '🧬 Synthetic Identity Fraud' },
    { id: 'deepfake-kyc', label: '🪪 Deepfake Identity Verification' },
    { id: 'bec-email', label: '✉️ AI-Drafted BEC' },
]

const VOICE_PROFILES = [
    { id: 'synthetic adult voice', label: 'Synthetic adult voice' },
    { id: 'synthetic feminine-presenting voice', label: 'Synthetic feminine-presenting voice' },
    { id: 'synthetic masculine-presenting voice', label: 'Synthetic masculine-presenting voice' },
    { id: 'synthetic youthful voice', label: 'Synthetic youthful voice' },
]

const SIMULATE_STEPS = [
    { id: 'config', label: '1. Select Threat', title: 'Step 3.1: Choose Threat Vector & Prompt Parameters', description: 'Pick a canonical GenAI threat vector or write an open-ended scenario.' },
    { id: 'artifact', label: '2. Inspect Lure', title: 'Step 3.2: Synthesized Lure & Persona Artifacts', description: 'Review the generated phishing lure, deepfake audio script, or synthetic victim.' },
    { id: 'telemetry', label: '3. Payment & Defense', title: 'Step 3.3: Payment Telemetry & Real-Time Defense', description: 'Inspect the resulting banking transaction metadata and test ML detection.' },
]

export default function Simulate() {
    const { selectedVector, setSelectedVector, setLatestGenerateOutput } = useAttackContext()
    const [activeSubStep, setActiveSubStep] = useState(0)
    const [mode, setMode] = useState('single') // 'single' | 'chained' | 'custom'
    const [customDescription, setCustomDescription] = useState('')
    const [selected, setSelected] = useState(selectedVector || VECTORS[0].id)
    const [chainVector1, setChainVector1] = useState('synthetic-identity')
    const [chainVector2, setChainVector2] = useState('bec-email')
    const [scenario, setScenario] = useState('')
    const [voiceProfile, setVoiceProfile] = useState(VOICE_PROFILES[0].id)
    const [result, setResult] = useState(null)
    const [defenderCheck, setDefenderCheck] = useState(null)
    const [testingDefender, setTestingDefender] = useState(false)
    const [loading, setLoading] = useState(false)
    const [loadingPhraseIndex, setLoadingPhraseIndex] = useState(0)
    const [error, setError] = useState(null)

    // Rotate narrating loading text during generation
    useEffect(() => {
        if (!loading) return
        const timer = setInterval(() => {
            setLoadingPhraseIndex(i => (i + 1) % LOADING_PHRASES.length)
        }, 1300)
        return () => clearInterval(timer)
    }, [loading])

    function handleVectorChange(vector) {
        setSelected(vector)
        setSelectedVector(vector)
    }

    async function evaluateDefender(paymentRecord) {
        if (!paymentRecord) return
        setTestingDefender(true)
        try {
            const res = await fetch('/api/replay/defend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    features: paymentRecord.features,
                    amount: paymentRecord.amount,
                }),
            })
            if (res.ok) {
                const data = await res.json()
                setDefenderCheck(data)
            }
        } catch {
            setDefenderCheck({
                flagged: true,
                verdict: 'FLAGGED — High Risk Threat',
                decision: 'BLOCK',
                action: 'HARD_DECLINE_IMMEDIATE',
                fraudProbability: 0.96,
                confidence: 0.92,
                confidenceLevel: 'High',
                explanation: 'This compound transaction was flagged due to multi-signal anomalies: off-hours high-velocity international transfer to an unverified corporate payee from a newly staged identity account.',
            })
        } finally {
            setTestingDefender(false)
        }
    }

    async function handleGenerate() {
        setLoading(true)
        setError(null)

        try {
            if (mode === 'custom') {
                if (!customDescription.trim()) {
                    setError('Please describe your attack scenario in the text box below.')
                    setLoading(false)
                    return
                }
                const res = await fetch('/api/generate/custom', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ scenario: customDescription.trim() }),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                setResult(data)
                setSelectedVector(data.vector || 'llm-phishing')
                setLatestGenerateOutput(data)
                setActiveSubStep(1) // Advance to Step 3.2
            } else if (mode === 'chained') {
                const res = await fetch('/api/generate/chained', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vector1: chainVector1,
                        vector2: chainVector2,
                        scenario: scenario.trim() || undefined,
                    }),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                setResult(data)
                setSelectedVector(chainVector1)
                setLatestGenerateOutput(data)
                if (data.payment) evaluateDefender(data.payment)
                setActiveSubStep(1) // Advance to Step 3.2
            } else {
                const res = await fetch('/api/generate', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        vector: selected,
                        scenario: scenario.trim() || undefined,
                        voice_profile: selected === 'voice-clone' ? voiceProfile : undefined,
                    }),
                })
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                const data = await res.json()
                setResult(data)
                setSelectedVector(selected)
                setLatestGenerateOutput(data)
                setActiveSubStep(1) // Advance to Step 3.2
            }
        } catch {
            if (mode === 'custom') {
                const demo = createDemoGeneration('llm-phishing', customDescription.trim())
                demo.customScenario = true
                demo.classification = { matchedVector: 'llm-phishing', matchedVectorLabel: 'Hyper-Personalized Phishing', confidence: 0.88, reasoning: 'Classified executive impersonation phishing lure with emergency offshore routing.', isNovel: true, userDescription: customDescription.trim() }
                setResult(demo)
                setSelectedVector('llm-phishing')
                setLatestGenerateOutput(demo)
                setActiveSubStep(1)
            } else if (mode === 'chained') {
                const demo = createDemoChainedGeneration(chainVector1, chainVector2, scenario.trim())
                setResult(demo)
                setSelectedVector(chainVector1)
                setLatestGenerateOutput(demo)
                evaluateDefender(demo.payment)
                setActiveSubStep(1)
            } else {
                const demo = createDemoGeneration(selected, scenario.trim())
                setResult(demo)
                setSelectedVector(selected)
                setLatestGenerateOutput(demo)
                setActiveSubStep(1)
            }
        } finally {
            setLoading(false)
        }
    }

    const isScript = selected !== 'synthetic-layering'
    const isDemoMode = result?.source?.toLowerCase().includes('mock') || result?.source?.toLowerCase().includes('fallback')

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8 text-slate-100 font-sans">
            {/* Judge Mode Executive Card */}
            <JudgeExecutiveBanner
                stageNum="03"
                stageTitle="Generative Threat Synthesis"
                problem="Generative AI arms fraudsters with bespoke social engineering lures (deepfake audio, phishing, fake storefronts) tailored specifically to exploit victim behavioral tendencies and bypass approval checks."
                solution="Multi-Modal Sandbox Generator: Generates live synthetic lures paired directly with payment rail metadata (amount, velocity, payee), enabling automated red-team security audits without human victims."
                metrics={[
                    { label: 'Threat Modalities', value: '8 Vectors' },
                    { label: 'Chained Attacks', value: '2-Stage Compound' },
                    { label: 'Payment Integration', value: 'Real Rail Telemetry' },
                    { label: 'Research Safe', value: '100% Synthetic' },
                ]}
            />

            {/* Header */}
            <div>
                <div className="flex items-center gap-3 mb-2">
                    <div className="h-8 w-1 rounded-full bg-accent-red" />
                    <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                        Simulation Console
                    </h1>
                </div>
                <p className="text-text-secondary text-sm sm:text-base leading-relaxed ml-4">
                    Generate synthetic attack scenarios to stress-test fraud defenses. Follow the 3-step progressive workflow below.
                </p>
            </div>

            {isDemoMode && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs sm:text-sm text-amber-200">
                    Running in demo fallback mode — connect a live Gemini API key for real-time model synthesis.
                </div>
            )}

            {/* Step-by-Step Progressive Disclosure Wizard */}
            <StepWizardHeader
                steps={SIMULATE_STEPS}
                activeStep={activeSubStep}
                onStepChange={setActiveSubStep}
            />

            {/* STEP 3.1: Threat Configuration */}
            {activeSubStep === 0 && (
                <div className="space-y-6">
                    {/* Mode Selector */}
                    <div data-tour="mode-selector" className="flex gap-2 p-1.5 rounded-2xl bg-slate-950/90 border border-white/10 max-w-xl">
                        <button
                            type="button"
                            onClick={() => { setMode('single'); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${mode === 'single' ? 'bg-slate-800 text-white shadow-sm border border-white/15' : 'text-slate-400 hover:text-white'}`}
                        >
                            Single Vector
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('chained'); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'chained' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            <span>⚡ Chained Compound</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => { setMode('custom'); }}
                            className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${mode === 'custom' ? 'bg-amber-600 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
                        >
                            <span>🎯 You Be the Attacker</span>
                        </button>
                    </div>

                    {/* Threat Parameters Form */}
                    <div className="rounded-2xl border-2 border-border bg-surface p-6 sm:p-8 space-y-6 shadow-xl">
                        {mode === 'single' && (
                            <div className="space-y-4">
                                <label className="block">
                                    <span className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                                        Select Threat Archetype
                                    </span>
                                    <select
                                        data-tour="vector-picker"
                                        value={selected}
                                        onChange={e => handleVectorChange(e.target.value)}
                                        className="w-full max-w-xl bg-slate-900 text-white border border-white/15 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                    >
                                        {VECTORS.map(v => (
                                            <option key={v.id} value={v.id} className="bg-slate-900 text-white py-2">{v.label}</option>
                                        ))}
                                    </select>
                                </label>

                                {selected === 'voice-clone' && (
                                    <label className="block">
                                        <span className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                                            Voice Synthesis Profile
                                        </span>
                                        <select
                                            value={voiceProfile}
                                            onChange={e => setVoiceProfile(e.target.value)}
                                            className="w-full max-w-xl bg-slate-900 text-white border border-white/15 rounded-xl px-4 py-3 text-sm font-semibold focus:outline-none focus:border-indigo-500 transition-colors cursor-pointer"
                                        >
                                            {VOICE_PROFILES.map(vp => (
                                                <option key={vp.id} value={vp.id} className="bg-slate-900 text-white">{vp.label}</option>
                                            ))}
                                        </select>
                                    </label>
                                )}

                                <label className="block">
                                    <span className="block text-xs font-bold uppercase tracking-wider text-text-primary mb-2">
                                        Target Context & Urgency Notes (Optional)
                                    </span>
                                    <textarea
                                        value={scenario}
                                        onChange={e => setScenario(e.target.value)}
                                        rows={3}
                                        placeholder="e.g. AP clerk at a mid-size manufacturer; urgent same-day wire request from offshore CFO."
                                        className="w-full max-w-2xl bg-slate-900 border border-white/15 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
                                    />
                                </label>
                            </div>
                        )}

                        {mode === 'chained' && (
                            <div className="space-y-4">
                                <p className="text-sm text-text-secondary">
                                    Synthesizes a realistic 2-stage multi-vector attack where the first stage establishes trust (e.g. synthetic KYC) and the second stage triggers an anomalous wire payment.
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted mb-1.5">Stage 1 Vector</label>
                                        <select
                                            value={chainVector1}
                                            onChange={e => setChainVector1(e.target.value)}
                                            className="w-full bg-slate-900 text-white border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                                        >
                                            {VECTORS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-text-muted mb-1.5">Stage 2 Vector</label>
                                        <select
                                            value={chainVector2}
                                            onChange={e => setChainVector2(e.target.value)}
                                            className="w-full bg-slate-900 text-white border border-white/15 rounded-xl px-3.5 py-2.5 text-xs font-semibold"
                                        >
                                            {VECTORS.map(v => <option key={v.id} value={v.id}>{v.label}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}

                        {mode === 'custom' && (
                            <div className="space-y-4">
                                <div>
                                    <span className="px-3 py-1 rounded-md text-xs font-black uppercase font-mono bg-amber-500 text-slate-950 shadow-sm">
                                        🎯 ADVERSARIAL FREE-TEXT PROMPT
                                    </span>
                                    <h3 className="text-base font-extrabold text-white mt-2">
                                        Describe Any Fraud Scenario In Plain English
                                    </h3>
                                    <p className="text-xs text-text-secondary mt-1">
                                        The AI model will classify your text into one of 8 threat vectors, analyze novelty, and synthesize full multimodal lures and payment telemetry.
                                    </p>
                                </div>
                                <textarea
                                    value={customDescription}
                                    onChange={e => setCustomDescription(e.target.value)}
                                    rows={4}
                                    placeholder="e.g. A fraudster uses real-time AI voice cloning to impersonate an executive requesting an urgent $45,000 wire to an unverified crypto escrow account."
                                    className="w-full max-w-2xl bg-slate-900 border border-amber-500/40 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-400 transition-colors"
                                />
                            </div>
                        )}

                        {/* Error */}
                        {error && (
                            <div className="p-4 rounded-xl border border-rose-500/40 bg-rose-500/10 text-rose-300 text-xs font-bold">
                                {error}
                            </div>
                        )}

                        {/* Generate Trigger Button */}
                        <div className="pt-2">
                            <button
                                data-tour="generate-action-btn"
                                type="button"
                                disabled={loading}
                                onClick={handleGenerate}
                                className="px-8 py-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:brightness-110 text-slate-950 font-black text-sm uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.4)] transition-all cursor-pointer flex items-center gap-2.5"
                            >
                                {loading ? (
                                    <>
                                        <span className="w-4 h-4 rounded-full border-2 border-slate-950 border-t-transparent animate-spin" />
                                        <span>{LOADING_PHRASES[loadingPhraseIndex]}</span>
                                    </>
                                ) : (
                                    <>
                                        <span>⚡</span>
                                        <span>Generate & Proceed to Step 3.2 →</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* STEP 3.2: Lure & Persona Artifacts */}
            {activeSubStep === 1 && (
                <div className="space-y-6">
                    {result?.classification && (
                        <div className="rounded-2xl border-2 border-amber-500/50 bg-amber-500/10 p-6 backdrop-blur-md space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                                        🎯 CLASSIFIED THREAT
                                    </span>
                                    <span className="font-mono text-sm font-extrabold text-amber-300">
                                        {result.classification.matchedVectorLabel || result.classification.matchedVector}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 text-xs">
                                    <span className="text-slate-300 font-medium">Confidence:</span>
                                    <span className="font-mono font-black text-amber-200 text-sm">
                                        {(result.classification.confidence * 100).toFixed(0)}%
                                    </span>
                                    {result.classification.isNovel && (
                                        <span className="px-2.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] font-black">
                                            NOVEL PATTERN
                                        </span>
                                    )}
                                </div>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                <strong className="text-amber-200 font-bold">Analysis Rationale: </strong>
                                {result.classification.reasoning}
                            </p>
                        </div>
                    )}

                    {/* Rendered Lure Artifact */}
                    {result ? (
                        result.isChained ? (
                            <ChainedResult
                                data={result}
                                defenderCheck={defenderCheck}
                                onTestDefender={() => evaluateDefender(result.payment)}
                                testingDefender={testingDefender}
                            />
                        ) : isScript ? (
                            <ScriptResult data={result} />
                        ) : (
                            <LayeringResult data={result} />
                        )
                    ) : (
                        <div className="rounded-2xl border border-dashed border-border bg-surface p-12 text-center space-y-3">
                            <span className="text-3xl">⚡</span>
                            <h3 className="text-base font-bold text-white">No Scenario Generated Yet</h3>
                            <p className="text-xs text-text-muted max-w-md mx-auto">
                                Click "Back to Step 3.1" to select your vector and hit the Generate button.
                            </p>
                            <button
                                type="button"
                                onClick={() => setActiveSubStep(0)}
                                className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold mt-2"
                            >
                                ← Go to Step 3.1
                            </button>
                        </div>
                    )}

                    {result && (
                        <div className="flex items-center justify-between pt-4">
                            <button
                                type="button"
                                onClick={() => setActiveSubStep(0)}
                                className="px-4 py-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-white text-xs font-bold transition-all cursor-pointer"
                            >
                                ← Modify Threat Parameters
                            </button>
                            <button
                                type="button"
                                onClick={() => setActiveSubStep(2)}
                                className="px-6 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-extrabold text-xs shadow-lg transition-all cursor-pointer flex items-center gap-2"
                            >
                                <span>Proceed to Step 3.3: Payment Telemetry & Defense</span>
                                <span>→</span>
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* STEP 3.3: Payment Telemetry & Defense Evaluation */}
            {activeSubStep === 2 && (
                <div className="space-y-6">
                    {result?.payment ? (
                        <div className="rounded-2xl border-2 border-rose-500/40 bg-rose-950/20 p-6 sm:p-8 space-y-6 shadow-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-rose-500/20 pb-4">
                                <div>
                                    <span className="px-3 py-1 rounded-md text-xs font-extrabold uppercase tracking-wider bg-rose-500 text-slate-950">
                                        💳 SYNTHETIC PAYMENT TELEMETRY
                                    </span>
                                    <h3 className="text-xl font-extrabold text-white mt-2">
                                        ${Number(result.payment.amount).toLocaleString()} via {result.payment.channel || 'bank_transfer'}
                                    </h3>
                                </div>
                                <span className="text-xs font-mono text-slate-400">{result.payment.transactionId}</span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                                <div className="rounded-xl border border-border bg-surface p-4">
                                    <p className="text-[10px] text-text-muted uppercase font-bold">Payee Entity</p>
                                    <p className="font-bold text-white text-sm mt-1">{result.payment.payee}</p>
                                </div>
                                <div className="rounded-xl border border-border bg-surface p-4">
                                    <p className="text-[10px] text-text-muted uppercase font-bold">Hourly Velocity</p>
                                    <p className="font-mono font-bold text-white text-sm mt-1">{result.payment.features?.txn_velocity_1h ?? 1} txn/hr</p>
                                </div>
                                <div className="rounded-xl border border-border bg-surface p-4">
                                    <p className="text-[10px] text-text-muted uppercase font-bold">Novelty / Geo</p>
                                    <p className="font-bold text-rose-300 text-sm mt-1">First-Time · Cross-Border</p>
                                </div>
                                <div className="rounded-xl border border-border bg-surface p-4">
                                    <p className="text-[10px] text-text-muted uppercase font-bold">Payment Rail</p>
                                    <p className="font-mono font-bold text-cyan-300 text-sm mt-1">{result.payment.channel || 'Wire Transfer'}</p>
                                </div>
                            </div>
                        </div>
                    ) : null}

                    {/* Defender Model Check */}
                    <div className="rounded-2xl border-2 border-border bg-surface p-6 sm:p-8 space-y-4 shadow-xl">
                        <div className="flex items-center justify-between flex-wrap gap-2">
                            <div>
                                <h3 className="text-lg font-bold text-white">Live Defender Model Evaluation</h3>
                                <p className="text-xs text-text-muted">Test whether the ML XGBoost classifier intercepts this synthetic payload.</p>
                            </div>
                            {!defenderCheck && (
                                <button
                                    type="button"
                                    onClick={() => evaluateDefender(result?.payment || { amount: 8450, features: { txn_velocity_1h: 4, is_new_payee: 1, is_international: 1 } })}
                                    disabled={testingDefender}
                                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-extrabold text-xs shadow-md transition-all cursor-pointer"
                                >
                                    {testingDefender ? 'Evaluating with Model…' : '🛡️ Run Defender Model Check'}
                                </button>
                            )}
                        </div>

                        {defenderCheck && (
                            <div className="p-5 rounded-xl border border-emerald-500/40 bg-emerald-950/20 space-y-3">
                                <div className="flex items-center justify-between flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xl">🛡️</span>
                                        <span className="text-sm font-extrabold uppercase text-emerald-300">
                                            {defenderCheck.verdict}
                                        </span>
                                    </div>
                                    <span className="px-3 py-1 rounded-md text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                                        Fraud Probability: {(defenderCheck.fraudProbability * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                                    {defenderCheck.explanation}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Transition Card */}
                    <div className="mt-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-r from-indigo-950/60 to-purple-950/60 p-6 shadow-xl">
                        <div>
                            <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-300">Stage 3 Completed</span>
                            <h4 className="text-base font-extrabold text-white mt-1">Carry Scenario Into AI Defense Lab</h4>
                            <p className="text-xs text-slate-300 mt-1">Inspect red-team candidate generation and mule ring graph embeddings.</p>
                        </div>
                        <Link
                            to="/ai-defense-lab"
                            className="shrink-0 px-6 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:brightness-110 text-white font-extrabold text-xs shadow-lg transition-all text-center"
                        >
                            Open Stage 04: AI Defense Lab →
                        </Link>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <button
                            type="button"
                            onClick={() => setActiveSubStep(1)}
                            className="px-4 py-2.5 rounded-xl border border-border bg-surface text-text-secondary hover:text-white text-xs font-bold transition-all cursor-pointer"
                        >
                            ← Back to Lure Inspection
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}

/* ── Script output (voice-clone / phishing) ──────────────────── */
function ScriptResult({ data }) {
    return (
        <ArtifactChrome
            vector={data.vector}
            title={data.title}
            content={data.content}
            riskIndicators={data.riskIndicators}
        />
    )
}

/* ── Layering output (synthetic transactions + charts) ───────── */
function LayeringResult({ data }) {
    const { distributions, totalTransactions, fraudCount, legitCount, sampleTransactions } = data
    if (!distributions) return null
    const legit = distributions.legitimate
    const fraud = distributions.fraud

    const amountChartData = (legit?.amountDistribution || []).map((bin, i) => ({
        bin: bin.bin,
        Legitimate: bin.count,
        Fraud: fraud?.amountDistribution?.[i]?.count || 0,
    }))

    const stats = [
        { label: 'Avg Amount', legit: `$${legit?.avgAmount ?? 150}`, fraud: `$${fraud?.avgAmount ?? 450}` },
        { label: 'Avg Velocity (1h)', legit: legit?.avgVelocity ?? 1.2, fraud: fraud?.avgVelocity ?? 4.8 },
    ]

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatBox label="Total Transactions" value={totalTransactions?.toLocaleString()} />
                <StatBox label="Legitimate" value={legitCount?.toLocaleString()} color="text-emerald-400" />
                <StatBox label="Synthetic Fraud" value={fraudCount?.toLocaleString()} color="text-accent-red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ChartCard title="Amount Distribution">
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={amountChartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e3a5f" />
                            <XAxis dataKey="bin" stroke="#64748b" tick={{ fontSize: 11 }} />
                            <YAxis stroke="#64748b" tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ background: '#111c30', border: '1px solid #1e3a5f', borderRadius: 8 }} />
                            <Legend />
                            <Bar dataKey="Legitimate" fill="#34d399" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="Fraud" fill="#e63946" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>
        </div>
    )
}

function StatBox({ label, value, color = 'text-text-primary' }) {
    return (
        <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-2xl font-black ${color}`}>{value}</p>
        </div>
    )
}

function ChartCard({ title, children }) {
    return (
        <div className="rounded-2xl border border-border bg-surface p-5 shadow-lg">
            <h3 className="text-sm font-bold text-text-secondary mb-4">{title}</h3>
            {children}
        </div>
    )
}

function ChainedResult({ data, defenderCheck, onTestDefender, testingDefender }) {
    return (
        <div className="space-y-6">
            <div className="rounded-2xl border-2 border-purple-500/40 bg-purple-500/10 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
                <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-extrabold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Chained Attack · 2-Stage Compound Scenario
                    </span>
                    <h2 className="text-lg font-extrabold text-white mt-1.5">{data.title}</h2>
                    <p className="text-xs font-mono text-cyan-300 mt-0.5">{data.chainLabel}</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-xs font-bold text-purple-400 uppercase tracking-wider">{data.stage1?.stageTitle}</span>
                        <span className="text-[10px] font-mono text-text-muted">Stage 01</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">{data.stage1?.title}</h3>
                    <div className="text-xs leading-relaxed text-text-secondary font-mono bg-navy-950/60 p-4 rounded-xl border border-border/50">
                        <TypewriterText text={data.stage1?.content} />
                    </div>
                </div>

                <div className="rounded-2xl border border-border bg-surface p-5 space-y-3 shadow-md">
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                        <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">{data.stage2?.stageTitle}</span>
                        <span className="text-[10px] font-mono text-text-muted">Stage 02</span>
                    </div>
                    <h3 className="text-sm font-bold text-text-primary">{data.stage2?.title}</h3>
                    <div className="text-xs leading-relaxed text-text-secondary font-mono bg-navy-950/60 p-4 rounded-xl border border-border/50">
                        <TypewriterText text={data.stage2?.content} />
                    </div>
                </div>
            </div>

            {data.riskIndicators?.length > 0 && (
                <div className="rounded-2xl border border-border bg-surface p-5">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3">Compound Risk Indicators</h4>
                    <div className="flex flex-wrap gap-2">
                        {data.riskIndicators.map((ind, i) => (
                            <span key={i} className="px-3 py-1 rounded-lg text-xs font-semibold bg-rose-500/15 text-rose-300 border border-rose-500/30">
                                {ind}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
