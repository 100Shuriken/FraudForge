import { useState, useEffect } from 'react'
import { Routes, Route, NavLink, useLocation, Link, Navigate } from 'react-router-dom'
import ConsumerSimpleView from './pages/ConsumerSimpleView.jsx'
import UnifiedLiveCockpit from './pages/UnifiedLiveCockpit.jsx'
import MissionBriefing from './pages/MissionBriefing.jsx'
import Simulate from './pages/Simulate.jsx'
import Defend from './pages/Defend.jsx'
import AIDefenseLab from './pages/AIDefenseLab.jsx'
import BeginnerAssistant from './components/BeginnerAssistant.jsx'
import StageNavigationFooter from './components/StageNavigationFooter.jsx'
import { useAttackContext } from './context/AttackContext.jsx'

export const NAVIGATION_STAGES = [
    { to: '/', label: '1-Page Attack & Defense', short: '1-Page Live', icon: '⚡', num: '01', color: 'emerald' },
    { to: '/generate', label: 'Attack Studio', short: 'Attacks', icon: '🎯', num: '02', color: 'indigo' },
    { to: '/ai-defense-lab', label: 'AI Defense Lab', short: 'Defense Lab', icon: '🔬', num: '03', color: 'rose' },
    { to: '/defend', label: 'Defender ML & ROI', short: 'Defender ML', icon: '🛡️', num: '04', color: 'amber' },
]

const THEME_ORDER = ['system', 'light', 'dark']

const THEME_META = {
    system: { icon: '🖥️', label: 'System', title: 'Theme: following your system setting — click for light' },
    light: { icon: '☀️', label: 'Light', title: 'Theme: light — click for dark' },
    dark: { icon: '🌙', label: 'Dark', title: 'Theme: dark — click to follow your system' },
}

// Earlier builds stored 'hacker' / 'defense'; map them onto the new scheme so
// a returning user does not land on an invalid theme.
const LEGACY_THEMES = { hacker: 'dark', defense: 'light' }

function readStoredTheme() {
    try {
        const stored = localStorage.getItem('fraudforge-theme')
        if (!stored) return 'system'
        if (THEME_ORDER.includes(stored)) return stored
        return LEGACY_THEMES[stored] || 'system'
    } catch {
        return 'system'
    }
}

const VECTOR_LABELS = {
    'voice-clone': 'Voice Cloning',
    'deepfake-video': 'Deepfake Video Calls',
    'llm-phishing': 'Hyper-Personalized Phishing',
    'fake-ecommerce': 'AI-Built Fake E-Commerce Sites',
    'fake-chatbot': 'Fake AI Chatbots',
    'synthetic-identity': 'Synthetic Identity Fraud',
    'deepfake-kyc': 'Deepfake Identity Verification',
    'bec-email': 'AI-Drafted BEC',
}

export default function App() {
    const {
        uiMode,
        toggleUiMode,
        selectedVector,
        visitedStages,
        addVisitedStage,
        judgeMode,
        setJudgeMode,
        beginnerMode,
        toggleBeginnerMode,
    } = useAttackContext()

    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [theme, setTheme] = useState(readStoredTheme)
    const location = useLocation()

    useEffect(() => {
        addVisitedStage(location.pathname)
    }, [location.pathname])

    useEffect(() => {
        const root = document.documentElement
        // No attribute means "follow the OS", which the stylesheet handles
        // through prefers-color-scheme.
        if (theme === 'system') root.removeAttribute('data-theme')
        else root.setAttribute('data-theme', theme)
        // The old build styled the body; make sure nothing lingers.
        document.body.className = ''
        localStorage.setItem('fraudforge-theme', theme)
    }, [theme])

    const cycleTheme = () => {
        setTheme(prev => THEME_ORDER[(THEME_ORDER.indexOf(prev) + 1) % THEME_ORDER.length])
    }

    const themeMeta = THEME_META[theme]

    return (
        <div className="min-h-screen flex flex-col md:flex-row font-sans">
            {/* ── Mobile Top Header ───────────────────────────────────── */}
            <div className="md:hidden sticky top-0 z-50 flex items-center justify-between px-4 py-3 bg-surface backdrop-blur-md border-b border-border shadow-md">
                <div className="flex items-center gap-2.5">
                    <div className="brand-mark w-8 h-8 rounded-lg flex items-center justify-center">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                    </div>
                    <div>
                        <span className="brand-wordmark text-base font-bold">
                            Fraud<span className="text-accent-red">Forge</span>
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {/* Mobile Beginner Guide Toggle */}
                    <button
                        onClick={toggleBeginnerMode}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                            beginnerMode
                                ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40 shadow-sm'
                                : 'bg-navy-950 text-slate-400 border-border'
                        }`}
                        title="Toggle Beginner Walkthrough Guide"
                    >
                        {beginnerMode ? '🧭 Guide' : '🧭 Off'}
                    </button>

                    {/* Mobile Judge Mode Toggle */}
                    <button
                        onClick={() => setJudgeMode(!judgeMode)}
                        className={`px-2 py-1 rounded text-[11px] font-bold border transition-colors ${
                            judgeMode
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : 'bg-navy-950 text-slate-400 border-border'
                        }`}
                    >
                        {judgeMode ? '🏆 Judge' : '⚙️ Tech'}
                    </button>

                    {/* Mobile Theme Toggle */}
                    <button
                        onClick={cycleTheme}
                        className="px-2.5 py-1 rounded-lg border border-border bg-surface-sunken text-xs font-semibold flex items-center gap-1 cursor-pointer"
                        title={themeMeta.title}
                        aria-label={themeMeta.title}
                    >
                        <span aria-hidden="true">{themeMeta.icon}</span> {themeMeta.label}
                    </button>

                    <button
                        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                        className="p-2 rounded-lg bg-surface border border-border text-current hover:border-signal-cyan transition-colors cursor-pointer"
                        aria-label="Toggle navigation menu"
                    >
                        {mobileMenuOpen ? (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
                        )}
                    </button>
                </div>
            </div>

            {/* ── Left Sidebar Navigation Rail (Desktop & Tablet) ─────── */}
            {uiMode === 'technical' && (
                <aside
                    className={`fixed inset-y-0 left-0 z-40 w-64 bg-surface border-r border-border flex flex-col justify-between transition-transform duration-300 md:static md:translate-x-0 ${
                        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
                    }`}
                >
                {/* Brand Header */}
                <div className="p-5 border-b border-border">
                    <div className="flex items-center gap-3">
                        <div className="brand-mark w-10 h-10 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                            </svg>
                        </div>
                        <div>
                            <div className="brand-wordmark text-xl font-extrabold tracking-tight">
                                Fraud<span className="text-accent-red">Forge</span>
                            </div>
                            <span className="text-[10px] font-semibold text-signal-cyan block tracking-tight">
                                Mastercard Innovation Challenge 2026
                            </span>
                        </div>
                    </div>

                    {/* Status Pill */}
                    <div className="mt-4 flex items-center justify-between px-3.5 py-2 rounded-xl bg-navy-950 border border-border">
                        <div className="flex items-center gap-2">
                            <span className="live-dot" />
                            <span className="text-xs font-semibold">Sandbox Environment</span>
                        </div>
                        <span className="text-[10px] font-bold text-signal-green px-2 py-0.5 rounded bg-signal-green/10 border border-signal-green/30">
                            ONLINE
                        </span>
                    </div>

                    {/* Judge Mode Switch — compact, single control (theme lives in the top header) */}
                    <div className="mt-4 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-surface border border-border">
                        <div>
                            <span className="text-xs font-bold block">🏆 Judge Mode</span>
                            <span className="text-[10px] text-text-muted">Executive summaries</span>
                        </div>
                        <button
                            type="button"
                            onClick={() => setJudgeMode(!judgeMode)}
                            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 transition-colors duration-200 ease-in-out focus:outline-none ${
                                judgeMode
                                    ? 'bg-amber-500 border-amber-400'
                                    : 'bg-navy-950 border-border'
                            }`}
                            role="switch"
                            aria-checked={judgeMode}
                        >
                            <span
                                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out mt-0.5 ${
                                    judgeMode ? 'translate-x-5' : 'translate-x-1'
                                }`}
                            />
                        </button>
                    </div>
                </div>

                {/* Vertical Progress Rail Navigation List (Milestone 1) */}
                <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 scrollbar-thin">
                    <div className="px-3 py-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                        <span>Progress Rail</span>
                        <span className="text-xs text-signal-cyan font-mono font-bold">
                            {visitedStages.size}/{NAVIGATION_STAGES.length} Done
                        </span>
                    </div>

                    {NAVIGATION_STAGES.map((stage) => {
                        const isVisited = visitedStages.has(stage.to)
                        // A tinted panel and an accent label read as "selected"
                        // without the neon bloom the old rail used.
                        const activeStyles = {
                            emerald: 'border-emerald-400 bg-emerald-500/15 text-emerald-400 font-semibold',
                            indigo: 'border-indigo-400 bg-indigo-500/15 text-indigo-400 font-semibold',
                            purple: 'border-purple-400 bg-purple-500/15 text-purple-400 font-semibold',
                            rose: 'border-rose-400 bg-rose-500/15 text-rose-400 font-semibold',
                            amber: 'border-amber-400 bg-amber-500/15 text-amber-400 font-semibold',
                            sky: 'border-sky-400 bg-sky-500/15 text-sky-400 font-semibold',
                            cyan: 'border-cyan-400 bg-cyan-500/15 text-cyan-400 font-semibold',
                        }[stage.color]

                        return (
                            <NavLink
                                key={stage.to}
                                to={stage.to}
                                end={stage.to === '/'}
                                onClick={() => setMobileMenuOpen(false)}
                                className={({ isActive }) =>
                                    `group flex items-center justify-between px-3.5 py-2.5 rounded-xl border text-xs transition-all duration-150 ${
                                        isActive
                                            ? activeStyles
                                            : 'border-transparent text-slate-400 hover:text-current hover:bg-surface hover:border-border'
                                    }`
                                }
                            >
                                {({ isActive }) => (
                                    <>
                                        <div className="flex items-center gap-2.5 min-w-0">
                                            <span className="text-base shrink-0">{stage.icon}</span>
                                            <span className="text-xs truncate font-medium">
                                                {stage.label}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                            {isVisited && !isActive && (
                                                <span className="text-[10px] text-emerald-400 font-bold" title="Stage visited">
                                                    ✓
                                                </span>
                                            )}
                                            <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${isActive ? 'bg-black/40 text-current font-bold' : 'bg-black/10 text-slate-400'}`}>
                                                {stage.num}
                                            </span>
                                            {isActive && (
                                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                            )}
                                        </div>
                                    </>
                                )}
                            </NavLink>
                        )
                    })}
                </nav>

                {/* Sidebar Footer */}
                <div className="p-4 border-t border-border bg-navy-950 space-y-2">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>SOC v2.4.0</span>
                        <span className="text-signal-green font-semibold">Ready</span>
                    </div>
                </div>
            </aside>
            )}

            {/* Mobile backdrop */}
            {mobileMenuOpen && (
                <div
                    onClick={() => setMobileMenuOpen(false)}
                    className="fixed inset-0 z-30 bg-black/70 backdrop-blur-sm md:hidden"
                />
            )}

            {/* ── Main Content Area on the Right ───────────────────────── */}
            <div className="flex-1 flex flex-col min-w-0 min-h-screen relative">
                {/* Desktop Top Control Banner (Highly Obvious Quick Toggles) */}
                <header className="hidden md:flex items-center justify-between px-6 lg:px-8 py-3 border-b border-border bg-surface backdrop-blur-md sticky top-0 z-30 shadow-sm">
                    <div className="flex items-center gap-2 min-w-0">
                        <span className="text-xs font-semibold text-signal-cyan font-mono truncate">
                            Mastercard Innovation Challenge 2026
                        </span>
                        {uiMode === 'technical' && selectedVector && (
                            <Link
                                to="/identify"
                                className="ml-2 px-2.5 py-1 rounded-lg border border-rose-500/50 bg-rose-950/40 hover:bg-rose-900/60 text-rose-200 text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer group shrink-0"
                                title="Click to jump back to Attack Vector Library"
                            >
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                <span className="truncate max-w-[10rem]">{VECTOR_LABELS[selectedVector] || selectedVector}</span>
                            </Link>
                        )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        {/* View Mode: the one control that matters most, kept prominent */}
                        <div className="flex items-center p-0.5 rounded-lg bg-surface-sunken border border-border" role="group" aria-label="View mode">
                            <button
                                type="button"
                                onClick={() => toggleUiMode('consumer')}
                                aria-pressed={uiMode === 'consumer'}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                    uiMode === 'consumer'
                                        ? 'bg-surface text-text-primary shadow-sm'
                                        : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                Consumer
                            </button>
                            <button
                                type="button"
                                onClick={() => toggleUiMode('technical')}
                                aria-pressed={uiMode === 'technical'}
                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                                    uiMode === 'technical'
                                        ? 'bg-surface text-text-primary shadow-sm'
                                        : 'text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                Technical
                            </button>
                        </div>

                        {/* Theme — single control, lives only here */}
                        <button
                            type="button"
                            onClick={cycleTheme}
                            className="px-3 py-1.5 rounded-lg border border-border bg-surface-sunken text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
                            title={themeMeta.title}
                            aria-label={themeMeta.title}
                        >
                            <span aria-hidden="true">{themeMeta.icon}</span> {themeMeta.label}
                        </button>

                        {uiMode === 'technical' && (
                            <button
                                type="button"
                                onClick={() => {
                                    const el = document.getElementById('ai-copilot-guide-hub')
                                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                }}
                                className="p-2 rounded-xl border border-border bg-navy-950 text-slate-300 hover:text-amber-300 hover:border-amber-500/40 transition-colors cursor-pointer"
                                title="Jump to guided AI Copilot tour"
                            >
                                🤖
                            </button>
                        )}
                    </div>
                </header>

                {/* Main page view */}
                <main className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col justify-between">
                    <div>
                        {uiMode === 'consumer' ? (
                            <ConsumerSimpleView onSwitchToJudge={() => toggleUiMode('technical')} />
                        ) : (
                            <>
                                {/* Clean Interactive Guided Assistant with Spotlight Highlighting */}
                                <BeginnerAssistant />

                                <Routes>
                                    <Route path="/" element={<UnifiedLiveCockpit />} />
                                    <Route path="/briefing" element={<MissionBriefing />} />
                                    <Route path="/generate" element={<Simulate />} />
                                    <Route path="/ai-defense-lab" element={<AIDefenseLab />} />
                                    <Route path="/defend" element={<Defend />} />

                                    {/* Backward-Compatible Redirects for Streamlined Pages */}
                                    <Route path="/identify" element={<Navigate to="/generate" replace />} />
                                    <Route path="/adapt" element={<Navigate to="/ai-defense-lab" replace />} />
                                    <Route path="/replay" element={<Navigate to="/generate" replace />} />
                                    <Route path="/reality-check" element={<Navigate to="/defend" replace />} />
                                    <Route path="/evidence" element={<Navigate to="/defend" replace />} />
                                    <Route path="/live-benchmark" element={<Navigate to="/defend" replace />} />
                                    <Route path="/methodology" element={<Navigate to="/defend" replace />} />
                                    <Route path="*" element={<Navigate to="/" replace />} />
                                </Routes>
                            </>
                        )}
                    </div>

                    {/* Sequential Stepper for Technical Mode */}
                    {uiMode === 'technical' && <StageNavigationFooter />}
                </main>

                {/* Footer */}
                <footer className="border-t border-border/40 py-4 px-6 text-center text-xs text-slate-400">
                    FraudForge · Mastercard Innovation Challenge 2026 · Autonomous Adversarial AI Defense Platform
                </footer>
            </div>
        </div>
    )
}

function StagePlaceholder() {
    return (
        <div className="max-w-4xl mx-auto py-16 text-center">
            <h2 className="text-2xl font-bold mb-2">Stage Not Found</h2>
            <p className="text-sm text-slate-400">Please select a valid stage from the left navigation panel.</p>
        </div>
    )
}
