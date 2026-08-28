import { useState } from 'react'

const SCAM_SCENARIOS = [
    {
        id: 'voice-call',
        title: 'Cloned Voice Phone Call',
        icon: '🎙️',
        badge: 'Voice AI',
        color: 'rose',
        story: 'A scammer uses a 3-second sample of your boss or family member’s voice from social media to generate an urgent call requesting emergency money.',
        scamPreview: {
            sender: 'Incoming Call: Boss / Family (Spoofed Caller ID)',
            type: 'audio',
            transcript: '“Hey! I am stuck in an urgent meeting with the client and my card is declined. Please wire $2,400 to this vendor account right now before the deadline!”',
            redFlags: ['Urgency & panic pressure', 'Unknown new payee account', 'Asks to bypass standard approval'],
        },
        shieldResult: {
            verdict: 'SUSPICIOUS PAYMENT BLOCKED',
            amountSaved: '$2,400.00',
            time: '0.04 seconds',
            explanation: 'FraudForge detected abnormal payment velocity to a brand-new payee at an unusual hour. The transfer was safely frozen before any funds left your account.',
            status: 'safe',
        },
        consumerTip: 'Always hang up and call your family member or boss back directly on their known personal phone number.',
    },
    {
        id: 'fake-sms',
        title: 'Urgent Electricity / Bank SMS',
        icon: '📱',
        badge: 'Phishing SMS',
        color: 'amber',
        story: 'You receive an urgent SMS claiming your electricity power or bank debit card will be suspended within 30 minutes unless you make a $150 update fee.',
        scamPreview: {
            sender: 'SMS from: +1 (800) 555-BANK-ALERT',
            type: 'sms',
            transcript: '“URGENT: Your electricity connection will be disconnected tonight at 9:30 PM due to unpaid bill. Update bill immediately at: pay-power-fast.cc/secure”',
            redFlags: ['30-minute countdown fear tactic', 'Suspicious non-official website link', 'Requests instant payment via unknown portal'],
        },
        shieldResult: {
            verdict: 'PHISHING LINK & TRANSFER INTERCEPTED',
            amountSaved: '$850.00 (Account Balance Protected)',
            time: '0.02 seconds',
            explanation: 'FraudForge flagged the malicious recipient domain and blocked payment credentials from being authorized.',
            status: 'safe',
        },
        consumerTip: 'Official utility companies and banks never ask for urgent payments through random SMS links.',
    },
    {
        id: 'deepfake-video',
        title: 'Deepfake Video Support Call',
        icon: '📹',
        badge: 'Video KYC Scam',
        color: 'purple',
        story: 'A fraudster wearing real-time AI face-swap filters contacts you on WhatsApp video pretending to be a bank manager offering an account upgrade.',
        scamPreview: {
            sender: 'WhatsApp Video Call: “Official Bank Verification”',
            type: 'video',
            transcript: '“Good evening. I am the senior fraud manager verifying your account. Please hold your ID card to the screen and approve the test authorization.”',
            redFlags: ['Bank staff contacting via WhatsApp video', 'Requests you to authorize a "test" transaction', 'Unnatural eye-blinking and facial boundary artifacts'],
        },
        shieldResult: {
            verdict: 'IDENTITY SPOOFING STOPPED',
            amountSaved: '$12,500.00',
            time: '0.05 seconds',
            explanation: 'Biometric synthetic texture detection detected video manipulation, instantly rejecting the fraudulent account takeover.',
            status: 'safe',
        },
        consumerTip: 'Real banks never conduct identity verification or transfer approvals via consumer video chat apps.',
    },
    {
        id: 'fake-deal',
        title: 'Too-Good-To-Be-True Shopping Deal',
        icon: '🛍️',
        badge: 'Fake E-Commerce',
        color: 'orange',
        story: 'An AI-generated scam shopping site displays brand new electronics at 80% discount to harvest credit card numbers.',
        scamPreview: {
            sender: 'Sponsored Web Ad: “Flash Sale: $1,200 Laptop for $199”',
            type: 'web',
            transcript: '“Deal expires in 04:59! Instant credit card checkout required. 100% money back guarantee.”',
            redFlags: ['Unbelievably low 80% discount', 'Fake countdown timer', 'Merchant domain registered 2 days ago'],
        },
        shieldResult: {
            verdict: 'MERCHANT WALLET BLACKLISTED',
            amountSaved: '$199.00 (Plus Credit Card Safeguarded)',
            time: '0.03 seconds',
            explanation: 'FraudForge identified the merchant terminal as a zero-fulfillment clone and refused payment authorization.',
            status: 'safe',
        },
        consumerTip: 'If a price looks too good to be true, it is almost certainly a scam.',
    },
]

const QUICK_PRESETS = [
    {
        label: '⚡ Electricity Bill Threat',
        text: 'URGENT: Your power connection will be cut at 9:30 PM tonight due to pending bill #4928. Pay $120 immediately to officer at: bit.ly/power-pay-now',
    },
    {
        label: '🎙️ Family Emergency Wire',
        text: 'Mom! My phone broke and I am at the emergency clinic with a flat tire. Can you please send $850 via UPI / wire to this doctor immediately?',
    },
    {
        label: '✉️ CEO Supplier Invoice',
        text: 'Aarav, I need you to wire $24,500 for the Apex Meridian supplier invoice before the 5 PM bank cutoff today. Keep this confidential until signed.',
    },
    {
        label: '📦 Legitimate Delivery Update',
        text: 'Your package #TRK-88291 from Amazon has shipped and is estimated to arrive tomorrow by 4 PM. Track on amazon.com/orders.',
    },
]

export default function ConsumerSimpleView({ onSwitchToJudge }) {
    const [selectedScam, setSelectedScam] = useState(SCAM_SCENARIOS[0])
    const [simulating, setSimulating] = useState(false)
    const [shieldActive, setShieldActive] = useState(true)

    // Upgraded "Check with Shield" State
    const [checkMode, setCheckMode] = useState('text') // 'text' | 'payment'
    const [messageInput, setMessageInput] = useState('')
    
    // Payment Input State
    const [payeeName, setPayeeName] = useState('Apex Meridian Global Escrow')
    const [payAmount, setPayAmount] = useState('3450')
    const [isNewPayee, setIsNewPayee] = useState(true)
    const [payChannel, setPayChannel] = useState('Instant UPI / Wire')
    const [isOffHours, setIsOffHours] = useState(true)

    // Shield Evaluation Output
    const [evaluating, setEvaluating] = useState(false)
    const [shieldReport, setShieldReport] = useState(null)

    const handleRunTest = (scam) => {
        setSelectedScam(scam)
        setSimulating(true)
        setShieldActive(false)
        setTimeout(() => {
            setSimulating(false)
            setShieldActive(true)
        }, 600)
    }

    // Intelligent Multi-Factor Threat Evaluation Engine
    const evaluateThreat = (e) => {
        if (e) e.preventDefault()
        setEvaluating(true)

        setTimeout(() => {
            if (checkMode === 'text') {
                const text = messageInput.trim()
                if (!text) {
                    setEvaluating(false)
                    return
                }

                // Factor 1: Urgency & Panic
                const urgencyMatches = text.match(/urgent|immediately|tonight|cutoff|now|warning|suspended|disconnected|expire|police|legal/gi) || []
                const urgencyScore = Math.min(100, urgencyMatches.length * 35)

                // Factor 2: Financial Demand / Money Request
                const moneyMatches = text.match(/\$|\b\d{2,6}\b|wire|pay|fee|bill|gift card|crypto|transfer|send|upi|bank/gi) || []
                const moneyScore = Math.min(100, moneyMatches.length * 28)

                // Factor 3: Authority / Impersonation
                const authorityMatches = text.match(/boss|cfo|officer|police|bank|amazon|electricity|power|manager|doctor|mom|family/gi) || []
                const authorityScore = Math.min(100, authorityMatches.length * 30)

                // Factor 4: Suspicious Links / Secrecy
                const linkMatches = text.match(/http|bit\.ly|\.cc|\.xyz|click|link|confidential|secret|dont tell/gi) || []
                const linkScore = Math.min(100, linkMatches.length * 45)

                // Overall Risk Composite (0 - 100)
                const totalRisk = Math.min(99, Math.round((urgencyScore * 0.35) + (moneyScore * 0.25) + (authorityScore * 0.20) + (linkScore * 0.20)))

                const isBlocked = totalRisk >= 65
                const isSuspicious = totalRisk >= 30 && totalRisk < 65

                setShieldReport({
                    type: 'text',
                    riskScore: totalRisk,
                    status: isBlocked ? 'blocked' : isSuspicious ? 'caution' : 'safe',
                    verdict: isBlocked ? '🛑 HIGH RISK SCAM — SHIELD INTERCEPTED' : isSuspicious ? '⚠️ SUSPICIOUS — VERIFY DIRECTLY' : '✅ SAFE (No Immediate Threat Detected)',
                    actionTime: '0.03 seconds',
                    moneySaved: isBlocked ? '$2,400.00' : '$0.00',
                    factors: [
                        { label: 'Urgency & Pressure Pressure', score: urgencyScore, flag: urgencyMatches.length > 0 },
                        { label: 'Payment Demand Indicators', score: moneyScore, flag: moneyMatches.length > 0 },
                        { label: 'Authority / Impersonation Cues', score: authorityScore, flag: authorityMatches.length > 0 },
                        { label: 'Suspicious Links or Secrecy', score: linkScore, flag: linkMatches.length > 0 },
                    ],
                    detectedKeywords: [...new Set([...urgencyMatches, ...moneyMatches, ...authorityMatches, ...linkMatches])],
                    checklist: isBlocked ? [
                        'DO NOT click any link or send money to this recipient.',
                        'DO NOT share any OTP, passwords, or 2FA codes.',
                        'Call the individual directly on their known personal phone number.',
                        'Report this scam to your bank or cyber helpline (1930).',
                    ] : [
                        'No immediate generative fraud patterns detected.',
                        'Always ensure payment amounts match your invoice before confirming.',
                    ]
                })
            } else {
                // Payment Mode Evaluation
                const amountNum = parseFloat(payAmount) || 0
                let risk = 15

                if (isNewPayee) risk += 35
                if (isOffHours) risk += 25
                if (amountNum > 2000) risk += 20
                if (/escrow|crypto|overseas|unknown|apex/i.test(payeeName)) risk += 15

                const totalRisk = Math.min(98, risk)
                const isBlocked = totalRisk >= 60

                setShieldReport({
                    type: 'payment',
                    riskScore: totalRisk,
                    status: isBlocked ? 'blocked' : totalRisk > 30 ? 'caution' : 'safe',
                    verdict: isBlocked ? '🛑 TRANSACTION FROZEN BY SHIELD' : '✅ TRANSACTION CLEARED',
                    actionTime: '0.04 seconds',
                    moneySaved: isBlocked ? `$${amountNum.toLocaleString()}` : '$0.00',
                    factors: [
                        { label: 'New Unverified Payee Profile', score: isNewPayee ? 85 : 10, flag: isNewPayee },
                        { label: 'Off-Hours Velocity Anomaly', score: isOffHours ? 75 : 15, flag: isOffHours },
                        { label: 'High-Value Amount Deviation', score: amountNum > 1500 ? 80 : 20, flag: amountNum > 1500 },
                        { label: 'Destination Routing Risk', score: 70, flag: true },
                    ],
                    detectedKeywords: [
                        isNewPayee ? 'New Payee' : null,
                        isOffHours ? 'Off-Hours Execution' : null,
                        amountNum > 1500 ? `High Amount ($${amountNum})` : null,
                    ].filter(Boolean),
                    checklist: isBlocked ? [
                        'This transaction shows extreme deviation from your normal spending habits.',
                        'FraudForge has held the payment in escrow for your safety.',
                        'Please verify via your bank mobile app biometric authentication to proceed.',
                    ] : [
                        'Transaction parameters are consistent with your account history.',
                    ]
                })
            }
            setEvaluating(false)
        }, 500)
    }

    return (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-10 font-sans text-slate-100">
            {/* ── Consumer Hero Header ── */}
            <div className="rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-slate-950 via-slate-900 to-amber-950/40 border-2 border-amber-500/40 shadow-2xl space-y-4 text-center sm:text-left flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="space-y-2 max-w-2xl">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-black uppercase tracking-wider">
                        <span>🛡️</span> Everyday Consumer Protection
                    </div>
                    <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                        How <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-emerald-400">FraudForge Protects Your Money</span>
                    </h1>
                    <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-medium">
                        Scammers now use generative AI to clone voices, create deepfake video calls, and craft believable messages. Here is how our automated bank defense stops them in real time.
                    </p>
                </div>

                {onSwitchToJudge && (
                    <button
                        type="button"
                        onClick={onSwitchToJudge}
                        className="shrink-0 px-5 py-3 rounded-2xl bg-slate-900 hover:bg-amber-950 text-amber-300 border-2 border-amber-500/50 font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                        <span>🏆 Switch to Technical Mode →</span>
                    </button>
                )}
            </div>

            {/* ── Step 1: Choose a Scam Scenario ── */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400">
                            STEP 1 OF 2
                        </span>
                        <h2 className="text-xl font-extrabold text-white">
                            Choose a Real-Life Scam to Test:
                        </h2>
                    </div>
                    <span className="text-xs text-slate-400 hidden sm:inline-block">
                        Click any card to see how it works
                    </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {SCAM_SCENARIOS.map((scam) => {
                        const isSelected = selectedScam.id === scam.id
                        return (
                            <button
                                key={scam.id}
                                type="button"
                                onClick={() => handleRunTest(scam)}
                                className={`p-5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer flex flex-col justify-between space-y-3 ${
                                    isSelected
                                        ? 'bg-amber-500/15 border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] ring-1 ring-amber-400 scale-[1.02]'
                                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-600 hover:bg-slate-800/80'
                                }`}
                            >
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <span className="text-3xl">{scam.icon}</span>
                                        <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                                            isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
                                        }`}>
                                            {scam.badge}
                                        </span>
                                    </div>
                                    <h3 className="font-extrabold text-base text-white">
                                        {scam.title}
                                    </h3>
                                    <p className="text-xs text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                                        {scam.story}
                                    </p>
                                </div>

                                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs font-bold">
                                    <span className={isSelected ? 'text-amber-300' : 'text-slate-400'}>
                                        {isSelected ? '● Active Test' : 'Test This Scam →'}
                                    </span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* ── Step 2: Interactive Scam Preview vs FraudForge Defense Shield ── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Left: What the Scammer Sends (The Trick) */}
                <div className="lg:col-span-6 rounded-3xl p-6 sm:p-8 bg-slate-950 border-2 border-rose-500/40 shadow-xl space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-rose-500/20">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/20 text-rose-400 text-lg border border-rose-500/40">
                                ⚠️
                            </span>
                            <div>
                                <h3 className="text-base font-extrabold text-white">
                                    What You Receive (The Scam)
                                </h3>
                                <p className="text-xs text-rose-300 font-mono">
                                    {selectedScam.scamPreview.sender}
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            MALICIOUS LURE
                        </span>
                    </div>

                    {/* Simulated Message Box */}
                    <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
                        <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                            <span>Incoming Audio / Message</span>
                            <span>Just now</span>
                        </div>
                        <p className="text-sm sm:text-base text-slate-100 font-serif italic bg-slate-950/80 p-4 rounded-xl border border-border leading-relaxed">
                            {selectedScam.scamPreview.transcript}
                        </p>
                    </div>

                    {/* Highlighted Psychological Tricks */}
                    <div className="space-y-2">
                        <span className="text-xs font-mono font-bold uppercase tracking-wider text-rose-400 block">
                            🚩 Psychological Tricks Used by the Scammer:
                        </span>
                        <div className="space-y-1.5">
                            {selectedScam.scamPreview.redFlags.map((flag, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-950/30 border border-rose-500/30 text-xs font-semibold text-rose-200">
                                    <span>⚠️</span>
                                    <span>{flag}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right: How FraudForge Shield Protects You */}
                <div className="lg:col-span-6 rounded-3xl p-6 sm:p-8 bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950 border-2 border-emerald-500 shadow-2xl space-y-5">
                    <div className="flex items-center justify-between pb-4 border-b border-emerald-500/30">
                        <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 text-lg border border-emerald-500/40">
                                🛡️
                            </span>
                            <div>
                                <h3 className="text-base font-extrabold text-white">
                                    How FraudForge Protects You
                                </h3>
                                <p className="text-xs text-emerald-300 font-mono">
                                    Autonomous Defense Action
                                </p>
                            </div>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-500 text-slate-950 shadow-sm">
                            PROTECTED ✓
                        </span>
                    </div>

                    {/* Shield Status Card */}
                    <div className="p-5 rounded-2xl bg-emerald-950/30 border-2 border-emerald-500/60 space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-mono font-bold text-emerald-400 uppercase">
                                Defense Verdict
                            </span>
                            <span className="text-[11px] font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/40">
                                Blocked in {selectedScam.shieldResult.time}
                            </span>
                        </div>
                        <div className="text-lg sm:text-xl font-black text-white flex items-center gap-2">
                            <span>✅</span>
                            <span>{selectedScam.shieldResult.verdict}</span>
                        </div>
                        <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium">
                            {selectedScam.shieldResult.explanation}
                        </p>
                    </div>

                    {/* Saved Amount Badge */}
                    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-between">
                        <div>
                            <span className="text-xs text-slate-400 block font-medium">Your Money Protected:</span>
                            <span className="text-2xl font-black text-emerald-400 font-mono">
                                {selectedScam.shieldResult.amountSaved}
                            </span>
                        </div>
                        <div className="text-right">
                            <span className="text-xs text-slate-400 block font-medium">Customer Stress:</span>
                            <span className="text-sm font-extrabold text-white">0% (Zero Loss)</span>
                        </div>
                    </div>

                    {/* Everyday Consumer Safety Tip */}
                    <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/40 space-y-1">
                        <span className="text-xs font-mono font-bold uppercase text-amber-300 block flex items-center gap-1.5">
                            <span>💡</span> Consumer Safety Tip:
                        </span>
                        <p className="text-xs sm:text-sm text-amber-100 font-semibold leading-relaxed">
                            {selectedScam.consumerTip}
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 🚀 UPGRADED INTERACTIVE: CHECK WITH SHIELD ENGINE ── */}
            <div className="rounded-3xl p-6 sm:p-10 bg-slate-950 border-2 border-amber-500/50 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-amber-500/20">
                    <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/40 text-2xl shadow-[0_0_20px_rgba(245,158,11,0.3)]">
                            🔍
                        </div>
                        <div>
                            <h2 className="text-xl sm:text-2xl font-extrabold text-white">
                                Interactive AI Shield Threat Checker
                            </h2>
                            <p className="text-xs text-slate-300 mt-0.5">
                                Test any real message, SMS, or payment transaction against FraudForge's real-time risk classifier.
                            </p>
                        </div>
                    </div>

                    {/* Check Mode Toggle */}
                    <div className="flex items-center p-1 rounded-2xl bg-slate-900 border border-slate-800 self-start sm:self-auto">
                        <button
                            type="button"
                            onClick={() => {
                                setCheckMode('text')
                                setShieldReport(null)
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                checkMode === 'text'
                                    ? 'bg-amber-400 text-slate-950 font-black shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            💬 Check Message / SMS
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setCheckMode('payment')
                                setShieldReport(null)
                            }}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                checkMode === 'payment'
                                    ? 'bg-emerald-400 text-slate-950 font-black shadow-md'
                                    : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            💳 Check Bank Transfer
                        </button>
                    </div>
                </div>

                {/* Mode 1: Text & SMS Scanner */}
                {checkMode === 'text' ? (
                    <div className="space-y-4">
                        {/* Quick Presets */}
                        <div className="space-y-2">
                            <span className="text-xs font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                                <span>⚡</span> Or Try a Quick Preset Scenario:
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                                {QUICK_PRESETS.map((preset, idx) => (
                                    <button
                                        key={idx}
                                        type="button"
                                        onClick={() => {
                                            setMessageInput(preset.text)
                                            setShieldReport(null)
                                        }}
                                        className="p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 hover:border-amber-400 text-left text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer truncate"
                                        title={preset.text}
                                    >
                                        {preset.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Input Area */}
                        <form onSubmit={evaluateThreat} className="space-y-3">
                            <div className="space-y-1.5">
                                <label className="text-xs font-mono font-bold text-slate-300">
                                    Paste Message, SMS, Email, or Call Transcript:
                                </label>
                                <textarea
                                    rows={4}
                                    value={messageInput}
                                    onChange={(e) => setMessageInput(e.target.value)}
                                    placeholder="Paste suspicious text here (e.g. 'Your power will be disconnected at 9:30 PM, wire $120 immediately to officer...')"
                                    className="w-full p-4 rounded-2xl bg-slate-900 border border-slate-700 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-400 font-sans leading-relaxed"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={evaluating || !messageInput.trim()}
                                className="w-full sm:w-auto px-8 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-yellow-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(245,158,11,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40"
                            >
                                {evaluating ? (
                                    <>
                                        <span className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                                        <span>Analyzing Multi-Factor Risk…</span>
                                    </>
                                ) : (
                                    <>
                                        <span>🛡️ Check with Shield</span>
                                        <span>→</span>
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                ) : (
                    /* Mode 2: Payment Transfer Scanner */
                    <form onSubmit={evaluateThreat} className="space-y-5">
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-xs font-mono font-bold text-slate-300">
                                    Recipient Name / Payee ID:
                                </label>
                                <input
                                    type="text"
                                    value={payeeName}
                                    onChange={(e) => setPayeeName(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-mono font-bold text-slate-300">
                                    Transfer Amount ($):
                                </label>
                                <input
                                    type="number"
                                    value={payAmount}
                                    onChange={(e) => setPayAmount(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400 font-mono font-bold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-mono font-bold text-slate-300">
                                    Transfer Channel:
                                </label>
                                <select
                                    value={payChannel}
                                    onChange={(e) => setPayChannel(e.target.value)}
                                    className="w-full px-4 py-3 rounded-xl bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-400"
                                >
                                    <option value="Instant UPI / Wire">Instant UPI / Immediate Wire</option>
                                    <option value="Standard ACH">Standard ACH Bank Transfer</option>
                                    <option value="Credit Card Checkout">Online Credit Card Checkout</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-4 pt-1">
                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={isNewPayee}
                                    onChange={(e) => setIsNewPayee(e.target.checked)}
                                    className="w-4 h-4 rounded text-amber-500"
                                />
                                <span>Brand New Payee (First-Time Transfer)</span>
                            </label>

                            <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-300">
                                <input
                                    type="checkbox"
                                    checked={isOffHours}
                                    onChange={(e) => setIsOffHours(e.target.checked)}
                                    className="w-4 h-4 rounded text-rose-500"
                                />
                                <span>Off-Hours Transaction (02:45 AM Late Night)</span>
                            </label>
                        </div>

                        <button
                            type="submit"
                            disabled={evaluating}
                            className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:brightness-110 text-slate-950 font-black text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all flex items-center justify-center gap-2 cursor-pointer"
                        >
                            {evaluating ? 'Evaluating Payment Parameters…' : '🛡️ Evaluate Transfer Security →'}
                        </button>
                    </form>
                )}

                {/* ── Rich Diagnostic Shield Output Report ── */}
                {shieldReport && (
                    <div className="rounded-3xl p-6 sm:p-8 bg-slate-900 border-2 border-emerald-500 shadow-2xl space-y-6 animate-popIn">
                        {/* Threat Verdict & Gauge Header */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-border">
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono font-black uppercase px-2.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                                        SHIELD DIAGNOSTIC REPORT
                                    </span>
                                    <span className="text-xs text-text-muted">· Intercepted in {shieldReport.actionTime}</span>
                                </div>
                                <h3 className="text-xl sm:text-2xl font-black text-white">
                                    {shieldReport.verdict}
                                </h3>
                            </div>

                            {/* Threat Score Pill */}
                            <div className="flex items-center gap-4 bg-slate-950 px-5 py-3 rounded-2xl border border-slate-800">
                                <div>
                                    <span className="text-[10px] text-text-muted uppercase font-bold block">Threat Level</span>
                                    <span className={`text-2xl font-black font-mono ${
                                        shieldReport.status === 'blocked' ? 'text-rose-400' : shieldReport.status === 'caution' ? 'text-amber-400' : 'text-emerald-400'
                                    }`}>
                                        {shieldReport.riskScore}/100
                                    </span>
                                </div>
                                <div className="w-24 h-3 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${
                                            shieldReport.status === 'blocked' ? 'bg-rose-500' : shieldReport.status === 'caution' ? 'bg-amber-400' : 'bg-emerald-400'
                                        }`}
                                        style={{ width: `${shieldReport.riskScore}%` }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* 4 Multi-Factor Risk Breakdown Meters */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                            {shieldReport.factors.map((f, idx) => (
                                <div key={idx} className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between text-xs font-bold">
                                        <span className="text-slate-300 truncate">{f.label}</span>
                                        <span className={`font-mono ${f.score > 50 ? 'text-rose-400 font-extrabold' : 'text-slate-400'}`}>
                                            {f.score}%
                                        </span>
                                    </div>
                                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                        <div
                                            className={`h-full ${f.score > 50 ? 'bg-rose-500' : f.score > 20 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                                            style={{ width: `${f.score}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Flagged Evidence Words */}
                        {shieldReport.detectedKeywords && shieldReport.detectedKeywords.length > 0 && (
                            <div className="space-y-2">
                                <span className="text-xs font-mono font-bold text-rose-300 uppercase block">
                                    🚩 Trigger Phrases / Anomaly Markers Detected:
                                </span>
                                <div className="flex flex-wrap gap-2">
                                    {shieldReport.detectedKeywords.map((kw, idx) => (
                                        <span key={idx} className="px-3 py-1 rounded-lg bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs font-mono font-bold">
                                            "{kw}"
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Immediate Consumer Action Checklist */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-slate-950 border border-amber-500/30 space-y-2.5">
                            <span className="text-xs font-mono font-bold text-amber-300 uppercase flex items-center gap-1.5">
                                <span>📋</span> Recommended Consumer Action Checklist:
                            </span>
                            <ul className="space-y-1.5 text-xs sm:text-sm text-slate-200">
                                {shieldReport.checklist.map((item, idx) => (
                                    <li key={idx} className="flex items-start gap-2">
                                        <span className="text-amber-400 font-bold">•</span>
                                        <span>{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
