"""FraudForge — FastAPI backend for AI-based payment fraud defense prototype."""

import json
import hashlib
import hmac
import os
import re
import smtplib
import sys
from email.message import EmailMessage
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# ---------------------------------------------------------------------------
# App
# ---------------------------------------------------------------------------

app = FastAPI(
    title="FraudForge API",
    description="Hackathon prototype — AI-based payment fraud defense (Red Team / Blue Team loop)",
    version="0.4.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DATA_DIR = Path(__file__).resolve().parent / "data"

# ---------------------------------------------------------------------------
# Routes — Attack taxonomy
# ---------------------------------------------------------------------------

@app.get("/")
async def root():
    return {"status": "ok", "app": "FraudForge API", "version": "0.4.0"}


def _verify_webhook_signature(raw_body: bytes, signature: str | None) -> None:
    secret = os.getenv("MASTERCARD_WEBHOOK_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="MASTERCARD_WEBHOOK_SECRET is not configured")
    expected = hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    if not signature or not hmac.compare_digest(expected, signature):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")


@app.post("/api/v1/events/mastercard")
async def mastercard_event(request: Request):
    """Ingest a Mastercard sandbox event and score it in shadow mode."""
    from db import save_event  # noqa: PLC0415
    from mastercard_adapter import normalize_mastercard_event  # noqa: PLC0415
    from risk import score_transaction  # noqa: PLC0415

    raw_body = await request.body()
    _verify_webhook_signature(raw_body, request.headers.get("x-mastercard-signature"))
    try:
        payload = json.loads(raw_body)
    except json.JSONDecodeError as exc:
        raise HTTPException(status_code=422, detail="Request body must be JSON") from exc
    event = normalize_mastercard_event(payload)
    decision = score_transaction(event)
    try:
        save_event(event, {
            "score": decision.score,
            "action": decision.action,
            "reasons": decision.reasons,
        })
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return {
        "provider": "mastercard",
        "mode": "shadow",
        "providerEventId": event["provider_event_id"],
        "riskScore": decision.score,
        "recommendedAction": decision.action,
        "reasons": decision.reasons,
        "paymentAction": "unchanged",
    }


@app.get("/api/attacks")
async def get_attacks():
    """Return the attack taxonomy JSON (8 vectors)."""
    attacks_file = DATA_DIR / "attacks.json"
    if not attacks_file.exists():
        raise HTTPException(status_code=500, detail="attacks.json not found")
    return json.loads(attacks_file.read_text(encoding="utf-8"))


# ---------------------------------------------------------------------------
# Routes — AI Defense Lab
#
# These mirror api/index.py exactly. Both delegate to lab_engine so a run
# scored in local dev and the same run scored on Vercel agree.
# ---------------------------------------------------------------------------

class AttackRunRequest(BaseModel):
    target_id: str = Field(default="C0001", max_length=16)
    attack_type: Optional[str] = Field(default=None, max_length=64)
    scenario_type: Optional[str] = Field(default=None, max_length=64)
    difficulty: str = Field(default="medium", pattern=r"^(easy|medium|hard)$")
    intensity: float = Field(default=0.6, ge=0.1, le=1.0)
    seed: Optional[int] = Field(default=None, ge=0, le=2_147_483_647)


@app.get("/api/customers")
async def list_customers():
    import lab_engine  # noqa: PLC0415
    return lab_engine.CUSTOMERS


@app.get("/api/customers/{customer_id}")
async def get_customer_detail(customer_id: str):
    import lab_engine  # noqa: PLC0415
    customer = lab_engine.get_customer(customer_id)
    if customer["customer_id"] != customer_id:
        raise HTTPException(status_code=404, detail=f"Unknown customer {customer_id}")
    return {
        "customer": customer,
        "candidate_scores": lab_engine.score_candidates(customer),
    }


@app.get("/api/attack-families")
async def list_attack_families():
    import lab_engine  # noqa: PLC0415
    return [
        {"name": f["name"], "modality": f["modality"], "description": f["description"]}
        for f in lab_engine.ATTACK_FAMILIES
    ]


@app.post("/api/attacks/run")
async def run_attack_endpoint(body: AttackRunRequest):
    """Plan, generate, and shadow-score one adversarial run."""
    import lab_engine  # noqa: PLC0415
    return lab_engine.run_attack(
        target_id=body.target_id,
        attack_type=body.attack_type,
        scenario_type=body.scenario_type,
        difficulty=body.difficulty,
        intensity=body.intensity,
        seed=body.seed,
    )


@app.post("/api/attacks/run-all")
async def run_all_attacks_endpoint(body: AttackRunRequest):
    import lab_engine  # noqa: PLC0415
    return lab_engine.run_all_attacks(target_id=body.target_id, seed=body.seed)


@app.post("/api/targets/{selector}")
async def run_targeted_attack(selector: str, body: AttackRunRequest):
    """Run against a named scenario type or a named attack family.

    The Lab's scenario dropdown sends scenario types (TRANSACTION_ANOMALY),
    while its per-family buttons send family names (velocity_anomaly), so
    this accepts either rather than making the caller know the difference.
    """
    import lab_engine  # noqa: PLC0415
    key = selector.strip()
    if key in lab_engine.SCENARIO_FAMILIES:
        return lab_engine.run_attack(
            target_id=body.target_id, scenario_type=key,
            difficulty=body.difficulty, intensity=body.intensity, seed=body.seed,
        )
    if key in lab_engine.ATTACK_BY_NAME:
        return lab_engine.run_attack(
            target_id=body.target_id, attack_type=key,
            difficulty=body.difficulty, intensity=body.intensity, seed=body.seed,
        )
    raise HTTPException(status_code=404, detail=f"Unknown scenario or attack family '{selector}'")


class CockpitRequest(BaseModel):
    vector: str = Field(default="voice-clone", max_length=64)
    target_id: str = Field(default="C0001", max_length=16)
    seed: Optional[int] = Field(default=None, ge=0, le=2_147_483_647)


@app.post("/api/cockpit/simulate")
async def cockpit_simulate(body: CockpitRequest):
    """Generate one attack for this vector/target and score it two ways."""
    import cockpit_engine  # noqa: PLC0415
    return cockpit_engine.simulate(body.vector, body.target_id, body.seed)


@app.get("/api/cockpit/benchmark")
async def cockpit_benchmark(seed: int = 2026):
    """Measured legacy-vs-hardened comparison over a labelled corpus."""
    import cockpit_engine  # noqa: PLC0415
    return cockpit_engine.benchmark(seed=seed)


class IncidentRequest(BaseModel):
    target_id: str = Field(default="C0001", max_length=16)
    vector: Optional[str] = Field(default=None, max_length=64)
    attack_type: Optional[str] = Field(default=None, max_length=64)
    seed: Optional[int] = Field(default=None, ge=0, le=2_147_483_647)
    include_retraining: bool = True


@app.post("/api/incident/report")
async def incident_report(body: IncidentRequest):
    """Compose one end-to-end incident: profile, plan, payload, verdicts, retraining."""
    import incident_engine  # noqa: PLC0415
    return incident_engine.build_report(
        target_id=body.target_id,
        vector=body.vector,
        attack_type=body.attack_type,
        seed=body.seed,
        include_retraining=body.include_retraining,
    )


@app.get("/api/runs/{run_id}")
async def get_run_detail(run_id: str):
    """Return a previously executed run so deep links stay honest."""
    import lab_engine  # noqa: PLC0415
    run = lab_engine.get_run(run_id)
    if run is None:
        raise HTTPException(
            status_code=404,
            detail=f"Run {run_id} is not in this server's history. Runs are held in memory and do not survive a restart.",
        )
    return run


# ---------------------------------------------------------------------------
# Routes — Simulation Console (Screen 2)
# ---------------------------------------------------------------------------

class GenerateRequest(BaseModel):
    """Optional parameters for richer, personalised scam-script generation."""
    # voice-clone params
    target_name: Optional[str] = None
    company: Optional[str] = None
    amount: Optional[float] = None
    caller_role: Optional[str] = None
    voice_profile: Optional[str] = None
    # phishing params
    brand: Optional[str] = None
    lure: Optional[str] = None
    channel: Optional[str] = None
    # free-text scenario (target profile, urgency type, channel)
    scenario: Optional[str] = None


class AIDefenseLabRequest(BaseModel):
    targetId: str = Field(default="C0001", pattern=r"^C\d{4}$")
    difficulty: str = Field(default="medium", pattern=r"^(easy|medium|hard)$")
    intensity: float = Field(default=0.6, ge=0.1, le=1.0)
    seed: int = Field(default=2026, ge=0, le=2_147_483_647)
    selectedVector: Optional[str] = Field(default=None, max_length=64)


class TrainRequest(BaseModel):
    labRunId: Optional[str] = Field(default=None, max_length=64)
    labRecords: list[dict] = Field(default_factory=list, max_length=100)
    # Omit for a fresh draw each run; supply one to reproduce a specific result.
    seed: Optional[int] = Field(default=None, ge=0, le=2_147_483_647)


@app.post("/api/ai-defense-lab/run")
async def run_ai_defense_lab(body: AIDefenseLabRequest):
    """Run the teammate's offline red-team planner against a synthetic target."""
    from ai_defense_lab_adapter import run_lab  # noqa: PLC0415
    try:
        run_data = run_lab(body.targetId, body.difficulty, body.intensity, body.seed, body.selectedVector)
        _save_lab_run(run_data)
        return run_data
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


def _save_lab_run(run_data: dict):
    file_path = DATA_DIR / "lab_runs.json"
    if not file_path.exists():
        file_path.write_text("{}", encoding="utf-8")
    try:
        runs = json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        runs = {}
    runs[run_data["runId"]] = run_data
    file_path.write_text(json.dumps(runs, indent=2), encoding="utf-8")


@app.get("/api/ai-defense-lab/run/{run_id}")
async def get_lab_run(run_id: str):
    """Retrieve a previously executed AI Defense Lab run."""
    file_path = DATA_DIR / "lab_runs.json"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="Lab run not found")
    try:
        runs = json.loads(file_path.read_text(encoding="utf-8"))
    except json.JSONDecodeError:
        raise HTTPException(status_code=404, detail="Lab run not found")
    if run_id not in runs:
        raise HTTPException(status_code=404, detail="Lab run not found")
    return runs[run_id]



class ChainedGenerateRequest(BaseModel):
    vector1: str = Field(default="synthetic-identity")
    vector2: str = Field(default="bec-email")
    scenario: Optional[str] = None
    target_name: Optional[str] = None
    amount: Optional[float] = None


@app.post("/api/generate/chained")
async def generate_chained(body: ChainedGenerateRequest = ChainedGenerateRequest()):
    """Generate a compound two-stage synthetic attack scenario combining two vectors."""
    from generators import generate_chained_attack  # noqa: PLC0415
    return generate_chained_attack(body.vector1, body.vector2, body.model_dump(exclude_none=True))


@app.post("/api/generate/{vector}")
async def generate(vector: str, body: GenerateRequest = GenerateRequest()):
    """Generate synthetic attack data for a given vector.

    Accepts an optional JSON body to parameterise the generation
    (target name, company, amount, etc.). All fields are optional —
    omitting them uses random/Faker defaults.
    """
    from generators import (  # noqa: PLC0415
        generate_voice_clone_script,
        generate_phishing_script,
        generate_synthetic_layering,
        generate_payment_artifact,
    )

    params = body.model_dump(exclude_none=True)

    if vector == "voice-clone":
        return generate_voice_clone_script(params)
    elif vector == "llm-phishing":
        return generate_phishing_script(params)
    elif vector in {
        "deepfake-video", "fake-ecommerce", "fake-chatbot", "synthetic-identity", "deepfake-kyc", "bec-email",
    }:
        return generate_payment_artifact(vector, params)
    else:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown vector: {vector}. Use: voice-clone, llm-phishing, deepfake-video, fake-ecommerce, fake-chatbot, synthetic-identity, deepfake-kyc, bec-email",
        )


# ---------------------------------------------------------------------------
# Routes — Custom free-text "You be the attacker" scenario (Milestone 2)
# ---------------------------------------------------------------------------

class CustomScenarioRequest(BaseModel):
    description: str = Field(min_length=5, max_length=2000)

KNOWN_VECTORS = ["voice-clone", "deepfake-video", "llm-phishing", "fake-ecommerce", "fake-chatbot", "synthetic-identity", "deepfake-kyc", "bec-email"]
VECTOR_LABELS = {"voice-clone": "Voice Cloning", "deepfake-video": "Deepfake Video Calls", "llm-phishing": "Hyper-Personalized Phishing", "fake-ecommerce": "AI-Built Fake E-Commerce Sites", "fake-chatbot": "Fake AI Chatbots", "synthetic-identity": "Synthetic Identity Fraud", "deepfake-kyc": "Deepfake Identity Verification", "bec-email": "AI-Drafted BEC"}

def _classify_scenario(description: str) -> dict:
    """Use Gemini to classify a free-text scam description into a known vector."""
    prompt = (
        "You are a payment fraud analyst. Classify which of these 8 fraud vectors a scam description most resembles:\n"
        "voice-clone, deepfake-video, llm-phishing, fake-ecommerce, fake-chatbot, synthetic-identity, deepfake-kyc, bec-email\n\n"
        f"Description: \"{description}\"\n\n"
        'Respond in JSON only: {"vector_id": "...", "confidence": 0.0-1.0, "reasoning": "...", "is_novel": false}'
    )
    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        import json as _json
        raw = ask_gemini(prompt, max_tokens=300, system="Classify fraud scenarios accurately.")
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[-1].rsplit("```", 1)[0].strip()
        result = _json.loads(cleaned)
        vid = result.get("vector_id", "llm-phishing")
        if vid not in KNOWN_VECTORS:
            vid = "llm-phishing"
        return {"vector_id": vid, "confidence": float(result.get("confidence", 0.7)), "reasoning": result.get("reasoning", "Matched based on content."), "is_novel": bool(result.get("is_novel", False))}
    except Exception:
        dl = description.lower()
        if any(w in dl for w in ["voice", "call", "phone"]): return {"vector_id": "voice-clone", "confidence": 0.6, "reasoning": "Keywords suggest voice attack.", "is_novel": False}
        if any(w in dl for w in ["video", "zoom", "teams"]): return {"vector_id": "deepfake-video", "confidence": 0.6, "reasoning": "Keywords suggest video impersonation.", "is_novel": False}
        if any(w in dl for w in ["shop", "store", "ecommerce"]): return {"vector_id": "fake-ecommerce", "confidence": 0.6, "reasoning": "Keywords suggest fake storefront.", "is_novel": False}
        if any(w in dl for w in ["chatbot", "support", "helpdesk"]): return {"vector_id": "fake-chatbot", "confidence": 0.6, "reasoning": "Keywords suggest fake chatbot.", "is_novel": False}
        if any(w in dl for w in ["identity", "passport", "ssn"]): return {"vector_id": "synthetic-identity", "confidence": 0.6, "reasoning": "Keywords suggest identity fraud.", "is_novel": False}
        if any(w in dl for w in ["kyc", "verification", "selfie"]): return {"vector_id": "deepfake-kyc", "confidence": 0.6, "reasoning": "Keywords suggest KYC bypass.", "is_novel": False}
        if any(w in dl for w in ["ceo", "cfo", "wire", "invoice"]): return {"vector_id": "bec-email", "confidence": 0.6, "reasoning": "Keywords suggest BEC.", "is_novel": False}
        return {"vector_id": "llm-phishing", "confidence": 0.5, "reasoning": "Defaulted to phishing.", "is_novel": True}

@app.post("/api/generate/custom")
async def generate_custom(body: CustomScenarioRequest):
    """Classify a free-text scam description and generate artifacts using the matched vector."""
    from generators import generate_voice_clone_script, generate_phishing_script, generate_payment_artifact  # noqa: PLC0415
    classification = _classify_scenario(body.description)
    matched = classification["vector_id"]
    params = {"scenario": body.description}
    if matched == "voice-clone":
        result = generate_voice_clone_script(params)
    elif matched == "llm-phishing":
        result = generate_phishing_script(params)
    else:
        result = generate_payment_artifact(matched, params)
    result["customScenario"] = True
    result["classification"] = {"matchedVector": matched, "matchedVectorLabel": VECTOR_LABELS.get(matched, matched), "confidence": classification["confidence"], "reasoning": classification["reasoning"], "isNovel": classification["is_novel"], "userDescription": body.description}
    return result


# ---------------------------------------------------------------------------
# Routes — Defense Dashboard (Screen 3)
# ---------------------------------------------------------------------------

@app.post("/api/train")
async def train(body: TrainRequest = TrainRequest()):
    """Run the three-round adversarial retraining loop and report its metrics.

    Prefers the XGBoost trainer when its dependencies and datasets are
    present. When they are not — which is always the case on serverless —
    it falls back to the dependency-free loop in `defender_engine` rather
    than raising, because a 500 here used to send the UI to fixed demo
    constants that never changed.
    """
    try:
        from trainer import train_both_models  # noqa: PLC0415
        return train_both_models(body.labRecords, body.labRunId)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    except Exception:  # noqa: BLE001 — missing deps, missing parquet, OOM, ...
        import random as _random  # noqa: PLC0415

        import defender_engine  # noqa: PLC0415

        # A fixed default seed would make every training run return byte-identical
        # numbers, which is the "static results" problem in a different costume.
        # Draw fresh unless the caller pins one.
        seed = body.seed if body.seed is not None else _random.SystemRandom().randrange(2**31)
        results = defender_engine.train(seed=seed)
        results["provenance"]["engine"] = "defender_engine (dependency-free fallback)"
        return results


@app.post("/api/benchmark")
async def benchmark():
    """Run the compact single-seed benchmark without the full evasion loop."""
    from trainer import run_live_benchmark  # noqa: PLC0415
    return run_live_benchmark()


class ExplainRequest(BaseModel):
    amount: float = 0
    hour: int = 0
    is_new_payee: int = 0
    txn_velocity_1h: int = 1
    days_since_last_txn: int = 0
    is_international: int = 0
    predicted_fraud_prob: Optional[float] = 0.5
    actual_fraud: Optional[int] = None


class ExplainTermRequest(BaseModel):
    term: str = Field(min_length=1, max_length=120)
    context: str = Field(default="", max_length=500)


@app.post("/api/explain")
async def explain(txn: ExplainRequest):
    """Generate a plain-language explanation for a flagged transaction."""
    from trainer import explain_transaction  # noqa: PLC0415
    return explain_transaction(txn.model_dump())


@app.post("/api/explain-term")
async def explain_term(body: ExplainTermRequest):
    """Explain a technical fraud-analysis term for the current research view."""
    term = body.term.strip()
    prompt = (
        f"Explain the fraud-analysis term '{term}' to a bank operations analyst in 2 concise sentences. "
        "Define it plainly, say how it is interpreted here, and avoid advice for evading detection. "
        f"Current UI context: {body.context.strip() or 'synthetic payment risk analysis'}."
    )
    fallback = {
        "candidate scores": "Candidate scores rank attack patterns by fit to observed target signals. The highest score is selected for this synthetic run; it is not a probability of real-world fraud.",
        "shadow scoring": "Shadow scoring recommends allow or review without changing or blocking a payment. It tests detector behavior safely.",
        "false negative": "A false negative is a fraudulent example classified as legitimate. These misses help identify patterns for defensive training.",
        "evasion reasoning": "Evasion reasoning identifies features that make a synthetic fraud pattern harder to recognize so controlled defensive test data can be created.",
        "feature importance": "Feature importance estimates how much each input contributed to model decisions. It describes model behavior, not causation.",
        "precision": "Precision is the share of flagged transactions that were actually fraud in the evaluation set.",
        "recall": "Recall is the share of known fraudulent transactions that the model successfully flags.",
        "auc-roc": "AUC-ROC measures how well the model separates fraud from legitimate transactions across decision thresholds.",
        "prediction confidence": "Prediction confidence measures the distance between the model's output probability and the decision threshold (0.50). High confidence means the model is decisive, while low confidence indicates borderline uncertainty.",
        "confidence score": "Confidence score reflects distance from the 50% decision boundary: scores near 0% or 100% have high confidence, while probabilities near 50% indicate high uncertainty.",
    }.get(term.lower(), "This term describes a signal or measurement used to evaluate synthetic payment risk. Interpret it with the surrounding values and run provenance.")
    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        explanation = ask_gemini(prompt, max_tokens=180, system="Explain fraud-defense concepts clearly and safely for controlled research.")
        source = "Gemini API"
    except Exception:
        explanation = fallback
        source = "Local research glossary"
    return {"term": term, "explanation": explanation, "source": source}


# ---------------------------------------------------------------------------
# Routes — Attack Replay demo (Milestones 1–4)
# ---------------------------------------------------------------------------

class ReplayMessageRequest(BaseModel):
    personaName: Optional[str] = None
    occupation: Optional[str] = None
    vector: Optional[str] = "llm-phishing"  # voice-clone | llm-phishing
    scenario: Optional[str] = None


class ReplayPaymentRequest(BaseModel):
    persona: dict
    vector: Optional[str] = "llm-phishing"
    receivedAtIso: Optional[str] = None


class ReplayDefendRequest(BaseModel):
    features: Optional[dict] = None
    amount: Optional[float] = None
    hour: Optional[int] = None
    is_new_payee: Optional[int] = None
    txn_velocity_1h: Optional[int] = None
    days_since_last_txn: Optional[int] = None
    is_international: Optional[int] = None
    time_drift: Optional[float] = None
    payee: Optional[str] = None
    channel: Optional[str] = None
    personaAvgSingleTxn: Optional[float] = None


@app.get("/api/replay/persona")
async def replay_persona():
    """Generate a fresh synthetic victim persona (no real PII)."""
    from generators import generate_persona  # noqa: PLC0415
    return generate_persona()


@app.post("/api/replay/message")
async def replay_message(body: ReplayMessageRequest):
    """Generate a scam message scoped to the persona's name."""
    from generators import generate_payment_artifact, generate_phishing_script, generate_voice_clone_script  # noqa: PLC0415
    params = {}
    if body.personaName:
        params["target_name"] = body.personaName
    if body.occupation:
        params["scenario"] = f"Target is a {body.occupation}. Make the lure relevant to their profession."
    if body.scenario:
        params["scenario"] = body.scenario
    if body.vector == "voice-clone":
        return generate_voice_clone_script(params)
    if body.vector == "llm-phishing":
        return generate_phishing_script(params)
    return generate_payment_artifact(body.vector or "llm-phishing", params)


@app.post("/api/replay/payment")
async def replay_payment(body: ReplayPaymentRequest):
    """Generate a synthetic payment attempt that looks anomalous vs the persona's baseline."""
    from generators import generate_replay_payment  # noqa: PLC0415
    return generate_replay_payment(body.persona, body.vector or "llm-phishing", body.receivedAtIso)


class ReplayEmailRequest(BaseModel):
    email: str
    subject: str
    body: str


@app.post("/api/replay/email")
async def replay_email(body: ReplayEmailRequest):
    """Send a harmless, clearly labeled test notice through configured Gmail SMTP."""
    recipient = body.email.strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient):
        raise HTTPException(status_code=422, detail="Enter a valid test email address")

    from dotenv import load_dotenv  # noqa: PLC0415
    load_dotenv(Path(__file__).resolve().parent / ".env")
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    if not username or not password:
        raise HTTPException(
            status_code=503,
            detail="Real test email is not configured. Set SMTP_USERNAME and SMTP_PASSWORD.",
        )

    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM", username).strip()
    message["To"] = recipient
    message["Subject"] = "[FraudForge TEST] Synthetic replay notification"
    message.set_content(
        "FraudForge synthetic replay test\n\n"
        "This is a harmless hackathon notification confirming that the email test path works.\n"
        "It contains no real fraud request, credential prompt, payment instruction, or active link.\n\n"
        "The full synthetic scenario remains available only inside the FraudForge demo inbox."
    )

    try:
        with smtplib.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "587"))) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Test email could not be sent") from exc

    return {"status": "sent", "to": recipient}


@app.post("/api/replay/defend")
async def replay_defend(body: ReplayDefendRequest):
    """Score a single synthetic transaction and return a plain-language explanation.

    If a persisted defender_v1 model exists (trained on real PaySim + ULB data),
    it is used directly — no in-memory retraining needed.
    Falls back to a minimal in-memory XGBoost model if the production model
    has not been trained yet.
    """
    import numpy as np  # noqa: PLC0415
    import pandas as pd  # noqa: PLC0415
    from trainer import (  # noqa: PLC0415
        FEATURES, _build_reference_data, _fit, explain_transaction,
        load_defender_model, load_defender_meta,
    )
    from sklearn.model_selection import train_test_split  # noqa: PLC0415

    persisted_model = load_defender_model()
    using_production_model = persisted_model is not None

    # Merge nested features dict with top-level fields
    raw = body.model_dump(exclude_none=True)
    feats = dict(raw.get("features", {}))
    for k in ["amount", "hour", "is_new_payee", "txn_velocity_1h", "days_since_last_txn", "is_international", "time_drift", "payee", "channel"]:
        if k in raw and k not in feats:
            feats[k] = raw[k]

    if using_production_model:
        from data_adapters import MERGED_FEATURES  # noqa: PLC0415
        model = persisted_model
        row = {f: feats.get(f, 0) for f in MERGED_FEATURES}
        X_single = pd.DataFrame([row])
        prob = float(model.predict_proba(X_single)[0, 1])
    else:
        ref = _build_reference_data()
        X_ref = ref[FEATURES]
        y_ref = ref["is_fraud"]
        X_tr, _X_te, y_tr, _y_te = train_test_split(
            X_ref, y_ref, test_size=0.25, stratify=y_ref, random_state=99
        )
        model = _fit(X_tr, y_tr)
        row = {f: feats.get(f, 0) for f in FEATURES}
        X_single = pd.DataFrame([row])
        prob = float(model.predict_proba(X_single)[0, 1])

    flagged = prob >= 0.5
    confidence = round(abs(prob - 0.5) * 2, 4)
    confidence_level = "High" if confidence >= 0.70 else "Medium" if confidence >= 0.35 else "Low"

    decision = "BLOCK" if prob >= 0.75 else "REVIEW" if prob >= 0.50 else "ALLOW"
    action = "HARD_DECLINE_IMMEDIATE" if prob >= 0.75 else "CHALLENGE_3DS_BIOMETRIC" if prob >= 0.50 else "FRICTIONLESS_AUTHORIZATION"

    txn_for_explain = dict(row)
    txn_for_explain["predicted_fraud_prob"] = prob
    explanation_result = explain_transaction(txn_for_explain)

    meta = load_defender_meta() if using_production_model else None

    return {
        "fraudProbability": round(prob, 4),
        "confidence": confidence,
        "confidenceLevel": confidence_level,
        "flagged": flagged,
        "verdict": "FLAGGED — High Risk Threat" if prob >= 0.75 else "FLAGGED — Step-Up Required" if flagged else "PASSED — Normal Pattern",
        "decision": decision,
        "action": action,
        "explanation": explanation_result["explanation"],
        "explanationSource": explanation_result["source"],
        "features": feats,
        "modelInfo": {
            "usingProductionModel": using_production_model,
            "trainedAt": meta["trainedAt"] if meta else None,
            "sourceDatasets": meta.get("sourceDatasets") if meta else None,
        },
    }


# ---------------------------------------------------------------------------
# Routes — Production Defender (Milestone 5)
# ---------------------------------------------------------------------------

@app.get("/api/defender/status")
async def defender_status():
    """Return metadata for the persisted production defender model.

    Returns {ready: false} if the model has not been trained yet.
    """
    from trainer import load_defender_meta  # noqa: PLC0415
    meta = load_defender_meta()
    if meta is None:
        return {"ready": False}
    return {"ready": True, **meta}


@app.post("/api/defender/train")
async def defender_train(force_rebuild: bool = False):
    """Build + persist the production defender model from real multi-source data.

    This blocks until training completes (typically 2-5 minutes for 785k rows).
    Triggers data merging from PaySim + ULB datasets if the parquet cache
    doesn't exist yet.

    Query param:
        force_rebuild (bool): if true, rebuild the merged parquet from scratch
                              even if the cache exists.
    """
    from trainer import train_defender_model  # noqa: PLC0415
    try:
        meta = train_defender_model(force_rebuild_data=force_rebuild)
        return {"status": "trained", **meta}
    except FileNotFoundError as exc:
        raise HTTPException(
            status_code=503,
            detail=f"Dataset file not found: {exc}. Ensure PaySim and ULB CSVs are present.",
        ) from exc
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(
            status_code=500,
            detail=f"Training failed: {exc}",
        ) from exc


# ---------------------------------------------------------------------------
# Routes — AI Defense Lab 2 (Red Team Control Center) Integration
# ---------------------------------------------------------------------------

_lab_dir = Path(__file__).resolve().parent.parent / "AI-Defense-Lab"
if str(_lab_dir) not in sys.path:
    sys.path.insert(0, str(_lab_dir))

try:
    from backend.main import (
        population_summary as lab_population_summary,
        customers as lab_customers,
        customer_detail as lab_customer_detail,
        merchants as lab_merchants,
        transactions as lab_transactions,
        transaction_detail as lab_transaction_detail,
        scenarios as lab_scenarios,
        scenarios_by_type as lab_scenarios_by_type,
        targets_for_attack as lab_targets_for_attack,
        generate_dataset as lab_generate_dataset,
        generate_scenario as lab_generate_scenario,
        generate_scenario_dataset as lab_generate_scenario_dataset,
        make_plan as lab_make_plan,
        run_attack as lab_run_attack,
        run_all as lab_run_all,
        run_detail as lab_run_detail,
    )
    app.add_api_route("/api/population/summary", lab_population_summary, methods=["GET"])
    app.add_api_route("/api/customers", lab_customers, methods=["GET"])
    app.add_api_route("/api/customers/{customer_id}", lab_customer_detail, methods=["GET"])
    app.add_api_route("/api/merchants", lab_merchants, methods=["GET"])
    app.add_api_route("/api/transactions", lab_transactions, methods=["GET"])
    app.add_api_route("/api/transactions/{transaction_id}", lab_transaction_detail, methods=["GET"])
    app.add_api_route("/api/scenarios", lab_scenarios, methods=["GET"])
    app.add_api_route("/api/scenarios/{scenario_type}", lab_scenarios_by_type, methods=["GET"])
    app.add_api_route("/api/targets/{attack_type}", lab_targets_for_attack, methods=["GET"])
    app.add_api_route("/api/dataset/generate", lab_generate_dataset, methods=["POST"])
    app.add_api_route("/api/scenarios/generate", lab_generate_scenario, methods=["POST"])
    app.add_api_route("/api/scenarios/dataset", lab_generate_scenario_dataset, methods=["POST"])
    app.add_api_route("/api/planner/plan", lab_make_plan, methods=["POST"])
    app.add_api_route("/api/attacks/run", lab_run_attack, methods=["POST"])
    app.add_api_route("/api/attacks/run-all", lab_run_all, methods=["POST"])
    app.add_api_route("/api/runs/{run_id}", lab_run_detail, methods=["GET"])
except Exception as exc:
    print(f"Notice: AI-Defense-Lab 2 integration fallback active: {exc}")
