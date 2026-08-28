import { useState } from 'react'

const ENDPOINTS = [
    {
        method: 'POST',
        path: '/api/replay/defend',
        tag: 'Real-Time Defense',
        summary: 'Classifies synthetic payment transactions in real-time, computing calibrated fraud risk, decision (BLOCK/REVIEW/ALLOW), and SHAP attribution.',
        requestExample: `{
  "amount": 8450.00,
  "payee": "Stealth Offshore Crypto Gateway LLC",
  "channel": "bank_transfer",
  "txn_velocity_1h": 4,
  "is_new_payee": 1,
  "is_international": 1,
  "time_drift": 0.42
}`,
        responseExample: `{
  "flagged": true,
  "fraudProbability": 0.985,
  "confidence": 0.97,
  "confidenceLevel": "High",
  "verdict": "FLAGGED — High Risk Threat",
  "decision": "BLOCK",
  "action": "HARD_DECLINE_IMMEDIATE",
  "riskFactors": [
    "High transaction value ($8,450.00)",
    "First-time unverified payee",
    "Elevated hourly velocity (4 txns/1h)",
    "Cross-border foreign jurisdiction routing"
  ],
  "modelInfo": {
    "model": "XGBoost Production Classifier v2.4",
    "holdoutAUC": 0.914
  }
}`
    },
    {
        method: 'POST',
        path: '/api/generate/custom',
        tag: 'Adversarial GenAI',
        summary: 'Accepts unstructured natural-language attack prompts and synthesizes threat artifacts, personas, and structured payment telemetry.',
        requestExample: `{
  "scenario": "CEO voice clone demanding immediate $45,000 emergency vendor payment to offshore crypto escrow account"
}`,
        responseExample: `{
  "vector": "voice-clone",
  "vectorLabel": "Voice Cloning",
  "confidence": 0.94,
  "rationale": "High-urgency executive impersonation demanding wire routing to unverified offshore escrow.",
  "generated": {
    "target": "Alex Morgan (Chief Financial Officer)",
    "channel": "deepfake_voice_call",
    "amount": 45000,
    "urgencyLevel": "CRITICAL"
  }
}`
    },
    {
        method: 'POST',
        path: '/api/explain-term',
        tag: 'Explainability & NLP',
        summary: 'Demystifies complex FinTech, cybersecurity, or ML terminology using context-aware LLM explanations.',
        requestExample: `{
  "term": "Counterfactual Perturbation",
  "context": "Defender model evasion boundary analysis"
}`,
        responseExample: `{
  "term": "Counterfactual Perturbation",
  "plainEnglish": "The minimum tweak an attacker would need to make to a transaction (e.g. lowering the amount by $200 or waiting 3 hours) to trick the AI into passing it as normal.",
  "whyItMatters": "Helps risk teams discover blind spots before fraudsters find them."
}`
    }
]

export default function ApiDocumentationCard() {
    const [selectedIdx, setSelectedIdx] = useState(0)
    const [copied, setCopied] = useState(false)
    const ep = ENDPOINTS[selectedIdx]

    const copyCurl = () => {
        const origin = window.location.origin
        const curl = `curl -X ${ep.method} "${origin}${ep.path}" \\\n  -H "Content-Type: application/json" \\\n  -d '${ep.requestExample.replace(/\n/g, '')}'`
        navigator.clipboard.writeText(curl)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
    }

    return (
        <div className="rounded-2xl border-2 border-cyan-500/40 bg-surface p-6 sm:p-8 space-y-6 shadow-2xl backdrop-blur-md">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/80 pb-5">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="px-3 py-1 rounded-md text-xs font-black tracking-wider uppercase font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/50 shadow-sm">
                            LIVE OPENAPI 3.1
                        </span>
                        <span className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            FastAPI Backend Active
                        </span>
                    </div>
                    <h3 className="text-xl sm:text-2xl font-black text-text-primary tracking-tight">
                        Interactive REST API Documentation
                    </h3>
                    <p className="text-sm sm:text-base text-text-secondary leading-relaxed max-w-3xl">
                        FraudForge exposes a fully documented, production-ready REST API via FastAPI's built-in OpenAPI specification. Test endpoints live or open the interactive Swagger explorer.
                    </p>
                </div>

                {/* Direct Action Buttons */}
                <div className="flex flex-wrap gap-3 shrink-0">
                    <a
                        href="/api/docs"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:brightness-110 text-white text-xs sm:text-sm font-bold shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
                    >
                        <span>📖</span>
                        <span>Open Swagger UI (/docs)</span>
                        <span>↗</span>
                    </a>
                    <a
                        href="/api/redoc"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-4 py-3 rounded-xl border border-cyan-500/40 bg-surface hover:bg-surface-hover text-cyan-300 text-xs sm:text-sm font-bold transition-all cursor-pointer"
                    >
                        <span>📄</span>
                        <span>ReDoc View (/redoc)</span>
                        <span>↗</span>
                    </a>
                    <a
                        href="/api/openapi.json"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-3 rounded-xl border border-border bg-surface hover:bg-surface-hover text-text-secondary hover:text-text-primary text-xs font-mono transition-all cursor-pointer"
                        title="Raw OpenAPI JSON Specification"
                    >
                        <span>JSON</span>
                    </a>
                </div>
            </div>

            {/* In-Page Endpoint Schema Explorer */}
            <div className="space-y-4">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span className="text-xs font-extrabold uppercase tracking-wider text-text-primary">
                        ⚡ In-Page Endpoint Schema Explorer
                    </span>
                    <button
                        type="button"
                        onClick={copyCurl}
                        className="text-xs font-bold px-3 py-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 transition-all cursor-pointer flex items-center gap-1.5"
                    >
                        <span>{copied ? '✓ Copied cURL!' : '📋 Copy cURL'}</span>
                    </button>
                </div>

                {/* Endpoint Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {ENDPOINTS.map((item, idx) => (
                        <button
                            key={item.path}
                            type="button"
                            onClick={() => setSelectedIdx(idx)}
                            className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                                selectedIdx === idx
                                    ? 'border-cyan-500 bg-cyan-950/30 shadow-[0_0_15px_rgba(6,182,212,0.25)]'
                                    : 'border-border bg-surface/50 hover:bg-surface-hover hover:border-border/80'
                            }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                    {item.method}
                                </span>
                                <span className="text-xs font-bold text-text-primary truncate">
                                    {item.path}
                                </span>
                            </div>
                            <span className="text-[11px] font-medium text-text-muted">
                                {item.tag}
                            </span>
                        </button>
                    ))}
                </div>

                {/* Selected Endpoint Details */}
                <div className="p-4 sm:p-5 rounded-xl border border-border bg-navy-950/60 space-y-4">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                {ep.method}
                            </span>
                            <span className="font-mono text-sm sm:text-base font-extrabold text-cyan-300">
                                {ep.path}
                            </span>
                        </div>
                        <p className="text-xs sm:text-sm text-text-secondary leading-relaxed">
                            {ep.summary}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Request Schema */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                                <span>📥 JSON Request Body</span>
                                <span className="font-mono text-[10px]">application/json</span>
                            </div>
                            <pre className="p-3.5 rounded-lg bg-black/70 border border-border font-mono text-xs text-emerald-300 overflow-x-auto leading-relaxed max-h-56">
                                {ep.requestExample}
                            </pre>
                        </div>

                        {/* Response Schema */}
                        <div className="space-y-1.5">
                            <div className="flex items-center justify-between text-xs font-bold text-text-muted">
                                <span>📤 Live Response (200 OK)</span>
                                <span className="font-mono text-[10px]">application/json</span>
                            </div>
                            <pre className="p-3.5 rounded-lg bg-black/70 border border-border font-mono text-xs text-cyan-300 overflow-x-auto leading-relaxed max-h-56">
                                {ep.responseExample}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
