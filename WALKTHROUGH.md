# FraudForge Walkthrough

FraudForge is a controlled payment-fraud research environment. It connects synthetic attack generation, adaptive red-team planning, defender training, model evaluation, and evidence review.

All scenarios and payment records are synthetic. The application does not authorize, block, or execute real payments.

## 1. Product Flow

Use the top navigation in this order:

1. **Mission Briefing**: Start the investigation and see the full research path.
2. **Identify**: Review the eight GenAI-enhanced payment-fraud vectors.
3. **Generate**: Create a synthetic attack artifact and payment scenario.
4. **AI Defense Lab**: Select a synthetic customer, run the adaptive red-team planner, generate attack records, and score them with the shadow defender.
5. **Adapt**: Send the Lab batch into the augmented training pipeline and inspect missed or near-miss patterns.
6. **Defend**: Train and compare baseline and augmented XGBoost models across adversarial rounds.
7. **Reality Check**: Separate measured experimental results from illustrative low-prevalence context.
8. **Evidence**: Trace metrics to their seed, evaluation context, and producing code path.
9. **Live Benchmark**: Run a compact benchmark when the Python backend is available.
10. **Methodology**: Review the research design, limits, and governance boundary.
11. **Attack Replay**: Walk through a synthetic persona, message, payment attempt, and defender verdict.

The shared attack context keeps the selected vector and latest generated scenario available as you move through the workflow.

## 2. Recommended Demo Walkthrough

### Step 1: Identify a vector

Open **Identify** and select an attack card. The selected vector is stored globally and appears in the shell as the currently traced vector.

Available vectors include:

- Voice Cloning
- Deepfake Video Calls
- Hyper-Personalized Phishing
- AI-Built Fake E-Commerce Sites
- Fake AI Chatbots
- Synthetic Identity Fraud
- Deepfake Identity Verification
- AI-Drafted BEC

### Step 2: Generate a scenario

Open **Generate**. Choose a vector and optionally enter a target profile, urgency type, or payment channel. Select **Generate**.

Each result can include:

- A synthetic message, call, storefront, identity, or business-email artifact
- A concrete payment amount
- A payee
- A timestamp
- A payment channel
- Risk indicators

After generation, select **Open AI Defense Lab** to carry the scenario into the red-team planning stage.

If Gemini is unavailable, FraudForge uses a deterministic-safe local fallback. The result remains synthetic and is labeled as a demo or fallback response where applicable.

### Step 3: Run the AI Defense Lab

Open **AI Defense Lab**. The page shows whether an upstream Generate scenario is connected.

Configure:

- A synthetic customer target
- Difficulty: easy, medium, or hard
- Attack intensity from 10% to 100%

Select **Run planner**.

The Lab returns:

- The selected attack type
- Candidate suitability scores
- Planner rationale
- Three synthetic attack records
- Risk scores and allow/review recommendations
- A deterministic run ID
- Provenance metadata

The Lab currently supports target-aware planning for behavioral drift, device switching, velocity anomalies, and account takeover. Its planner runs offline by default.

The defender result is shadow scoring. A `review` recommendation does not block or alter a payment.

### Step 4: Adapt the defender

Select **Continue to Adapt**. Adapt receives the Lab records through the shared application state.

Select **Run Adaptation**. The frontend sends the Lab run ID and records to:

```text
POST /api/train
```

The backend adds the Lab records to the Round 1 augmented training set. The baseline model remains trained on its original data, so the comparison stays meaningful.

Adapt displays:

- Lab records and generated payment candidates
- False negatives and near misses
- Evasion reasoning
- A harder synthetic batch preview
- Confirmation of the Lab run ID and record count included in training

### Step 5: Defend

Select **Continue to Defend** or open **Defend** from the navigation.

Use **Train & Compare Models** to view:

- Baseline versus augmented precision
- Recall
- F1 score
- AUC-ROC
- Confusion matrices
- Evasion advice
- Round 1, Round 2, and Round 3 metrics
- Feature-importance changes
- Flagged transaction explanations

The full training loop uses the Python backend. It may take longer than the lightweight generation and Lab endpoints.

### Step 6: Review and replay

Use **Evidence** to trace claims and **Methodology** to understand their limits.

Use **Attack Replay** for a compact narrative demo:

1. Synthetic persona
2. Mock inbox or vector-specific artifact
3. Synthetic anomalous payment
4. Defender verdict

The mock inbox does not send the generated attack content. The optional email test sends only a harmless labeled notification when SMTP is explicitly configured.

## 3. AI Explanation Controls

Small `?` controls appear beside difficult terms in the Lab, Adapt, Defend, and Evidence screens.

They explain concepts such as:

- Candidate scores
- False negatives
- Evasion reasoning
- Precision
- Recall
- Feature importance
- AUC-ROC

Transaction-level explanations are also available in the Defend dashboard.

The explanation route is:

```text
POST /api/explain-term
```

Request example:

```json
{
  "term": "False negative",
  "context": "Adapt stage missed transaction review"
}
```

Local development uses Gemini when configured. If Gemini is unavailable, the backend uses a vetted local research glossary. The Vercel serverless deployment uses the glossary fallback because it does not require the full Python ML environment.

## 4. Local Development

Requirements:

- Python 3.10 or later
- Node.js 18 or later

### Backend

From the repository root:

```powershell
cd backend
C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe -m pip install -r requirements.txt
C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe -m uvicorn main:app --reload --port 8000
```

The backend runs at:

```text
http://127.0.0.1:8000
```

### Frontend

In a second terminal:

```powershell
cd frontend
cmd /c "npm install"
cmd /c "npm run dev -- --host 127.0.0.1"
```

The frontend runs at:

```text
http://127.0.0.1:5173
```

Vite proxies `/api` requests to the local backend.

### Environment variables

For local Gemini generation, add a real key to `backend/.env`:

```text
GEMINI_API_KEY=your_key_here
```

Do not commit `.env` files or real credentials.

Optional harmless SMTP test configuration:

```text
SMTP_USERNAME=your_gmail_address
SMTP_PASSWORD=your_gmail_app_password
SMTP_FROM=your_gmail_address
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
```

## 5. API Routes

### Lightweight generation and replay

```text
GET  /api/attacks
POST /api/generate/{vector}
GET  /api/replay/persona
POST /api/replay/message
POST /api/replay/payment
POST /api/replay/defend
POST /api/replay/email
```

### AI Defense Lab

```text
POST /api/ai-defense-lab/run
POST /api/explain-term
```

Example Lab request:

```json
{
  "targetId": "C0001",
  "difficulty": "medium",
  "intensity": 0.6,
  "seed": 2026
}
```

### Defender training

```text
POST /api/train
POST /api/benchmark
POST /api/defender/train
GET  /api/defender/status
POST /api/explain
```

The training request can include a Lab batch:

```json
{
  "labRunId": "LAB-EXAMPLE",
  "labRecords": [
    {
      "amount": 1800.50,
      "hour": 14,
      "signal": "4 txn/hr",
      "attackType": "velocity_anomaly",
      "isFraud": true
    }
  ]
}
```

## 6. Testing and Validation

### Frontend build

```powershell
cd frontend
cmd /c "npm run build"
```

### Backend syntax

```powershell
cd backend
C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe -m py_compile main.py trainer.py ai_defense_lab_adapter.py
```

### Teammate Lab tests

```powershell
cd AI-Defense-Lab\AI-Defense-Lab
C:\Users\tanay\AppData\Local\Programs\Python\Python313\python.exe -m unittest discover -s tests -p "test_*.py"
```

The teammate module currently has 20 passing tests covering planner validation, deterministic behavior, attack registry execution, composite attacks, sleeper pacing, adversarial probing, and simulator generation.

### What should be checked manually

- Generate a scenario and confirm the Lab shows upstream context.
- Run the Lab and confirm a run ID and three records appear.
- Continue to Adapt and confirm the Lab batch inclusion notice appears after training.
- Open each `?` control and confirm an explanation appears.
- Open the live Lab URL and confirm the serverless endpoint returns three records.

## 7. Deployment Architecture

FraudForge uses two deployment targets:

### Vercel

Vercel hosts the frontend and lightweight serverless API. The production URL is:

```text
https://fraud-forge-nine.vercel.app/
```

The deployable serverless entry point is:

```text
api/index.py
```

Vercel supports the lightweight Lab preview, generation, replay, and glossary explanation endpoints.

### Render

Render hosts the full FastAPI backend described by:

```text
render.yaml
```

It is the appropriate home for:

- Full XGBoost training
- Multi-dataset defender training
- Persistent model artifacts
- Full adversarial rounds
- PostgreSQL-backed event persistence

Vercel intentionally returns a clear unavailable response for heavy training routes rather than attempting an unreliable serverless training job.

### Deploy frontend and serverless API

From the repository root:

```powershell
cmd /c "vercel deploy --prod --yes"
```

The project is linked to the `fraud-forge` Vercel project and aliases production to:

```text
https://fraud-forge-nine.vercel.app
```

After deployment, smoke-test:

```powershell
$body = @{ targetId = 'C0002'; difficulty = 'hard'; intensity = 0.8; seed = 77 } | ConvertTo-Json
Invoke-RestMethod -Uri 'https://fraud-forge-nine.vercel.app/api/ai-defense-lab/run' -Method Post -ContentType 'application/json' -Body $body
```

## 8. Integrity and Governance Notes

- All Lab records are synthetic and marked as fraud ground truth for controlled evaluation.
- Run IDs are deterministic for the same target, difficulty, intensity, and seed.
- Provenance identifies the generator, scorer, seed, and synthetic-only status.
- The current shadow scorer recommends `allow` or `review`; it does not enforce payment decisions.
- Candidate scores are suitability scores, not real-world fraud probabilities.
- Precision, recall, F1, and AUC describe the supplied evaluation set and should not be presented as universal production performance.
- Vercel and local responses may differ in planner mode because Vercel uses a serverless-safe deterministic adapter.
- Full defender training belongs on the self-hosted Python backend, not in a Vercel function.
- No real payment, credential, identity, or messaging action is required for the core workflow.

## 9. Current Known Limitations

- Lab runs are held in frontend memory and are lost on refresh.
- The Lab currently supports four transaction-oriented attack types in its UI.
- Lab records are included in the training request but are not persisted as a separate audit table.
- The Vercel deployment cannot run the full XGBoost training loop.
- The frontend production bundle has an existing Vite chunk-size warning; the build still succeeds.
- Gemini-generated explanations depend on the configured local backend key and rate limits; safe fallbacks remain available.
