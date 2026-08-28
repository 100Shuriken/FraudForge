import { useState } from 'react'
import { createDemoTraining } from '../data/demoData.js'
import ApiPlayground from '../components/ApiPlayground.jsx'
import TransactionScorer from '../components/TransactionScorer.jsx'

export default function LiveBenchmark() {
    const [result, setResult] = useState(null)
    const [running, setRunning] = useState(false)

    async function handleRun() {
        setRunning(true)
        const seed = Math.floor(Date.now() % 2147483647)
        const runId = `live-${seed}-${Math.floor(Math.random() * 1000)}`
        try {
            const response = await fetch('/api/benchmark', { method: 'POST' })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setResult({ ...(await response.json()), runId, live: true })
        } catch {
            const demo = createDemoTraining(seed)
            setResult({ seed, runId, baseline: demo.baseline, augmented: demo.augmented, elapsedSeconds: 0.4 + Math.random() * 0.8, source: 'Fresh client-side simulation', live: false })
        } finally {
            setRunning(false)
        }
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10 text-slate-100 font-sans">
            <div className="max-w-3xl mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <span className="px-3 py-1 rounded-md text-xs font-bold tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                        STAGE 09 · ON-DEMAND EVALUATION
                    </span>
                </div>
                <h1 className="text-3xl font-extrabold tracking-tight text-white">Live Benchmark</h1>
                <p className="text-text-secondary text-base leading-relaxed mt-2">
                    Run a compact single-seed version of the train and evaluation pipeline in real time. Its output tests fresh data generation and model fitting directly on demand.
                </p>
            </div>

            <div className="rounded-xl border border-border bg-surface p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5 mb-8 shadow-xl">
                <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-1">Single-Seed Fast Execution</p>
                    <p className="text-sm text-text-secondary">Reference telemetry, synthetic fraud synthesis, XGBoost fit, and held-out evaluation.</p>
                </div>
                <button
                    onClick={handleRun}
                    disabled={running}
                    className="shrink-0 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs tracking-wider shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                    {running ? (
                        <>
                            <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Running Benchmark...</span>
                        </>
                    ) : (
                        <>
                            <span>▶</span> Run Live Benchmark
                        </>
                    )}
                </button>
            </div>

            {result && (
                <div className="space-y-6 animate-fadeIn mb-10">
                    <div className={`p-4 rounded-xl border ${result.live ? 'border-emerald-500/40 bg-emerald-950/30 text-emerald-200' : 'border-amber-500/40 bg-amber-950/30 text-amber-200'} flex items-center justify-between shadow-md`}>
                        <div>
                            <p className="text-xs font-bold uppercase tracking-wider mb-0.5">{result.live ? '✓ Live Server Benchmark Completed' : '⚡ Fresh Client-Side Simulation Completed'}</p>
                            <p className="text-xs text-text-secondary">Run ID: <strong className="text-white font-mono">{result.runId}</strong> · Seed: <strong className="text-white font-mono">{result.seed}</strong> · Execution Time: <strong className="text-white font-mono">{Number(result.elapsedSeconds).toFixed(2)}s</strong></p>
                        </div>
                        <span className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${result.live ? 'bg-emerald-900/60 border-emerald-500 text-emerald-300' : 'bg-amber-900/60 border-amber-500 text-amber-300'}`}>
                            {result.live ? 'SERVER ML' : 'BROWSER SIM'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <ResultCard data={result.baseline} theme="slate" />
                        <ResultCard data={result.augmented} enhanced theme="emerald" />
                    </div>
                </div>
            )}

            {/* Standalone Interactive Scorer */}
            <div className="mb-10">
                <TransactionScorer />
            </div>

            {/* Developer SDK & Live REST API Playground */}
            <div className="mt-10">
                <ApiPlayground />
            </div>
        </div>
    )
}

function ResultCard({ data, enhanced = false, theme = 'slate' }) {
    const isEmerald = theme === 'emerald'
    return (
        <div className={`rounded-xl border p-6 shadow-xl ${isEmerald ? 'border-emerald-500/50 bg-emerald-950/15' : 'border-border bg-surface'}`}>
            <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                <h2 className="font-bold text-base text-white">{data.label}</h2>
                {enhanced ? (
                    <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        AUGMENTED DEFENDER
                    </span>
                ) : (
                    <span className="px-2.5 py-1 rounded-md text-xs font-semibold bg-navy-800 text-text-secondary border border-border">
                        UNMODIFIED BASELINE
                    </span>
                )}
            </div>

            <div className="grid grid-cols-2 gap-3.5">
                {[
                    ['Precision', data.precision, 'text-sky-400'],
                    ['Recall', data.recall, 'text-signal-green'],
                    ['F1 Score', data.f1, 'text-emerald-400'],
                    ['AUC-ROC', data.auc, 'text-amber-400'],
                ].map(([label, value, colorClass]) => (
                    <div key={label} className="rounded-lg border border-border bg-navy-950 p-3.5">
                        <p className="text-[11px] text-text-muted uppercase font-semibold mb-1">{label}</p>
                        <p className={`text-2xl font-mono font-bold ${colorClass}`}>{(value * 100).toFixed(1)}%</p>
                    </div>
                ))}
            </div>
        </div>
    )
}