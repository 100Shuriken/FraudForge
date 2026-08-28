import { useState } from 'react'
import { useLocation, Link } from 'react-router-dom'
import { NAVIGATION_STAGES } from '../App.jsx'

const STAGE_GUIDES = {
    '/': {
        title: 'Stage 01: Mission Briefing (Start Here)',
        goal: 'Understand the big picture: generative AI enables attackers to create novel, hyper-realistic fraud that evades traditional static bank rules.',
        action: 'Click "⚡ Start Guided 3-Minute Tour" or click "Next: Identify Vectors →" below.',
        nextUrl: '/identify',
        nextLabel: 'Identify Attack Vectors',
        icon: '🚀',
        color: 'emerald',
    },
    '/identify': {
        title: 'Stage 02: Identify Attack Vectors',
        goal: 'Explore the 8 new ways cybercriminals use Generative AI (voice cloning, deepfakes, LLM phishing, synthetic IDs).',
        action: 'Click on any card below (e.g. "Voice Cloning") to select it, then click "⚡ Simulate →".',
        nextUrl: '/generate',
        nextLabel: 'Generate Attack Scenario',
        icon: '🎯',
        color: 'indigo',
    },
    '/generate': {
        title: 'Stage 03: Generate Scenario & Payment Artifacts',
        goal: 'Generate realistic synthetic attack payloads (urgent CEO emails, synthetic voice transcripts, payment amounts).',
        action: 'Pick "Single Vector", "Chained Attack", or "You Be the Attacker", then click the bright "⚡ Generate Attack" button.',
        nextUrl: '/ai-defense-lab',
        nextLabel: 'AI Defense Lab',
        icon: '⚡',
        color: 'purple',
    },
    '/ai-defense-lab': {
        title: 'Stage 04: AI Defense Lab (Red vs Blue)',
        goal: 'Inspect offline red-team candidate generation, shadow scoring, and multi-hop mule ring graph embeddings.',
        action: 'Click "Plan Offline Red-Team Candidates" to simulate how attackers find evasion holes.',
        nextUrl: '/adapt',
        nextLabel: 'Adapt & Evasion',
        icon: '🔬',
        color: 'rose',
    },
    '/adapt': {
        title: 'Stage 05: Adapt Evasion (The Secret Sauce)',
        goal: 'Analyze transactions that slipped past the baseline detector and synthesize harder evasion batches to teach the model.',
        action: 'Review the false-negative transactions and click "Generate Harder Batch".',
        nextUrl: '/defend',
        nextLabel: 'Defender Models',
        icon: '🔄',
        color: 'amber',
    },
    '/defend': {
        title: 'Stage 06: Defender ML Models & Scorer',
        goal: 'Compare 3 machine learning models side-by-side to see how adversarial retraining recovers recall from 18% to 79%.',
        action: 'Scroll down to the "Try It Yourself" slider box and test custom amounts and velocities, or click "Train Models".',
        nextUrl: '/reality-check',
        nextLabel: 'Reality Check',
        icon: '🛡️',
        color: 'emerald',
    },
    '/reality-check': {
        title: 'Stage 07: Reality Check (Base Rate Math)',
        goal: 'Learn why extreme class imbalance (only 1 fraud in 1,000 transactions) causes high false alarm queues in real banks.',
        action: 'Slide the "Real-World Fraud Prevalence" slider to see daily alerts and analyst workload change in real-time.',
        nextUrl: '/evidence',
        nextLabel: 'Evidence Register',
        icon: '⚖️',
        color: 'sky',
    },
    '/evidence': {
        title: 'Stage 08: Evidence & Regulatory Compliance',
        goal: 'Audit experimental claims, compare academic benchmarks (PaySim, IEEE-CIS), and verify RBI/PCI-DSS/FinCEN compliance.',
        action: 'Review the traceability audit table, check the compliance matrix, or click the Swagger API docs link.',
        nextUrl: '/live-benchmark',
        nextLabel: 'Live Benchmark',
        icon: '📋',
        color: 'cyan',
    },
    '/live-benchmark': {
        title: 'Stage 09: Live Benchmark & API Playground',
        goal: 'Run a live on-demand single-seed benchmark and execute live REST API queries against the production ML endpoint.',
        action: 'Click "Run Live Benchmark" or click "⚡ Send Live Test Payload" in the Developer Playground.',
        nextUrl: '/methodology',
        nextLabel: 'Research Methodology',
        icon: '⏱️',
        color: 'indigo',
    },
    '/methodology': {
        title: 'Stage 10: Research Methodology & Governance',
        goal: 'Review our closed-loop experimental design, research safety guardrails, and null-hypothesis testing.',
        action: 'Read through the governance principles and check out the live OpenAPI reference.',
        nextUrl: '/replay',
        nextLabel: 'Full Attack Replay',
        icon: '📐',
        color: 'purple',
    },
    '/replay': {
        title: 'Stage 11: Full Attack Replay (Grand Finale)',
        goal: 'Watch a complete 4-step live incident: Persona Profile → Scam Message → Anomalous Payment → AI Defender Verdict.',
        action: 'Click the glowing "▶ Run Full Attack Simulation" button and watch the 4 sequential steps animate!',
        nextUrl: '/',
        nextLabel: 'Back to Mission Briefing',
        icon: '🎬',
        color: 'rose',
    },
}

export default function GuidedTourBanner({ enabled = true }) {
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(false)
    const guide = STAGE_GUIDES[location.pathname] || STAGE_GUIDES['/']

    if (!enabled) return null

    return (
        <div className="mb-6 rounded-2xl border-2 border-indigo-500/40 bg-gradient-to-r from-indigo-950/70 via-slate-900/90 to-purple-950/70 p-4 sm:p-5 shadow-xl backdrop-blur-md transition-all">
            <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-500/20 text-xl border border-indigo-500/40 shadow-inner">
                        {guide.icon}
                    </span>
                    <div>
                        <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-extrabold uppercase tracking-wider bg-indigo-500 text-slate-950">
                                🧭 BEGINNER GUIDE
                            </span>
                            <h3 className="text-sm font-extrabold text-white">
                                {guide.title}
                            </h3>
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        type="button"
                        onClick={() => setCollapsed(!collapsed)}
                        className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-slate-800/80 border border-white/10 hover:border-indigo-400 transition-all cursor-pointer"
                    >
                        {collapsed ? '👁️ Show Guide' : '✕ Minimize'}
                    </button>
                </div>
            </div>

            {!collapsed && (
                <div className="mt-3.5 pt-3.5 border-t border-indigo-500/20 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                    <div className="md:col-span-8 space-y-2 text-xs">
                        <div className="flex items-start gap-2">
                            <strong className="text-indigo-300 shrink-0 font-semibold">🎯 Purpose:</strong>
                            <span className="text-slate-200 leading-relaxed">{guide.goal}</span>
                        </div>
                        <div className="flex items-start gap-2">
                            <strong className="text-amber-300 shrink-0 font-semibold">👉 What to Click:</strong>
                            <span className="text-amber-100 font-medium leading-relaxed">{guide.action}</span>
                        </div>
                    </div>

                    <div className="md:col-span-4 flex justify-end">
                        <Link
                            to={guide.nextUrl}
                            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white font-bold text-xs shadow-lg transition-all cursor-pointer text-center"
                        >
                            <span>Next: {guide.nextLabel}</span>
                            <span>→</span>
                        </Link>
                    </div>
                </div>
            )}
        </div>
    )
}
