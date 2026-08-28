import { useLocation, Link } from 'react-router-dom'
import { NAVIGATION_STAGES } from '../App.jsx'

export default function StageNavigationFooter() {
    const location = useLocation()
    const currentIndex = NAVIGATION_STAGES.findIndex(s => s.to === location.pathname)
    const current = currentIndex !== -1 ? NAVIGATION_STAGES[currentIndex] : NAVIGATION_STAGES[0]

    const prevStage = currentIndex > 0 ? NAVIGATION_STAGES[currentIndex - 1] : null
    const nextStage = currentIndex < NAVIGATION_STAGES.length - 1 ? NAVIGATION_STAGES[currentIndex + 1] : NAVIGATION_STAGES[0]

    const progressPct = ((currentIndex + 1) / NAVIGATION_STAGES.length) * 100

    return (
        <div className="mt-12 mb-6 pt-6 border-t border-border/80">
            <div className="rounded-2xl border-2 border-border bg-surface p-5 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-5">
                {/* Previous Button */}
                <div className="w-full md:w-1/3 flex justify-start">
                    {prevStage ? (
                        <Link
                            to={prevStage.to}
                            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-primary text-xs font-bold transition-all group"
                        >
                            <span className="transition-transform group-hover:-translate-x-1">←</span>
                            <span className="text-text-muted">Previous:</span>
                            <span>{prevStage.label}</span>
                        </Link>
                    ) : (
                        <span className="text-xs text-text-muted font-mono">
                            🚀 Beginning of Journey
                        </span>
                    )}
                </div>

                {/* Center Stepper Progress */}
                <div className="w-full md:w-1/3 flex flex-col items-center justify-center text-center space-y-2">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-text-primary">
                            Stage {current.num} of 11
                        </span>
                        <span className="text-xs text-text-muted">·</span>
                        <span className="text-xs font-semibold text-text-secondary">
                            {current.label}
                        </span>
                    </div>

                    {/* Interactive dots */}
                    <div className="flex items-center gap-1.5">
                        {NAVIGATION_STAGES.map((s, idx) => (
                            <Link
                                key={s.to}
                                to={s.to}
                                title={`${s.num}. ${s.label}`}
                                className={`h-2 rounded-full transition-all duration-300 ${
                                    idx === currentIndex
                                        ? 'w-6 bg-gradient-to-r from-emerald-400 to-cyan-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]'
                                        : idx < currentIndex
                                        ? 'w-2 bg-emerald-500/60 hover:bg-emerald-400'
                                        : 'w-2 bg-slate-700 hover:bg-slate-500'
                                }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Next Button */}
                <div className="w-full md:w-1/3 flex justify-end">
                    <Link
                        to={nextStage.to}
                        className="w-full md:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:brightness-110 text-white font-extrabold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(16,185,129,0.35)] transition-all group"
                    >
                        <span>{currentIndex === NAVIGATION_STAGES.length - 1 ? '🔁 Replay from Start' : `Next: ${nextStage.label}`}</span>
                        <span className="transition-transform group-hover:translate-x-1.5 text-sm">→</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
