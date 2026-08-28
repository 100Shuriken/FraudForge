import PrevalenceSimulator from '../components/PrevalenceSimulator.jsx'

const scenarios = [
    { label: 'Experimental mix', fraudRate: '18.4%', precision: '88.0%', falsePositive: '8.3%', note: 'Synthetic fraud is intentionally common so the detector can be stress-tested.' },
    { label: 'Illustrative realistic mix', fraudRate: '0.15%', precision: '14.2%', falsePositive: '0.8%', note: 'At real-world prevalence (15 bps), even a 99.2% specific detector generates substantial review queues.' },
]

export default function RealityCheck() {
    return (
        <div className="max-w-7xl mx-auto px-6 py-10 space-y-10">
            <div className="max-w-3xl">
                <div className="flex items-center gap-3 mb-3"><div className="h-8 w-1 rounded-full bg-accent-red" /><h1 className="text-3xl font-extrabold tracking-tight text-text-primary">Reality Check</h1></div>
                <p className="text-text-secondary text-base leading-relaxed ml-4">This page asks the uncomfortable question: what happens when fraud is rare? Compare the stress-test mix with an illustrative low-prevalence scenario before treating precision or alert volume as production expectations.</p>
                <p className="text-xs text-text-muted mt-3 ml-4">Read this page to understand why the same detector can look excellent in a balanced experiment and noisy in a live payment stream.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {scenarios.map((scenario, index) => <ScenarioCard key={scenario.label} {...scenario} highlighted={index === 0} />)}
            </div>

            {/* Interactive Base Rate Fallacy & Alert Queue Simulator */}
            <PrevalenceSimulator />

            <section className="rounded-xl border border-border bg-surface p-6 shadow-lg">
                <p className="text-xs font-bold uppercase tracking-wider text-accent-red-light mb-3">Why the numbers move</p>
                <p className="text-sm leading-7 text-text-secondary">Precision depends on the mix of positive and negative cases, while recall describes how much fraud is found. When legitimate payments dominate (e.g. 1 fraud event per 667 legitimate payments), a small false-positive rate can still create a large review queue. The realistic-prevalence figures above are calculated dynamically via the Base Rate Simulator, grounding operational expectations for bank risk teams.</p>
            </section>
        </div>
    )
}

function ScenarioCard({ label, fraudRate, precision, falsePositive, note, highlighted }) {
    return <article className={`rounded-xl border bg-surface p-6 ${highlighted ? 'border-accent-red/40' : 'border-amber-500/30'}`}><div className="flex items-center justify-between mb-5"><h2 className="text-lg font-bold text-text-primary">{label}</h2><span className={`text-xs font-bold uppercase tracking-wider ${highlighted ? 'text-accent-red-light' : 'text-amber-300'}`}>{highlighted ? 'Measured' : 'Illustrative'}</span></div><div className="grid grid-cols-3 gap-3 mb-5"><Metric label="Fraud rate" value={fraudRate} /><Metric label="Precision" value={precision} /><Metric label="False positives" value={falsePositive} /></div><p className="text-sm leading-relaxed text-text-secondary">{note}</p></article>
}

function Metric({ label, value }) {
    return <div className="rounded-lg border border-border p-3"><p className="text-[11px] uppercase tracking-wider text-text-muted mb-1">{label}</p><p className="text-xl font-mono font-bold text-text-primary">{value}</p></div>
}