import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import fallbackAttacks from '../data/attacks.json'
import { useAttackContext } from '../context/AttackContext.jsx'

/* ── Channel badge color map ─────────────────────────────────── */
const CHANNEL_COLORS = {
    'Phone / Voice': 'bg-purple-500/20 text-purple-300 border-purple-500/30',
    'Digital Onboarding': 'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'Email / SMS': 'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'Credit / Account Opening': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    'Online Banking / APIs': 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    'E-Commerce / Card-Not-Present': 'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'Payments / Money Movement': 'bg-orange-500/20 text-orange-300 border-orange-500/30',
    'Social Media / Messaging': 'bg-pink-500/20 text-pink-300 border-pink-500/30',
}

/* ── Threat-level icon per card ──────────────────────────────── */
const THREAT_ICONS = {
    'voice-clone': '🎙️',
    'deepfake-kyc': '🎭',
    'llm-phishing': '📧',
    'synthetic-identity': '🧬',
    'agentic-ato': '🤖',
    'card-testing': '💳',
    'synthetic-layering': '🔀',
    'romance-scam': '💔',
}

export default function AttackLibrary() {
    const { selectedVector, setSelectedVector } = useAttackContext()
    const [attacks, setAttacks] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch('/api/attacks')
            .then(res => {
                if (!res.ok) throw new Error(`HTTP ${res.status}`)
                return res.json()
            })
            .then(data => { setAttacks(data); setLoading(false) })
            .catch(() => { setAttacks(fallbackAttacks); setLoading(false) })
    }, [])

    if (loading) return <LoadingState />
    if (error) return <ErrorState message={error} />

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            {/* Page header */}
            <div className="mb-10">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-1 rounded-full bg-accent-red" />
                    <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">
                        Attack Library
                    </h1>
                </div>
                <p className="text-text-secondary text-base max-w-2xl ml-4">
                    Eight GenAI-powered payment fraud vectors identified through red-team research.
                    Each represents a distinct threat channel where generative AI amplifies attacker capability.
                </p>
                <p className="text-xs text-text-muted mt-3 ml-4">Open a card to inspect the threat pattern and its real-world grounding.</p>
            </div>

            {/* Stats bar */}
            <div data-tour="vector-filter-all" className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
                <StatCard label="Total Vectors" value={attacks.length} color="indigo" />
                <StatCard label="Threat Channels" value={new Set(attacks.map(a => a.channel)).size} color="sky" />
                <StatCard label="AI-Amplified" value={attacks.length} color="rose" />
                <StatCard label="Red Team Status" value="Active" color="emerald" />
            </div>

            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {attacks.map((attack, idx) => (
                    <AttackCard key={attack.id} attack={attack} index={idx} selected={selectedVector === attack.id} onSelect={setSelectedVector} />
                ))}
            </div>
        </div>
    )
}

/* ── Attack Card ─────────────────────────────────────────────── */
function AttackCard({ attack, index, selected, onSelect }) {
    const [expanded, setExpanded] = useState(false)
    const channelClass = CHANNEL_COLORS[attack.channel] || 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    const icon = THREAT_ICONS[attack.id] || '⚡'

    return (
        <div
              data-tour={attack.id === 'voice-clone' ? 'vector-card-voice-clone' : undefined}
              className={`group relative rounded-xl border ${selected ? 'border-accent-red ring-1 ring-accent-red/40' : 'border-border'} bg-surface hover:bg-surface-hover
                 transition-all duration-300 hover:border-accent-red/40 hover:shadow-[0_0_30px_rgba(230,57,70,0.08)]
                  overflow-hidden cursor-pointer`}
              onClick={() => { onSelect(attack.id); setExpanded(!expanded) }}
        >
            {/* Top accent line */}
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-accent-red/60 via-accent-red to-accent-red/60 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

            <div className="p-6">
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <span className="text-2xl leading-none">{icon}</span>
                        <div>
                            <h3 className="text-base font-bold text-text-primary group-hover:text-accent-red-light transition-colors">
                                {attack.name}
                            </h3>
                        </div>
                    </div>
                    <span className="text-xs font-mono text-text-muted tabular-nums">
                        #{String(index + 1).padStart(2, '0')}
                    </span>
                </div>

                {/* Channel badge */}
                <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border mb-3 ${channelClass}`}>
                    {attack.channel}
                </span>

                {/* Description */}
                <p className="text-sm text-text-secondary leading-relaxed mb-3">
                    {attack.description}
                </p>

                {/* Expandable grounding note */}
                <div className={`overflow-hidden transition-all duration-300 ${expanded ? 'max-h-60 opacity-100' : 'max-h-0 opacity-0'}`}>
                    <div className="mt-2 pt-3 border-t border-border">
                        <div className="flex items-center gap-2 mb-2">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-red">
                                <circle cx="12" cy="12" r="10" /><path d="M12 16v-4" /><path d="M12 8h.01" />
                            </svg>
                            <span className="text-xs font-semibold text-accent-red uppercase tracking-wider">Real-World Grounding</span>
                        </div>
                        <p className="text-xs text-text-muted leading-relaxed">
                            {attack.groundingNote}
                        </p>
                    </div>
                </div>

                {/* Expand hint and action buttons */}
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/50 text-xs">
                    <div className="flex items-center gap-1 text-text-muted">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                            className={`transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}>
                            <polyline points="6 9 12 15 18 9" />
                        </svg>
                        <span>{expanded ? 'Hide' : 'Show'} evidence</span>
                    </div>

                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                        <Link
                            data-tour="simulate-btn"
                            to="/generate"
                            onClick={() => onSelect(attack.id)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 transition-colors"
                        >
                            ⚡ Simulate →
                        </Link>
                        <Link
                            to="/replay"
                            onClick={() => onSelect(attack.id)}
                            className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 transition-colors"
                        >
                            🎬 Replay →
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    )
}

/* ── Stat Card ───────────────────────────────────────────────── */
function StatCard({ label, value, color = 'indigo' }) {
    const colorStyles = {
        indigo: 'text-indigo-400 border-indigo-500/30 bg-indigo-950/20',
        sky: 'text-sky-400 border-sky-500/30 bg-sky-950/20',
        rose: 'text-rose-400 border-rose-500/30 bg-rose-950/20',
        emerald: 'text-emerald-400 border-emerald-500/30 bg-emerald-950/20',
    }[color] || 'text-white border-border bg-surface'

    return (
        <div className={`rounded-xl border p-4 shadow-md ${colorStyles}`}>
            <p className="text-xs font-semibold uppercase tracking-wider opacity-75 mb-1">{label}</p>
            <p className="text-2xl font-bold font-mono">{value}</p>
        </div>
    )
}

/* ── Loading state ───────────────────────────────────────────── */
function LoadingState() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center gap-4">
            <div className="w-10 h-10 border-3 border-accent-red/30 border-t-accent-red rounded-full animate-spin" />
            <p className="text-text-secondary text-sm">Loading attack vectors…</p>
        </div>
    )
}

/* ── Error state ─────────────────────────────────────────────── */
function ErrorState({ message }) {
    return (
        <div className="max-w-7xl mx-auto px-6 py-20 flex flex-col items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-accent-red/15 flex items-center justify-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent-red">
                    <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6" /><path d="M9 9l6 6" />
                </svg>
            </div>
            <p className="text-text-secondary text-sm">Failed to load attacks: {message}</p>
            <p className="text-text-muted text-xs">Refresh the page to try again.</p>
        </div>
    )
}
