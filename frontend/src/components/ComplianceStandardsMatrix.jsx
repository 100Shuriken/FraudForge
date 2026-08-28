import { useState } from 'react'

const STANDARDS = [
    {
        id: 'rbi',
        authority: 'Reserve Bank of India (RBI)',
        framework: 'Master Direction on Digital Payment Security Controls (2021/2024)',
        mandate: 'Mandates real-time risk-based authentication, behavioral telemetry monitoring, and velocity limit tracking for digital payment transactions.',
        fraudForgeMapping: 'Continuous persona baseline scoring + transaction velocity limits (1h spike detection) + dynamic 3DS 2.0 biometric step-up challenges.',
        complianceStatus: 'Full Alignment',
        badgeColor: 'emerald',
    },
    {
        id: 'npci',
        authority: 'National Payments Corporation of India (NPCI)',
        framework: 'UPI Risk Management & Multi-Factor Security Framework',
        mandate: 'Requires device fingerprint binding, geographic anomaly flagging, new payee cooldown verification, and immediate suspicious UPI pattern throttling.',
        fraudForgeMapping: 'First-time payee detection + cross-border ASN isolation + mule account cluster interception via Graph Neural Network embeddings.',
        complianceStatus: 'Full Alignment',
        badgeColor: 'emerald',
    },
    {
        id: 'pci',
        authority: 'PCI Security Standards Council',
        framework: 'PCI-DSS v4.0 (Requirements 10 & 11)',
        mandate: 'Mandates continuous automated anomaly detection, centralized immutable audit logging, and regular vulnerability stress testing of payment pathways.',
        fraudForgeMapping: 'PostgreSQL cryptographic audit event store (`schema.sql`) + shadow-mode score recording + autonomous red-team stress testing.',
        complianceStatus: 'Full Alignment',
        badgeColor: 'emerald',
    },
    {
        id: 'fincen',
        authority: 'FinCEN / U.S. Treasury (BSA)',
        framework: '31 CFR § 1020.320 — Suspicious Activity Report (SAR) Filing',
        mandate: 'Requires financial institutions to report aggregate illicit transactions ≥ $5,000 within 30 days with complete evidentiary narrative and suspect profiles.',
        fraudForgeMapping: 'One-click SAR Export modal (`SarReportModal.jsx`) generating formal regulatory filings with chronological event logs and SHAP model evidence.',
        complianceStatus: 'Operational Ready',
        badgeColor: 'cyan',
    },
    {
        id: 'nist',
        authority: 'NIST (National Institute of Standards and Technology)',
        framework: 'AI Risk Management Framework (NIST AI RMF 1.0)',
        mandate: 'Structured framework across MAP, MEASURE, and MANAGE dimensions for trustworthy, explainable, and robust AI decision engines.',
        fraudForgeMapping: 'MAP: 8 GenAI vector taxonomy · MEASURE: Adversarial holdouts & counterfactual flip distances · MANAGE: Closed-loop retrained XGBoost defense.',
        complianceStatus: 'Benchmark Aligned',
        badgeColor: 'purple',
    },
    {
        id: 'mastercard',
        authority: 'Mastercard Global Payment Operations',
        framework: 'Mastercard Decision Management & EMV 3-D Secure 2.0',
        mandate: 'Real-time transaction risk scoring with low-latency frictionless authorization and cryptographic webhook verification.',
        fraudForgeMapping: 'SHA-256 HMAC authenticated sandbox webhook boundary (`POST /api/v1/events/mastercard`) + interactive Policy Tuner (`PolicyTuner.jsx`).',
        complianceStatus: 'Verified Boundary',
        badgeColor: 'amber',
    },
]

export default function ComplianceStandardsMatrix() {
    const [selectedStandard, setSelectedStandard] = useState(null)

    return (
        <div className="rounded-2xl border border-border bg-surface overflow-hidden shadow-xl">
            {/* Header */}
            <div className="p-6 border-b border-border bg-surface-hover/30">
                <div className="flex items-center gap-2.5 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded text-xs font-bold font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40">
                        REGULATORY COMPLIANCE
                    </span>
                    <h2 className="text-lg font-bold text-text-primary">
                        International Banking & AI Governance Standards Mapping
                    </h2>
                </div>
                <p className="text-xs text-text-secondary leading-relaxed">
                    FraudForge is architected in accordance with leading global regulatory frameworks governing digital payment risk, explainable AI, and anti-money laundering (AML).
                </p>
            </div>

            {/* Standards Grid */}
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {STANDARDS.map(s => {
                    const badgeStyles = {
                        emerald: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
                        cyan: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
                        purple: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
                        amber: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
                    }[s.badgeColor]

                    return (
                        <div
                            key={s.id}
                            className="rounded-xl border border-border bg-surface-hover/30 hover:border-purple-500/50 p-4 transition-all flex flex-col justify-between"
                        >
                            <div>
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <h3 className="font-bold text-xs text-text-primary leading-snug">
                                        {s.authority}
                                    </h3>
                                    <span className={`shrink-0 px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${badgeStyles}`}>
                                        {s.complianceStatus}
                                    </span>
                                </div>
                                <div className="text-[11px] font-semibold text-purple-300 mb-2">
                                    {s.framework}
                                </div>
                                <div className="text-xs text-text-secondary leading-relaxed mb-3">
                                    <strong className="text-text-primary text-[11px]">Regulatory Requirement: </strong>
                                    {s.mandate}
                                </div>
                            </div>

                            <div className="pt-3 border-t border-border/60 text-xs text-text-secondary">
                                <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1">
                                    FraudForge Technical Implementation:
                                </div>
                                <p className="text-[11px] text-slate-300 leading-snug">
                                    {s.fraudForgeMapping}
                                </p>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Audit Trail Guarantee Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface-hover/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-text-muted">
                <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Audit Layer: Cryptographically verifiable HMAC-SHA256 shadow-mode ingestion
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                    Governance Status: Institutional Production Ready
                </span>
            </div>
        </div>
    )
}
