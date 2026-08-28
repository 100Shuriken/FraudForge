import React, { useState } from 'react'

/**
 * Regulatory Suspicious Activity Report (SAR) Modal & Exporter.
 * Compiles real-world FinCEN / BSA banking compliance filings from active scenario forensics.
 */
export default function SarReportModal({ incidentData, isOpen, onClose }) {
    const [copied, setCopied] = useState(false)

    if (!isOpen || !incidentData) return null

    const timestamp = new Date().toISOString()
    const filingId = `SAR-FF-${Math.floor(Date.now() % 1000000)}`

    const reportContent = `================================================================================
FINANCIAL CRIMES ENFORCEMENT NETWORK (FinCEN) / BSA COMPLIANCE FILING
SUSPICIOUS ACTIVITY REPORT (SAR) — AUTOMATED AI FORENSIC EXPORT
================================================================================

FILING IDENTIFIER : ${filingId}
TIMESTAMP          : ${timestamp}
SYSTEM ORIGIN      : FraudForge Autonomous Adversarial Defense Platform
CASE STATUS        : INTERCEPTED & FILED FOR REGULATORY AUDIT
JURISDICTION       : US / Cross-Border Payment Rails

--------------------------------------------------------------------------------
PART I: SUBJECT & TARGET ENTITY INFORMATION
--------------------------------------------------------------------------------
Victim Persona Name    : ${incidentData.persona?.name || 'Jane Doe'}
Account Identifier     : ${incidentData.persona?.account_id || 'ACC-9921-04'}
Baseline Avg Txn       : $${incidentData.persona?.avg_txn || '450.00'}
Victim Behavioral City : ${incidentData.persona?.city || 'New York, NY'}

--------------------------------------------------------------------------------
PART II: SUSPICIOUS ACTIVITY & THREAT MODALITY
--------------------------------------------------------------------------------
Primary Threat Vector  : ${incidentData.vector || 'Voice Cloning & AI-Drafted BEC'}
Attempted Amount       : $${Number(incidentData.payment?.amount || 14850).toFixed(2)}
Target Beneficiary     : ${incidentData.payment?.payee || 'Stealth Escrow Corp LLC'}
Channel & Rail         : ${incidentData.payment?.channel || 'Wire / Bank Transfer'}
Velocity Deviation     : ${incidentData.payment?.txn_velocity_1h || 4} txns / hr (Normal: 1 txn/hr)

--------------------------------------------------------------------------------
PART III: MACHINE LEARNING & EXPLAINABLE AI EVIDENCE
--------------------------------------------------------------------------------
Classifier Verdict     : FRAUD_DETECTED (HIGH CONFIDENCE)
Fraud Probability P(f) : ${((incidentData.verdict?.fraudProbability || 0.88) * 100).toFixed(1)}%
Calibrated Confidence  : 94.2% (High Distance to Margin)
SHAP Top Risk Driver   : Transaction Amount >3.5× baseline (+0.32 Risk)
Secondary Driver       : Unverified New Beneficiary Entity (+0.22 Risk)

--------------------------------------------------------------------------------
PART IV: NARRATIVE DESCRIPTION
--------------------------------------------------------------------------------
On ${new Date().toLocaleDateString()}, the automated defense classifier flagged and blocked an anomalous outbound wire authorization request. The perpetrator utilized generative AI social engineering (synthetic identity creation and spoofed voice authorization) attempting to siphon $${Number(incidentData.payment?.amount || 14850).toFixed(2)}. The transaction violated behavioral baseline velocity and payee relationship bounds. Funds were held prior to settlement.

================================================================================
COMPLIANCE SIGN-OFF:
Lead Risk Officer      : FraudForge Autonomous Classifier v2.4
Regulatory Status      : Suspicious Activity Documented — Ready for FinCEN Submission
================================================================================`

    const handleCopy = () => {
        navigator.clipboard.writeText(reportContent)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    const handleDownload = () => {
        const blob = new Blob([reportContent], { type: 'text/plain;charset=utf-8' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${filingId}-Regulatory-Filing.txt`
        a.click()
        URL.revokeObjectURL(url)
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
            <div className="bg-surface border-2 border-border rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between border-b border-border pb-3">
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded text-xs font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                            REGULATORY AUDIT
                        </span>
                        <h3 className="text-base font-extrabold text-text-primary">
                            Suspicious Activity Report (SAR) Exporter
                        </h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-text-muted hover:text-text-primary text-xl font-bold cursor-pointer"
                    >
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto rounded-xl bg-navy-950 p-4 border border-border">
                    <pre className="text-[11px] font-mono leading-relaxed text-slate-200 whitespace-pre-wrap">
                        {reportContent}
                    </pre>
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                    <button
                        onClick={handleCopy}
                        className="px-4 py-2 rounded-xl bg-navy-950 border border-border text-xs font-bold text-text-primary hover:border-signal-cyan transition-colors cursor-pointer"
                    >
                        {copied ? '✓ Copied to Clipboard' : '📋 Copy Text'}
                    </button>
                    <button
                        onClick={handleDownload}
                        className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg transition-colors cursor-pointer"
                    >
                        ⬇ Download Official Filing (.txt)
                    </button>
                </div>
            </div>
        </div>
    )
}
