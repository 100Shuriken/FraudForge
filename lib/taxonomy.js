/**
 * Attack taxonomy: the Identify pillar.
 *
 * The brief asks for breadth AND depth across "channels, rails, and
 * social-engineering surfaces". So each vector carries more than a name:
 * the rail it rides, the surface it attacks, what GenAI specifically
 * unlocked, the observable signals it leaves, and the generator parameters
 * that let the Generate pillar reproduce it.
 *
 * `gen` is what makes an entry more than a slide bullet. Any vector with a
 * `gen` block can be synthesised and scored by lab-engine, which is what
 * connects Identify to Generate to Defend rather than listing attacks and
 * simulating something else.
 *
 *   amount    [start, end] multipliers on the account's own baseline
 *   velocity  [start, end] payments per hour across the sequence
 *   payee / intl / device: probability any step trips that signal
 *   hours     window of day the attacker operates in
 *   steps     payments in the sequence
 */

export const CATEGORIES = [
  { id: "social", label: "Social engineering", blurb: "The victim authorises the payment themselves. Authentication is not the control that fails." },
  { id: "identity", label: "Identity and onboarding", blurb: "Fraud enters at account creation, before any payment is scored." },
  { id: "takeover", label: "Credential and session", blurb: "A legitimate account is captured and operated by someone else." },
  { id: "behaviour", label: "Transaction behaviour", blurb: "The payments themselves are the attack, shaped to sit under thresholds." },
  { id: "merchant", label: "Acceptance and merchant", blurb: "The merchant side of the rail is the instrument." },
  { id: "model", label: "Model-directed", blurb: "The detector itself is the target." },
];

export const VECTORS = [
  /* ---- Social engineering surfaces --------------------------------- */
  {
    id: "vishing", name: "Voice-cloned executive call", category: "social",
    rails: ["Wire", "RTGS", "UPI"], surface: "Voice",
    genai: "Three seconds of public audio clones a voice well enough to pass a colleague's ear on a bad line.",
    signals: ["First payment to payee", "Amount well above the account baseline", "In-hours but out of pattern"],
    gen: { amount: [2.2, 0.9], velocity: [1, 1], payee: 0.9, intl: 0.35, device: 0.25, hours: [10, 16], steps: 7 },
  },
  {
    id: "video_deepfake", name: "Deepfake video authorisation", category: "social",
    rails: ["Wire", "Corporate ACH"], surface: "Video",
    genai: "Real-time face swap survives a video call, so 'get them on camera' stopped being a control.",
    signals: ["New beneficiary registered minutes earlier", "Cross-border routing", "Unrecognised device"],
    gen: { amount: [2.6, 1.8], velocity: [1, 2], payee: 0.95, intl: 0.55, device: 0.8, hours: [11, 15], steps: 6 },
  },
  {
    id: "bec_thread", name: "Invoice thread hijack", category: "social",
    rails: ["ACH", "SWIFT", "NEFT"], surface: "Email",
    genai: "A model reads the real thread and writes the reply in the sender's register, changing only the account number.",
    signals: ["Known payee, changed beneficiary account", "Amount matches a real invoice", "Business hours"],
    gen: { amount: [1.4, 0.5], velocity: [2, 1], payee: 0.85, intl: 0.2, device: 0.35, hours: [9, 17], steps: 9 },
  },
  {
    id: "support_impersonation", name: "Fake support agent", category: "social",
    rails: ["UPI", "Card", "Wallet"], surface: "Chat",
    genai: "A tuned chatbot runs the whole script, handles objections, and never breaks character.",
    signals: ["OTP used within seconds of issue", "Payment immediately after inbound contact", "New payee"],
    gen: { amount: [1.2, 1.9], velocity: [2, 3], payee: 0.8, intl: 0.15, device: 0.45, hours: [10, 20], steps: 8 },
  },
  {
    id: "romance_investment", name: "Long-con investment grooming", category: "social",
    rails: ["Wallet", "Crypto off-ramp", "IMPS"], surface: "Messaging",
    genai: "One operator sustains hundreds of personalised relationships that used to take one human each.",
    signals: ["Escalating amounts over weeks", "Same beneficiary repeatedly", "Victim defends the payment when challenged"],
    gen: { amount: [0.3, 3.2], velocity: [1, 1], payee: 0.35, intl: 0.45, device: 0.1, hours: [19, 23], steps: 12 },
  },
  {
    id: "task_scam", name: "Task and commission scam", category: "social",
    rails: ["UPI", "Wallet"], surface: "Messaging",
    genai: "Generated task platforms, fake dashboards and payout receipts at near-zero cost.",
    signals: ["Small deposits then a large one", "Payments to newly created VPAs", "Rapid deposit-withdraw cycles"],
    gen: { amount: [0.15, 2.4], velocity: [2, 4], payee: 0.6, intl: 0.1, device: 0.2, hours: [11, 22], steps: 14 },
  },
  {
    id: "collect_request_abuse", name: "Collect-request manipulation", category: "social",
    rails: ["UPI"], surface: "In-app request",
    genai: "Generated merchant identities and pretexts make a pull request look like a refund.",
    signals: ["Victim approves a debit believing it is a credit", "Unknown VPA", "Sub-limit amount"],
    gen: { amount: [0.4, 1.1], velocity: [3, 2], payee: 0.9, intl: 0.05, device: 0.15, hours: [10, 21], steps: 9 },
  },
  {
    id: "qr_swap", name: "QR substitution", category: "social",
    rails: ["UPI", "Wallet"], surface: "Physical / print",
    genai: "Bulk generation of visually plausible merchant collateral and matching storefront pages.",
    signals: ["Merchant-adjacent VPA that is not the merchant", "Geographic cluster of small payments"],
    gen: { amount: [0.2, 0.7], velocity: [2, 5], payee: 0.85, intl: 0.02, device: 0.3, hours: [9, 20], steps: 13 },
  },

  /* ---- Identity and onboarding ------------------------------------- */
  {
    id: "synthetic_identity", name: "Synthetic identity", category: "identity",
    rails: ["Card issuing", "Account opening"], surface: "KYC",
    genai: "Coherent identities with matching documents, photos and social traces, generated in bulk.",
    signals: ["Thin but clean file", "Credit built deliberately then busted out", "Attribute correlations that do not occur naturally"],
    gen: { amount: [0.6, 2.8], velocity: [1, 2], payee: 0.7, intl: 0.4, device: 0.55, hours: [9, 19], steps: 8 },
  },
  {
    id: "deepfake_kyc", name: "Liveness bypass at onboarding", category: "identity",
    rails: ["Account opening"], surface: "Biometric",
    genai: "Injected synthetic video defeats passive liveness that assumes a camera sees a real scene.",
    signals: ["Device fingerprint reused across applicants", "Perfect capture conditions", "Fast form completion"],
    gen: { amount: [1.8, 2.6], velocity: [1, 2], payee: 0.9, intl: 0.5, device: 0.9, hours: [1, 6], steps: 6 },
  },
  {
    id: "document_forgery", name: "Generated document forgery", category: "identity",
    rails: ["Account opening", "Lending"], surface: "Document",
    genai: "Statements, payslips and utility bills rendered with correct layout, fonts and arithmetic.",
    signals: ["Documents internally consistent but unverifiable at source", "Issuer metadata absent"],
    gen: { amount: [1.5, 2.2], velocity: [1, 1], payee: 0.75, intl: 0.3, device: 0.6, hours: [9, 18], steps: 5 },
  },
  {
    id: "mule_recruitment", name: "Mule network onboarding", category: "identity",
    rails: ["IMPS", "UPI", "ACH"], surface: "Recruitment",
    genai: "Job adverts, onboarding packs and handler conversations produced per-recruit at scale.",
    signals: ["Account receives then forwards within minutes", "Fan-in fan-out topology", "Balance never rests"],
    gen: { amount: [0.8, 1.6], velocity: [3, 5], payee: 0.85, intl: 0.25, device: 0.35, hours: [8, 22], steps: 15 },
  },

  /* ---- Credential and session -------------------------------------- */
  {
    id: "account_takeover", name: "Account takeover", category: "takeover",
    rails: ["Card", "ACH", "UPI"], surface: "Credential",
    genai: "Breach data is enriched and personalised automatically, raising per-attempt success.",
    signals: ["New device plus new payee plus off-hours", "Contact details changed before the payment"],
    gen: { amount: [2.9, 1.5], velocity: [3, 2], payee: 0.9, intl: 0.7, device: 0.9, hours: [1, 5], steps: 7 },
  },
  {
    id: "sim_swap", name: "SIM swap and OTP interception", category: "takeover",
    rails: ["UPI", "Card", "Net banking"], surface: "Telecom",
    genai: "Voice cloning clears the telco's own identity check to move the number.",
    signals: ["SIM change immediately before payment", "OTP consumed on a new device", "Recovery flow used"],
    gen: { amount: [2.4, 2.9], velocity: [2, 4], payee: 0.95, intl: 0.4, device: 0.95, hours: [0, 5], steps: 6 },
  },
  {
    id: "session_hijack", name: "Live session hijack", category: "takeover",
    rails: ["Net banking", "Card"], surface: "Session",
    genai: "Overlay and injection kits generated per target bank, refreshed faster than signatures update.",
    signals: ["Same session, changed behavioural biometrics", "Payment mid-session with no navigation"],
    gen: { amount: [1.9, 2.5], velocity: [2, 3], payee: 0.8, intl: 0.35, device: 0.5, hours: [10, 18], steps: 7 },
  },
  {
    id: "credential_stuffing", name: "Credential stuffing at scale", category: "takeover",
    rails: ["Card", "Wallet"], surface: "Login",
    genai: "Agents solve challenges, rotate fingerprints and pace attempts to look human.",
    signals: ["Many accounts, one device cluster", "Low-value probe before real use"],
    gen: { amount: [0.1, 1.4], velocity: [4, 6], payee: 0.5, intl: 0.3, device: 0.85, hours: [2, 6], steps: 16 },
  },

  /* ---- Transaction behaviour --------------------------------------- */
  {
    id: "velocity_anomaly", name: "Velocity burst", category: "behaviour",
    rails: ["UPI", "Card"], surface: "Rail timing",
    genai: "Optimised burst shapes found by probing, rather than guessed.",
    signals: ["Payments per hour far above the account's own cadence"],
    gen: { amount: [1.9, 0.4], velocity: [5, 1], payee: 0.75, intl: 0.3, device: 0.2, hours: [13, 18], steps: 9 },
  },
  {
    id: "sleeper_pacing", name: "Sleeper pacing", category: "behaviour",
    rails: ["UPI", "ACH"], surface: "Rail timing",
    genai: "The ramp is fitted to the victim's own history so each step stays unremarkable.",
    signals: ["Slow escalation over days", "Every single payment individually normal"],
    gen: { amount: [0.2, 2.6], velocity: [1, 4], payee: 0.3, intl: 0.1, device: 0.05, hours: [10, 17], steps: 11 },
  },
  {
    id: "structuring", name: "Structuring and smurfing", category: "behaviour",
    rails: ["IMPS", "UPI", "Cash-in"], surface: "Reporting threshold",
    genai: "Split schedules computed against published reporting limits per jurisdiction.",
    signals: ["Amounts clustered just below a reporting threshold", "Many beneficiaries, one controller"],
    gen: { amount: [0.55, 0.95], velocity: [3, 5], payee: 0.7, intl: 0.2, device: 0.25, hours: [9, 20], steps: 18 },
  },
  {
    id: "card_testing", name: "Card testing", category: "behaviour",
    rails: ["Card"], surface: "Authorisation",
    genai: "Merchant selection and retry cadence tuned automatically against decline feedback.",
    signals: ["Micro authorisations across many merchants", "High decline ratio then one success"],
    gen: { amount: [0.02, 0.9], velocity: [5, 3], payee: 0.6, intl: 0.5, device: 0.7, hours: [0, 6], steps: 20 },
  },
  {
    id: "refund_abuse", name: "Refund and chargeback abuse", category: "behaviour",
    rails: ["Card", "Wallet"], surface: "Dispute",
    genai: "Dispute narratives and supporting evidence written to match issuer criteria.",
    signals: ["Purchase then dispute pattern repeats", "Delivery evidence contested consistently"],
    gen: { amount: [1.1, 1.8], velocity: [1, 2], payee: 0.4, intl: 0.2, device: 0.2, hours: [10, 19], steps: 8 },
  },
  {
    id: "behavioral_drift", name: "Behavioural drift", category: "behaviour",
    rails: ["Card", "UPI"], surface: "Profile",
    genai: "The drift curve is fitted so the profile moves faster than the baseline updates.",
    signals: ["Spending profile migrates steadily", "No single step looks anomalous"],
    gen: { amount: [0.8, 2.4], velocity: [1, 2], payee: 0.45, intl: 0.15, device: 0.1, hours: [10, 20], steps: 8 },
  },

  /* ---- Acceptance and merchant ------------------------------------- */
  {
    id: "fake_merchant", name: "Generated merchant front", category: "merchant",
    rails: ["Card acquiring"], surface: "Acceptance",
    genai: "Whole storefronts, catalogues, reviews and policies generated in an afternoon.",
    signals: ["New MID, immediate volume", "No delivery evidence", "Chargebacks arrive together"],
    gen: { amount: [0.9, 1.9], velocity: [2, 4], payee: 0.9, intl: 0.35, device: 0.4, hours: [9, 22], steps: 12 },
  },
  {
    id: "transaction_laundering", name: "Transaction laundering", category: "merchant",
    rails: ["Card acquiring"], surface: "Acceptance",
    genai: "A benign storefront is generated as cover for the traffic actually being processed.",
    signals: ["Descriptor mismatches basket", "Ticket distribution wrong for the stated category"],
    gen: { amount: [0.7, 2.1], velocity: [2, 3], payee: 0.55, intl: 0.6, device: 0.3, hours: [8, 23], steps: 14 },
  },
  {
    id: "subscription_trap", name: "Negative-option subscription", category: "merchant",
    rails: ["Card"], surface: "Recurring",
    genai: "Checkout copy and cancellation flows optimised against measured drop-off.",
    signals: ["Small recurring debits", "Cancellation attempts precede disputes"],
    gen: { amount: [0.05, 0.3], velocity: [1, 1], payee: 0.3, intl: 0.15, device: 0.1, hours: [0, 23], steps: 16 },
  },

  /* ---- Model-directed ---------------------------------------------- */
  {
    id: "adversarial_probing", name: "Decision-boundary probing", category: "model",
    rails: ["Card", "UPI"], surface: "Detector",
    genai: "Automated perturbation search finds the exact point the detector stops firing.",
    signals: ["Near-identical payments with tiny feature deltas", "Clustered just under threshold"],
    gen: { amount: [0.9, 1.6], velocity: [2, 3], payee: 0.5, intl: 0.2, device: 0.3, hours: [12, 18], steps: 9 },
  },
  {
    id: "feature_evasion", name: "Targeted feature suppression", category: "model",
    rails: ["Card", "UPI"], surface: "Detector",
    genai: "Once the salient features are known, each one is individually held below its trigger.",
    signals: ["Every signal just under its own threshold", "Suspiciously average on every axis"],
    gen: { amount: [0.95, 1.25], velocity: [1, 2], payee: 0.15, intl: 0.05, device: 0.05, hours: [11, 16], steps: 12 },
  },
  {
    id: "device_switch", name: "Device and fingerprint rotation", category: "model",
    rails: ["Card", "UPI", "Net banking"], surface: "Device",
    genai: "Fingerprints synthesised to sit inside the population's normal distribution.",
    signals: ["Unrecognised device with otherwise plausible telemetry"],
    gen: { amount: [1.1, 1.7], velocity: [1, 2], payee: 0.5, intl: 0.25, device: 0.95, hours: [2, 23], steps: 7 },
  },
];

export const byCategory = (id) => VECTORS.filter((v) => v.category === id);
export const vectorById = (id) => VECTORS.find((v) => v.id === id);

export const TAXONOMY_STATS = {
  vectors: VECTORS.length,
  categories: CATEGORIES.length,
  rails: [...new Set(VECTORS.flatMap((v) => v.rails))].sort(),
  surfaces: [...new Set(VECTORS.map((v) => v.surface))].sort(),
};
