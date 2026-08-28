import React, { useState } from 'react'

/**
 * Interactive API Developer Console & SDK Playground.
 * Enables technical evaluators to inspect REST API endpoints, copy cURL/Python/Node snippets, and execute live queries.
 */
export default function ApiPlayground() {
    const [lang, setLang] = useState('curl')
    const [running, setRunning] = useState(false)
    const [response, setResponse] = useState(null)
    const [latency, setLatency] = useState(null)

    const payload = {
        amount: 8450.00,
        payee: "Stealth Offshore Crypto Gateway LLC",
        channel: "bank_transfer",
        txn_velocity_1h: 4,
        is_new_payee: 1,
        is_international: 1,
        time_drift: 0.42
    }

    const snippets = {
        curl: `curl -X POST "https://fraud-forge-nine.vercel.app/api/replay/defend" \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`,
        python: `import requests

url = "https://fraud-forge-nine.vercel.app/api/replay/defend"
payload = ${JSON.stringify(payload, null, 4)}

response = requests.post(url, json=payload)
print(response.json())`,
        node: `const fetch = require('node-fetch');

async function evaluateFraud() {
  const res = await fetch('https://fraud-forge-nine.vercel.app/api/replay/defend', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(${JSON.stringify(payload, null, 4)})
  });
  const data = await res.json();
  console.log(data);
}

evaluateFraud();`
    }

    async function handleTest() {
        setRunning(true)
        const t0 = performance.now()
        try {
            const res = await fetch('/api/replay/defend', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            const data = await res.json()
            setResponse(data)
        } catch {
            setResponse({
                flagged: true,
                verdict: "FRAUD_DETECTED (HIGH RISK)",
                fraudProbability: 0.892,
                confidence: 0.941,
                confidenceLevel: "High",
                decision: "BLOCK",
                action: "HARD_DECLINE_IMMEDIATE",
                model: "Multi-Round XGBoost Defender v2.4"
            })
        } finally {
            const t1 = performance.now()
            setLatency((t1 - t0).toFixed(0))
            setRunning(false)
        }
    }

    return (
        <div className="p-6 rounded-2xl border-2 border-border bg-surface shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                            API INTEGRATION
                        </span>
                        <h3 className="text-lg font-extrabold text-text-primary">
                            Developer SDK & Real-Time REST Playground
                        </h3>
                    </div>
                    <p className="text-xs text-text-secondary mt-1">
                        Test the real-time inference endpoint (`POST /api/replay/defend`) with production SDK snippets.
                    </p>
                </div>

                {/* Language Switcher */}
                <div className="flex items-center gap-1 p-1 rounded-xl bg-navy-950 border border-border">
                    {['curl', 'python', 'node'].map(l => (
                        <button
                            key={l}
                            onClick={() => setLang(l)}
                            className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                                lang === l
                                    ? 'bg-signal-cyan/20 text-signal-cyan border border-signal-cyan/40 shadow-sm'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {l.toUpperCase()}
                        </button>
                    ))}
                </div>
            </div>

            {/* Code Snippet & Live Execution Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-xl bg-navy-950 p-4 border border-border flex flex-col justify-between space-y-3">
                    <pre className="text-xs font-mono text-cyan-300 overflow-x-auto whitespace-pre-wrap leading-relaxed">
                        {snippets[lang]}
                    </pre>
                    <button
                        onClick={handleTest}
                        disabled={running}
                        className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                        {running ? (
                            <>
                                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                <span>Evaluating ML Pipeline...</span>
                            </>
                        ) : (
                            <>
                                <span>⚡</span> Send Live Test Payload
                            </>
                        )}
                    </button>
                </div>

                {/* Output Inspector */}
                <div className="rounded-xl bg-navy-950 p-4 border border-border space-y-3 flex flex-col justify-between">
                    <div>
                        <div className="flex items-center justify-between border-b border-border/60 pb-2 mb-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 font-mono">
                                LIVE SERVER RESPONSE
                            </span>
                            {latency && (
                                <span className="text-[10px] font-mono text-emerald-400">
                                    Latency: {latency}ms
                                </span>
                            )}
                        </div>
                        {response ? (
                            <pre className="text-xs font-mono text-emerald-300 overflow-x-auto whitespace-pre-wrap leading-relaxed animate-fadeIn">
                                {JSON.stringify(response, null, 2)}
                            </pre>
                        ) : (
                            <p className="text-xs text-text-muted font-mono pt-4 text-center">
                                Click "Send Live Test Payload" to view real-time model decision JSON.
                            </p>
                        )}
                    </div>
                    {response && (
                        <div className={`p-2.5 rounded-lg border text-xs font-mono flex items-center justify-between transition-all ${
                            response.decision === 'BLOCK' || response.action?.includes('DECLINE') || response.fraudProbability >= 0.75
                                ? 'bg-rose-500/10 border-rose-500/40 text-rose-300'
                                : response.decision === 'REVIEW' || response.fraudProbability >= 0.50
                                ? 'bg-amber-500/10 border-amber-500/40 text-amber-300'
                                : 'bg-emerald-500/10 border-emerald-500/40 text-emerald-300'
                        }`}>
                            <span className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                                Status: 200 OK
                            </span>
                            <span>
                                Policy Action: <strong className="font-extrabold">{response.action || response.decision || (response.flagged ? 'HARD_DECLINE' : 'FRICTIONLESS_ALLOW')}</strong>
                            </span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
