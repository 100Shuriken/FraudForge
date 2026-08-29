import { useState, useEffect, useCallback } from 'react'
import { useAttackContext } from '../context/AttackContext.jsx'

const VECTORS = [
    { id: 'voice-clone', name: 'Voice Cloning', icon: '🎙️', desc: 'AI-cloned executive audio call requesting an urgent wire' },
    { id: 'deepfake-video', name: 'Deepfake Video Calls', icon: '📹', desc: 'Real-time face-swap authorization during video KYC' },
    { id: 'synthetic-identity', name: 'Synthetic KYC Fraud', icon: '🪪', desc: 'Fabricated identity blending real and synthesised attributes' },
    { id: 'bec-email', name: 'AI Business Email Compromise', icon: '✉️', desc: 'Context-aware reply hijacking a live invoice thread' },
    { id: 'fake-ecommerce', name: 'AI Fake E-Commerce Store', icon: '🛍️', desc: 'Autonomous scam merchant with no fulfilment' },
    { id: 'fake-chatbot', name: 'Fake AI Support Bot', icon: '💬', desc: 'Malicious support agent harvesting one-time codes' },
]

const pct = (value, digits = 1) =>
    value == null || Number.isNaN(Number(value)) ? '—' : `${(Number(value) * 100).toFixed(digits)}%`

const money = (value) =>
    value == null ? '—' : `$${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`

const describeError = (err) => {
    const message = err?.message || String(err)
    if (/failed to fetch|networkerror|load failed/i.test(message)) {
        return 'Cannot reach the FraudForge API. Start the backend with:  uvicorn main:app --reload --port 8000'
    }
    return message
}

export default function UnifiedLiveCockpit() {
    const { selectedVector, setSelectedVector } = useAttackContext()

    const [customers, setCustomers] = useState([])
    const [activeVectorId, setActiveVectorId] = useState(selectedVector || 'voice-clone')
    const [targetId, setTargetId] = useState('C0001')

    const [sim, setSim] = useState(null)
    const [benchmark, setBenchmark] = useState(null)
    const [busy, setBusy] = useState(false)
    const [benchmarkBusy, setBenchmarkBusy] = useState(false)
    const [error, setError] = useState(null)

    const currentVector = VECTORS.find(v => v.id === activeVectorId) || VECTORS[0]
    const target = customers.find(c => c.customer_id === targetId)

    useEffect(() => {
        let cancelled = false
        fetch('/api/customers')
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then(data => {
                if (cancelled || !Array.isArray(data) || !data.length) return
                setCustomers(data)
                setTargetId(prev => (data.some(c => c.customer_id === prev) ? prev : data[0].customer_id))
            })
            .catch(err => !cancelled && setError(describeError(err)))
        return () => { cancelled = true }
    }, [])

    const runSimulation = useCallback(async () => {
        setBusy(true)
        setError(null)
        try {
            const res = await fetch('/api/cockpit/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ vector: activeVectorId, target_id: targetId }),
            })
            if (!res.ok) throw new Error(`Simulation failed — HTTP ${res.status}`)
            setSim(await res.json())
        } catch (err) {
            setSim(null)
            setError(describeError(err))
        } finally {
            setBusy(false)
        }
    }, [activeVectorId, targetId])

    // Re-run whenever the vector or target changes, so the panels always
    // describe the selection on screen.
    useEffect(() => {
        if (customers.length) runSimulation()
    }, [customers.length, runSimulation])

    const runBenchmark = async () => {
        setBenchmarkBusy(true)
        setError(null)
        try {
            const res = await fetch('/api/cockpit/benchmark')
            if (!res.ok) throw new Error(`Benchmark failed — HTTP ${res.status}`)
            setBenchmark(await res.json())
        } catch (err) {
            setBenchmark(null)
            setError(describeError(err))
        } finally {
            setBenchmarkBusy(false)
        }
    }

    const verdict = sim?.verdict
    const txn = sim?.transaction

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6 font-sans">
            {error && (
                <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5" aria-hidden="true">⚠️</span>
                    <p className="text-xs text-amber-100/90 flex-1 break-words">{error}</p>
                </div>
            )}

            {/* ── Header + controls ─────────────────────────────────── */}
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-5">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                        <span className="text-xs font-semibold text-text-secondary">
                            Red-team attack and blue-team defence, on one screen
                        </span>
                        <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-1">
                            Generative AI Fraud &amp; Adversarial Hardening
                        </h1>
                        <p className="text-xs text-text-muted mt-1.5 max-w-2xl">
                            Every figure below is computed live by the scoring engine against synthetic
                            data. Nothing on this page is a stored result.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={runSimulation}
                        disabled={busy || !customers.length}
                        className="px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        {busy ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Scoring…
                            </>
                        ) : (
                            <>▶ Run simulation</>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">
                            1. AI threat vector
                        </label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {VECTORS.map(v => (
                                <button
                                    key={v.id}
                                    type="button"
                                    onClick={() => { setActiveVectorId(v.id); setSelectedVector(v.id) }}
                                    title={v.desc}
                                    aria-pressed={activeVectorId === v.id}
                                    className={`p-2.5 rounded-lg border text-left text-xs font-semibold transition-colors cursor-pointer flex items-center gap-2 ${
                                        activeVectorId === v.id
                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-400'
                                            : 'bg-surface-sunken text-text-secondary border-border hover:text-text-primary'
                                    }`}
                                >
                                    <span className="text-base shrink-0" aria-hidden="true">{v.icon}</span>
                                    <span className="truncate">{v.name}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="cockpit-target" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block">
                            2. Target account
                        </label>
                        <select
                            id="cockpit-target"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary cursor-pointer"
                        >
                            {customers.map(c => (
                                <option key={c.customer_id} value={c.customer_id}>
                                    {c.name ? `${c.name} · ` : ''}{c.customer_id} · {c.city} · ${c.average_amount.toLocaleString()} avg · {c.daily_txns} txn/day
                                </option>
                            ))}
                        </select>
                        {target && (
                            <dl className="grid grid-cols-3 gap-2 text-[11px] pt-1">
                                <div className="p-2 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-text-muted">Device stability</dt>
                                    <dd className="font-mono font-bold text-text-primary">{target.device_stability}</dd>
                                </div>
                                <div className="p-2 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-text-muted">Regularity</dt>
                                    <dd className="font-mono font-bold text-text-primary">{target.spending_regularity}</dd>
                                </div>
                                <div className="p-2 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-text-muted">Velocity signal</dt>
                                    <dd className="font-mono font-bold text-text-primary">{target.velocity_signal}</dd>
                                </div>
                            </dl>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Attack vs defence ─────────────────────────────────── */}
            {sim && txn && verdict ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                    {/* Red team */}
                    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
                        <header className="flex items-center justify-between pb-3 border-b border-border">
                            <div>
                                <h2 className="text-sm font-bold text-text-primary">Red team · synthesised attack</h2>
                                <p className="text-xs text-rose-400 font-mono mt-0.5">
                                    {currentVector.name} → {sim.attackFamily.replaceAll('_', ' ')}
                                </p>
                            </div>
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
                                STEP 1
                            </span>
                        </header>

                        <blockquote className="text-xs text-text-secondary italic bg-surface-sunken p-3 rounded-lg border border-border leading-relaxed">
                            {sim.lure}
                        </blockquote>

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                                Payment the attack produced
                            </p>
                            <dl className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                <div className="p-2.5 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-[10px] text-text-muted">Amount</dt>
                                    <dd className="font-mono font-bold text-rose-400">${txn.amount.toLocaleString()}</dd>
                                    <dd className="text-[10px] text-text-muted mt-0.5">{txn.amountRatio}× baseline</dd>
                                </div>
                                <div className="p-2.5 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-[10px] text-text-muted">Velocity (1h)</dt>
                                    <dd className="font-mono font-bold text-text-primary">{txn.velocity1h}</dd>
                                </div>
                                <div className="p-2.5 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-[10px] text-text-muted">Payee</dt>
                                    <dd className="font-mono font-bold text-text-primary">{txn.isNewPayee ? 'New' : 'Known'}</dd>
                                </div>
                                <div className="p-2.5 rounded-lg bg-surface-sunken border border-border">
                                    <dt className="text-[10px] text-text-muted">Routing</dt>
                                    <dd className="font-mono font-bold text-text-primary">
                                        {txn.isInternational ? 'Cross-border' : 'Domestic'}
                                    </dd>
                                    <dd className="text-[10px] text-text-muted mt-0.5">{String(txn.hour).padStart(2, '0')}:00</dd>
                                </div>
                            </dl>
                        </div>

                        <p className="text-[11px] text-text-muted">
                            Shown payment is one step of a {sim.sequence.total}-payment sequence.
                        </p>
                    </section>

                    {/* Blue team */}
                    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm space-y-4">
                        <header className="flex items-center justify-between pb-3 border-b border-border">
                            <div>
                                <h2 className="text-sm font-bold text-text-primary">Blue team · scorer verdict</h2>
                                <p className="text-xs text-emerald-400 font-mono mt-0.5">Legacy rules vs hardened scorer</p>
                            </div>
                            <span className="px-2.5 py-1 rounded-md text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                                STEP 2
                            </span>
                        </header>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="p-3.5 rounded-xl bg-surface-sunken border border-border space-y-2">
                                <p className="text-[11px] font-mono font-bold text-text-muted uppercase">Legacy rules</p>
                                <p className={`text-xs font-bold ${verdict.legacy.flagged ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {verdict.legacy.flagged ? '✓ Flagged' : '✗ Missed'}
                                </p>
                                <ul className="text-[11px] text-text-secondary space-y-0.5">
                                    {verdict.legacy.reasons.map((r, i) => <li key={i}>· {r}</li>)}
                                </ul>
                            </div>

                            <div className="p-3.5 rounded-xl bg-surface-sunken border-2 border-emerald-500/40 space-y-2">
                                <div className="flex items-center justify-between">
                                    <p className="text-[11px] font-mono font-bold text-emerald-400 uppercase">Hardened</p>
                                    <span className="font-mono text-xs font-bold text-text-primary">
                                        {verdict.hardened.score.toFixed(2)}
                                    </span>
                                </div>
                                <p className={`text-xs font-bold ${verdict.hardened.flagged ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {verdict.hardened.flagged ? `✓ ${verdict.hardened.action.toUpperCase()}` : '✗ Missed'}
                                </p>
                                <p className="text-[11px] text-text-muted">
                                    Confidence {verdict.hardened.confidenceLevel}
                                </p>
                            </div>
                        </div>

                        {verdict.demonstratesGap && (
                            <p className="text-[11px] text-emerald-400 font-semibold">
                                This payment is exactly the gap: under the flat thresholds it passes,
                                but against this account&apos;s own baseline it does not.
                            </p>
                        )}

                        <div>
                            <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-2">
                                What drove the score
                            </p>
                            <div className="space-y-1.5">
                                {Object.entries(verdict.hardened.contributions).length === 0 && (
                                    <p className="text-[11px] text-text-muted">No signal cleared its reporting floor.</p>
                                )}
                                {Object.entries(verdict.hardened.contributions)
                                    .sort((a, b) => b[1] - a[1])
                                    .map(([feature, weight]) => (
                                        <div key={feature} className="flex items-center gap-2 text-xs">
                                            <span className="w-28 shrink-0 text-text-secondary capitalize">
                                                {feature.replaceAll('_', ' ')}
                                            </span>
                                            <div className="flex-1 h-2 rounded-full bg-surface-sunken overflow-hidden border border-border">
                                                <div
                                                    className="h-full bg-rose-400"
                                                    style={{ width: `${Math.min(100, (weight / 0.35) * 100)}%` }}
                                                />
                                            </div>
                                            <span className="font-mono font-bold text-rose-400 w-12 text-right">
                                                +{weight.toFixed(2)}
                                            </span>
                                        </div>
                                    ))}
                            </div>
                        </div>

                        <p className="text-[11px] text-text-muted pt-1 border-t border-border">
                            Across the full sequence: legacy caught {sim.sequence.caughtByLegacy},
                            hardened caught {sim.sequence.caughtByHardened}, of {sim.sequence.total}.
                        </p>
                    </section>
                </div>
            ) : (
                !busy && (
                    <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                        <p className="text-sm font-semibold text-text-primary">No simulation yet</p>
                        <p className="text-xs text-text-muted mt-1">
                            Pick a vector and target, then run the simulation.
                        </p>
                    </div>
                )
            )}

            {/* ── Measured benchmark ────────────────────────────────── */}
            <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                        <h2 className="text-sm font-bold text-text-primary">Measured detector comparison</h2>
                        <p className="text-xs text-text-muted mt-0.5">
                            Both detectors run over one labelled corpus of synthetic fraud and
                            legitimate traffic. These are the resulting confusion-matrix figures.
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={runBenchmark}
                        disabled={benchmarkBusy}
                        className="px-4 py-2.5 rounded-lg border border-border bg-surface-sunken hover:bg-surface-hover text-text-primary font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                        {benchmarkBusy ? 'Evaluating…' : benchmark ? 'Re-run benchmark' : 'Run benchmark'}
                    </button>
                </div>

                {benchmark ? (
                    <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Metric
                                label="Legacy recall"
                                value={pct(benchmark.legacy.recall)}
                                note={`${benchmark.legacy.truePositives}/${benchmark.legacy.truePositives + benchmark.legacy.falseNegatives} caught`}
                                tone="rose"
                            />
                            <Metric
                                label="Hardened recall"
                                value={pct(benchmark.hardened.recall)}
                                note={`${pct(benchmark.recallDelta)} better`}
                                tone="emerald"
                            />
                            <Metric
                                label="Fraud value recovered"
                                value={money(benchmark.recoveredValue)}
                                note={`of ${money(benchmark.corpus.fraudValue)} in corpus`}
                            />
                            <Metric
                                label="False positives"
                                value={pct(benchmark.hardened.falsePositiveRate, 2)}
                                note={`legacy ${pct(benchmark.legacy.falsePositiveRate, 2)}`}
                                tone={benchmark.frictionDelta <= 0 ? 'emerald' : 'amber'}
                            />
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr>
                                        <th className="text-left px-3 py-2">Detector</th>
                                        <th className="text-right px-3 py-2">Recall</th>
                                        <th className="text-right px-3 py-2">Precision</th>
                                        <th className="text-right px-3 py-2">F1</th>
                                        <th className="text-right px-3 py-2">False positive rate</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {[['Legacy static rules', benchmark.legacy], ['Hardened scorer', benchmark.hardened]].map(([name, m]) => (
                                        <tr key={name} className="border-t border-border">
                                            <td className="px-3 py-2 font-semibold">{name}</td>
                                            <td className="px-3 py-2 text-right font-mono">{pct(m.recall)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{pct(m.precision)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{pct(m.f1)}</td>
                                            <td className="px-3 py-2 text-right font-mono">{pct(m.falsePositiveRate, 2)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <p className="text-[11px] text-text-muted leading-relaxed">
                            Corpus: {benchmark.corpus.fraudulent.toLocaleString()} synthetic fraudulent and{' '}
                            {benchmark.corpus.legitimate.toLocaleString()} legitimate payments, seed {benchmark.seed}.
                            Legacy = {benchmark.provenance.legacyModel}. Hardened = {benchmark.provenance.hardenedModel}.
                            Recovered value is fraud the hardened scorer stops and the legacy rules do not,
                            within this corpus — it is not a monthly projection.
                        </p>
                    </>
                ) : (
                    !benchmarkBusy && (
                        <p className="text-xs text-text-muted">
                            Run the benchmark to measure both detectors. It scores several hundred
                            payments, so it takes a moment.
                        </p>
                    )
                )}
            </section>
        </div>
    )
}

function Metric({ label, value, note, tone }) {
    const toneClass = { emerald: 'text-emerald-400', rose: 'text-rose-400', amber: 'text-amber-400' }[tone] || 'text-text-primary'
    return (
        <div className="p-3.5 rounded-xl bg-surface-sunken border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">{label}</span>
            <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${toneClass}`}>{value}</p>
            {note && <span className="text-[10px] text-text-muted">{note}</span>}
        </div>
    )
}
