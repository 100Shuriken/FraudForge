import { useState, useEffect, useCallback } from 'react'

const VECTORS = [
    { id: 'voice-clone', name: 'Voice Cloning' },
    { id: 'deepfake-video', name: 'Deepfake Video Call' },
    { id: 'synthetic-identity', name: 'Synthetic KYC Fraud' },
    { id: 'bec-email', name: 'Business Email Compromise' },
    { id: 'fake-ecommerce', name: 'Fake E-Commerce Store' },
    { id: 'fake-chatbot', name: 'Fake AI Support Bot' },
]

const pct = (v, d = 0) => (v == null ? '—' : `${(Number(v) * 100).toFixed(d)}%`)
const money = (v) => (v == null ? '—' : `$${Number(v).toLocaleString(undefined, { maximumFractionDigits: 0 })}`)
const clock = (iso) => {
    try {
        return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    } catch {
        return '—'
    }
}

const describeError = (err) => {
    const m = err?.message || String(err)
    return /failed to fetch|networkerror|load failed/i.test(m)
        ? 'Cannot reach the FraudForge API. Start the backend with:  uvicorn main:app --reload --port 8000'
        : m
}

export default function IncidentReport() {
    const [customers, setCustomers] = useState([])
    const [targetId, setTargetId] = useState('C0001')
    const [vector, setVector] = useState('voice-clone')
    const [report, setReport] = useState(null)
    const [busy, setBusy] = useState(false)
    const [error, setError] = useState(null)

    useEffect(() => {
        fetch('/api/customers')
            .then(r => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
            .then(data => {
                if (Array.isArray(data) && data.length) {
                    setCustomers(data)
                    setTargetId(prev => (data.some(c => c.customer_id === prev) ? prev : data[0].customer_id))
                }
            })
            .catch(err => setError(describeError(err)))
    }, [])

    const generate = useCallback(async () => {
        setBusy(true)
        setError(null)
        try {
            const res = await fetch('/api/incident/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ target_id: targetId, vector }),
            })
            if (!res.ok) throw new Error(`Report failed — HTTP ${res.status}`)
            setReport(await res.json())
        } catch (err) {
            setReport(null)
            setError(describeError(err))
        } finally {
            setBusy(false)
        }
    }, [targetId, vector])

    useEffect(() => {
        if (customers.length && !report) generate()
        // Only auto-generate the first report; after that it is on demand.
    }, [customers.length]) // eslint-disable-line react-hooks/exhaustive-deps

    const s = report?.summary

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            {error && (
                <div role="alert" className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 flex items-start gap-3">
                    <span className="text-lg leading-none mt-0.5" aria-hidden="true">⚠️</span>
                    <p className="text-xs text-amber-100/90 flex-1 break-words">{error}</p>
                </div>
            )}

            {/* ── Controls ──────────────────────────────────────────── */}
            <div className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-4">
                <div>
                    <span className="px-2.5 py-0.5 rounded-md text-[11px] font-bold font-mono bg-indigo-500/15 text-indigo-400 border border-indigo-500/30">
                        FULL INCIDENT REPORT
                    </span>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary mt-2">
                        One attack, start to finish
                    </h1>
                    <p className="text-xs text-text-muted mt-1.5 max-w-2xl">
                        Who was targeted, why this attack was chosen, what was sent, what each
                        detector said, what got through, and what the model learned from the
                        misses — computed in a single pass so every section describes the same run.
                    </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                    <div>
                        <label htmlFor="report-target" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block mb-1.5">
                            Target account
                        </label>
                        <select
                            id="report-target"
                            value={targetId}
                            onChange={e => setTargetId(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary cursor-pointer"
                        >
                            {customers.map(c => (
                                <option key={c.customer_id} value={c.customer_id}>
                                    {c.name ? `${c.name} · ` : ''}{c.customer_id} · {c.city}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="report-vector" className="text-[11px] font-bold uppercase tracking-wider text-text-secondary block mb-1.5">
                            Threat vector
                        </label>
                        <select
                            id="report-vector"
                            value={vector}
                            onChange={e => setVector(e.target.value)}
                            className="w-full px-3 py-2.5 rounded-lg border border-border bg-surface text-sm text-text-primary cursor-pointer"
                        >
                            {VECTORS.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                        </select>
                    </div>

                    <button
                        type="button"
                        onClick={generate}
                        disabled={busy || !customers.length}
                        data-tour="generate-report-btn"
                        className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs uppercase tracking-wider transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {busy ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                Building…
                            </>
                        ) : 'Generate incident report'}
                    </button>
                </div>
            </div>

            {report && s && (
                <>
                    {/* ── Header ─────────────────────────────────────── */}
                    <div data-tour="report-summary" className="p-6 rounded-2xl bg-surface border border-border shadow-sm space-y-5">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border">
                            <div>
                                <h2 className="text-lg font-extrabold text-text-primary font-mono">{report.incidentId}</h2>
                                <p className="text-xs text-text-secondary mt-1">
                                    {report.target.name} ({report.target.customer_id}) · {report.target.city} ·{' '}
                                    <span className="font-mono">{report.attack.family.replaceAll('_', ' ')}</span>
                                </p>
                            </div>
                            <div className="text-left sm:text-right">
                                <p className="text-[11px] text-text-muted">Generated {clock(report.generatedAt)}</p>
                                <p className="text-[11px] text-text-muted font-mono">seed {report.seed}</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                            <Tile label="Payments sent" value={s.total} note={money(s.valueTotal)} />
                            <Tile label="Hardened caught" value={`${s.hardenedCaught}/${s.total}`} note={pct(s.detectionRate)} tone="emerald" />
                            <Tile label="Legacy caught" value={`${s.legacyCaught}/${s.total}`} note={pct(s.legacyDetectionRate)} tone="rose" />
                            <Tile label="Value through" value={money(s.valueThrough)} note={`legacy let ${money(s.valueThroughLegacy)} through`} tone="amber" />
                        </div>

                        <blockquote className="text-xs text-text-secondary italic bg-surface-sunken p-3 rounded-lg border border-border">
                            {report.attack.lure}
                        </blockquote>
                    </div>

                    {/* ── Phase timeline ─────────────────────────────── */}
                    <div data-tour="report-phases" className="space-y-3">
                        {report.phases.map((phase, i) => (
                            <section key={phase.id} className="p-5 rounded-2xl bg-surface border border-border shadow-sm">
                                <div className="flex items-start gap-4">
                                    <span
                                        aria-hidden="true"
                                        className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 font-mono text-xs font-bold"
                                    >
                                        {i + 1}
                                    </span>
                                    <div className="min-w-0 flex-1 space-y-2.5">
                                        <div>
                                            <h3 className="text-sm font-bold text-text-primary">{phase.title}</h3>
                                            <p className="text-sm font-semibold text-indigo-400 mt-0.5">{phase.headline}</p>
                                        </div>
                                        <p className="text-xs text-text-secondary leading-relaxed">{phase.detail}</p>
                                        {phase.facts.length > 0 && (
                                            <dl className="flex flex-wrap gap-2 pt-1">
                                                {phase.facts.map((f, j) => (
                                                    <div key={j} className="px-2.5 py-1.5 rounded-lg bg-surface-sunken border border-border">
                                                        <dt className="text-[10px] text-text-muted">{f.label}</dt>
                                                        <dd className="text-xs font-mono font-bold text-text-primary">{f.value}</dd>
                                                    </div>
                                                ))}
                                            </dl>
                                        )}
                                    </div>
                                </div>
                            </section>
                        ))}
                    </div>

                    {/* ── Payment ledger ─────────────────────────────── */}
                    <section data-tour="report-ledger" className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
                        <div>
                            <h3 className="text-sm font-bold text-text-primary">Payment-by-payment ledger</h3>
                            <p className="text-xs text-text-muted mt-0.5">
                                Every payment in the sequence, with what each detector decided and why.
                            </p>
                        </div>

                        <div className="overflow-x-auto rounded-xl border border-border">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr>
                                        <th className="text-left px-3 py-2">#</th>
                                        <th className="text-left px-3 py-2">Time</th>
                                        <th className="text-right px-3 py-2">Amount</th>
                                        <th className="text-right px-3 py-2">vs base</th>
                                        <th className="text-right px-3 py-2">Vel</th>
                                        <th className="text-right px-3 py-2">Risk</th>
                                        <th className="text-left px-3 py-2">Hardened</th>
                                        <th className="text-left px-3 py-2">Legacy</th>
                                        <th className="text-left px-3 py-2">Why</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {report.payments.map(p => (
                                        <tr key={p.id} className="border-t border-border align-top">
                                            <td className="px-3 py-2 font-mono text-text-muted">{p.step}</td>
                                            <td className="px-3 py-2 font-mono text-text-muted">{clock(p.at)}</td>
                                            <td className="px-3 py-2 text-right font-mono font-bold">${p.amount.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right font-mono text-text-secondary">{p.amountRatio}×</td>
                                            <td className="px-3 py-2 text-right font-mono text-text-secondary">{p.velocity}</td>
                                            <td className="px-3 py-2 text-right font-mono font-bold">{p.riskScore.toFixed(2)}</td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    p.action === 'BLOCK' ? 'bg-emerald-500/15 text-emerald-400'
                                                        : p.action === 'STEP_UP_AUTH' ? 'bg-amber-500/15 text-amber-400'
                                                        : 'bg-rose-500/15 text-rose-400'
                                                }`}>
                                                    {p.action === 'STEP_UP_AUTH' ? 'STEP-UP' : p.action}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                                    p.legacyFlagged ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'
                                                }`}>
                                                    {p.legacyFlagged ? 'FLAG' : 'MISS'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-text-secondary max-w-[18rem]">
                                                {p.reasons.join(', ')}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* ── Retraining ─────────────────────────────────── */}
                    {report.retraining && (
                        <section data-tour="report-retraining" className="p-5 rounded-2xl bg-surface border border-border shadow-sm space-y-3">
                            <div>
                                <h3 className="text-sm font-bold text-text-primary">What the defender learned</h3>
                                <p className="text-xs text-text-muted mt-0.5">
                                    Three rounds against one fixed held-out split, so the rounds are comparable.
                                </p>
                            </div>

                            <div className="overflow-x-auto rounded-xl border border-border">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr>
                                            <th className="text-left px-3 py-2">Round</th>
                                            <th className="text-right px-3 py-2">Recall</th>
                                            <th className="text-right px-3 py-2">Precision</th>
                                            <th className="text-right px-3 py-2">F1</th>
                                            <th className="text-right px-3 py-2">AUC</th>
                                            <th className="text-right px-3 py-2">Mined</th>
                                            <th className="text-left px-3 py-2">What changed</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {report.retraining.rounds.map(r => (
                                            <tr key={r.round} className="border-t border-border align-top">
                                                <td className="px-3 py-2 font-mono font-bold">{r.round}</td>
                                                <td className="px-3 py-2 text-right font-mono font-bold text-emerald-400">{pct(r.recall, 1)}</td>
                                                <td className="px-3 py-2 text-right font-mono">{pct(r.precision, 1)}</td>
                                                <td className="px-3 py-2 text-right font-mono">{pct(r.f1, 1)}</td>
                                                <td className="px-3 py-2 text-right font-mono">{r.auc.toFixed(3)}</td>
                                                <td className="px-3 py-2 text-right font-mono text-text-secondary">
                                                    {r.adversarialSamplesAdded || '—'}
                                                </td>
                                                <td className="px-3 py-2 text-text-secondary">{r.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="p-3 rounded-lg bg-surface-sunken border border-border">
                                <p className="text-[11px] font-bold uppercase tracking-wider text-text-secondary mb-1">
                                    Where the attacker goes next
                                </p>
                                <p className="text-xs text-text-secondary leading-relaxed">
                                    {report.retraining.evasionAdvice.text}
                                </p>
                            </div>

                            <p className="text-[11px] text-text-muted leading-relaxed pt-1 border-t border-border">
                                {report.retraining.provenance.model}. Decision threshold{' '}
                                {report.retraining.provenance.threshold}. {report.retraining.provenance.note}{' '}
                                All data is synthetic.
                            </p>
                        </section>
                    )}
                </>
            )}

            {!report && !busy && !error && (
                <div className="rounded-2xl border border-dashed border-border bg-surface p-10 text-center">
                    <p className="text-sm font-semibold text-text-primary">No report yet</p>
                    <p className="text-xs text-text-muted mt-1">Pick a target and vector, then generate one.</p>
                </div>
            )}
        </div>
    )
}

function Tile({ label, value, note, tone }) {
    const toneClass = { emerald: 'text-emerald-400', rose: 'text-rose-400', amber: 'text-amber-400' }[tone] || 'text-text-primary'
    return (
        <div className="p-3.5 rounded-xl bg-surface-sunken border border-border">
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-muted block">{label}</span>
            <p className={`text-xl sm:text-2xl font-black font-mono mt-1 ${toneClass}`}>{value}</p>
            {note && <span className="text-[10px] text-text-muted">{note}</span>}
        </div>
    )
}
