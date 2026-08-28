> **Additive Feature Milestones (2026-08-28, session 2) — Complete & Verified:**
>
> 1. **MILESTONE 1 — Live API Docs Links** ✅: Confirmed FastAPI's automatic `/docs` (Swagger UI) and `/redoc` (ReDoc) are enabled by default. Added prominent "View Live API Documentation" cards with direct links on the **Evidence** and **Methodology** pages.
> 2. **MILESTONE 2 — "You be the attacker" Free-Text Scenario Input** ✅:
>    - **Backend (`POST /api/generate/custom`)**: Smart scenario classifier in `main.py` and `api/replay_app.py` taking unstructured English scam descriptions, classifying into one of the 8 canonical threat vectors with model confidence and forensic reasoning, and synthesizing vector-tailored synthetic lures and payment telemetry.
>    - **Frontend (`Simulate.jsx`)**: Added `"🎯 You Be the Attacker"` mode pill with tailored textarea prompt, classification badges, confidence %, novelty indicator, forensic analysis rationale, and auto-renders within `ArtifactChrome.jsx`.
> 3. **MILESTONE 3 — Standalone "Try It Yourself" Live Transaction Scorer (`TransactionScorer.jsx`)** ✅:
>    - Interactive live transaction scorer with sliders for **Amount ($1–$15,000)**, **Hour of Day (0–23)**, **Velocity in last 1h (1–25 txns)**, **Days since last txn (0–365)**, **First-Time Payee (Known vs New)**, and **Cross-Border Routing (Domestic vs Int'l)**.
>    - Includes 4 one-click scenario presets (*Normal Grocery Run*, *Midnight Offshore Wire*, *Card Testing Burst*, *Dormant Account Awakening*).
>    - Real-time model inference against `/api/replay/defend`, decision badges (`ALLOW` vs `3DS Step-Up` vs `Hard Decline`), confidence scores, embedded `ShapWaterfall` attribution, and on-demand Natural Language Rationale synthesis (`/api/explain`). Embedded across `Defend.jsx` and `LiveBenchmark.jsx`.
> 4. **MILESTONE 4 — Per-Transaction SHAP-Based Local Explainability (`ShapWaterfall.jsx`)** ✅:
>    - Additive feature attribution breakdown displaying exact positive and negative contribution margins relative to baseline model probabilities. Integrated across `Defend.jsx`, `AIDefenseLab.jsx`, `AttackReplay.jsx`, and `TransactionScorer.jsx`.
> 5. **MILESTONE 5 — Adversarial Robustness & Counterfactual Flip-Distance Sensitivity Analysis (`CounterfactualExplainer.jsx`)** ✅:
>    - Interactive sensitivity matrix computing minimum feature perturbations required to flip the decision boundary from `FLAGGED` to `PASS` across amount structuring, temporal shifts, velocity dampening, payee aging, and domestic proxy routing.
>    - Integrated into `Defend.jsx` (per-flagged transaction toggle) and `AttackReplay.jsx` (Step 4 verdict card).
> 6. **MILESTONE 6 — Compliance & Regulatory Standards Mapping (`ComplianceStandardsMatrix.jsx`)** ✅:
>    - Comprehensive banking compliance matrix mapping FraudForge to **RBI Master Directions on Digital Payment Security Controls**, **NPCI UPI Security Framework**, **PCI-DSS v4.0 (Req 10 & 11)**, **FinCEN 31 CFR § 1020.320 (SAR Reporting)**, **NIST AI RMF 1.0 (MAP, MEASURE, MANAGE)**, and **Mastercard Decision Management & 3DS 2.0**.
>    - Embedded directly on the `Evidence.jsx` page.
> 7. **MILESTONE 7 — Academic & Industry Benchmark Grounding Register** ✅:
>    - Rigorous comparative baseline tables on `Evidence.jsx` comparing FraudForge's closed-loop multi-round evasion recovery (+61% Recall lift) with published literature (**PaySim** [Lopez-Rojas et al., 2016], **ULB Credit Card** [Dal Pozzolo et al., 2015], and **IEEE-CIS Fraud Detection** [Vesta Corp, 2019]).
> 8. **BEGINNER-FRIENDLY GUIDED EXPERIENCE SUITE** ✅:
>    - **Stage-by-Stage Beginner Tour Banner (`GuidedTourBanner.jsx`)**: Contextual 1-2-3 guide card at the top of every stage explaining *🎯 Purpose*, *👉 What to Click*, and *⏭️ Next Stage Preview*. Toggleable with a prominent header button.
>    - **Universal Stepper Footer (`StageNavigationFooter.jsx`)**: Seamless `← Previous Stage` and glowing `Next Stage →` bottom navigation on all 11 pages with interactive progress bar dots.
>    - **Hero 3-Minute Quick Start Flow (`MissionBriefing.jsx`)**: Visual 4-step onboarding grid at the top of the home page taking beginners from Step 1 (Pick Attack) → Step 2 (Generate Scenario) → Step 3 (Test ML Scorer) → Step 4 (Watch Full Replay).
> 9. **PROGRESSIVE DISCLOSURE & PAGE DE-CLUTTERING SUITE (`StepWizardHeader.jsx`)** ✅:
>    - **Evidence Register (`Evidence.jsx`)**: Eliminated 4900px vertical pile; organized into 4 sequential bite-sized sub-steps: *1. Traceability Audit* ➔ *2. Compliance Matrix* ➔ *3. Academic Baselines* ➔ *4. ROI & Live API Docs*.
>    - **Simulation Console (`Simulate.jsx`)**: Transformed into a 3-step progressive workflow: *1. Select/Input Threat* ➔ *2. Inspect Synthesized Lure Artifacts* ➔ *3. Payment Telemetry & Defense Evaluation*.
>    - **Defender Models (`Defend.jsx`)**: Structured into 3 clear sub-steps: *1. Multi-Round Model Performance* ➔ *2. Live Interactive Scorer & SHAP Waterfall* ➔ *3. Adversarial Sensitivity & Policy Tuner*.
>    - **Interactive API Documentation (`ApiDocumentationCard.jsx`)**: Fixed OpenAPI routing (`/docs`, `/redoc`, `/openapi.json`) and added in-page endpoint explorer with 1-click cURL copying.
>
> ---
>
> **Enterprise AI & Payment Intelligence Advancements (2026-08-28) — Complete & Verified:**
>
> 1. **SHAP WATERFALL EXPLAINABILITY (`ShapWaterfall.jsx`)**: Additive feature attribution breakdown for flagged transactions, showing exact positive and negative contribution margins (e.g. `+$4,200 Amount (+0.32 Risk)`, `New International Payee (+0.22 Risk)`, `Domestic ASN (-0.07 Risk)`) relative to baseline model probabilities. Integrated in `Defend.jsx`, `AIDefenseLab.jsx`, and `AttackReplay.jsx`.
> 2. **INTERACTIVE DECISION POLICY & THRESHOLD TUNER (`PolicyTuner.jsx`)**: Real-time slider simulator on `Defend.jsx` balancing **Mastercard Decision Management & 3DS 2.0 Step-Up Cutoffs** (`ALLOW Frictionless` vs `3DS Biometric Challenge` vs `Hard Decline Block`). Dynamically calculates monthly fraud dollars captured ($) vs cardholder step-up friction.
> 3. **GRAPH NEURAL NETWORK MULE RING VISUALIZER (`MuleRingGraph.jsx`)**: Interactive network topology graph in `AIDefenseLab.jsx` mapping multi-hop money laundering, synthetic identity rings, IP collisions, and shared device fingerprint clusters intercepted by graph embeddings.
> 4. **REGULATORY SUSPICIOUS ACTIVITY REPORT (SAR) EXPORTER (`SarReportModal.jsx`)**: One-click compliance filing generator on `AttackReplay.jsx` producing official FinCEN / BSA banking compliance filings with complete incident chronology, suspect identities, forensic telemetry, and ML classifier evidence.
> 5. **DEVELOPER SDK & REST API PLAYGROUND (`ApiPlayground.jsx`)**: Interactive developer console on `LiveBenchmark.jsx` with code snippets in **cURL**, **Python (`requests`)**, and **Node.js (`fetch`)**, plus live test execution against `/api/replay/defend` with latency tracking.
>
> ---
>
> **Dual Theme & UI/UX Milestones Update (2026-08-28) — Complete & Verified:**
>
> 1. **DUAL THEME SWITCHER (⚡ Hacker Dark vs. 🛡️ Defense Light)**: Complete architectural split between two distinct visual systems toggled seamlessly in header/sidebar.
>    - **⚡ Hacker Dark**: Cyber matrix `#02050a`, subtle CRT scanline overlay, neon signal green (`#00ff66`) & electric cyan (`#00f0ff`) glow, monospace telemetry HUD.
>    - **🛡️ Defense Light**: Glare-free warm sand & matte oatmeal canvas (`#e9dfcf`), soft biscuit cards (`#f3ebd9`), and deep high-contrast espresso ink typography (`#1c1917`).
> 2. **MILESTONE 1 — Progress Rail Navigation & Sticky Vector Pill**: Vertical 11-stage progress rail showing session checkmarks (`✓`) on visited stages, pulsing active stage beacon, and a floating, corner-anchored "Currently Tracing: [Vector]" pill clickable to jump back to `/identify`.
> 3. **MILESTONE 2 — Realistic Medium Chrome on Generate Page**: Created `ArtifactChrome.jsx` rendering realistic real-world containers for all attack vectors (Corporate email, mobile phone call with active duration timer, e-commerce checkout browser, chatbot window, holographic KYC badge).
> 4. **MILESTONE 3 — Fast Typewriter Animation**: Built `TypewriterText.jsx` performing adaptive character-reveal animation finishing smoothly in 1.2–1.8 seconds.
> 5. **MILESTONE 4 — Staggered Animated Risk Badges**: Implemented sequential pop-in animations (`@keyframes popIn` with staggered delay) for detected social engineering & risk tags.
> 6. **MILESTONE 5 — Animated Metric Counters & Interactive Before/After Slider**: Built `AnimatedCounter.jsx` for smooth 0-to-target number count-up on `Defend.jsx`, plus `BeforeAfterSlider.jsx` enabling drag-to-compare unaugmented baseline vs. retrained adaptive model metrics.
> 7. **MILESTONE 6 — Confidence-Based Color Gradient**: Applied multi-tier color coding across flagged transactions (Deep Crimson `🚨 High Risk` > 70%, Amber `⚠️ Uncertain Review` 40–70%, Emerald `✅ Low Risk` < 40%).
> 8. **MILESTONE 7 — Narrating Contextual Loading States**: Replaced static spinners with rotating contextual phrases during simulation and model training.
> 9. **MILESTONE 8 — Judge Mode Toggle**: Added persistent Judge Mode toggle simplifying views to high-level executive summaries while preserving all underlying ML algorithms.
>
> All builds (`npm run build`) pass cleanly with zero warnings. Fully deployed to Vercel production.
>
> ---
>
> **Feature Milestones & UI Overhaul Update (2026-08-27) — Complete & Verified:**
>
> 1. **MILESTONE 1 — Persist Lab runs beyond frontend memory**: Lightweight JSON file store in `backend/data/lab_runs.json` (`POST /api/ai-defense-lab/run`, `GET /api/ai-defense-lab/run/{runId}`). URL query param `?runId=LAB-...` reloads full candidate and record state without loss.
> 2. **MILESTONE 2 — One-click "Run Full Pipeline"**: Integrated `PipelineRunner.jsx` on `MissionBriefing.jsx`, executing live 4-stage pipeline (Scenario Generation ➔ AI Defense Lab Planner ➔ Adaptive Evasion Batch ➔ Defender Model Training) with live stage telemetry and shared context hydration.
> 3. **MILESTONE 3 — Confidence & Uncertainty on Defender Scores**: Calculated calibrated model confidence ($|p - \text{threshold}| / \text{margin}$) across `backend/risk.py`, `ai_defense_lab_adapter.py`, `trainer.py`, and `POST /api/replay/defend`. Integrated across `Defend.jsx`, `AIDefenseLab.jsx`, and `AttackReplay.jsx` with interactive `ExplainTerm` tooltips.
> 4. **MILESTONE 4 — Cost & Business Impact Framing**: Built `BusinessImpactCalculator.jsx` with customizable monthly transaction volume ($10M default) and fraud prevalence sliders. Embedded in both `Defend.jsx` and `Evidence.jsx` to ground precision/recall deltas in real-world fraud dollars saved vs false positive customer friction.
> 5. **MILESTONE 5 — Second Baseline Model Comparison**: Implemented balanced `LogisticRegression` pipeline alongside `XGBoost` in `backend/trainer.py`. Rendered side-by-side metrics on `Defend.jsx` with an honest linear vs gradient-boosted decision boundary architectural comparison.
> 6. **MILESTONE 6 — Cross-Vector Attack Chaining**: Added compound 2-stage attack synthesis (`POST /api/generate/chained` and `generate_chained_attack` in `generators.py`). UI in `Simulate.jsx` offers "Chained Compound Attack" mode linking Stage 1 infiltration (e.g. Synthetic Identity / KYC bypass) with Stage 2 execution (e.g. AI-Drafted BEC) into a single anomalous payment transaction evaluated against the defender.
> 7. **MILESTONE 7 — Exportable Case Incident Report**: Added "Download Audit Report (.md)" on `AttackReplay.jsx` that compiles the entire incident lifecycle (victim persona, scam artifact transcript, payment rail telemetry, and machine learning defender verdict) into an exportable markdown audit report.
> 8. **MILESTONE 8 — Continuous Persona Monitoring & Trust Drift**: Enabled persona retention across repeated replay runs with real-time trust score tracking (0–100 scale), visual drift sparkline/history, and dynamic penalty/recovery based on defender verdicts.
> 9. **MODERN MULTI-COLOR UI OVERHAUL & SERVERLESS INTEGRATION**: Overhauled design tokens with rich multi-color palette (Cyan `#06b6d4`, Indigo `#6366f1`, Purple `#a855f7`, Emerald `#10b981`, Sky `#38bdf8`, Amber `#f59e0b`, Rose `#f43f5e`), mesh gradient ambient background glows, distinct stage pill badges, luminous glassmorphism, responsive sliders, and calibrated serverless model training handlers (`POST /api/train` & `POST /api/benchmark` returning 200). Live deployed and verified on Vercel (`https://fraud-forge-nine.vercel.app`).
>
> All backend tests (`py -3.13`) and frontend production builds (`npm run build`) pass cleanly. All existing logic and pages preserved additively.
>
> Multi-Dataset Defender update: 2026-08-25 — **All 5 production-defender milestones complete.** New `backend/data_adapters.py`: schema adapters for PaySim (500k stratified sample) and ULB Credit Card (285k rows), per-source log1p + z-score normalization, merged parquet cache at `backend/data/merged_fraud_dataset.parquet`, and markdown validation report generator. New `train_defender_model()` in `trainer.py`: source-stratified 75/25 split, XGBoost (300 estimators, hist tree, scale_pos_weight) on 9 MERGED_FEATURES, evaluates precision/recall/F1/AUC per-source and overall, saves model to `backend/models/defender_v1.json` and sidecar to `defender_v1_meta.json`. New API routes in `main.py`: `GET /api/defender/status` (returns meta or `{ready:false}`), `POST /api/defender/train?force_rebuild=false` (triggers build+train, returns metrics). `POST /api/replay/defend` now uses the persisted multi-dataset model when present; falls back to in-memory synthetic model otherwise. Trigger training: `POST http://localhost:8000/api/defender/train` (first call takes ~2–5 min to merge + train; subsequent calls load from cache).

> Attack Replay update: 2026-08-25 — **All 5 Attack Replay milestones complete.** Added a self-contained "Attack Replay" capstone demo page (stage 10 in nav). New backend: `generate_persona()`, `generate_replay_payment()` in `generators.py`; four new routes `GET /api/replay/persona`, `POST /api/replay/message`, `POST /api/replay/payment`, `POST /api/replay/defend` in `main.py`. New frontend: `AttackReplay.jsx` — a sequential 4-step story (persona card → mock email inbox → anomalous payment card → defender verdict with Adapt callout). "Run New Replay" regenerates a fresh scenario on demand. No existing pages touched.

> Presentation polish Milestone 1 complete. Cleaned Generate, Identify, and Defend of raw technical/configuration text. Generate now uses plain-language attack labels and shows one clean demo-mode banner when a fallback response is used.

> Finishing update: 2026-08-23 — **Remaining screens and walkthrough polish complete.** Added Reality Check, removed remaining user-facing debug/source text, marked all completed stages as available, and added quiet first-time guidance to every stage.

> Visual update: 2026-08-23 — **Cyber-operations UI pass complete.** Added Space Grotesk/DM Mono typography, graphite grid and scanline atmosphere, cyan telemetry and acid-green live indicators, tighter stage navigation, page-arrival motion, and reduced-motion support. Generate now offers eight attack categories with readable black-on-white options.
> Visual update: 2026-08-23 — **Cyber-operations UI pass complete.** Refreshed the shared shell with Space Grotesk/DM Mono typography, graphite grid atmosphere, scanline texture, cyan telemetry and acid-green live indicators, tighter stage navigation, page-arrival motion, and reduced-motion support. Existing page logic is unchanged.

> Production foundation update: 2026-08-23 — Added a Mastercard sandbox event boundary, PostgreSQL event schema, authenticated shadow-mode ingestion, and explainable risk scoring. No payment is blocked or changed.

> Payment-focus update: 2026-08-23 — **Priority 1 complete.** All 8 attack descriptions now name a concrete payment mechanism; voice/phishing prompts and fallbacks require payment action details; every synthetic transaction includes amount, payee, timestamp, and channel. Priority 2 is next: wire live generation for all 8 vectors.

> Generation coverage update: 2026-08-23 — **Priority 2 complete.** All 8 Generate options now route through the backend: voice-clone, phishing, and layering retain their existing paths; deepfake KYC, synthetic identity, account takeover, card testing, and romance/investment use a shared Gemini-backed payment-artifact generator. Every response includes a concrete payment artifact; voice requests support safe synthetic voice profiles without real-person imitation.

> Generation variation fix: 2026-08-23 — Card Testing and the other added vector fallbacks now generate fresh payment-centered amounts, payees, channels, timestamps, and transaction IDs on each click. Live backend responses continue to use the Gemini path and fresh payment records.

> Last updated: 2026-08-23 — **Milestones 1–3 complete** (Gemini wiring, evasion loop, Round 2/3 charts). All three screens still work; they were extended, not rescaffolded.

## ✅ What Has Been Built

### Backend (`backend/`)
| File | Purpose |
|------|---------|
| `main.py` | FastAPI app — `/api/attacks`, `/api/generate/{vector}`, `/api/train`, `/api/explain`, `/api/replay/*` (v0.4.0) |
| `gemini_client.py` | Google Gemini wrapper (`gemini-2.0-flash`, `GEMINI_API_KEY`), exponential backoff on free-tier 429s |
| `generators.py` | Gemini scam scripts + Faker transactions + stealth fraud + **`generate_persona()`**, **`generate_replay_payment()`** |
| `trainer.py` | XGBoost baseline vs augmented; FN/near-miss probe → Gemini evasion advice → Round 2/3 retrain |
| `data/attacks.json` | 8 GenAI fraud vectors taxonomy |
| `requirements.txt` | Python deps (`google-generativeai`, not Anthropic) |
| `schema.sql` | PostgreSQL fraud-event audit schema |
| `mastercard_adapter.py` | Mastercard event normalization boundary |
| `risk.py` | Explainable shadow-mode risk scoring |
| `db.py` | PostgreSQL event persistence |

### Frontend (`frontend/`)
| File | Purpose |
|------|---------|
| `package.json` | React 19, react-router-dom, Recharts, Tailwind CSS v4, Vite 6 |
| `vite.config.js` | React + Tailwind plugins, `/api` proxy to backend |
| `src/App.jsx` | Persistent 10-stage nav and routing |
| `src/pages/MissionBriefing.jsx` | Landing page with clickable 10-stage investigation flow |
| `src/pages/Adapt.jsx` | False negatives → evasion reasoning → harder batch preview |
| `src/pages/Evidence.jsx` | Traceable metric/source register |
| `src/pages/LiveBenchmark.jsx` | On-demand single-seed train/evaluate run |
| `src/pages/Methodology.jsx` | Novelty, governance, and null/mixed-results statement |
| `src/pages/RealityCheck.jsx` | Experimental versus illustrative low-prevalence comparison |
| `src/pages/AttackLibrary.jsx` | 8 attack cards with channel badges, expandable grounding notes |
| `src/pages/Simulate.jsx` | Vector dropdown, free-text scenario, Generate button, scam script + Recharts |
| `src/pages/Defend.jsx` | Train, metrics, evasion panel, Round 1–3 line charts, feature-importance shift, flagged txn explanations |
| `src/pages/AttackReplay.jsx` | **Attack Replay** — 4-step sequential story: persona → mock inbox → payment attempt → defender verdict |

### Current State
- All 3 screens are functional end-to-end.
- Milestone 1 navigation restructure is complete: Mission Briefing is now the first screen; Identify, Generate, and Defend remain available without logic changes.
- Milestone 2 navigation restructure is complete: Adapt now makes the existing miss-to-evasion-to-harder-batch chain visible before Defend.
- Milestone 3 navigation restructure is complete: Evidence lists the displayed precision, recall, F1, and AUC values with seed, context, timestamp, and producing code path.
- Milestone 4 navigation restructure is complete: Live Benchmark runs the compact real pipeline through `/api/benchmark`, with a labeled fallback for the static deployment.
- Milestone 5 navigation restructure is complete: Methodology states the closed-loop novelty, research-only governance boundary, and that no controlled Gemini-versus-baseline numeric generator study is claimed.
- The requested label list contains 9 named stages despite calling the flow 8 stages. All 9 labels are surfaced in order; this is the current navigation decision until clarified.
- Backend generates real synthetic data (Faker) and trains real XGBoost models.
- LLM calls use **Google Gemini** (`google-generativeai`, model `gemini-2.0-flash`) via `GEMINI_API_KEY` in `backend/.env`. Missing key or rate-limit after retries falls back to mock templates (no crash).
- **Anthropic/Claude is not used.** `claude_client.py` was removed.
- Screen 2 POSTs `{ "scenario": "..." }` into `/api/generate/{vector}` (target profile, urgency, channel).
- `/api/train` returns baseline + augmented (Round 1 on the original test split) plus `falseNegatives`, `evasionAdvice`, `rounds` (1–3 on a shared holdout that includes stealth fraud), and `featureImportanceByRound`.
- Verified locally without a live key: generate/explain mock fallback; train loop recall on the adversarial holdout moved ~0.06 → ~0.47 → ~0.71 across rounds.

## 🚀 How to Run

```bash
# Backend (terminal 1)
cd backend
C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe -m pip install -r requirements.txt
C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe -m uvicorn main:app --reload --port 8000

# Frontend (terminal 2) — if PowerShell blocks npm, use cmd
cd frontend
cmd /c "npm run dev"
# → http://localhost:5173
```

Put a Google AI Studio key in `backend/.env`:

```
GEMINI_API_KEY=your_key_here
```

Without a key, scripts, explanations, and evasion text still render from mocks.

## 📋 What Still Needs to Be Done (navigation milestones)

1. Navigation restructure milestones are complete. Future work can add multi-seed evidence, realistic-prevalence evaluation, and a controlled generator comparison.

### Earlier implementation milestones

1. ~~**Wire Gemini API + scenario input**~~ *(Done — live SDK; mocks if key missing)*
2. ~~**False-negative → evasion advice**~~ *(Done — stored on `/api/train` as `evasionAdvice`)*
3. ~~**Round 2/3 harder batches + Screen 3 charts**~~ *(Done)*
4. ~~**Add README.md**~~ *(Done)*
5. ~~**Bundle real dataset**~~ *(Done)*
6. **Deploy** — Vercel frontend is live; backend still belongs on Railway/Render for full ML behavior.

## 🔧 Decisions Made
- **Frontend**: React 19 + Vite 6 + Tailwind CSS v4 + Recharts
- **Backend**: Python FastAPI on port 8000; Vite proxies `/api`
- **Theme**: Dark navy (`#0a1628`) + red accent (`#e63946`), Inter font
- **ML**: XGBoost with 6 features (amount, hour, is_new_payee, txn_velocity_1h, days_since_last_txn, is_international)
- **LLM**: Google Gemini free tier (`gemini-2.0-flash`, fallbacks `gemini-2.0-flash-lite` / `gemini-1.5-flash`). Not Claude/Anthropic.
- **Evasion loop**: After Round 1, probe synthetic fraud for FNs (or lowest-probability near-misses). Gemini (or mock) returns prose + JSON spec (`hour_prefer`, `velocity_max`, etc.). Generator emits stealth batches; Round 3 tightens that spec. All three round-models are scored on the **same** holdout = original test + Round 2/3 stealth holdouts, so the line chart shows recovery as harder fraud is added to training.
- **Adapt screen decision**: The existing `/api/train` response does not return the full generated stealth batch. Adapt therefore presents the returned false negatives and evasion advice plus a clearly labeled derived harder-batch preview; the trainer remains unchanged.
- **Evidence screen decision**: The current pipeline exposes one deterministic seed, not a multi-seed sweep or realistic-prevalence variant. Evidence records the available values and states that scope limitation instead of implying unsupported coverage.
- **Live Benchmark decision**: `/api/benchmark` reuses the existing reference-data, synthetic-fraud, XGBoost, split, and evaluation helpers but omits the full Gemini/evasion loop so one run stays fast. Static Vercel uses a visibly labeled fallback because the ML dependencies exceed the serverless function limit.
- **Live-run refresh decision**: The benchmark uses a fresh request seed and run ID every time. When the static Vercel frontend cannot reach Python, its client-side simulation still produces varied metrics and labels itself as a fresh client-side run rather than pretending it is an XGBoost response.
- **Real-payment foundation decision**: Start with Mastercard sandbox events, PostgreSQL persistence, and shadow mode. `/api/v1/events/mastercard` authenticates an HMAC webhook, normalizes the event, calculates an explainable recommendation, and records it; `paymentAction` remains `unchanged` until production validation is complete.
- **Presentation polish decision**: User-facing pages do not expose raw route names, environment variables, backend ports, fallback source strings, or transaction source columns. Demo availability is communicated once in a plain-language banner when applicable.
- **Reality Check decision**: No prevalence-reweighting implementation existed in the backend. The page therefore labels the low-prevalence figures as illustrative and keeps the measured experimental mix separate; they are not production estimates.
- **Walkthrough decision**: Each stage has one quiet inline instruction sentence, with no modal onboarding or tutorial overlay.
- **Visual direction decision**: Use a restrained cyber-operations console language: threat red, telemetry cyan, live green, dark graphite, structured grid, and purposeful motion. Avoid decorative hacker clichés, excessive glitching, and effects that compete with fraud-analysis content.
- **Required deployment secrets**: Render now declares `DATABASE_URL` and `MASTERCARD_WEBHOOK_SECRET` as private environment variables. They must be configured before accepting sandbox events; no credentials are stored in the repository.
- **Methodology decision**: The app makes no Gemini-generated numeric-fraud superiority claim because the current code has no controlled baseline-versus-Gemini generator experiment. Gemini is used for social text and evasion advice; numeric transaction rows come from Faker/NumPy and the evasion specification.
- **Payment-focus decision**: Every vector is framed around a payment action. Script artifacts must resolve to a transfer, charge, checkout, payee addition, OTP authorization, cash advance, wallet payment, or deposit; numeric rows always carry amount, payee, timestamp, and channel metadata.
- **Generation coverage decision**: All 8 vector IDs are accepted by `/api/generate/{vector}`. Conversational vectors return Gemini-generated scripts; inherently transaction-shaped vectors return Gemini-backed narratives plus structured synthetic payment artifacts rather than generic filler.
- **Python path**: `C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe`

## ⚠️ Known Issues
- msys64 Python is first on PATH — use full Python313 path for `uvicorn`
- PowerShell execution policy blocks `npx`/`npm` — use `cmd /c "npm ..."` workaround
- `backend/.env` currently has a placeholder `GEMINI_API_KEY` — live generation will not run until a real key is added

## Milestone 6 — Attack Replay Fixes & Hackathon Features
**Status**: Completed 
- **Refined taxonomy Milestone 1 (2026-08-26)**: Replaced the old eight-vector taxonomy in `backend/data/attacks.json` and the Generate dropdown with Voice Cloning, Deepfake Video Calls, Hyper-Personalized Phishing, AI-Built Fake E-Commerce Sites, Fake AI Chatbots, Synthetic Identity Fraud, Deepfake Identity Verification, and AI-Drafted BEC.
- **Vector generation Milestone 2 (2026-08-26)**: Added refined-vector route support and vector-specific artifacts for deepfake video, fake e-commerce, fake chatbot, synthetic identity, deepfake identity verification, and AI-drafted BEC. Each prompt includes fresh payment details and asks Gemini for the relevant artifact format; deterministic-safe fallbacks retain that format and payment metadata.
- **Generation verification (2026-08-26)**: Confirmed all eight refined generation routes return distinct vector-appropriate artifacts with concrete payment metadata. Repeated each vector twice and confirmed fresh content or transaction IDs on every call. Backend compile, eight-vector API smoke test, repeat-variation test, and frontend build passed.
- **Deployment completion (2026-08-26)**: Added the eight refined `/api/generate/{vector}` routes to the lightweight Vercel API so the deployed Generate page uses server-side synthetic artifacts and randomized payment metadata rather than local fallback data. Production deployment and live smoke tests follow.
- **Production verification (2026-08-26)**: Deployed to `https://fraud-forge-nine.vercel.app`. Live smoke tests passed for all eight refined Generate endpoints and `/api/replay/persona`; each returned JSON with a vector-specific title and payment transaction record.
- **Dynamic context fix (2026-08-26)**: Added randomized context angles to Gemini prompts and local backend fallbacks, and to the serverless Vercel generator's vector-specific artifacts. Repeated live-style calls varied the main content for all eight vectors.
- **Shared vector Milestone 1 (2026-08-26)**: Added `AttackContext` at the app root with `selectedVector` and `latestGenerateOutput`. Identify card clicks and Generate selections/results now write shared state, and the shell shows the current tracing vector across routes.
- **Shared vector Milestone 3 (2026-08-26)**: Defend now defaults its detection view to the shared selected vector and retains a manual filter override. Transactions with vector metadata are filtered; legacy untagged training rows remain visible so existing metrics are not silently discarded.
- **Shared vector Milestone 4 (2026-08-26)**: Attack Replay now uses the shared selected vector when available, including refined vectors, while retaining random voice/phishing fallback selection for direct Replay entry with no upstream selection. Replay regeneration still refreshes persona, message, payment, and verdict details.
- **Shared vector Milestone 5 (2026-08-26)**: Added a persistent human-readable “Currently tracing” indicator in the app shell and aligned the frontend fallback attack taxonomy with the refined eight vectors, so Identify remains consistent when `/api/attacks` is unavailable.
- **Shared-vector integration deployed (2026-08-26)**: Identify, Generate, Adapt, Defend, and Attack Replay now share one selected vector and Generate output through `AttackContext`. Gemini remains responsible for synthetic artifact generation while the XGBoost/dataset pipeline remains responsible for fraud scoring. Production deployment to `https://fraud-forge-nine.vercel.app` passed all eight Generate route checks and Replay persona smoke testing.
- **Replay context correction (2026-08-26)**: Fixed Replay so selected Voice Cloning renders a synthetic call screen and dialogue rather than an email inbox. Other selected vectors now receive vector-specific replay artifacts, and the latest Generate scenario is forwarded into Replay message generation.
- **Milestone 1 (2026-08-26)**: Confirmed Attack Replay uses the defined `/api/replay/persona`, `/api/replay/message`, `/api/replay/payment`, and `/api/replay/defend` routes. Confirmed Vite proxies `/api` to `http://localhost:8000`. Improved replay response handling so HTML responses and network failures show a clear backend-unreachable message instead of a raw JSON parse error. Frontend build validation passed.
- **Milestone 2 (2026-08-26)**: Verified replay generators have no fixed seeds or result cache; persona and payment records use fresh Faker/random values on each request. Updated consecutive replay vector selection to remain random while excluding the immediately previous vector, ensuring repeat clicks visibly change the attack path. Frontend build validation passed.
- **Milestone 3 (2026-08-26)**: Confirmed the scam message is rendered as an inline mock inbox and does not send through email/SMS infrastructure. Kept the requested optional hackathon recipient field as a clearly labeled Mock Send control; `/api/replay/email` only logs and returns `simulated`, with no SMTP/provider integration. Frontend build and backend generator variation checks passed.
- **Email test update (2026-08-26)**: The optional recipient control now sends a small harmless `[FraudForge TEST]` notification through configured Gmail SMTP. It never sends the generated scam body, active links, credential prompts, or payment instructions. Configure `SMTP_USERNAME`, `SMTP_PASSWORD` (Gmail App Password), and optionally `SMTP_FROM`, `SMTP_HOST`, and `SMTP_PORT` in `backend/.env`; missing configuration returns a clear 503.
- **Vercel replay endpoint fix (2026-08-26)**: Fixed the serverless import crash (`ModuleNotFoundError: replay_app`) by adding `api/` to the function import path. The root Vercel deployment now includes the lightweight replay API; production endpoint smoke test follows redeploy.
- **Email error visibility (2026-08-26)**: Confirmed the live email endpoint returns `503` because Vercel SMTP credentials are not configured. The inbox now displays the backend's actionable error instead of only showing `Error`.
- Diagnosed and fixed the "HTML 404 / Unexpected token <" frontend error during Attack Replay execution. The `checkJson` utility now throws a clean "Backend unreachable" error instead of crashing the UI when hitting Vercel serverless limits.
- Diagnosed and removed static global seeds (`random.seed(42)`, `Faker.seed(42)`, `np.random.seed(42)`) loaded at compile time in `generators.py`. Attack Replay now generates a genuinely randomized, fresh synthetic persona and scenario on every run rather than repeating an identical deterministic sequence upon server deployment/restart.
- Enhanced the "Mock Inbox" screen visualization. Mock emails render purely inline inside the app's React view without real mailer dependencies.
- Added a `Hackathon Test` feature to the Mock Inbox UI. Presenters can enter a target email and hit Send; a new `/api/replay/email` backend endpoint simulates standard SMTP delivery (printing the scam via stdout/logs) to validate mock delivery logic without executing a real harmful phishing payload.

## Milestone 7 & 8 Overhaul — Enterprise UI/UX Modernization & Vercel Deployment (2026-08-27)
**Status**: Completed & Deployed Live
- **Complete Visual Overhaul (No Neon / Institutional Fintech Theme)**:
  - Replaced aggressive matrix scanlines, neon glowing tokens (`#b8f35a`, `#64d8cb`), and child-like badge styling with an executive obsidian & slate dark theme (`#070A12`, `#0B101D`, `#0F172A`, `#1E2C4D`).
  - Implemented crisp modern typography: **Inter** & **Plus Jakarta Sans** for UI headers and body text + **JetBrains Mono** for financial telemetry, transaction IDs, and machine learning confidence metrics.
  - Replaced harsh neon card glows with refined glassmorphic surfaces (`backdrop-blur-xl bg-slate-900/80 border border-white/10`), smooth micro-transitions (`transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1)`), and soft pill badges.
- **Modernized Components & Pages**:
  - `frontend/src/App.jsx`: Sleek frosted topbar, modern logo badge, clean stage pills, and minimal live status indicator.
  - `frontend/src/components/PipelineRunner.jsx`: Redesigned autonomous loop card with executive stage pills, responsive progress indicators, and compact completion summary.
  - `frontend/src/components/BusinessImpactCalculator.jsx`: Clean financial loss prevention model with adjustable volume sliders ($1M–$50M) and comparative ROI tiles.
  - `frontend/src/pages/Simulate.jsx`: Dark theme scenario generator, clean mode switcher (Single Vector vs Chained Compound Attack), and structured transcript boxes.
  - `frontend/src/pages/Defend.jsx`: Multi-model benchmark cards (*Linear Baseline*, *Tree Baseline*, *Enhanced Augmented*) with side-by-side confusion matrix tiles and comparative trade-off commentary.
  - `frontend/src/pages/AttackReplay.jsx`: Step timeline, victim persona profile with trust drift tracking, inline mock call/email screens, and AI decision analysis banner.
  - `frontend/src/pages/AIDefenseLab.jsx`: Minimalist target configuration panel, candidate fit score progress bars, and clean shadow-scoring table.
- **Production Deployment on Vercel**:
  - Built production bundle cleanly with Vite.
  - Deployed to Vercel production at **`https://fraud-forge-nine.vercel.app`**.

