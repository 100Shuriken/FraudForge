const indicators = ['Urgency pressure', 'Impersonation', 'Alternate-channel redirect', 'Synthetic details']

export function createDemoGeneration(vector, scenario = '') {
    if (vector === 'synthetic-layering') {
        const legitimate = [12, 28, 54, 44, 30, 18]
        const fraud = [4, 9, 18, 22, 27, 16]
        const hours = [20, 24, 31, 38, 35, 29, 23, 18]
        const hourFraud = [8, 11, 13, 10, 7, 5, 4, 6]
        return {
            vector,
            totalTransactions: 260,
            fraudCount: 60,
            legitCount: 200,
            distributions: {
                legitimate: distribution('Legitimate Baseline', legitimate, hours),
                fraud: distribution('Synthetic Fraud', fraud, hourFraud),
            },
            sampleTransactions: Array.from({ length: 8 }, (_, index) => ({
                amount: [42.5, 118.2, 760.0, 2350.0][index % 4],
                hour: [9, 13, 2, 23][index % 4],
                txn_velocity_1h: [1, 2, 4, 7][index % 4],
                is_new_payee: index % 3 === 0 ? 1 : 0,
                is_international: index % 4 === 2 ? 1 : 0,
                actual_fraud: index % 3 === 0 ? 1 : 0,
            })),
        }
    }

    const isVoice = vector === 'voice-clone'
    const scenarioText = scenario || 'Controlled synthetic fraud scenario'
    const attackDetails = {
        'deepfake-kyc': ['Deepfake identity verification attempt', 'The synthetic applicant presents a manipulated identity signal during onboarding.', 'authorize a card purchase'],
        'synthetic-identity': ['Synthetic identity onboarding attempt', 'Fabricated identity details are combined with plausible account history to test verification controls.', 'use a newly opened credit account for a purchase'],
        'agentic-ato': ['Automated account takeover attempt', 'A synthetic agent sequence tests credential, session, and payment-change monitoring.', 'add a payee and initiate a bank transfer'],
        'card-testing': ['Distributed card testing attempt', 'Small authorization attempts are distributed across merchants to test payment controls.', 'send small authorization charges before a larger checkout'],
        'romance-scam': ['Romance and investment scam', 'A synthetic persona builds trust before introducing an urgent payment request.', 'send a wallet deposit to an unfamiliar payee'],
    }[vector]
    if (attackDetails) {
        const paymentAmount = randomAmount(vector)
        const payee = randomPayee()
        const paymentChannel = randomChannel(vector)
        return {
            vector,
            title: `${attackDetails[0]} — Synthetic Sample`,
            content: `[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n${attackDetails[1]} The modeled payment action is to ${attackDetails[2]} through ${paymentChannel}.\n\nAmount: $${paymentAmount.toFixed(2)}\nPayee: ${payee}\nScenario: ${scenarioText}\n\n[INDICATORS: identity inconsistency, payment authorization pressure, unusual payee]`,
            riskIndicators: ['Identity inconsistency', 'Pressure cue', 'Unusual payment pattern', 'Synthetic details'],
            payment: { transactionId: `txn_${Math.floor(Math.random() * 900000 + 100000)}`, amount: paymentAmount, currency: 'USD', payee, timestamp: new Date().toISOString(), channel: paymentChannel, paymentAction: attackDetails[2], vector, scenario: scenarioText },
            params: { scenario },
            source: 'Local demo fallback',
        }
    }
    return {
        vector,
        title: isVoice ? 'Urgent Executive Transfer — Synthetic Sample' : 'Account Security Alert — Synthetic Sample',
        content: isVoice
            ? `[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\nCaller (synthetic executive voice): "I need this payment approved before the next reporting cutoff. Please confirm the transfer through the alternate channel we discussed."\n\nScenario: ${scenario || 'Urgent vendor payment request'}\n\n[INDICATORS: urgency pressure, executive impersonation, alternate-channel redirect]`
            : `[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\nSubject: Action required — unusual account activity\n\nYour account requires immediate verification. Review the pending payment using the secure verification channel before the deadline.\n\nScenario: ${scenarioText}\n\n[INDICATORS: spoofed sender, countdown urgency, credential harvesting]`,
        riskIndicators: indicators,
        params: { scenario },
        source: 'Local demo fallback',
    }
}

function distribution(label, amounts, hours) {
    return {
        label,
        avgAmount: label.includes('Fraud') ? 840.4 : 214.8,
        avgHour: label.includes('Fraud') ? 7.4 : 12.1,
        pctNewPayee: label.includes('Fraud') ? 68.3 : 12.5,
        avgVelocity: label.includes('Fraud') ? 4.8 : 1.7,
        pctInternational: label.includes('Fraud') ? 43.3 : 8.5,
        amountDistribution: amounts.map((count, index) => ({ bin: ['0-50', '50-100', '100-250', '250-500', '500-1000', '1000-5000'][index], count })),
        hourDistribution: hours.map((count, index) => ({ bin: `${index * 3}-${index * 3 + 3}`, count })),
    }
}

export function createDemoTraining(seed = Date.now()) {
    const random = seededRandom(seed)
    const baseline = model('XGBoost Baseline (Real Data Only)', vary(0.91, random, 0.04), vary(0.18, random, 0.08), vary(0.3, random, 0.08), vary(0.78, random, 0.03))
    const logisticBaseline = model('Logistic Regression Baseline', vary(0.68, random, 0.05), vary(0.62, random, 0.06), vary(0.65, random, 0.05), vary(0.74, random, 0.04))
    const augmented = model('Augmented Model (Real + Synthetic)', vary(0.88, random, 0.04), vary(0.72, random, 0.08), vary(0.79, random, 0.08), vary(0.91, random, 0.03))
    const rounds = [
        round(1, vary(0.3, random, 0.06), vary(0.39, random, 0.08), vary(0.34, random, 0.07), vary(0.78, random, 0.03)),
        round(2, vary(0.57, random, 0.06), vary(0.69, random, 0.08), vary(0.62, random, 0.07), vary(0.86, random, 0.03)),
        round(3, vary(0.72, random, 0.06), vary(0.79, random, 0.08), vary(0.75, random, 0.07), vary(0.91, random, 0.03)),
    ]
    return {
        baseline,
        logisticBaseline,
        augmented,
        modelComparison: {
            note: 'Logistic Regression fits a linear decision hyperplane with balanced class weights, often achieving decent recall on linear amount/velocity thresholds. In contrast, XGBoost captures non-linear feature interactions (such as high velocity during off-hours with newly added international payees) to significantly reduce false positives and improve overall precision.',
        },
        improvement: { precision: -0.03, recall: 0.54, f1: 0.49, auc: 0.13 },
        falseNegatives: { count: 17, pattern: { avgAmount: 412.8, avgHour: 6.2, avgVelocity: 3.9 } },
        evasionAdvice: { text: 'Stealth fraud clusters around lower amounts, quiet hours, and moderate velocity. Add these combinations to the next adversarial training batch.', source: 'Local demo fallback' },
        rounds,
        featureImportanceByRound: rounds.map(item => ({ round: item.round, ...item.featureImportance })),
        featureImportance: { amount: 0.28, hour: 0.2, is_new_payee: 0.18, txn_velocity_1h: 0.16, days_since_last_txn: 0.1, is_international: 0.08 },
        flaggedTransactions: [
            { amount: 412.8, hour: 3, txn_velocity_1h: 5, is_new_payee: 1, is_international: 1, actual_fraud: 1, predicted_fraud_prob: 0.94, confidence: 0.88, confidence_level: 'High' },
            { amount: 188.4, hour: 6, txn_velocity_1h: 4, is_new_payee: 1, is_international: 0, actual_fraud: 1, predicted_fraud_prob: 0.87, confidence: 0.74, confidence_level: 'High' },
        ],
    }
}

function model(label, precision, recall, f1, auc) {
    return { label, precision, recall, f1, auc, trainSamples: 720, testSamples: 180, fraudRateTrain: 18.4, confusionMatrix: { tn: 132, fp: 12, fn: Math.round((1 - recall) * 30), tp: Math.round(recall * 30) } }
}

function round(roundNumber, precision, recall, f1, auc) {
    return { round: roundNumber, metrics: { precision, recall, f1, auc }, featureImportance: { amount: 0.28 - roundNumber * 0.01, hour: 0.16 + roundNumber * 0.02, is_new_payee: 0.2, txn_velocity_1h: 0.14 + roundNumber * 0.01, days_since_last_txn: 0.12, is_international: 0.1 } }
}

function seededRandom(seed) {
    let value = Math.abs(Number(seed)) || Date.now()
    return () => {
        value = (value * 1664525 + 1013904223) % 4294967296
        return value / 4294967296
    }
}

function vary(value, random, range) {
    return Math.max(0.01, Math.min(0.99, value + (random() - 0.5) * range))
}

function randomAmount(vector) {
    const ranges = { 'deepfake-kyc': [900, 4200], 'synthetic-identity': [1800, 9200], 'agentic-ato': [500, 6500], 'card-testing': [3, 1800], 'romance-scam': [250, 4200] }
    const [min, max] = ranges[vector] || [100, 5000]
    return min + Math.random() * (max - min)
}

function randomPayee() {
    return ['Northstar Supplies', 'Cedar Ridge Travel', 'Harborline Digital', 'Summit Office Goods', 'Riverside Wallet'][Math.floor(Math.random() * 5)]
}

function randomChannel(vector) {
    if (vector === 'card-testing' || vector === 'deepfake-kyc') return 'card checkout'
    if (vector === 'agentic-ato') return 'bank transfer'
    if (vector === 'romance-scam') return 'digital wallet'
    return 'credit account'
}

export function createDemoChainedGeneration(vector1 = 'synthetic-identity', vector2 = 'bec-email', scenario = '') {
    const s1 = createDemoGeneration(vector1, scenario)
    const s2 = createDemoGeneration(vector2, scenario)
    const amount = 24500.00
    const payee = 'Apex Meridian Global Escrow'
    return {
        isChained: true,
        vector1,
        vector2,
        chainLabel: `${s1.title?.split('—')[0]?.trim() || vector1} ➔ ${s2.title?.split('—')[0]?.trim() || vector2}`,
        title: `Chained Compound Attack: ${vector1} + ${vector2}`,
        stage1: {
            vector: vector1,
            stageTitle: 'Stage 1: Identity Infiltration / Account Creation',
            title: s1.title,
            content: s1.content,
            riskIndicators: s1.riskIndicators || [],
        },
        stage2: {
            vector: vector2,
            stageTitle: 'Stage 2: Social Engineering & Payment Trigger',
            title: s2.title,
            content: s2.content,
            riskIndicators: s2.riskIndicators || [],
        },
        payment: {
            transactionId: `CHN-${Math.floor(Math.random() * 900000 + 100000)}`,
            amount,
            currency: 'USD',
            payee,
            timestamp: new Date().toISOString(),
            channel: 'bank transfer',
            paymentAction: `execute $${amount.toLocaleString()} transfer from synthetic account`,
            vector: `chained:${vector1}+${vector2}`,
            scenario: scenario || 'Cross-vector chained synthetic attack scenario',
            features: {
                amount,
                hour: 2,
                is_new_payee: 1,
                txn_velocity_1h: 6,
                days_since_last_txn: 0,
                is_international: 1,
            },
        },
        riskIndicators: ['Compound cross-vector chaining', 'Multi-stage escalation', 'Synthetic identity baseline', 'Executive impersonation'],
        source: 'Local demo fallback',
    }
}