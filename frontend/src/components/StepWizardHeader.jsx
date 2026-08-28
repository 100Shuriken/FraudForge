export default function StepWizardHeader({
    steps = [],
    activeStep = 0,
    onStepChange,
    title = 'Step-by-Step Flow',
    subtitle = 'Complete each section sequentially.',
}) {
    return (
        <div className="mb-8 rounded-2xl border-2 border-border bg-surface p-4 sm:p-5 shadow-lg backdrop-blur-md">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-border/80 pb-4 mb-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded text-[11px] font-extrabold uppercase tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                            PROGRESSIVE DISCLOSURE
                        </span>
                        <span className="text-xs font-mono font-bold text-text-muted">
                            Step {activeStep + 1} of {steps.length}
                        </span>
                    </div>
                    <h2 className="text-lg sm:text-xl font-extrabold text-text-primary">
                        {steps[activeStep]?.title || title}
                    </h2>
                    <p className="text-xs sm:text-sm text-text-secondary mt-0.5">
                        {steps[activeStep]?.description || subtitle}
                    </p>
                </div>

                {/* Step navigation buttons */}
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        disabled={activeStep === 0}
                        onClick={() => onStepChange && onStepChange(activeStep - 1)}
                        className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                            activeStep === 0
                                ? 'opacity-40 cursor-not-allowed border-border text-text-muted bg-surface'
                                : 'border-border bg-surface hover:bg-surface-hover text-text-primary cursor-pointer'
                        }`}
                    >
                        ← Back
                    </button>
                    <button
                        type="button"
                        disabled={activeStep === steps.length - 1}
                        onClick={() => onStepChange && onStepChange(activeStep + 1)}
                        className={`px-4 py-2 rounded-xl text-xs font-extrabold border transition-all ${
                            activeStep === steps.length - 1
                                ? 'opacity-40 cursor-not-allowed border-border text-text-muted bg-surface'
                                : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:brightness-110 text-white border-indigo-500 shadow-md cursor-pointer'
                        }`}
                    >
                        Next Step →
                    </button>
                </div>
            </div>

            {/* Step Pills Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                {steps.map((step, idx) => {
                    const isCurrent = idx === activeStep
                    const isCompleted = idx < activeStep
                    return (
                        <button
                            key={step.id || idx}
                            type="button"
                            onClick={() => onStepChange && onStepChange(idx)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex items-center gap-2.5 ${
                                isCurrent
                                    ? 'border-indigo-500 bg-indigo-950/40 text-white shadow-[0_0_12px_rgba(99,102,241,0.25)]'
                                    : isCompleted
                                    ? 'border-emerald-500/40 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-950/30'
                                    : 'border-border bg-surface/50 text-text-muted hover:bg-surface-hover hover:text-text-secondary'
                            }`}
                        >
                            <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-lg text-xs font-mono font-black ${
                                isCurrent
                                    ? 'bg-indigo-500 text-slate-950'
                                    : isCompleted
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-surface border border-border text-text-muted'
                            }`}>
                                {isCompleted ? '✓' : idx + 1}
                            </span>
                            <div className="truncate">
                                <span className="block text-xs font-bold truncate">
                                    {step.label}
                                </span>
                            </div>
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
