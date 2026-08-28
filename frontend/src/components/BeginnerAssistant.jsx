import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAttackContext } from '../context/AttackContext.jsx'

/**
 * PAGE_TOUR_STEPS:
 * Defines interactive guided steps for every page in FraudForge.
 * Each step specifies:
 *  - selector: CSS selector or data-tour identifier to highlight
 *  - title: Name of the element/button/square
 *  - instruction: What the user has to click or configure
 *  - explanation: What this button or process actually does under the hood
 *  - actionType: 'click' | 'focus' | 'observe'
 */
const PAGE_TOUR_STEPS = {
    '/': [
        {
            selector: '[data-tour="hero-badge"]',
            title: 'Evaluation Platform & Problem Statement',
            instruction: 'Observe the Mission Objective banner at the top.',
            explanation: 'Explains the core problem: Generative AI allows fraudsters to synthesize voice clones, deepfakes, and targeted phishing that bypass traditional static bank rules.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="start-tour-btn"]',
            title: '⚡ Start Guided 3-Minute Tour Button',
            instruction: 'Click this button to start the end-to-end guided walkthrough.',
            explanation: 'Automatically takes you sequentially through all stages of the fraud detection and defense lifecycle.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="pipeline-runner"]',
            title: 'Autonomous Adversarial Loop Orchestrator',
            instruction: 'Select an attack vector and click "Run Full Pipeline".',
            explanation: 'Executes all 4 core stages in one click: 1. Scenario Synthesis ➔ 2. Target Attack Planning ➔ 3. Evasion Mining ➔ 4. Defender Model Hardening.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="briefing-next-btn"]',
            title: 'Identify Attack Vectors Navigation Button',
            instruction: 'Click "Identify Attack Vectors →" to explore the 8 AI fraud vectors.',
            explanation: 'Navigates to Stage 02 where you can explore how generative AI techniques create distinct fraud footprints.',
            actionType: 'click',
        },
    ],
    '/identify': [
        {
            selector: '[data-tour="vector-filter-all"]',
            title: 'Threat Vector Categories Filter',
            instruction: 'Filter threat vectors by category (Audio/Video, Text/Email, Identity/Account).',
            explanation: 'Allows filtering the 8 GenAI fraud modalities into targeted operational categories.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="vector-card-voice-clone"]',
            title: 'Voice Cloning Attack Vector Card',
            instruction: 'Click on the "Voice Cloning" card or any attack vector.',
            explanation: 'Selects this threat vector as the active attack type for scenario generation and model evaluation.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="simulate-btn"]',
            title: '⚡ Simulate Attack Scenario Button',
            instruction: 'Click the bright "⚡ Simulate Attack" button on the selected card.',
            explanation: 'Navigates to Stage 03 (Simulation Console) with this vector pre-selected to generate realistic payment artifacts.',
            actionType: 'click',
        },
    ],
    '/generate': [
        {
            selector: '[data-tour="mode-selector"]',
            title: 'Simulation Generation Mode Tabs',
            instruction: 'Switch between "Single Vector", "Chained Multi-Stage Attack", and "You Be the Attacker".',
            explanation: 'Single Vector generates one scam payload. Chained Attack generates sophisticated multi-hop attacks combining two vectors (e.g. Synthetic KYC + Urgent BEC).',
            actionType: 'click',
        },
        {
            selector: '[data-tour="vector-picker"]',
            title: 'Threat Vector Selector Dropdown',
            instruction: 'Choose which AI fraud modality to generate payload for.',
            explanation: 'Tells the AI generator which prompt template and synthetic generator logic to execute.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="generate-action-btn"]',
            title: '⚡ Generate Attack Scenario Button',
            instruction: 'Click this button to synthesize the attack payload.',
            explanation: 'Invokes Gemini / generator engine to craft a highly realistic scam script, victim profile, and payment transaction metadata.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="payload-tabs"]',
            title: 'Payload Inspector Tabs',
            instruction: 'Switch between "Full Story", "Scam Script", "Payment Artifact", and "Risk Analysis".',
            explanation: 'Allows forensic inspection of the generated communication text, transaction details, and detected risk indicators.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="export-lab-btn"]',
            title: '🔬 Export to AI Defense Lab Button',
            instruction: 'Click to transfer this synthetic payload into Stage 04 AI Defense Lab.',
            explanation: 'Bridges generated payloads into the red-team spar engine to test detection rates against customer profiles.',
            actionType: 'click',
        },
    ],
    '/ai-defense-lab': [
        {
            selector: '[data-tour="target-list"]',
            title: 'Step 1: Target Customer Persona Selector',
            instruction: 'Click any customer card (e.g. C0001 Mumbai) on the left.',
            explanation: 'Loads the victim account profile—including average spend ($2,028), transaction frequency (1 txn/day), payment method (UPI), and device stability (0.94). The AI attacker uses this to find blindspots.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="random-target-btn"]',
            title: '🎲 Random Target Persona Button',
            instruction: 'Click "🎲 Random Target" to instantly pick another synthetic customer.',
            explanation: 'Picks a random customer persona with different spending baselines from Delhi, Pune, Kolkata, or Bangalore.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="archetype-selector"]',
            title: 'Step 2: Threat Archetype Picker',
            instruction: 'Select a threat archetype (e.g. Velocity Anomaly, Sleeper Pacing, Phishing, or Adversarial Probing).',
            explanation: 'Configures the attacker strategy: Auto lets the AI planner pick the most vulnerable vector; Velocity tests rate limits; Sleeper Pacing slowly warms transaction cadence to evade rules.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="run-attack-btn"]',
            title: 'Step 3: ▶ Run Target Attack Plan Button',
            instruction: 'Click the green "▶ Run Target Attack Plan" button.',
            explanation: 'Executes the attack planner against the selected customer persona, synthesizing realistic transaction probes with modulated velocity and amounts.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="run-all-btn"]',
            title: '⚡ Execute All 10 Vectors Button',
            instruction: 'Click to run an adversarial test across all 10 threat vectors at once.',
            explanation: 'Runs a comprehensive vulnerability scan comparing detection rates across voice clones, deepfakes, synthetic KYC, and sleeper pacing.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="pipeline-stages"]',
            title: '6-Stage Autonomous Adversarial Pipeline Bar',
            instruction: 'Observe the 6 sequential stages of the attack simulation.',
            explanation: 'Visualizes the lifecycle: 01 Target Profiling ➔ 02 Weakness Mining ➔ 03 AI Planning ➔ 04 Payload Synthesis ➔ 05 Shadow Scoring ➔ 06 Evasion Extraction.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="step4-metrics"]',
            title: 'Step 4: Detection & Evasion Rate Badges',
            instruction: 'Inspect the live Detection Rate and Evasion Rate badges.',
            explanation: 'Calculated dynamically: Detection Rate is the percentage of attack transactions intercepted (risk score ≥ 0.50). Evasion Rate is the percentage that slipped past (false negatives).',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="transactions-table"]',
            title: 'Synthesized Transaction Records Table',
            instruction: 'Click on any row in the transaction table to inspect its forensics.',
            explanation: 'Displays each synthesized transaction record, its amount, velocity, risk probability, and whether it was INTERCEPTED or EVADED (slipped below detection threshold).',
            actionType: 'click',
        },
        {
            selector: '[data-tour="forensic-inspector"]',
            title: 'Deep-Dive Forensic Inspector Card',
            instruction: 'Review the amount deviation, velocity anomaly, and classifier explanation.',
            explanation: 'Decomposes why the machine learning model flagged or missed this transaction, showing exact feature shifts from baseline.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="shap-waterfall"]',
            title: 'SHAP Feature Contribution Waterfall',
            instruction: 'Inspect which features pushed the risk score up (red) or down (green).',
            explanation: 'SHAP (SHapley Additive exPlanations) shows how much features like transaction velocity, new payee, and amount ratio contributed to the final fraud probability.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="mule-graph"]',
            title: 'Graph Neural Network (GNN) Mule Ring Visualizer',
            instruction: 'Explore the interactive multi-hop fund routing network graph.',
            explanation: 'Visualizes synthetic money mule rings and cyclic layering transfers that fraudsters use to launder stolen funds across accounts.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="adapt-bridge-btn"]',
            title: '🔄 Continue to Stage 05: Adapt Button',
            instruction: 'Click "Continue to Stage 05: Adapt →" to feed missed attacks into model retraining.',
            explanation: 'Sends the evaded false-negative transactions into the closed-loop hardening engine.',
            actionType: 'click',
        },
    ],
    '/adapt': [
        {
            selector: '[data-tour="missed-txns"]',
            title: 'False Negative Evasion Records',
            instruction: 'Review the transactions that successfully bypassed baseline detection.',
            explanation: 'These are the "stealth attacks" that found blindspots in the current fraud rules and ML models.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="harder-batch-btn"]',
            title: '⚡ Synthesize Harder Evasion Batch Button',
            instruction: 'Click this button to generate tighter adversarial variations.',
            explanation: 'Uses iterative perturbation to synthesize harder transaction variants right on the classifier decision boundary.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="train-bridge-btn"]',
            title: '🛡️ Train Defender Models Button',
            instruction: 'Click to proceed to Stage 06 Defender Models.',
            explanation: 'Transfers the mined evasion patterns into the 3-round retraining pipeline to teach the defender model how to catch these attacks.',
            actionType: 'click',
        },
    ],
    '/defend': [
        {
            selector: '[data-tour="train-action-btn"]',
            title: '⚡ Train & Retrain Defender Models Button',
            instruction: 'Click "⚡ Train Defender Models (3 Rounds)".',
            explanation: 'Trains baseline vs augmented XGBoost, Random Forest, and Logistic Regression models. Adversarial retraining boosts recall from ~18% up to ~79%!',
            actionType: 'click',
        },
        {
            selector: '[data-tour="model-comparison-tabs"]',
            title: 'Model Architecture Comparison Cards',
            instruction: 'Compare XGBoost, Random Forest, and Logistic Regression metrics.',
            explanation: 'Evaluates Precision, Recall, F1-Score, and AUC-ROC across different ML algorithms on real credit card & synthetic datasets.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="transaction-scorer-tool"]',
            title: 'Live Interactive Transaction Scorer Sandbox',
            instruction: 'Adjust the Amount ($), Velocity (txn/hr), and New Payee toggles.',
            explanation: 'Sends real-time feature vectors into the trained ML classifier to get instantaneous risk score, recommended action (Allow/Review/Block), and SHAP explanations.',
            actionType: 'observe',
        },
    ],
    '/reality-check': [
        {
            selector: '[data-tour="prevalence-slider"]',
            title: 'Real-World Fraud Prevalence Slider',
            instruction: 'Drag the prevalence slider from 0.1% to 2.0%.',
            explanation: 'Demonstrates the Base Rate Fallacy: In real banks, fraud is rare (~0.1%). Even a 99% accurate model generates hundreds of false alarms that analysts must review.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="alert-queue-card"]',
            title: 'Analyst Alert Queue & Workload Calculator',
            instruction: 'Observe how daily alert volume changes with prevalence.',
            explanation: 'Calculates the real operational workload and cost required for human fraud investigators to review flagged transactions.',
            actionType: 'observe',
        },
    ],
    '/evidence': [
        {
            selector: '[data-tour="audit-table"]',
            title: 'Experimental Traceability Audit Register',
            instruction: 'Review the benchmark citations and dataset hashes.',
            explanation: 'Provides full provenance and reproducibility citations for PaySim (785k rows), ULB Credit Card, and synthetic benchmark seeds.',
            actionType: 'observe',
        },
        {
            selector: '[data-tour="compliance-matrix"]',
            title: 'Regulatory Compliance Standards Matrix',
            instruction: 'Check compliance against RBI Cyber Security, PCI-DSS v4.0, and FinCEN SAR.',
            explanation: 'Maps FraudForge defense capabilities against global financial regulatory standards and exportable Suspicious Activity Reports (SAR).',
            actionType: 'observe',
        },
    ],
    '/live-benchmark': [
        {
            selector: '[data-tour="run-benchmark-btn"]',
            title: 'Run Live Benchmark Button',
            instruction: 'Click to evaluate the current model on a fresh test split.',
            explanation: 'Executes an automated single-seed evaluation returning exact Precision, Recall, and inference latency in milliseconds.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="api-test-payload-btn"]',
            title: '⚡ Send Live Test Payload Button',
            instruction: 'Click to execute a live REST API request to `/api/v1/score`.',
            explanation: 'Demonstrates the production-ready REST API endpoint that banks integrate into their transaction processing pipeline.',
            actionType: 'click',
        },
    ],
    '/methodology': [
        {
            selector: '[data-tour="methodology-card"]',
            title: 'Closed-Loop Research Methodology',
            instruction: 'Read through the null-hypothesis testing and safety guardrails.',
            explanation: 'Explains how the scientific red-team / blue-team evaluation loop prevents data leakage and ensures mathematically sound defenses.',
            actionType: 'observe',
        },
    ],
    '/replay': [
        {
            selector: '[data-tour="start-replay-btn"]',
            title: '▶ Run Full Attack Simulation Button',
            instruction: 'Click the bright glowing button to start the live incident animation.',
            explanation: 'Plays an animated, 4-step sequence showing how an attack starts from victim targeting, evolves into social engineering, executes as anomalous payments, and is intercepted by AI.',
            actionType: 'click',
        },
        {
            selector: '[data-tour="replay-step-tabs"]',
            title: 'Interactive Incident Step Progression Tabs',
            instruction: 'Click any step (1. Profile ➔ 2. Phish ➔ 3. Payment ➔ 4. AI Verdict).',
            explanation: 'Allows manual step-by-step navigation through every phase of the animated attack incident.',
            actionType: 'click',
        },
    ],
}

export default function BeginnerAssistant() {
    const location = useLocation()
    const navigate = useNavigate()
    const { beginnerMode, toggleBeginnerMode } = useAttackContext()

    const [catalogOpen, setCatalogOpen] = useState(false)
    const [tourActive, setTourActive] = useState(false)
    const [currentStepIndex, setCurrentStepIndex] = useState(0)
    const [highlightedEl, setHighlightedEl] = useState(null)

    const steps = useMemo(() => {
        return PAGE_TOUR_STEPS[location.pathname] || PAGE_TOUR_STEPS['/'] || []
    }, [location.pathname])

    const currentStep = steps[currentStepIndex] || steps[0]

    // Reset step when route changes
    useEffect(() => {
        setCurrentStepIndex(0)
        setHighlightedEl(null)
    }, [location.pathname])

    // Highlight active element when tour is active
    useEffect(() => {
        if (!tourActive || !currentStep) {
            document.querySelectorAll('.tour-spotlight-active').forEach(el => {
                el.classList.remove('tour-spotlight-active')
            })
            setHighlightedEl(null)
            return
        }

        const selector = currentStep.selector
        let el = document.querySelector(selector)

        // Fallback: try data-tour attribute without brackets
        if (!el && selector.includes('data-tour')) {
            const raw = selector.replace(/[\[\]"']/g, '').split('=')[1]
            if (raw) el = document.querySelector(`[data-tour="${raw}"]`)
        }

        // Clean previous highlights
        document.querySelectorAll('.tour-spotlight-active').forEach(e => {
            e.classList.remove('tour-spotlight-active')
        })

        if (el) {
            el.classList.add('tour-spotlight-active')
            setHighlightedEl(el)

            // Smooth scroll into view
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })

            // Auto-advance when user interacts with the actual element on screen
            const onUserInteract = () => {
                setTimeout(() => {
                    setCurrentStepIndex(prev => {
                        if (prev < steps.length - 1) return prev + 1
                        return prev
                    })
                }, 600)
            }

            el.addEventListener('click', onUserInteract)
            el.addEventListener('change', onUserInteract)

            return () => {
                el.classList.remove('tour-spotlight-active')
                el.removeEventListener('click', onUserInteract)
                el.removeEventListener('change', onUserInteract)
            }
        } else {
            setHighlightedEl(null)
        }
    }, [tourActive, currentStepIndex, currentStep, location.pathname])

    const handleNextStep = () => {
        if (currentStepIndex < steps.length - 1) {
            setCurrentStepIndex(prev => prev + 1)
        } else {
            setTourActive(false)
        }
    }

    const handlePrevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1)
        }
    }

    const triggerCurrentAction = () => {
        if (!currentStep) return
        const el = document.querySelector(currentStep.selector)
        if (el) {
            el.classList.add('animate-ping')
            setTimeout(() => el.classList.remove('animate-ping'), 600)

            if (typeof el.click === 'function') {
                el.click()
            }
        }
        setTimeout(() => {
            if (currentStepIndex < steps.length - 1) {
                setCurrentStepIndex(prev => prev + 1)
            }
        }, 500)
    }

    const startTour = (stepIdx = 0) => {
        setCurrentStepIndex(stepIdx)
        setTourActive(true)
        setCatalogOpen(false)
    }

    const closeTour = () => {
        setTourActive(false)
        document.querySelectorAll('.tour-spotlight-active').forEach(el => {
            el.classList.remove('tour-spotlight-active')
        })
    }

    return (
        <div id="ai-copilot-guide-hub" className="mb-8 space-y-4">
            {/* ── TOP DISTINCTIVE AI COPILOT HERO STRIP ── */}
            <div className="relative overflow-hidden rounded-3xl p-4 sm:p-5 bg-gradient-to-r from-slate-950 via-amber-950/40 to-slate-950 border-2 border-amber-400 shadow-[0_0_35px_rgba(245,158,11,0.35),inset_0_0_20px_rgba(245,158,11,0.1)] transition-all">
                {/* Subtle gold background gradient */}
                <div className="absolute top-0 right-0 w-96 h-full bg-gradient-to-l from-amber-500/10 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    {/* Left Branding & Purpose */}
                    <div className="flex items-center gap-3.5">
                        <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-300 border-2 border-amber-400 text-2xl shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                            <span>🤖</span>
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                            </span>
                        </div>

                        <div>
                            <div className="flex items-center gap-2.5 flex-wrap">
                                <h2 className="text-sm sm:text-base font-black text-white tracking-wide uppercase flex items-center gap-2">
                                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-emerald-400">
                                        AI Defense Copilot
                                    </span>
                                    <span className="text-slate-400">·</span>
                                    <span className="text-xs font-mono font-bold text-amber-300 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40">
                                        Active Assistant
                                    </span>
                                </h2>
                                <span className="text-[11px] font-mono px-2.5 py-0.5 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-extrabold shadow-sm">
                                    🎯 {steps.length} Interactive Steps
                                </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1 font-medium leading-relaxed">
                                <strong className="text-amber-300">How it works:</strong> I spotlight each square and button with a gold/emerald halo, explain the underlying fraud/ML mechanics, and advance automatically as you click!
                            </p>
                        </div>
                    </div>

                    {/* Right High-Impact Actions */}
                    <div className="flex items-center gap-2.5 flex-wrap shrink-0">
                        {!tourActive ? (
                            <button
                                type="button"
                                onClick={() => startTour(0)}
                                className="group relative px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-emerald-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.6)] hover:shadow-[0_0_35px_rgba(245,158,11,0.9)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <span className="text-sm">🚀</span>
                                <span>Start Spotlight Tour</span>
                                <span className="text-slate-900 group-hover:translate-x-1 transition-transform">→</span>
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={closeTour}
                                className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-rose-950 text-rose-300 font-extrabold text-xs border-2 border-rose-500/50 shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                            >
                                <span>✕ Exit Guided Tour</span>
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => setCatalogOpen(true)}
                            className="px-4 py-2.5 rounded-2xl bg-slate-900 hover:bg-amber-950 text-amber-200 border-2 border-amber-500/50 font-bold text-xs shadow-md hover:border-amber-400 transition-all flex items-center gap-2 cursor-pointer"
                        >
                            <span>📖</span>
                            <span>Explain All Buttons</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* ── TOP-DOCKED STEP GUIDANCE RIBBON (Active Tour Step) ── */}
            {tourActive && currentStep && (
                <div className="p-4 sm:p-5 rounded-3xl bg-slate-950 border-2 border-amber-400 text-white shadow-[0_15px_45px_rgba(0,0,0,0.9),0_0_35px_rgba(245,158,11,0.35)] animate-popIn space-y-4">
                    {/* Step Title Header & Progress */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-amber-500/30">
                        <div className="flex items-center gap-2.5 flex-wrap">
                            <span className="px-3 py-1 rounded-xl text-xs font-mono font-black uppercase bg-gradient-to-r from-amber-400 to-yellow-400 text-slate-950 shadow-[0_0_12px_rgba(245,158,11,0.5)]">
                                STEP {currentStepIndex + 1} OF {steps.length}
                            </span>
                            <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-2">
                                <span className="text-amber-400">🎯 Target Element:</span> {currentStep.title}
                            </h3>
                        </div>

                        {/* Step Quick Navigation Dots */}
                        <div className="flex items-center gap-2 bg-slate-900 px-3 py-1.5 rounded-full border border-slate-800">
                            {steps.map((st, idx) => (
                                <button
                                    key={idx}
                                    type="button"
                                    onClick={() => startTour(idx)}
                                    title={`Step ${idx + 1}: ${st.title}`}
                                    className={`h-2.5 rounded-full transition-all cursor-pointer ${
                                        idx === currentStepIndex
                                            ? 'w-7 bg-amber-400 shadow-[0_0_10px_#facc15]'
                                            : idx < currentStepIndex
                                            ? 'w-3 bg-emerald-400'
                                            : 'w-2 bg-slate-700 hover:bg-slate-500'
                                    }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Instruction & Explanation Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5">
                        {/* What to click */}
                        <div className="md:col-span-6 p-4 rounded-2xl bg-amber-500/15 border-2 border-amber-500/50 text-xs space-y-1.5 shadow-sm">
                            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-amber-300 block flex items-center gap-1.5">
                                <span className="text-sm">👉</span> WHAT YOU HAVE TO CLICK / CONFIGURE:
                            </span>
                            <p className="text-amber-100 font-bold text-xs sm:text-sm leading-relaxed">
                                {currentStep.instruction}
                            </p>
                        </div>

                        {/* What does this button or process do */}
                        <div className="md:col-span-6 p-4 rounded-2xl bg-orange-950/50 border-2 border-orange-500/40 text-xs space-y-1.5 shadow-sm">
                            <span className="text-[11px] font-mono font-black uppercase tracking-wider text-orange-300 block flex items-center gap-1.5">
                                <span className="text-sm">💡</span> WHAT DOES THIS ACTUALLY DO? (UNDER THE HOOD):
                            </span>
                            <p className="text-slate-200 text-xs sm:text-sm leading-relaxed font-medium">
                                {currentStep.explanation}
                            </p>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between pt-1 gap-2 flex-wrap">
                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={handlePrevStep}
                                disabled={currentStepIndex === 0}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed text-white cursor-pointer transition-all"
                            >
                                ← Previous Step
                            </button>
                            <button
                                type="button"
                                onClick={triggerCurrentAction}
                                className="px-5 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-emerald-600 to-teal-600 hover:brightness-110 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <span>⚡ Click For Me</span>
                            </button>
                        </div>

                        <div className="flex items-center gap-2.5">
                            <button
                                type="button"
                                onClick={closeTour}
                                className="px-4 py-2.5 rounded-xl text-xs font-bold border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-300 cursor-pointer"
                            >
                                ✕ Exit Tour
                            </button>
                            <button
                                type="button"
                                onClick={handleNextStep}
                                className="px-6 py-2.5 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all flex items-center gap-2 cursor-pointer active:scale-95"
                            >
                                <span>{currentStepIndex === steps.length - 1 ? 'Finish Tour ✓' : 'Next Step →'}</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── FULL-PAGE ELEMENT CATALOG MODAL (Clean Center Overlay) ── */}
            {catalogOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
                    <div className="w-full max-w-2xl max-h-[85vh] rounded-3xl bg-surface border-2 border-indigo-500/60 shadow-[0_20px_70px_rgba(0,0,0,0.9)] flex flex-col overflow-hidden animate-popIn text-white">
                        {/* Modal Header */}
                        <div className="p-5 border-b border-border bg-gradient-to-r from-indigo-950 via-surface to-purple-950 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-xl border border-indigo-500/40">
                                    📖
                                </span>
                                <div>
                                    <h3 className="text-base font-extrabold text-white">
                                        Page Element Catalog & Process Guide
                                    </h3>
                                    <p className="text-xs text-indigo-300 font-mono">
                                        Current Stage: {location.pathname}
                                    </p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => setCatalogOpen(false)}
                                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-colors cursor-pointer"
                            >
                                ✕
                            </button>
                        </div>

                        {/* Modal Body */}
                        <div className="flex-1 overflow-y-auto p-5 space-y-3.5 scrollbar-thin">
                            {steps.map((st, idx) => (
                                <div
                                    key={idx}
                                    className="p-4 rounded-2xl border border-border bg-navy-950 space-y-2 hover:border-indigo-500/50 transition-all"
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono text-xs font-extrabold text-signal-cyan px-2 py-0.5 rounded bg-signal-cyan/10 border border-signal-cyan/20">
                                                0{idx + 1}
                                            </span>
                                            <h4 className="text-sm font-bold text-white">
                                                {st.title}
                                            </h4>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setCatalogOpen(false)
                                                startTour(idx)
                                            }}
                                            className="px-3 py-1 rounded-lg text-xs font-extrabold bg-signal-cyan/20 text-signal-cyan border border-signal-cyan/40 hover:bg-signal-cyan/30 transition-colors cursor-pointer"
                                        >
                                            Spotlight 👁️
                                        </button>
                                    </div>

                                    <div className="text-xs space-y-1.5 pt-1">
                                        <p className="text-amber-200">
                                            <strong className="text-amber-300">👉 Action:</strong> {st.instruction}
                                        </p>
                                        <p className="text-slate-300 leading-relaxed">
                                            <strong className="text-indigo-300">💡 Process:</strong> {st.explanation}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Modal Footer */}
                        <div className="p-4 border-t border-border bg-navy-950 flex items-center justify-between text-xs">
                            <span className="text-slate-400">
                                Click any <strong>Spotlight 👁️</strong> button to highlight that exact element on the page.
                            </span>
                            <button
                                type="button"
                                onClick={() => {
                                    setCatalogOpen(false)
                                    startTour(0)
                                }}
                                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
                            >
                                Launch Step 1 Tour →
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
