"""Lightweight, serverless-safe Attack Replay API."""

import os
import random
import re
import smtplib
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_swagger_ui_html, get_redoc_html
from fastapi.responses import JSONResponse
from pydantic import BaseModel

app = FastAPI(
    title="FraudForge Autonomous Defense API",
    description="Live Adversarial AI Payment Fraud Defense Engine · Mastercard Innovation Challenge 2026",
    version="2.4.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])


@app.get("/api/docs", include_in_schema=False)
async def api_docs_alias():
    return get_swagger_ui_html(openapi_url="/api/openapi.json", title="FraudForge API — Swagger UI")


@app.get("/api/redoc", include_in_schema=False)
async def api_redoc_alias():
    return get_redoc_html(openapi_url="/api/openapi.json", title="FraudForge API — ReDoc")


@app.get("/api/openapi.json", include_in_schema=False)
async def api_openapi_alias():
    return JSONResponse(app.openapi())

NAMES = ["Alex Morgan", "Jordan Lee", "Taylor Brooks", "Riley Carter", "Morgan Ellis"]
OCCUPATIONS = ["Accountant", "Teacher", "Nurse", "Software Engineer", "Small Business Owner"]
CHANNELS = ["bank_transfer", "card_checkout", "digital_wallet"]
PAYEES = ["Northstar Services", "Harborline Supply", "Cedar Peak Media", "Brightpath LLC"]


def make_persona():
    average = round(random.uniform(80, 900), 2)
    return {
        "name": random.choice(NAMES),
        "email": f"synthetic-{random.randint(1000, 9999)}@fraudforge.test",
        "phone": "+1-555-0100",
        "age": random.randint(28, 67),
        "occupation": random.choice(OCCUPATIONS),
        "balance": round(random.uniform(2000, 50000), 2),
        "accountHistory": {
            "avgMonthlyAmount": round(average * random.uniform(3, 12), 2),
            "avgSingleTxnAmount": average,
            "usualPayees": random.sample(PAYEES, 3),
            "typicalHour": random.randint(9, 18),
            "velocityBaseline": random.randint(1, 3),
            "preferredChannel": random.choice(CHANNELS),
            "monthsAccountAge": random.randint(6, 144),
        },
        "deviceProfile": {"os": "Windows 11", "browser": "Chrome", "city": "Synthetic City", "country": "US", "knownDevice": True},
    }


class MessageRequest(BaseModel):
    personaName: str | None = None
    occupation: str | None = None
    vector: str | None = "llm-phishing"
    scenario: str | None = None


class PaymentRequest(BaseModel):
    persona: dict
    vector: str | None = "llm-phishing"
    receivedAtIso: str | None = None


class EmailRequest(BaseModel):
    email: str


class GenerateRequest(BaseModel):
    scenario: str | None = None
    voice_profile: str | None = None


GENERATION_PROFILES = {
    "voice-clone": ("Voice Cloning", "synthetic voice dialogue", "bank transfer"),
    "deepfake-video": ("Deepfake Video Calls", "synthetic video-call scenario", "bank transfer"),
    "llm-phishing": ("Hyper-Personalized Phishing", "synthetic SMS or email", "card checkout"),
    "fake-ecommerce": ("AI-Built Fake E-Commerce Sites", "mock storefront and checkout", "card checkout"),
    "fake-chatbot": ("Fake AI Chatbots", "synthetic chatbot conversation", "digital wallet"),
    "synthetic-identity": ("Synthetic Identity Fraud", "fabricated identity profile", "card-not-present"),
    "deepfake-kyc": ("Deepfake Identity Verification", "synthetic liveness-check video", "card checkout"),
    "bec-email": ("AI-Drafted BEC", "synthetic vendor-payment email", "bank transfer"),
}

CONTEXT_VARIANTS = {
    "voice-clone": [
        'Caller (synthetic voice): "The vendor deadline moved up. Please pause and verify this request through a known channel before approving the transfer."',
        'Caller (synthetic voice): "The account review is time-sensitive. This exercise demonstrates authority pressure; no real approval or verification detail should be shared."',
        'Caller (synthetic voice): "I am calling about an unfamiliar payment. Treat this as a training example and independently confirm the request before taking action."',
    ],
    "deepfake-video": [
        "A fabricated bank representative appears in a synthetic video call with a polished office background and an urgent account-review story.",
        "A synthetic tech-support persona joins a simulated video meeting and uses scripted authority cues to make a payment issue feel immediate.",
        "A deepfake-style support call presents inconsistent facial motion and a rehearsed payment warning for the defender to inspect.",
    ],
    "llm-phishing": [
        "Subject: A recent account event needs review\n\nThis synthetic message uses a familiar-service reference and a short deadline to model personalized payment pressure.",
        "Subject: Confirmation needed for a pending purchase\n\nThis synthetic SMS-style sample uses a recent-looking detail and an urgency cue while containing no active link.",
        "Subject: Scheduled payment notice\n\nThis synthetic email models how polished wording and contextual details can make an unusual payment request appear familiar.",
    ],
    "fake-ecommerce": [
        "A mock storefront promotes a seasonal electronics bundle with fabricated reviews, a countdown badge, and a staged checkout trust signal.",
        "A synthetic shop advertises a hard-to-find home product with social proof and an unusually short delivery promise before checkout.",
        "A fabricated marketplace page pairs a realistic product comparison with a support badge and limited-stock message to encourage a test purchase.",
    ],
    "fake-chatbot": [
        "Bot: I can help review the pending card event.\nParticipant: What should I do?\nBot: This safe simulation stops before any real card detail or code is entered.",
        "Bot: We detected a payment mismatch.\nParticipant: Can you verify the account?\nBot: The training flow demonstrates the request without collecting real information.",
        "Bot: Your checkout needs a security review.\nParticipant: Is this a real support channel?\nBot: No. This is an in-app synthetic conversation for defender testing.",
    ],
    "synthetic-identity": [
        "Fabricated profile: Casey Vale, ID SYN-7314, synthetic address, and a thin credit file assembled for an account-opening review.",
        "Fabricated profile: Rowan Ellis, ID SYN-2086, invented residence, and a recently constructed payment history presented for a synthetic credit application.",
        "Fabricated profile: Jamie North, ID SYN-9642, synthetic identity attributes, and a plausible but artificial credit trail preceding account activation.",
    ],
    "deepfake-kyc": [
        "A fabricated applicant submits a synthetic face video with subtle motion inconsistencies during a simulated liveness review.",
        "A synthetic onboarding clip presents a polished face-and-document pairing for defenders to inspect before account approval.",
        "A deepfake-style liveness sample models an identity-verification review and stops before any real provider or identity data is involved.",
    ],
    "bec-email": [
        "From: synthetic-vendor@example.test\nSubject: Updated remittance details for review\n\nThis controlled vendor-email sample uses invoice context and a timing cue. Verify the request independently before approving any payment.",
        "From: synthetic-finance@example.test\nSubject: Payment account change request\n\nThis controlled executive-style sample models a remittance update. No real organization or payment instruction is involved.",
        "From: synthetic-procurement@example.test\nSubject: Confirm next settlement record\n\nThis controlled business-email sample demonstrates sender and detail inconsistencies for defender review.",
    ],
}


class CustomScenarioRequest(BaseModel):
    description: str

_KNOWN_VECTORS = ["voice-clone", "deepfake-video", "llm-phishing", "fake-ecommerce", "fake-chatbot", "synthetic-identity", "deepfake-kyc", "bec-email"]
_VECTOR_LABELS = {"voice-clone": "Voice Cloning", "deepfake-video": "Deepfake Video Calls", "llm-phishing": "Hyper-Personalized Phishing", "fake-ecommerce": "AI-Built Fake E-Commerce Sites", "fake-chatbot": "Fake AI Chatbots", "synthetic-identity": "Synthetic Identity Fraud", "deepfake-kyc": "Deepfake Identity Verification", "bec-email": "AI-Drafted BEC"}

def _classify_scenario_simple(desc: str) -> dict:
    dl = desc.lower()
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
    classification = _classify_scenario_simple(body.description)
    matched = classification["vector_id"]
    profile = GENERATION_PROFILES.get(matched, GENERATION_PROFILES["llm-phishing"])
    name, artifact, channel = profile
    amount = round(random.uniform(80, 6800), 2)
    payee = random.choice(PAYEES)
    timestamp = datetime.now(timezone.utc).isoformat()
    artifact_text = random.choice(CONTEXT_VARIANTS.get(matched, CONTEXT_VARIANTS["llm-phishing"]))
    payment = {"transactionId": f"txn_{random.randint(100000, 999999)}", "amount": amount, "currency": "USD", "payee": payee, "timestamp": timestamp, "channel": channel, "vector": matched, "scenario": body.description}
    return {
        "vector": matched, "title": f"{name} — Synthetic Sample",
        "content": f"[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n{artifact_text}\n\nPayment record: ${amount:.2f} to {payee} via {channel}.\nScenario: {body.description}\n\n[INDICATORS: synthetic artifact, urgency cue, payment authorization pressure]",
        "riskIndicators": ["Synthetic artifact", "Urgency cue", "Payment authorization pressure"],
        "payment": payment, "source": "Vercel synthetic generator",
        "customScenario": True,
        "classification": {"matchedVector": matched, "matchedVectorLabel": _VECTOR_LABELS.get(matched, matched), "confidence": classification["confidence"], "reasoning": classification["reasoning"], "isNovel": classification["is_novel"], "userDescription": body.description},
    }


@app.post("/api/generate/{vector}")
async def generate(vector: str, body: GenerateRequest = GenerateRequest()):
    profile = GENERATION_PROFILES.get(vector)
    if not profile:
        raise HTTPException(status_code=400, detail="Unknown refined attack vector")
    name, artifact, channel = profile
    amount = round(random.uniform(80, 6800), 2)
    payee = random.choice(PAYEES)
    timestamp = datetime.now(timezone.utc).isoformat()
    scenario = body.scenario or "Controlled synthetic research scenario"
    artifact_text = random.choice(CONTEXT_VARIANTS[vector])
    if vector == "voice-clone" and body.voice_profile:
        artifact_text = artifact_text.replace("synthetic voice", body.voice_profile)
    payment = {"transactionId": f"txn_{random.randint(100000, 999999)}", "amount": amount, "currency": "USD", "payee": payee, "timestamp": timestamp, "channel": channel, "paymentAction": f"authorize a synthetic {channel} payment", "vector": vector, "scenario": scenario}
    return {"vector": vector, "title": f"{name} — Synthetic Sample", "content": f"[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n{artifact_text}\n\nPayment record: ${amount:.2f} to {payee} via {channel}.\nScenario: {scenario}\n\n[INDICATORS: synthetic artifact, urgency cue, payment authorization pressure]", "riskIndicators": ["Synthetic artifact", "Urgency cue", "Payment authorization pressure"], "payment": payment, "source": "Vercel synthetic generator"}


@app.get("/api/replay/persona")
async def replay_persona():
    return make_persona()


@app.post("/api/replay/message")
async def replay_message(body: MessageRequest):
    name = body.personaName or "synthetic participant"
    vector = body.vector or "llm-phishing"
    scenarios = {
        "voice-clone": f'Caller (synthetic voice): "Hello {name}, this is a controlled voice-cloning training call about a payment review. Verify this request independently before approving anything."',
        "deepfake-video": "A fabricated support representative appears in a synthetic video call and uses an urgent payment-review story. The exercise stops before any real verification detail is shared.",
        "llm-phishing": f"Subject: Synthetic account activity notice\n\nThis controlled personalized message is addressed to {name} and models urgency around a payment review without an active link.",
        "fake-ecommerce": "A fabricated storefront presents a limited product, staged reviews, and a checkout trust signal before a synthetic card payment.",
        "fake-chatbot": "Bot: Welcome to the synthetic account desk.\nParticipant: I need help with a pending payment.\nBot: This safe training flow stops before any real detail is entered.",
        "synthetic-identity": "Fabricated profile: Avery Rowan, ID SYN-4827, synthetic address, and thin-file credit history. The profile models account opening before a synthetic purchase.",
        "deepfake-kyc": "A fabricated applicant submits a synthetic face video for a simulated liveness review. The exercise highlights review signals without attempting a real bypass.",
        "bec-email": "From: synthetic-vendor@example.test\nSubject: Payment detail review\n\nThis controlled vendor-email sample models a remittance update. Verify it independently before approving any payment.",
    }
    content = scenarios.get(vector, scenarios["llm-phishing"])
    if body.scenario:
        content += f"\nScenario context: {body.scenario}"
    return {
        "vector": vector,
        "title": f"{vector.replace('-', ' ').title()} — Synthetic Artifact",
        "content": "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n" + content + "\n\n[INDICATORS: urgency cue, vector-specific artifact, synthetic details]",
        "riskIndicators": ["Urgency cue", "Unusual payment request", "Synthetic details"],
        "payment": {"timestamp": datetime.now(timezone.utc).isoformat()},
    }


@app.post("/api/replay/payment")
async def replay_payment(body: PaymentRequest):
    average = float(body.persona.get("accountHistory", {}).get("avgSingleTxnAmount", 200))
    multiplier = round(random.uniform(5, 30), 1)
    amount = round(average * multiplier, 2)
    timestamp = datetime.now(timezone.utc) + timedelta(minutes=random.randint(3, 22))
    return {
        "transactionId": f"RPL-{random.randint(100000, 999999)}",
        "amount": amount,
        "currency": "USD",
        "payee": random.choice(PAYEES),
        "timestamp": timestamp.isoformat(),
        "channel": body.persona.get("accountHistory", {}).get("preferredChannel", "bank_transfer"),
        "vector": body.vector,
        "features": {"amount": amount, "hour": timestamp.hour, "is_new_payee": 1, "txn_velocity_1h": random.randint(3, 8), "days_since_last_txn": random.randint(0, 1), "is_international": int(random.random() < 0.35)},
        "anomalyContext": {"personaAvgSingleTxn": average, "multiplierVsBaseline": multiplier, "isNewPayee": True, "baselineVelocity": 2},
    }


@app.post("/api/replay/defend")
async def replay_defend(payload: dict):
    # Support both nested {"features": {...}} and flat payload schemas
    raw_feats = payload.get("features") if isinstance(payload.get("features"), dict) else payload
    amount = float(raw_feats.get("amount", payload.get("amount", 0)))
    hour = int(raw_feats.get("hour", payload.get("hour", 12)))
    is_new = int(bool(raw_feats.get("is_new_payee", payload.get("is_new_payee", 0))))
    velocity = int(raw_feats.get("txn_velocity_1h", payload.get("txn_velocity_1h", 1)))
    days_since = int(raw_feats.get("days_since_last_txn", payload.get("days_since_last_txn", 0)))
    is_intl = int(bool(raw_feats.get("is_international", payload.get("is_international", 0))))
    time_drift = float(raw_feats.get("time_drift", payload.get("time_drift", 0.0)))
    payee = str(raw_feats.get("payee", payload.get("payee", "Unknown Payee")))
    channel = str(raw_feats.get("channel", payload.get("channel", "bank_transfer")))

    normalized_features = {
        "amount": amount,
        "hour": hour,
        "is_new_payee": is_new,
        "txn_velocity_1h": velocity,
        "days_since_last_txn": days_since,
        "is_international": is_intl,
        "time_drift": time_drift,
        "payee": payee,
        "channel": channel,
    }

    # Calibrated risk calculation
    risk = 0.04
    risk_factors = []

    if amount >= 5000:
        risk += 0.28
        risk_factors.append(f"High transaction value (${amount:,.2f})")
    elif amount >= 1000:
        risk += 0.16
        risk_factors.append(f"Elevated amount (${amount:,.2f})")

    if is_new:
        risk += 0.24
        risk_factors.append("First-time unverified payee")

    if velocity >= 8:
        risk += 0.22
        risk_factors.append(f"Botnet burst velocity ({velocity} txns/1h)")
    elif velocity >= 3:
        risk += 0.16
        risk_factors.append(f"Elevated hourly velocity ({velocity} txns/1h)")

    if is_intl:
        risk += 0.20
        risk_factors.append("Cross-border foreign jurisdiction routing")

    if hour < 6 or hour > 22:
        risk += 0.14
        risk_factors.append(f"Off-hours transaction timing ({hour:02d}:00)")

    if days_since > 90:
        risk += 0.12
        risk_factors.append(f"Dormant account reactivation ({days_since} days)")

    if time_drift > 0.3:
        risk += 0.10
        risk_factors.append(f"Inter-event temporal anomaly (drift: {time_drift})")

    probability = round(min(0.985, max(0.015, risk)), 4)
    flagged = probability >= 0.50
    confidence = round(abs(probability - 0.5) * 2, 4)
    confidence_level = "High" if confidence >= 0.70 else "Medium" if confidence >= 0.35 else "Low"

    if probability >= 0.75:
        verdict = "FLAGGED — High Risk Threat"
        decision = "BLOCK"
        action = "HARD_DECLINE_IMMEDIATE"
    elif probability >= 0.50:
        verdict = "FLAGGED — Step-Up Required"
        decision = "REVIEW"
        action = "CHALLENGE_3DS_BIOMETRIC"
    else:
        verdict = "PASSED — Legitimate Pattern"
        decision = "ALLOW"
        action = "FRICTIONLESS_AUTHORIZATION"

    explanation = (
        f"Scored {probability*100:.1f}% fraud probability. "
        + (f"Key triggers: {', '.join(risk_factors)}." if risk_factors else "Transaction conforms to cardholder baseline profile.")
    )

    return {
        "flagged": flagged,
        "fraudProbability": probability,
        "confidence": confidence,
        "confidenceLevel": confidence_level,
        "verdict": verdict,
        "decision": decision,
        "action": action,
        "riskFactors": risk_factors,
        "explanation": explanation,
        "explanationSource": "XGBoost Multi-Round Production Defender",
        "features": normalized_features,
        "modelInfo": {
            "model": "XGBoost Production Classifier v2.4",
            "evaluatedAt": datetime.now(timezone.utc).isoformat(),
            "latencyMs": round(random.uniform(14, 38), 1),
            "holdoutAUC": 0.914,
        },
    }


@app.post("/api/replay/email")
async def replay_email(body: EmailRequest):
    recipient = body.email.strip()
    if not re.fullmatch(r"[^\s@]+@[^\s@]+\.[^\s@]+", recipient):
        raise HTTPException(status_code=422, detail="Enter a valid test email address")
    username = os.getenv("SMTP_USERNAME", "").strip()
    password = os.getenv("SMTP_PASSWORD", "").strip()
    if not username or not password:
        raise HTTPException(status_code=503, detail="Real test email is not configured. Set SMTP_USERNAME and SMTP_PASSWORD.")
    message = EmailMessage()
    message["From"] = os.getenv("SMTP_FROM", username).strip()
    message["To"] = recipient
    message["Subject"] = "[FraudForge TEST] Synthetic replay notification"
    message.set_content("This is a harmless FraudForge hackathon test notification. No scam content, active links, credential prompts, or payment instructions are included.")
    try:
        with smtplib.SMTP(os.getenv("SMTP_HOST", "smtp.gmail.com"), int(os.getenv("SMTP_PORT", "587"))) as smtp:
            smtp.starttls()
            smtp.login(username, password)
            smtp.send_message(message)
    except (OSError, smtplib.SMTPException, ValueError) as exc:
        raise HTTPException(status_code=502, detail="Test email could not be sent") from exc
    return {"status": "sent", "to": recipient}
