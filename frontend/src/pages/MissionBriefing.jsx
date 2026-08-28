import { NavLink } from 'react-router-dom'
import PipelineRunner from '../components/PipelineRunner.jsx'
import JudgeExecutiveBanner from '../components/JudgeExecutiveBanner.jsx'

export const STAGES = [
    { to: '/', label: 'Mission Command', short: 'Mission', kind: 'current', color: 'emerald', desc: 'Command center & 1-click loop' },
    { to: '/generate', label: 'Attack Studio', short: 'Attacks', kind: 'existing', color: 'indigo', desc: '8 GenAI vectors & payload generator' },
    { to: '/ai-defense-lab', label: 'AI Defense Lab', short: 'Lab', kind: 'existing', color: 'rose', desc: 'Red-team spar, evasions & mule graph' },
    { to: '/defend', label: 'Defender ML & ROI', short: 'Defend', kind: 'existing', color: 'amber', desc: '3-round XGBoost retraining & SHAP' },
]

export default function MissionBriefing() {
    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 lg:py-14 text-slate-100 font-sans">
            {/* ── Hero Header ── */}
            <div data-tour="hero-badge" className="max-w-4xl mb-12">
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                    <span className="px-3 py-1 rounded-md text-xs font-bold tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        MISSION CONTROL · ADVERSARIAL DEFENSE PLATFORM
                    </span>
                    <span className="px-3 py-1 rounded-md text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        Mastercard Innovation Challenge 2026
                    </span>
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white mb-4">
                    AI Payment Fraud <span className="text-signal-green">Defense Command</span>
                </h1>
                <p className="text-base sm:text-lg leading-relaxed text-text-secondary">
                    FraudForge stresses financial fraud defenses against generative red-team attack vectors, extracting evasive transaction signatures to autonomously retrain and harden machine learning classifiers in a closed-loop research pipeline.
                </p>
            </div>

            {/* ── Quick-Start Walkthrough for Beginners & Evaluators ── */}
            <div className="mb-12 rounded-2xl border-2 border-emerald-500/50 bg-gradient-to-br from-emerald-950/40 via-slate-900/90 to-cyan-950/40 p-6 sm:p-8 shadow-2xl backdrop-blur-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-emerald-500/20">
                    <div>
                        <div className="flex items-center gap-2.5 mb-1.5">
                            <span className="px-3 py-1 rounded-md text-xs font-extrabold font-mono bg-emerald-500 text-slate-950 shadow-sm">
                                🚀 START HERE (4-STEP GUIDED TOUR)
                            </span>
                            <span className="text-xs font-bold text-emerald-300">
                                Perfect for first-time evaluators & judges
                            </span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                            How to Experience FraudForge in 4 Clean Steps
                        </h2>
                    </div>
                    <NavLink
                        data-tour="start-tour-btn"
                        to="/generate"
                        className="shrink-0 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:brightness-110 text-slate-950 font-extrabold text-xs uppercase tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2 cursor-pointer text-center"
                    >
                        <span>▶ Start Guided Walkthrough</span>
                        <span>→</span>
                    </NavLink>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <NavLink
                        data-tour="briefing-next-btn"
                        to="/generate"
                        className="p-4 rounded-xl border border-border bg-surface/80 hover:bg-surface-hover hover:border-indigo-500/50 transition-all group flex flex-col justify-between cursor-pointer"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🎯</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">STAGE 02</span>
                            </div>
                            <h3 className="font-bold text-sm text-white group-hover:text-indigo-300 transition-colors">
                                Attack Studio
                            </h3>
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                                Pick from 8 GenAI threat vectors (Voice Cloning, Deepfake, Synthetic KYC) and synthesize scam payloads.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-indigo-400 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Open Attack Studio →
                        </span>
                    </NavLink>

                    <NavLink
                        to="/ai-defense-lab"
                        className="p-4 rounded-xl border border-border bg-surface/80 hover:bg-surface-hover hover:border-rose-500/50 transition-all group flex flex-col justify-between cursor-pointer"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🔬</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">STAGE 03</span>
                            </div>
                            <h3 className="font-bold text-sm text-white group-hover:text-rose-300 transition-colors">
                                AI Defense Lab
                            </h3>
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                                Spar synthesized attacks against real customer baseline profiles and measure evasion vs detection.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-rose-400 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Spar in Defense Lab →
                        </span>
                    </NavLink>

                    <NavLink
                        to="/defend"
                        className="p-4 rounded-xl border border-border bg-surface/80 hover:bg-surface-hover hover:border-amber-500/50 transition-all group flex flex-col justify-between cursor-pointer"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🛡️</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">STAGE 04</span>
                            </div>
                            <h3 className="font-bold text-sm text-white group-hover:text-amber-300 transition-colors">
                                Defender ML & ROI
                            </h3>
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                                Autonomously retrain XGBoost classifiers across 3 rounds, recovering recall from 18% to 79%.
                            </p>
                        </div>
                        <span className="text-xs font-bold text-amber-400 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Retrain & Harden →
                        </span>
                    </NavLink>

                    <NavLink
                        to="/generate"
                        className="p-4 rounded-xl border border-border bg-surface/80 hover:bg-surface-hover hover:border-emerald-500/50 transition-all group flex flex-col justify-between cursor-pointer"
                    >
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-2xl">🎬</span>
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">INTERACTIVE</span>
                            </div>
                            <h3 className="font-bold text-sm text-white group-hover:text-emerald-300 transition-colors">
                                Live Incident Replay
                            </h3>
                            <p className="text-xs text-text-secondary mt-1.5 leading-relaxed">
                                Watch 4-step multimodal attack execution (Targeting ➔ Lure ➔ Payment ➔ Interception).
                            </p>
                        </div>
                        <span className="text-xs font-bold text-emerald-400 mt-4 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                            Experience Replay →
                        </span>
                    </NavLink>
                </div>
            </div>

            {/* ── One-Click Autonomous Pipeline Runner ── */}
            <PipelineRunner />

            {/* ── Interactive 4-Stage Navigation Topology ── */}
            <section aria-labelledby="flow-heading" className="mt-12">
                <div className="flex items-center justify-between gap-4 mb-6 border-b border-border pb-4">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-signal-cyan">Investigation Topology</p>
                        <h2 id="flow-heading" className="text-xl font-extrabold text-white tracking-tight mt-0.5">Core Autonomous Pipeline</h2>
                    </div>
                    <span className="text-xs font-mono text-text-muted bg-navy-900 px-3 py-1 rounded border border-border">4 Core Stages</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {STAGES.map((stage, index) => {
                        const borderColors = {
                            emerald: 'border-emerald-500/40 hover:border-emerald-400 group-hover:text-emerald-300',
                            indigo: 'border-indigo-500/40 hover:border-indigo-400 group-hover:text-indigo-300',
                            purple: 'border-purple-500/40 hover:border-purple-400 group-hover:text-purple-300',
                            rose: 'border-rose-500/40 hover:border-rose-400 group-hover:text-rose-300',
                            amber: 'border-amber-500/40 hover:border-amber-400 group-hover:text-amber-300',
                        }
                        const badgeColor = borderColors[stage.color] || borderColors.emerald

                        return (
                            <NavLink
                                key={stage.to}
                                to={stage.to}
                                end={stage.to === '/'}
                                className={({ isActive }) => `group relative min-h-28 rounded-xl border p-4 flex flex-col justify-between transition-all duration-200 shadow-md ${
                                    isActive
                                        ? 'border-signal-green bg-signal-green/10 shadow-[0_0_20px_rgba(184,243,90,0.15)] ring-1 ring-signal-green/40'
                                        : `border-border/80 bg-surface/90 hover:bg-surface-hover ${badgeColor}`
                                }`}
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-mono font-bold text-text-muted group-hover:text-white">
                                                STAGE 0{index + 1}
                                            </span>
                                            {isActive && <span className="w-2.5 h-2.5 rounded-full bg-signal-green shadow-[0_0_8px_#b8f35a]" />}
                                        </div>
                                        <span className="text-base font-bold leading-snug text-white group-hover:text-white mt-1">
                                            {stage.label}
                                        </span>
                                        <p className="text-[11px] text-text-secondary line-clamp-1 mt-0.5">
                                            {stage.desc}
                                        </p>
                                        <span className="text-xs font-semibold text-text-muted group-hover:text-signal-cyan flex items-center gap-1 mt-2">
                                            {stage.kind === 'current' ? '● Active' : 'Enter Stage →'}
                                        </span>
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </div>
            </section>

            {/* ── Key Capabilities Cards ── */}
            <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
                <BriefingCard
                    color="rose"
                    icon="🎯"
                    label="Red Team Synthesis"
                    text="Generates synthetic AI-amplified attack vectors including deepfake voice cloning, synthetic KYC, and automated account takeover."
                />
                <BriefingCard
                    color="emerald"
                    icon="🛡️"
                    label="Adaptive ML Hardening"
                    text="Extracts blindspots and false negatives from missed transactions, feeding evasive parameters into multi-round model retraining."
                />
                <BriefingCard
                    color="amber"
                    icon="📊"
                    label="Loss Prevention ROI"
                    text="Full cryptographic reproducibility with deterministic seeds, telemetry logging, and quantitative business fraud savings modeling."
                />
            </div>
        </div>
    )
}

function BriefingCard({ label, text, color, icon }) {
    const colorStyles = {
        rose: 'border-rose-500/40 bg-rose-950/20 text-rose-300',
        emerald: 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300',
        amber: 'border-amber-500/40 bg-amber-950/20 text-amber-300',
    }[color] || 'border-border bg-surface text-white'

    return (
        <div className={`p-5 rounded-xl border ${colorStyles} shadow-lg backdrop-blur-sm space-y-2`}>
            <div className="flex items-center gap-2.5">
                <span className="text-lg">{icon}</span>
                <p className="text-sm font-bold uppercase tracking-wider text-white">{label}</p>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">{text}</p>
        </div>
    )
}