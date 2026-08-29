import { useState, useEffect, useMemo, useCallback, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { useLocation } from 'react-router-dom'

/**
 * Guided tour + inline element explanations.
 *
 * Every selector below must exist on the page it is listed under. A step
 * pointing at a removed element highlights nothing and fails silently, which
 * is exactly what the landing-page steps did after the cockpit was rebuilt.
 */
const PAGE_TOUR_STEPS = {
    '/': [
        {
            selector: '[data-tour="vector-selector"]',
            title: 'AI threat vector',
            instruction: 'Pick which generative-AI fraud technique to simulate.',
            explanation: 'Each vector maps to an attack family the generator knows how to synthesise — voice cloning becomes vishing, BEC becomes phishing. Changing it re-runs the simulation against the same account.',
        },
        {
            selector: '[data-tour="target-selector"]',
            title: 'Target account',
            instruction: 'Choose the account to attack.',
            explanation: 'The three figures under the picker — device stability, spending regularity, velocity signal — are what the scorer grades against. A payment that is unremarkable for one account is an obvious outlier for another.',
        },
        {
            selector: '[data-tour="run-sim-btn"]',
            title: 'Run simulation',
            instruction: 'Click to synthesise a fresh attack and score it.',
            explanation: 'Calls /api/cockpit/simulate. The backend generates a payment sequence shaped by the chosen vector, then scores every step twice: once with flat legacy rules, once with the hardened per-account scorer.',
        },
        {
            selector: '[data-tour="attack-panel"]',
            title: 'Red team panel',
            instruction: 'Read the synthesised lure and the payment it produced.',
            explanation: 'One step of the sequence: the social-engineering text, and the payment features behind it — amount as a multiple of this account’s baseline, velocity, payee novelty, routing.',
        },
        {
            selector: '[data-tour="verdict-panel"]',
            title: 'Blue team verdict',
            instruction: 'Compare what each detector decided.',
            explanation: 'The bars are real feature attributions from the scorer, not a fixed list. When legacy says MISS and hardened says REVIEW, that gap is the whole product claim on a single payment.',
        },
        {
            selector: '[data-tour="run-benchmark-btn"]',
            title: 'Run benchmark',
            instruction: 'Click to measure both detectors over a labelled corpus.',
            explanation: 'Scores several hundred synthetic fraudulent and legitimate payments through both detectors and reports the confusion-matrix results: recall, precision, F1, false-positive rate.',
        },
        {
            selector: '[data-tour="benchmark-panel"]',
            title: 'Measured comparison',
            instruction: 'Read the recall and false-positive figures.',
            explanation: 'Computed per request. Recovered value is fraud the hardened scorer stops and the legacy rules do not, within this corpus only — deliberately not extrapolated to a monthly number.',
        },
    ],
    '/generate': [
        {
            selector: '[data-tour="mode-selector"]',
            title: 'Generation mode',
            instruction: 'Switch between single vector, chained multi-stage, and manual attacker mode.',
            explanation: 'Single generates one payload. Chained builds a multi-hop attack combining two vectors, such as synthetic KYC followed by an urgent BEC request.',
        },
        {
            selector: '[data-tour="vector-picker"]',
            title: 'Threat vector selector',
            instruction: 'Choose which fraud modality to generate a payload for.',
            explanation: 'Selects the prompt template and synthetic generator the backend runs.',
        },
        {
            selector: '[data-tour="generate-action-btn"]',
            title: 'Generate scenario',
            instruction: 'Click to synthesise the attack payload.',
            explanation: 'Invokes the generator to craft a scam script, victim profile, and payment metadata for the selected vector.',
        },
    ],
    '/ai-defense-lab': [
        {
            selector: '[data-tour="target-list"]',
            title: 'Target persona list',
            instruction: 'Click any customer card on the left.',
            explanation: 'Loads that account’s behavioural baseline — average spend, cadence, device stability. The planner reads these to choose an attack.',
        },
        {
            selector: '[data-tour="random-target-btn"]',
            title: 'Random target',
            instruction: 'Click to jump to a different synthetic account.',
            explanation: 'Picks another persona with a different spending baseline, which usually changes which attack family the planner selects.',
        },
        {
            selector: '[data-tour="archetype-selector"]',
            title: 'Threat archetype picker',
            instruction: 'Choose an attack archetype, or leave it on Auto.',
            explanation: 'Auto ranks all ten families against this account and picks the highest scorer. The named options force a specific family so you can compare.',
        },
        {
            selector: '[data-tour="run-attack-btn"]',
            title: 'Run target attack plan',
            instruction: 'Click to synthesise and score an attack sequence.',
            explanation: 'Generates a multi-step payment sequence, scores each step through the risk engine, and derives detection and evasion rates from those scores.',
        },
        {
            selector: '[data-tour="run-all-btn"]',
            title: 'Execute all 10 vectors',
            instruction: 'Click to sweep every attack family at once.',
            explanation: 'Runs all ten families against this account and reports each one’s detection rate, showing which techniques this account is most exposed to.',
        },
        {
            selector: '[data-tour="step4-metrics"]',
            title: 'Detection and evasion badges',
            instruction: 'Read the live detection, evasion, and mean-risk figures.',
            explanation: 'Derived from the scored records, not stored. Detection is the share of payments reaching the review threshold; evasion is its complement, so the two always total 100%.',
        },
        {
            selector: '[data-tour="transactions-table"]',
            title: 'Synthesised records table',
            instruction: 'Click any row to inspect its forensics.',
            explanation: 'Each row is one generated payment with amount, velocity, risk probability, and whether the scorer intercepted it or it slipped past the threshold.',
        },
        {
            selector: '[data-tour="pipeline-stages"]',
            title: '6-stage pipeline',
            instruction: 'Observe the stages of the adversarial loop.',
            explanation: 'Target profiling, weakness mining, planning, payload synthesis, shadow scoring, evasion extraction — the order the backend actually executes.',
        },
        {
            selector: '[data-tour="shap-waterfall"]',
            title: 'Feature contribution waterfall',
            instruction: 'Inspect which features pushed the score up or down.',
            explanation: 'Shows how much each signal — velocity, new payee, amount ratio — contributed to the final risk score for the selected record.',
        },
    ],
    '/defend': [
        {
            selector: '[data-tour="train-action-btn"]',
            title: 'Train defender models',
            instruction: 'Click to run the three-round adversarial retraining loop.',
            explanation: 'Trains a class-weighted logistic regression, then twice mines the payments the previous round missed and retrains on them. The held-out split stays fixed across rounds so recall stays comparable.',
        },
        {
            selector: '[data-tour="model-comparison-tabs"]',
            title: 'Model comparison',
            instruction: 'Compare precision, recall, F1 and AUC across rounds.',
            explanation: 'Recall climbing while precision dips slightly is the real trade-off of catching stealthier fraud. Both directions are shown rather than only the flattering one.',
        },
        {
            selector: '[data-tour="transaction-scorer-tool"]',
            title: 'Live transaction scorer',
            instruction: 'Adjust amount, velocity and the new-payee toggle.',
            explanation: 'Sends a feature vector to the scorer and returns the risk score, recommended action, and the contribution of each signal.',
        },
    ],
    '/report': [
        {
            selector: '[data-tour="generate-report-btn"]',
            title: 'Generate incident report',
            instruction: 'Click to build a full end-to-end incident.',
            explanation: 'Runs profiling, planning, synthesis, dual scoring and retraining in one backend call, so every section describes the same run rather than three unrelated ones.',
        },
        {
            selector: '[data-tour="report-summary"]',
            title: 'Incident summary',
            instruction: 'Read the headline counts and value figures.',
            explanation: 'How many payments were sent, how many each detector caught, and how much value got through under each — the whole incident in four numbers.',
        },
        {
            selector: '[data-tour="report-phases"]',
            title: 'Phase timeline',
            instruction: 'Walk the six phases of the incident.',
            explanation: 'Target profiled, attack selected, payload synthesised, both detectors scored, what got through, what the defender learned. Each phase carries the figures it describes.',
        },
        {
            selector: '[data-tour="report-ledger"]',
            title: 'Payment ledger',
            instruction: 'Inspect every payment in the sequence.',
            explanation: 'One row per payment with both verdicts side by side and the exact reasons the scorer gave, so a disagreement between detectors traces back to a specific signal.',
        },
        {
            selector: '[data-tour="report-retraining"]',
            title: 'What the defender learned',
            instruction: 'Read the per-round metrics and the evasion advice.',
            explanation: 'The rounds table shows recall climbing as mined false negatives enter training. The advice below is derived from payments that still evade the final model.',
        },
    ],
}

// The app header is sticky; scroll targets under it otherwise land hidden.
const HEADER_OFFSET = 96

function scrollToElement(el) {
    const top = el.getBoundingClientRect().top + window.scrollY - HEADER_OFFSET
    window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
}

export default function BeginnerAssistant() {
    const location = useLocation()

    const [tourActive, setTourActive] = useState(false)
    const [stepIndex, setStepIndex] = useState(0)
    const [explainMode, setExplainMode] = useState(false)
    const [openMarker, setOpenMarker] = useState(null)
    const [rects, setRects] = useState([])
    const [missing, setMissing] = useState([])

    const steps = useMemo(
        () => PAGE_TOUR_STEPS[location.pathname] || [],
        [location.pathname],
    )
    const currentStep = steps[stepIndex]

    useEffect(() => {
        setStepIndex(0)
        setTourActive(false)
        setOpenMarker(null)
    }, [location.pathname])

    // ---- Tour spotlight --------------------------------------------------
    useEffect(() => {
        document.querySelectorAll('.tour-spotlight-active').forEach(el =>
            el.classList.remove('tour-spotlight-active'),
        )
        if (!tourActive || !currentStep) return

        // The target may not be mounted yet (a panel that appears after a run
        // completes), so retry briefly instead of failing silently.
        let attempts = 0
        let cleanup = () => {}

        const attach = () => {
            const el = document.querySelector(currentStep.selector)
            if (!el) {
                if (attempts++ < 20) {
                    const t = setTimeout(attach, 150)
                    cleanup = () => clearTimeout(t)
                }
                return
            }
            el.classList.add('tour-spotlight-active')
            scrollToElement(el)

            const advance = () => setTimeout(() => {
                setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev))
            }, 700)
            el.addEventListener('click', advance)

            cleanup = () => {
                el.classList.remove('tour-spotlight-active')
                el.removeEventListener('click', advance)
            }
        }

        attach()
        return () => cleanup()
    }, [tourActive, stepIndex, currentStep, steps.length])

    // ---- Inline explain markers -----------------------------------------
    const measure = useCallback(() => {
        if (!explainMode) {
            setRects([])
            return
        }
        const found = []
        const absent = []
        steps.forEach((step, index) => {
            const el = document.querySelector(step.selector)
            if (!el) {
                absent.push(step.title)
                return
            }
            const r = el.getBoundingClientRect()
            if (r.width === 0 && r.height === 0) return
            found.push({
                index,
                step,
                top: r.top + window.scrollY,
                left: r.left + window.scrollX,
                width: r.width,
                height: r.height,
            })
        })
        setRects(found)
        setMissing(absent)
    }, [explainMode, steps])

    useLayoutEffect(() => {
        measure()
        if (!explainMode) return

        // Content shifts as runs complete, so re-measure on anything that moves.
        window.addEventListener('scroll', measure, { passive: true })
        window.addEventListener('resize', measure)
        const observer = new MutationObserver(measure)
        observer.observe(document.body, { childList: true, subtree: true, attributes: true })
        const timer = setInterval(measure, 1000)

        return () => {
            window.removeEventListener('scroll', measure)
            window.removeEventListener('resize', measure)
            observer.disconnect()
            clearInterval(timer)
        }
    }, [explainMode, measure])

    const startTour = (index = 0) => {
        setStepIndex(index)
        setTourActive(true)
        setExplainMode(false)
    }

    const closeTour = () => {
        setTourActive(false)
        document.querySelectorAll('.tour-spotlight-active').forEach(el =>
            el.classList.remove('tour-spotlight-active'),
        )
    }

    const clickTarget = () => {
        const el = document.querySelector(currentStep?.selector || '')
        if (el && typeof el.click === 'function') el.click()
        setTimeout(() => {
            setStepIndex(prev => (prev < steps.length - 1 ? prev + 1 : prev))
        }, 600)
    }

    if (steps.length === 0) return null

    return (
        <div id="ai-copilot-guide-hub" className="mb-5 space-y-3">
            {/* ── Control bar ───────────────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 flex-wrap rounded-xl px-4 py-2.5 bg-surface border border-border">
                <div className="flex items-center gap-2.5 min-w-0">
                    <span className="text-base shrink-0" aria-hidden="true">🤖</span>
                    <span className="text-xs font-bold text-text-primary truncate">AI Defense Copilot</span>
                    <span className="hidden sm:inline text-[11px] text-text-muted truncate">
                        — {steps.length} things to try on this page
                    </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => (tourActive ? closeTour() : startTour(0))}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer border ${
                            tourActive
                                ? 'bg-rose-500/15 text-rose-400 border-rose-500/40'
                                : 'bg-amber-500/15 text-amber-400 border-amber-500/40 hover:bg-amber-500/25'
                        }`}
                    >
                        {tourActive ? '✕ Exit tour' : '🚀 Start tour'}
                    </button>

                    <button
                        type="button"
                        onClick={() => { setExplainMode(v => !v); setOpenMarker(null); if (!explainMode) closeTour() }}
                        aria-pressed={explainMode}
                        className={`px-3 py-1.5 rounded-lg font-semibold text-xs transition-colors cursor-pointer border ${
                            explainMode
                                ? 'bg-indigo-500/15 text-indigo-400 border-indigo-500/40'
                                : 'bg-surface-sunken text-text-secondary border-border hover:text-text-primary'
                        }`}
                    >
                        {explainMode ? '✕ Hide explanations' : '💬 Explain buttons'}
                    </button>
                </div>
            </div>

            {/* Explain-mode hint */}
            {explainMode && (
                <p className="text-[11px] text-text-muted px-1">
                    Numbered markers now sit next to each control on the page — click one to see
                    what it does.
                    {missing.length > 0 && ` (${missing.length} not on screen yet: ${missing.join(', ')})`}
                </p>
            )}

            {/* ── Tour step ribbon ──────────────────────────────────── */}
            {tourActive && currentStep && (
                <div className="p-4 rounded-xl bg-surface border-2 border-amber-500/50 shadow-sm space-y-3 animate-popIn">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                            <span className="px-2.5 py-1 rounded-md text-[11px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 shrink-0">
                                {stepIndex + 1} / {steps.length}
                            </span>
                            <h3 className="text-sm font-bold text-text-primary truncate">{currentStep.title}</h3>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0" role="tablist" aria-label="Tour steps">
                            {steps.map((st, i) => (
                                <button
                                    key={i}
                                    type="button"
                                    onClick={() => setStepIndex(i)}
                                    title={`${i + 1}. ${st.title}`}
                                    aria-label={`Step ${i + 1}: ${st.title}`}
                                    className={`h-2 rounded-full transition-all cursor-pointer ${
                                        i === stepIndex ? 'w-6 bg-amber-400'
                                            : i < stepIndex ? 'w-2 bg-emerald-400'
                                            : 'w-2 bg-border'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
                                What to do
                            </span>
                            <p className="text-xs text-text-primary font-semibold leading-relaxed">
                                {currentStep.instruction}
                            </p>
                        </div>
                        <div className="p-3 rounded-lg bg-surface-sunken border border-border">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-text-secondary block mb-1">
                                What it actually does
                            </span>
                            <p className="text-xs text-text-secondary leading-relaxed">
                                {currentStep.explanation}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setStepIndex(p => Math.max(0, p - 1))}
                                disabled={stepIndex === 0}
                                className="px-3 py-2 rounded-lg text-xs font-semibold border border-border bg-surface-sunken hover:bg-surface-hover disabled:opacity-40 disabled:cursor-not-allowed text-text-primary cursor-pointer transition-colors"
                            >
                                ← Previous
                            </button>
                            <button
                                type="button"
                                onClick={clickTarget}
                                className="px-3 py-2 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer transition-colors"
                            >
                                ⚡ Click it for me
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={() => (stepIndex === steps.length - 1 ? closeTour() : setStepIndex(p => p + 1))}
                            className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 cursor-pointer transition-colors"
                        >
                            {stepIndex === steps.length - 1 ? 'Finish ✓' : 'Next →'}
                        </button>
                    </div>
                </div>
            )}

            {/* ── Inline markers, anchored to the real controls ─────── */}
            {explainMode && createPortal(
                <div className="ff-explain-layer">
                    {rects.map(r => (
                        <div key={r.index}>
                            {/* Outline around the control being explained */}
                            <div
                                className="ff-explain-outline"
                                style={{ top: r.top, left: r.left, width: r.width, height: r.height }}
                            />
                            <button
                                type="button"
                                onClick={() => setOpenMarker(openMarker === r.index ? null : r.index)}
                                aria-label={`Explain: ${r.step.title}`}
                                className="ff-explain-marker"
                                style={{ top: r.top - 10, left: r.left + r.width - 10 }}
                            >
                                {r.index + 1}
                            </button>

                            {openMarker === r.index && (
                                <div
                                    role="dialog"
                                    aria-label={r.step.title}
                                    className="ff-explain-popover"
                                    style={{
                                        top: r.top + r.height + 12,
                                        // Keep the card on screen when the control sits near the right edge.
                                        left: Math.min(r.left, window.innerWidth - 340),
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-1.5">
                                        <h4 className="text-xs font-bold text-text-primary">{r.step.title}</h4>
                                        <button
                                            type="button"
                                            onClick={() => setOpenMarker(null)}
                                            aria-label="Close"
                                            className="text-text-muted hover:text-text-primary text-xs cursor-pointer leading-none"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                    <p className="text-[11px] font-semibold text-amber-400 mb-1.5">{r.step.instruction}</p>
                                    <p className="text-[11px] text-text-secondary leading-relaxed">{r.step.explanation}</p>
                                    <button
                                        type="button"
                                        onClick={() => { setExplainMode(false); startTour(r.index) }}
                                        className="mt-2.5 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-500/15 text-amber-400 border border-amber-500/40 cursor-pointer"
                                    >
                                        Walk me through it →
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>,
                document.body,
            )}
        </div>
    )
}
