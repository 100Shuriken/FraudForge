import { useState } from 'react'

export default function ExplainTerm({ term, context = '' }) {
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [explanation, setExplanation] = useState('')

    async function explain() {
        if (explanation) { setOpen(value => !value); return }
        setLoading(true)
        setOpen(true)
        try {
            const response = await fetch('/api/explain-term', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ term, context }),
            })
            if (!response.ok) throw new Error(`HTTP ${response.status}`)
            const data = await response.json()
            setExplanation(data.explanation)
        } catch {
            setExplanation('This term describes a signal or measurement used to evaluate synthetic payment risk. Review it alongside the surrounding values and run provenance before drawing conclusions.')
        } finally {
            setLoading(false)
        }
    }

    return <span className="relative inline-flex items-center align-middle"><button type="button" onClick={explain} aria-label={`Explain ${term} with AI`} title={`Explain ${term} with AI`} className="ml-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[var(--signal-cyan)]/40 text-[10px] font-bold text-[var(--signal-cyan)] hover:bg-[var(--signal-cyan)]/10">?</button>{open && <span className="absolute left-0 top-6 z-20 w-64 rounded-lg border border-[var(--signal-cyan)]/30 bg-navy-950 px-3 py-2 text-left text-xs font-normal leading-relaxed text-text-secondary shadow-xl">{loading ? 'Asking the AI analyst…' : explanation}</span>}</span>
}
