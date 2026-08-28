import { useAttackContext } from '../context/AttackContext.jsx'

/**
 * Enhanced Judge Mode Executive Banner.
 * Displays tailored executive narratives, business impact, and plain-language insights for hackathon evaluators.
 */
export default function JudgeExecutiveBanner({ stageNum, stageTitle, problem, solution, metrics = [] }) {
    const { judgeMode } = useAttackContext()

    if (!judgeMode) return null

    return (
        <div className="mb-6 p-5 sm:p-6 rounded-2xl border border-amber-500/50 bg-gradient-to-r from-amber-500/10 via-purple-500/10 to-indigo-500/10 backdrop-blur-md shadow-xl space-y-4 animate-fadeIn">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/40 uppercase tracking-wider font-mono">
                        🏆 Judge Mode Active · Stage {stageNum || 'Executive'}
                    </span>
                    <span className="text-xs font-bold text-white">
                        {stageTitle || 'Executive Evaluation Briefing'}
                    </span>
                </div>
                <span className="text-[11px] font-mono text-amber-300/80">Mastercard Innovation Challenge 2026</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-black/30 border border-border space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400 font-mono block">
                        ⚠️ Real-World Financial Risk:
                    </span>
                    <p className="text-slate-200 leading-relaxed font-sans">
                        {problem}
                    </p>
                </div>

                <div className="p-3.5 rounded-xl bg-black/30 border border-border space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono block">
                        🛡️ FraudForge AI Defense Solution:
                    </span>
                    <p className="text-slate-200 leading-relaxed font-sans">
                        {solution}
                    </p>
                </div>
            </div>

            {metrics && metrics.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
                    {metrics.map((m, i) => (
                        <div key={i} className="p-2.5 rounded-lg bg-navy-950/80 border border-amber-500/30 text-center">
                            <span className="text-[10px] text-slate-400 block font-mono">{m.label}</span>
                            <span className="text-sm font-bold text-amber-300 font-mono">{m.value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
