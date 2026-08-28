import { useState, useCallback, useRef } from 'react'
import { useAttackContext } from '../context/AttackContext.jsx'
import ExplainTerm from '../components/ExplainTerm.jsx'
import TypewriterText from '../components/TypewriterText.jsx'
import ShapWaterfall from '../components/ShapWaterfall.jsx'
import SarReportModal from '../components/SarReportModal.jsx'
import CounterfactualExplainer from '../components/CounterfactualExplainer.jsx'

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmt(n) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n)
}

function fmtTime(iso) {
    try {
        return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    } catch { return iso }
}

function fmtDate(iso) {
    try {
        return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch { return iso }
}

const CHANNEL_LABEL = {
    bank_transfer: 'Bank Transfer',
    card_checkout: 'Card Checkout',
    digital_wallet: 'Digital Wallet',
}

// ─── Step container ───────────────────────────────────────────────────────────

function StepShell({ num, label, children, loading }) {
    return (
        <div className="relative">
            {/* connector line */}
            {num < 4 && (
                <div className="absolute left-4 top-[3rem] bottom-[-1.5rem] w-px bg-white/10 z-0" />
            )}
            <div className="relative z-10 flex gap-4">
                {/* step badge */}
                <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-mono text-xs font-bold bg-slate-800 border border-white/15 text-slate-200 shadow-sm">
                    {num}
                </div>
                <div className="flex-1 min-w-0 pb-10">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">{label}</p>
                    {loading
                        ? <LoadingPulse />
                        : children}
                </div>
            </div>
        </div>
    )
}

function LoadingPulse() {
    return (
        <div className="flex items-center gap-2.5 p-4 rounded-xl border border-white/10 bg-slate-900/60">
            <span className="live-dot" />
            <span className="text-xs text-slate-400 font-mono">Generating telemetry…</span>
        </div>
    )
}

// ─── Step 1 — Persona card ────────────────────────────────────────────────────

function PersonaCard({ p, trustHistory, retainPersona }) {
    const h = p.accountHistory
    const latestTrust = trustHistory?.[trustHistory.length - 1]?.score ?? 85
    const trustTier = latestTrust >= 75 ? 'High Trust' : latestTrust >= 50 ? 'Moderate Risk' : 'High Risk'
    const trustColor = latestTrust >= 75
        ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
        : latestTrust >= 50
        ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
        : 'text-rose-300 border-rose-500/30 bg-rose-500/10'

    return (
        <div className="rounded-xl border border-white/10 bg-slate-900/80 backdrop-blur-md p-5 space-y-4 shadow-md">
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                    <h2 className="text-lg font-bold text-white tracking-tight">{p.name}</h2>
                    <p className="text-xs text-slate-400 mt-0.5">{p.occupation} · Age {p.age}</p>
                </div>
                <div className="flex items-center gap-2">
                    {/* Persona Trust Score Badge (Milestone 8) */}
                    <div className={`px-2.5 py-1 rounded-full text-xs font-bold font-mono border flex items-center gap-1.5 ${trustColor}`}>
                        <span>🛡 Trust: {latestTrust}/100</span>
                        <span className="text-[10px] uppercase font-sans font-medium">({trustTier})</span>
                    </div>
                    {retainPersona && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                            Locked Target
                        </span>
                    )}
                </div>
            </div>

            {/* Trust Score Drift History (Milestone 8) */}
            {trustHistory && trustHistory.length > 1 && (
                <div className="rounded-lg border border-white/5 bg-slate-950/70 p-3 space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                        <span>Trust Score Drift ({trustHistory.length} Replay Runs)</span>
                        <span className="text-indigo-300 font-mono">Δ {latestTrust - trustHistory[0].score >= 0 ? `+${latestTrust - trustHistory[0].score}` : latestTrust - trustHistory[0].score} pts</span>
                    </div>
                    <div className="flex items-center gap-1.5 overflow-x-auto py-1">
                        {trustHistory.map((item, idx) => (
                            <div key={idx} className="flex items-center gap-1 shrink-0">
                                <span className={`px-2 py-0.5 rounded font-mono text-[11px] font-semibold border ${item.score >= 75 ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : item.score >= 50 ? 'bg-amber-500/10 border-amber-500/30 text-amber-300' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'}`}>
                                    R{idx + 1}: {item.score}
                                </span>
                                {idx < trustHistory.length - 1 && <span className="text-slate-600 text-xs">→</span>}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <StatBox label="Account Balance" value={fmt(p.balance)} />
                <StatBox label="Avg Single Txn" value={fmt(h.avgSingleTxnAmount)} />
                <StatBox label="Preferred Channel" value={CHANNEL_LABEL[h.preferredChannel] ?? h.preferredChannel} />
                <StatBox label="Account Age" value={`${h.monthsAccountAge}mo`} />
            </div>

            <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">Usual Payees</p>
                <div className="flex flex-wrap gap-1.5">
                    {h.usualPayees.map((pay, i) => (
                        <span key={i} className="px-2 py-0.5 rounded text-[11px] font-mono text-slate-300 bg-slate-800 border border-white/5">
                            {pay}
                        </span>
                    ))}
                </div>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>📱 {p.deviceProfile.os} · {p.deviceProfile.browser}</span>
                <span>📍 {p.deviceProfile.city}, {p.deviceProfile.country}</span>
                <span>⏰ Active ~{h.typicalHour}:00</span>
            </div>
        </div>
    )
}

function StatBox({ label, value }) {
    return (
        <div className="rounded-lg border border-white/5 bg-slate-950/60 px-3 py-2">
            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">{label}</p>
            <p className="text-xs font-semibold text-white font-mono">{value}</p>
        </div>
    )
}

// ─── Step 2 — Mock email inbox ────────────────────────────────────────────────

function MockEmailInbox({ message, persona }) {
    // derive fake sender / subject from the generated content
    const lines = (message.content || '').split('\n').filter(Boolean)
    const subjectLine = lines.find(l => l.toLowerCase().startsWith('subject:')) || ''
    const subject = subjectLine
        ? subjectLine.replace(/^subject:\s*/i, '')
        : message.title || 'Urgent: Action Required'

    const fromLine = lines.find(l => l.toLowerCase().startsWith('from:')) || ''
    const from = fromLine
        ? fromLine.replace(/^from:\s*/i, '')
        : 'noreply@secure-banking[.]verify-id[.]com'

    // strip the SYNTHETIC prefix and From/Subject header lines for the body display
    const bodyLines = lines.filter(l =>
        !l.startsWith('[SYNTHETIC') &&
        !l.toLowerCase().startsWith('from:') &&
        !l.toLowerCase().startsWith('subject:')
    )
    const body = bodyLines.join('\n').trim()

    const receivedAt = message.payment?.timestamp ?? new Date().toISOString()
    const [testEmail, setTestEmail] = useState('')
    const [sendState, setSendState] = useState('idle') // idle, sending, sent, error
    const [sendError, setSendError] = useState('')

    const handleSendTestEmail = async () => {
        if (!testEmail) return
        setSendState('sending')
        setSendError('')
        try {
            const res = await fetch('/api/replay/email', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: testEmail, subject, body }),
            })
            if (!res.ok) {
                const detail = await res.json().catch(() => null)
                throw new Error(detail?.detail || 'Safe test email could not be sent')
            }
            setSendState('sent')
            setTimeout(() => setSendState('idle'), 3000)
        } catch (err) {
            setSendState('error')
            setSendError(err.message)
            setTimeout(() => setSendState('idle'), 3000)
        }
    }

    return (
        <div className="rounded-xl border border-border overflow-hidden"
            style={{ background: '#0d1a2e' }}>
            {/* toolbar mockup */}
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50"
                style={{ background: '#091220' }}>
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
                <span className="ml-3 text-[10px] font-mono text-text-muted">Inbox — {persona.email}</span>
            </div>

            {/* email header strip */}
            <div className="px-5 py-3 border-b border-border/50 space-y-1">
                <p className="text-[11px] font-mono text-text-muted">
                    <span className="text-text-secondary font-semibold">From: </span>{from}
                </p>
                <p className="text-[11px] font-mono text-text-muted">
                    <span className="text-text-secondary font-semibold">To: </span>{persona.email}
                </p>
                <p className="text-[11px] font-mono text-text-muted">
                    <span className="text-text-secondary font-semibold">Date: </span>
                    {fmtDate(receivedAt)} {fmtTime(receivedAt)}
                </p>
                <p className="text-sm font-bold text-text-primary mt-1">{subject}</p>
            </div>

            {/* Optional presenter test: sends only a harmless labeled notification. */}
            <div className="px-5 py-2.5 border-b border-border/50 flex items-center justify-between gap-3 bg-surface-hover/30">
                <p className="text-[10px] uppercase font-bold tracking-wider text-text-muted">Hackathon Test — Safe Email</p>
                <div className="flex flex-1 max-w-sm gap-2">
                    <input
                        type="email"
                        value={testEmail}
                        onChange={(e) => setTestEmail(e.target.value)}
                        placeholder="Optional test recipient..."
                        className="flex-1 bg-surface border border-border rounded px-3 py-1.5 text-xs text-text-primary outline-none focus:border-accent-red/50 transition-colors"
                    />
                    <button
                        onClick={handleSendTestEmail}
                        disabled={!testEmail || sendState === 'sending'}
                        className="px-4 py-1.5 rounded bg-navy-800 border border-border text-xs font-semibold hover:bg-navy-700 disabled:opacity-50 transition-colors"
                        style={{ color: sendState === 'error' ? '#ff6b6b' : sendState === 'sent' ? 'var(--signal-green)' : 'var(--signal-cyan)' }}
                    >
                        {sendState === 'sending' ? 'Sending...' : sendState === 'sent' ? 'Sent!' : sendState === 'error' ? 'Error' : 'Send Safe Test'}
                    </button>
                </div>
            </div>
            {sendError && (
                <p className="px-5 py-2 text-[11px] text-accent-red border-b border-border/50">
                    {sendError}
                </p>
            )}

            {/* email body */}
            <div className="px-5 py-4">
                <div className="text-xs leading-relaxed text-text-secondary whitespace-pre-wrap font-mono">
                    <TypewriterText text={body} />
                </div>
            </div>

            {/* risk indicators banner */}
            {message.riskIndicators?.length > 0 && (
                <div className="px-5 py-3 border-t border-accent-red/20"
                    style={{ background: 'rgba(230,57,70,0.06)' }}>
                    <p className="text-[9px] font-bold uppercase tracking-wider text-accent-red mb-1.5">
                        🔍 Social Engineering Indicators Detected
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {message.riskIndicators.map((ind, i) => (
                            <span key={i} className="px-2.5 py-1 rounded text-[10px] font-mono animate-popIn"
                                style={{ background: 'rgba(230,57,70,0.12)', color: '#ff6b6b', border: '1px solid rgba(230,57,70,0.25)', animationDelay: `${i * 120}ms` }}>
                                {ind}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

function MockCallScreen({ message, persona }) {
    return (
        <div className="rounded-xl border border-border overflow-hidden" style={{ background: '#0d1a2e' }}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/50" style={{ background: '#091220' }}>
                <span className="text-[10px] font-mono text-text-muted">Synthetic voice call</span>
                <span className="text-[10px] font-mono text-accent-red">DEMO ONLY · 00:42</span>
            </div>
            <div className="px-5 py-6 flex items-center gap-4 border-b border-border/50">
                <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{ background: 'rgba(230,57,70,0.15)' }}>◉</div>
                <div>
                    <p className="text-sm font-bold text-text-primary">Synthetic caller</p>
                    <p className="text-xs text-text-muted">Addressed to {persona.name}</p>
                </div>
            </div>
            <div className="px-5 py-4 text-xs leading-relaxed text-text-secondary whitespace-pre-wrap font-mono">
                <TypewriterText text={message.content} />
            </div>
            <div className="px-5 py-3 border-t border-accent-red/20 text-[10px] text-accent-red">
                Voice-clone indicators are shown for defensive review. No call was placed.
            </div>
        </div>
    )
}

// ─── Step 3 — Payment attempt card ───────────────────────────────────────────

function PaymentCard({ payment, persona }) {
    const { anomalyContext: ctx } = payment
    const isHuge = ctx?.multiplierVsBaseline >= 8
    return (
        <div className="rounded-xl border border-rose-500/30 bg-slate-900/80 backdrop-blur-md overflow-hidden shadow-md">
            <div className="px-5 py-3 border-b border-rose-500/20 bg-rose-500/5 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-rose-400">Payment Authorization Request</span>
                </div>
                <span className="font-mono text-[10px] text-slate-400">{payment.transactionId}</span>
            </div>

            <div className="px-5 py-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Amount</p>
                    <p className="text-xl font-bold font-mono text-rose-400">{fmt(payment.amount)}</p>
                </div>
                <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Beneficiary</p>
                    <p className="text-xs font-semibold text-white truncate">{payment.payee}</p>
                    <p className="text-[10px] text-rose-400 mt-0.5 font-medium">⚠ New Payee</p>
                </div>
                <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Channel</p>
                    <p className="text-xs font-semibold text-white">{CHANNEL_LABEL[payment.channel] ?? payment.channel}</p>
                </div>
                <div>
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-0.5">Timestamp</p>
                    <p className="text-xs font-semibold text-slate-300 font-mono">{fmtTime(payment.timestamp)}</p>
                </div>
            </div>

            {ctx && (
                <div className="px-5 py-3 border-t border-white/5 bg-slate-950/60 space-y-1.5">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 mb-1">Baseline Anomaly Comparison</p>
                    <AnomalyRow label="Transaction Amount" value={fmt(payment.amount)} highlight />
                    <AnomalyRow label="Historical Avg Single Txn" value={fmt(ctx.personaAvgSingleTxn)} />
                    <AnomalyRow label="Deviation Multiplier" value={`${ctx.multiplierVsBaseline}×`} highlight={isHuge} />
                    <AnomalyRow label="Hourly Velocity" value={`${payment.features?.txn_velocity_1h ?? '—'} txns/hr (baseline: ${ctx.baselineVelocity})`} />
                </div>
            )}
        </div>
    )
}

function AnomalyRow({ label, value, highlight }) {
    return (
        <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">{label}</span>
            <span className={`font-mono font-semibold ${highlight ? 'text-rose-400' : 'text-slate-300'}`}>{value}</span>
        </div>
    )
}

// ─── Step 4 — Defender verdict ────────────────────────────────────────────────

function DefenderVerdict({ result }) {
    const flagged = result.flagged
    const pct = (result.fraudProbability * 100).toFixed(1)
    const confPct = result.confidence != null ? (result.confidence * 100).toFixed(0) : (Math.abs(result.fraudProbability - 0.5) * 200).toFixed(0)
    const confLevel = result.confidenceLevel || (Number(confPct) >= 70 ? 'High' : Number(confPct) >= 35 ? 'Medium' : 'Low')

    return (
        <div className={`rounded-xl border overflow-hidden shadow-md ${
            flagged ? 'border-emerald-500/30 bg-slate-900/80' : 'border-rose-500/30 bg-slate-900/80'
        }`}>
            {/* verdict banner */}
            <div className={`px-5 py-3.5 flex items-center justify-between gap-3 border-b ${
                flagged ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'
            }`}>
                <div className="flex items-center gap-2.5">
                    <span className="text-lg">{flagged ? '🛡' : '⚠'}</span>
                    <div>
                        <span className={`text-xs font-bold uppercase tracking-wider ${
                            flagged ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                            {result.verdict}
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1 font-mono">
                            Confidence: {confPct}% ({confLevel})
                            <ExplainTerm term="Prediction confidence" context="Attack replay single payment classification" />
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400">Fraud Score</p>
                    <p className={`text-lg font-bold font-mono ${
                        flagged ? 'text-emerald-400' : 'text-rose-400'
                    }`}>
                        {pct}%
                    </p>
                </div>
            </div>

            {/* explanation */}
            <div className="px-5 py-4">
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5">
                    AI Decision Analysis
                </p>
                <p className="text-xs leading-relaxed text-slate-300">{result.explanation}</p>
                <p className="text-[10px] font-mono text-slate-500 mt-2">
                    Evaluation Engine: {result.explanationSource}
                </p>
            </div>

            {/* adapt callout when missed */}
            {!flagged && (
                <div className="mx-5 mb-4 px-4 py-3 rounded-lg border border-amber-500/20 bg-amber-500/5 text-xs text-amber-300">
                    <p className="font-semibold mb-1">Why the Adapt stage exists</p>
                    <p className="text-slate-400 text-[11px] leading-relaxed">
                        The current model missed this transaction — the fraud signature was close enough to the persona's
                        normal pattern to slip through. False negatives feed the evasion loop, and the detector is retrained against harder batches.
                    </p>
                </div>
            )}

            {/* feature breakdown */}
            <div className="px-5 pb-4 space-y-3">
                <p className="text-[9px] uppercase font-bold tracking-wider text-slate-400 font-mono">Model Input Features</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {Object.entries(result.features).map(([k, v]) => (
                        <div key={k} className="flex justify-between items-center text-[11px] rounded px-2.5 py-1 font-mono bg-slate-950/70 border border-white/5">
                            <span className="text-slate-400 truncate mr-2">{k}</span>
                            <span className="font-bold text-slate-200">{String(v)}</span>
                        </div>
                    ))}
                </div>

                {/* SHAP Feature Attribution Waterfall */}
                <ShapWaterfall transaction={{ ...result, ...result.features, predicted_fraud_prob: result.fraudProbability }} />

                {/* Counterfactual Flip-Distance Sensitivity Analysis */}
                <CounterfactualExplainer
                    transaction={{ ...result.features, amount: result.amount }}
                    currentProb={result.fraudProbability}
                />
            </div>
        </div>
    )
}

// ─── Main page ────────────────────────────────────────────────────────────────

// ─── Main page ────────────────────────────────────────────────────────────────

const SCAM_VECTORS = ['llm-phishing', 'voice-clone']

function downloadAuditReport(persona, message, payment, verdict, replayVector, trustHistory) {
    if (!persona || !payment || !verdict) return
    const ts = new Date().toISOString()
    const latestTrust = trustHistory?.[trustHistory.length - 1]?.score ?? 85
    const reportMd = `# FraudForge Security Incident & Replay Audit Report
**Generated at:** ${ts}
**Incident ID:** ${payment.transactionId || 'REP-' + Date.now()}
**Attack Vector:** ${replayVector || payment.vector || 'Social Engineering'}

---

## 1. Executive Summary
- **Target Persona:** ${persona.name} (${persona.occupation}, Age ${persona.age})
- **Payment Attempt:** $${Number(payment.amount).toLocaleString()} ${payment.currency || 'USD'} via ${payment.channel}
- **Defender Model Verdict:** **${verdict.verdict}** (Fraud Probability: ${(verdict.fraudProbability * 100).toFixed(1)}%)
- **Defender Confidence:** ${((verdict.confidence ?? Math.abs(verdict.fraudProbability - 0.5) * 2) * 100).toFixed(0)}% (${verdict.confidenceLevel || 'High'})
- **Persona Trust Score:** ${latestTrust}/100

---

## 2. Target Profile & Behavioral Baseline
- **Account Age:** ${persona.accountHistory?.monthsAccountAge} months
- **Average Single Transaction:** $${persona.accountHistory?.avgSingleTxnAmount?.toFixed(2)}
- **Anomaly Multiplier:** ${payment.anomalyContext?.multiplierVsBaseline ?? 'N/A'}x above baseline
- **Baseline Velocity:** ${payment.anomalyContext?.baselineVelocity ?? 2} txns/hr
- **Device Telemetry:** ${persona.deviceProfile?.os} (${persona.deviceProfile?.browser}) in ${persona.deviceProfile?.city}, ${persona.deviceProfile?.country}

---

## 3. Social Engineering Artifact Transcript
**Title:** ${message?.title || 'Social Engineering Lure'}
\`\`\`
${message?.content || 'N/A'}
\`\`\`

---

## 4. Payment Rail Telemetry & Anomaly Vector
- **Transaction ID:** ${payment.transactionId}
- **Payee:** ${payment.payee}
- **Timestamp:** ${payment.timestamp}
- **Channel:** ${payment.channel}
- **Velocity (1h):** ${payment.features?.txn_velocity_1h ?? 'N/A'} txns/hr
- **International:** ${payment.features?.is_international ? 'YES' : 'NO'}

---

## 5. Machine Learning Defender Evaluation
- **Verdict:** ${verdict.verdict}
- **Fraud Probability:** ${(verdict.fraudProbability * 100).toFixed(1)}%
- **Confidence:** ${((verdict.confidence ?? Math.abs(verdict.fraudProbability - 0.5) * 2) * 100).toFixed(0)}%
- **Decision Rationale:** ${verdict.explanation}

---
*Report automatically generated by FraudForge Autonomous Defense Simulator.*
`

    const blob = new Blob([reportMd], { type: 'text/markdown;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `fraudforge_audit_report_${persona.name.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}.md`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
}

export default function AttackReplay() {
    const { selectedVector, latestGenerateOutput } = useAttackContext()
    const lastVector = useRef(null)
    const [running, setRunning] = useState(false)
    const [persona, setPersona] = useState(null)
    const [message, setMessage] = useState(null)
    const [payment, setPayment] = useState(null)
    const [verdict, setVerdict] = useState(null)
    const [error, setError] = useState(null)
    const [retainPersona, setRetainPersona] = useState(false)
    const [sarModalOpen, setSarModalOpen] = useState(false)
    const [trustHistory, setTrustHistory] = useState([
        { score: 85, timestamp: new Date().toLocaleTimeString(), note: 'Initial baseline' }
    ])

    // which step is currently loading
    const [phase, setPhase] = useState(null) // 'persona' | 'message' | 'payment' | 'defend' | null
    const [replayVector, setReplayVector] = useState(null)

    const runReplay = useCallback(async () => {
        setRunning(true)
        setMessage(null); setPayment(null); setVerdict(null); setError(null)
        if (!retainPersona) {
            setPersona(null)
        }

        const availableVectors = SCAM_VECTORS.filter(candidate => candidate !== lastVector.current)
        const vector = selectedVector || availableVectors[Math.floor(Math.random() * availableVectors.length)]
        lastVector.current = vector
        setReplayVector(vector)

        try {
            const checkJson = async (res, stepName) => {
                const contentType = res.headers.get('content-type') || ''
                if (!res.ok) {
                    if (contentType.includes('text/html')) {
                        throw new Error('Backend unreachable (received an HTML response). Is the server running?')
                    }
                    throw new Error(`${stepName} API: ${res.status}`)
                }
                if (!contentType || !contentType.includes("application/json")) {
                    throw new Error(`Backend unreachable (received HTML instead of JSON). Is the server running?`);
                }
                return await res.json();
            };

            // Step 1 — persona (reuse if retainPersona is checked and persona exists)
            let pData = persona
            if (!retainPersona || !pData) {
                setPhase('persona')
                const pRes = await fetch('/api/replay/persona')
                pData = await checkJson(pRes, 'Persona')
                setPersona(pData)
                setTrustHistory([{ score: 85, timestamp: new Date().toLocaleTimeString(), note: 'Initial baseline' }])
            }

            // Step 2 — scam message
            setPhase('message')
            const mRes = await fetch('/api/replay/message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    personaName: pData.name,
                    occupation: pData.occupation,
                    vector,
                    scenario: latestGenerateOutput?.payment?.scenario,
                }),
            })
            const mData = await checkJson(mRes, 'Message')
            setMessage(mData)

            // Step 3 — payment attempt
            setPhase('payment')
            const receivedAt = mData.payment?.timestamp ?? new Date().toISOString()
            const payRes = await fetch('/api/replay/payment', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ persona: pData, vector, receivedAtIso: receivedAt }),
            })
            const payData = await checkJson(payRes, 'Payment')
            setPayment(payData)

            // Step 4 — defend
            setPhase('defend')
            const dRes = await fetch('/api/replay/defend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    features: payData.features,
                    amount: payData.amount,
                    personaAvgSingleTxn: pData.accountHistory?.avgSingleTxnAmount,
                }),
            })
            const dData = await checkJson(dRes, 'Defend')
            setVerdict(dData)

            // Update trust score history (Milestone 8)
            setTrustHistory(prev => {
                const lastScore = prev[prev.length - 1]?.score ?? 85
                const delta = dData.flagged ? -Math.round((dData.fraudProbability || 0.8) * 22) : 6
                const newScore = Math.max(5, Math.min(99, lastScore + delta))
                return [...prev, {
                    score: newScore,
                    delta,
                    verdict: dData.verdict,
                    vector,
                    timestamp: new Date().toLocaleTimeString(),
                }]
            })

            setPhase(null)
        } catch (err) {
            const message = err instanceof TypeError
                ? 'Backend unreachable. Is the server running on port 8000?'
                : err.message
            setError(message)
            setPhase(null)
        } finally {
            setRunning(false)
        }
    }, [selectedVector, latestGenerateOutput, retainPersona, persona])

    const anyData = persona || message || payment || verdict

    return (
        <div className="max-w-3xl mx-auto px-5 py-12">
            {/* page header */}
            <div className="mb-8">
                <p className="telemetry-label text-xs mb-3">FraudForge / Attack Replay</p>
                <h1 className="text-4xl font-extrabold tracking-tight text-text-primary mb-4">
                    Attack Replay
                </h1>
                <p className="text-sm text-text-secondary leading-relaxed max-w-xl">
                    Watch one synthetic victim travel a complete attack path — persona profiled,
                    scam delivered, payment attempted, defender verdict returned.
                    All data is fabricated; nothing is sent to any real system.
                </p>
            </div>

            {/* controls row */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-8 p-4 rounded-xl border border-border bg-navy-950/60">
                <div className="flex items-center gap-3">
                    <button
                        onClick={runReplay}
                        disabled={running}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl
                            text-sm font-bold uppercase tracking-wider transition-all duration-200
                            disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{
                            background: running ? '#1e3a5f' : 'linear-gradient(135deg, #e63946, #c1121f)',
                            color: '#fff',
                            boxShadow: running ? 'none' : '0 0 24px rgba(230,57,70,0.35)',
                        }}>
                        {running
                            ? <><span className="live-dot" /> Running Replay…</>
                            : <>{anyData ? '↺ Re-run Attack Path' : '▶ Run Attack Replay'}</>
                        }
                    </button>

                    {/* Retain Persona checkbox (Milestone 8) */}
                    <label className="flex items-center gap-2 text-xs font-semibold text-text-secondary cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={retainPersona}
                            onChange={e => setRetainPersona(e.target.checked)}
                            className="rounded border-border bg-navy-900 text-purple-500 focus:ring-purple-500"
                        />
                        <span>Retain Persona Across Runs (Track Trust Drift)</span>
                    </label>
                </div>

                {/* Action Buttons: SAR Report & Markdown Audit */}
                {verdict && (
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setSarModalOpen(true)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-amber-300 border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 transition-colors cursor-pointer"
                        >
                            <span>📄 File Regulatory SAR</span>
                        </button>
                        <button
                            onClick={() => downloadAuditReport(persona, message, payment, verdict, replayVector, trustHistory)}
                            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider text-signal-cyan border border-signal-cyan/40 bg-signal-cyan/10 hover:bg-signal-cyan/20 transition-colors cursor-pointer"
                        >
                            <span>📥 Download Audit (.md)</span>
                        </button>
                    </div>
                )}
            </div>

            {/* Regulatory SAR Exporter Modal */}
            <SarReportModal
                incidentData={{ persona, payment, verdict, vector: replayVector }}
                isOpen={sarModalOpen}
                onClose={() => setSarModalOpen(false)}
            />

            {/* error */}
            {error && (
                <div className="mb-6 px-4 py-3 rounded-xl border border-accent-red/40 bg-accent-red/10 text-xs text-accent-red font-mono">
                    Backend error: {error}. Make sure the backend is running on port 8000.
                </div>
            )}

            {/* step-by-step story */}
            {anyData && (
                <div className="space-y-0">
                    {/* Step 1 */}
                    <StepShell num={1} label="Victim Profile — Synthetic Persona" loading={phase === 'persona' && !persona}>
                        {persona && <PersonaCard p={persona} trustHistory={trustHistory} retainPersona={retainPersona} />}
                    </StepShell>

                    {/* Step 2 */}
                    {persona && (
                        <StepShell num={2} label="Mock Inbox — Scam Message Received" loading={phase === 'message' && !message}>
                            {message && replayVector === 'voice-clone'
                                ? <MockCallScreen message={message} persona={persona} />
                                : message && <MockEmailInbox message={message} persona={persona} />}
                        </StepShell>
                    )}

                    {/* Step 3 */}
                    {message && (
                        <StepShell num={3} label="Simulated Reaction — Payment Attempt" loading={phase === 'payment' && !payment}>
                            {payment && <PersonaPaymentCard payment={payment} persona={persona} />}
                        </StepShell>
                    )}

                    {/* Step 4 */}
                    {payment && (
                        <StepShell num={4} label="Defender Verdict — Live Model Check" loading={phase === 'defend' && !verdict}>
                            {verdict && (
                                <div className="space-y-4">
                                    <DefenderVerdict result={verdict} />
                                    <div className="flex justify-end">
                                        <button
                                            onClick={() => downloadAuditReport(persona, message, payment, verdict, replayVector, trustHistory)}
                                            className="px-4 py-2 rounded-lg text-xs font-bold text-[var(--signal-cyan)] border border-[var(--signal-cyan)]/30 bg-[var(--signal-cyan)]/5 hover:bg-[var(--signal-cyan)]/15 transition-colors"
                                        >
                                            📥 Export Case Incident Report (.md)
                                        </button>
                                    </div>
                                </div>
                            )}
                        </StepShell>
                    )}
                </div>
            )}

            {/* idle state */}
            {!anyData && !running && !error && (
                <div className="rounded-xl border border-border border-dashed py-16 text-center">
                    <p className="text-text-muted text-sm">Press <strong className="text-text-secondary">Run Attack Replay</strong> to generate a fresh scenario.</p>
                </div>
            )}
        </div>
    )
}

// alias to avoid re-declaration issue (PaymentCard is already used in step 3 wrapper)
function PersonaPaymentCard({ payment, persona }) {
    return <PaymentCard payment={payment} persona={persona} />
}
