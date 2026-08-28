const sections = [
    {
        label: 'What is novel here',
        title: 'A closed loop for adaptive fraud stress testing',
        body: 'The central contribution is the visible connection between a defender’s false negatives, Gemini-guided evasion reasoning, harder synthetic fraud, and subsequent defender hardening. FraudForge makes that causal loop inspectable stage by stage rather than presenting a detector score as a finished answer.',
        tone: 'red',
    },
    {
        label: 'Governance boundary',
        title: 'Research and stress testing only',
        body: 'This is a controlled research prototype, not a production authorization engine, credit decision system, or operational fraud response service. Outputs are synthetic, the reference data is limited, and any real deployment would require validated data, monitoring, human review, privacy controls, model-risk governance, and domain-specific testing.',
        tone: 'amber',
    },
    {
        label: 'Null / mixed result',
        title: 'No Gemini-versus-baseline generator study is claimed',
        body: 'The current code does not run a controlled comparison between a baseline fraud generator and a Gemini-generated numeric fraud generator. Gemini supplies social-engineering text and evasion advice; Faker, NumPy, and the evasion specification produce transaction rows. Therefore, any improvement shown here is an augmentation and adversarial-loop result, not evidence that Gemini-generated transactions outperform a baseline generator.',
        tone: 'blue',
    },
]

export default function Methodology() {
    return (
        <div className="max-w-5xl mx-auto px-6 py-10">
            <div className="max-w-3xl mb-10">
                <div className="flex items-center gap-3 mb-3"><div className="h-8 w-1 rounded-full bg-accent-red" /><h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Methodology</h1></div>
                <p className="text-text-secondary text-base leading-relaxed ml-4">The final stage separates what this prototype demonstrates from what it does not establish.</p>
                <p className="text-xs text-text-muted mt-3 ml-4">Read each section before interpreting the experiment: contribution, boundary, then the result we deliberately do not claim.</p>
            </div>

            <div className="space-y-5">
                {sections.map(section => <MethodSection key={section.label} {...section} />)}
            </div>

            {/* Live API Documentation */}
            <div className="mt-8 rounded-xl border border-cyan-500/30 bg-surface p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">LIVE</span>
                        <span className="text-sm font-bold text-text-primary">API Surface Documentation</span>
                    </div>
                    <p className="text-xs text-text-secondary">Auto-generated OpenAPI specification from the live FastAPI backend — every route, request schema, and response model is documented.</p>
                </div>
                <a
                    href="/docs"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="shrink-0 inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-colors shadow-lg"
                >
                    📖 View Live API Docs
                </a>
            </div>

            <div className="mt-10 pt-6 border-t border-border flex flex-wrap gap-x-8 gap-y-2 text-xs font-mono text-text-muted">
                <span>MODEL: XGBOOST</span><span>LLM: GEMINI / MOCK FALLBACK</span><span>DATA: SYNTHETIC + PAYSIM SAMPLE</span><span>STATUS: PROTOTYPE</span>
            </div>
        </div>
    )
}

function MethodSection({ label, title, body, tone }) {
    const colors = { red: 'border-accent-red/50 text-accent-red-light', amber: 'border-amber-500/60 text-amber-300', blue: 'border-blue-400/60 text-blue-300' }
    return <section className={`border-l-2 ${colors[tone].split(' ')[0]} pl-6 py-2`}><p className={`text-xs font-bold uppercase tracking-[0.18em] mb-2 ${colors[tone].split(' ')[1]}`}>{label}</p><h2 className="text-xl font-bold text-text-primary mb-3">{title}</h2><p className="text-sm leading-7 text-text-secondary max-w-4xl">{body}</p></section>
}