import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { createDemoTraining } from '../data/demoData.js'
import { useAttackContext } from '../context/AttackContext.jsx'
import ExplainTerm from '../components/ExplainTerm.jsx'

export default function Adapt() {
    const { selectedVector, latestGenerateOutput, latestLabRun, latestTraining } = useAttackContext()
    const [training, setTraining] = useState(latestTraining || null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (!training && latestTraining) {
            setTraining(latestTraining)
        }
    }, [latestTraining, training])

    async function handleAdapt() {
        setLoading(true)
        try {
            const response = await fetch('/api/train', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    labRunId: latestLabRun?.runId || null,
                    labRecords,
                }),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            setTraining(await response.json())
        } catch {
            setTraining(createDemoTraining())
        } finally {
            setLoading(false)
        }
    }

    const falseNegatives = training?.falseNegatives?.samples || training?.flaggedTransactions || []
    const generatedPayment = latestGenerateOutput?.payment
    const generatedCandidate = generatedPayment ? {
        ...generatedPayment.features,
        amount: generatedPayment.amount,
        payee: generatedPayment.payee,
        vector: selectedVector,
        scenario: latestGenerateOutput.payment?.scenario,
        predicted_fraud_prob: null,
    } : null
    const labRecords = latestLabRun?.records || []
    const labCandidates = labRecords.map(record => ({
        amount: record.amount,
        hour: record.hour,
        txn_velocity_1h: record.signal?.includes('txn/hr') ? Number.parseInt(record.signal, 10) : 1,
        is_new_payee: record.attackType === 'device_switch' || record.attackType === 'account_takeover' ? 1 : 0,
        is_international: record.attackType === 'account_takeover' ? 1 : 0,
        predicted_fraud_prob: record.riskScore,
    }))
    const linkedFalseNegatives = [...labCandidates, ...(generatedCandidate ? [generatedCandidate] : []), ...falseNegatives]
    const advice = training?.evasionAdvice
    const harderBatch = buildHarderPreview(linkedFalseNegatives)

    return (
        <div className="max-w-7xl mx-auto px-6 py-10">
            <div className="max-w-3xl mb-8">
                <div className="flex items-center gap-3 mb-3">
                    <div className="h-8 w-1 rounded-full bg-accent-red" />
                    <h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Adapt the Attack</h1>
                </div>
                <p className="text-text-secondary text-base leading-relaxed ml-4">
                    A defender's miss becomes the next red-team input. Inspect the transactions that slipped through, read the evasion reasoning, then preview the harder synthetic batch sent into the next training round.
                </p>
                <p className="text-xs text-text-muted mt-3 ml-4">Run adaptation once, then read the three panels from top to bottom: miss, reasoning, harder challenge.</p>
            </div>

            {!training && (
                <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-amber-300 mb-2">No adaptation run yet</p>
                        <p className="text-sm text-text-secondary">Run the defender pipeline to bring misses into this stage{selectedVector ? ` for ${selectedVector}` : ''}.</p>
                    </div>
                    <button data-tour="adapt-action-btn" onClick={handleAdapt} disabled={loading} className="shrink-0 px-5 py-3 rounded-lg bg-accent-red hover:bg-accent-red-dark text-white font-semibold text-sm disabled:opacity-50 cursor-pointer">
                        {loading ? 'Analyzing misses…' : '⚙ Run Adaptation'}
                    </button>
                </div>
            )}

            {training && (
                <div className="space-y-6">
                    {training.labBatch?.recordsIncluded > 0 && (
                        <div className="rounded-lg border border-[var(--signal-cyan)]/30 bg-[var(--signal-cyan)]/5 px-4 py-3 text-sm text-text-secondary">
                            <span className="font-bold text-[var(--signal-cyan)]">Lab batch included:</span>{' '}
                            {training.labBatch.recordsIncluded} synthetic records added to Round 1 augmented training
                            {training.labBatch.runId ? ` · ${training.labBatch.runId}` : ''}.
                        </div>
                    )}
                    <section data-tour="false-negatives-table" className="rounded-xl border border-border bg-surface overflow-hidden">
                        <SectionHeading step="01" title={<>Missed transactions <ExplainTerm term="False negative" context="Adapt stage missed transaction review" /></>} detail={`${linkedFalseNegatives.length} samples${latestLabRun ? ' · includes the latest lab batch' : ''}${selectedVector ? ` linked to ${selectedVector}` : ''}`} />
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead><tr className="border-b border-border text-left text-xs uppercase tracking-wider text-text-muted"><th className="px-6 py-3">Amount</th><th className="px-6 py-3">Hour</th><th className="px-6 py-3">Velocity</th><th className="px-6 py-3">New payee</th><th className="px-6 py-3">Fraud probability</th></tr></thead>
                                <tbody>{linkedFalseNegatives.slice(0, 8).map((txn, index) => <tr key={index} className="border-b border-border/50"><td className="px-6 py-3 font-mono text-text-primary">${Number(txn.amount || 0).toFixed(2)}</td><td className="px-6 py-3 text-text-secondary">{txn.hour ?? '—'}:00</td><td className="px-6 py-3 text-text-secondary">{txn.txn_velocity_1h ?? '—'} txn/hr</td><td className="px-6 py-3 text-text-secondary">{txn.is_new_payee ? 'Yes' : 'No'}</td><td className="px-6 py-3 font-mono text-accent-red-light">{txn.predicted_fraud_prob != null ? `${(txn.predicted_fraud_prob * 100).toFixed(0)}%` : generatedCandidate && index === 0 ? 'Generated candidate' : 'Near miss'}</td></tr>)}</tbody>
                            </table>
                        </div>
                    </section>

                    <section data-tour="evasion-advice-panel" className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-6">
                        <SectionHeading step="02" title={<>Evasion reasoning <ExplainTerm term="Evasion reasoning" context="Adapt stage defensive training" /></>} detail="How the missed pattern is adjusted for the next challenge" />
                        <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">{advice?.text || 'The evasion analysis is not available for this run.'}</p>
                    </section>

                    <section data-tour="harder-batch-preview" className="rounded-xl border border-accent-red/30 bg-accent-red/5 overflow-hidden">
                        <SectionHeading step="03" title="Harder batch preview" detail="Derived from the miss pattern before the next defender round" />
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-6 pt-0">
                            {harderBatch.map((txn, index) => <div key={index} className="rounded-lg border border-border bg-surface p-4"><p className="text-xs uppercase tracking-wider text-text-muted mb-3">Synthetic row {String(index + 1).padStart(2, '0')}</p><p className="text-lg font-mono font-bold text-text-primary mb-2">${txn.amount.toFixed(2)}</p><p className="text-xs text-text-secondary">Hour {txn.hour}:00 · {txn.txn_velocity_1h} txn/hr · {txn.is_new_payee ? 'new payee' : 'known payee'} · {txn.is_international ? 'international' : 'domestic'}</p></div>)}
                        </div>
                    </section>

                    <div className="flex justify-end"><Link data-tour="retrain-defend-btn" to="/defend" className="rounded-lg bg-accent-red px-4 py-2.5 text-sm font-bold text-white hover:bg-accent-red-dark">Continue to Defend →</Link></div>
                </div>
            )}
        </div>
    )
}

function SectionHeading({ step, title, detail }) {
    return <div className="px-6 py-5 border-b border-border flex items-start gap-4"><span className="font-mono text-xs text-accent-red-light">{step}</span><div><h2 className="text-base font-bold text-text-primary">{title}</h2><p className="text-xs text-text-muted mt-1">{detail}</p></div></div>
}

function buildHarderPreview(samples) {
    const source = samples.length ? samples : [{ amount: 412.8, hour: 3, txn_velocity_1h: 5, is_new_payee: 1, is_international: 1 }]
    return source.slice(0, 3).map((txn, index) => ({ amount: Number(txn.amount || 250) * (0.72 + index * 0.08), hour: (Number(txn.hour ?? 6) + index * 2) % 24, txn_velocity_1h: Math.max(2, Number(txn.txn_velocity_1h || 3) - index), is_new_payee: txn.is_new_payee ?? 1, is_international: txn.is_international ?? index % 2 }))
}