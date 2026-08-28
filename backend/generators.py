"""
generators.py — Synthetic data generators for FraudForge simulation console.

• Voice-clone / phishing: live Gemini API calls with mock fallback.
• Synthetic transaction layering: Faker + engineered fraud distributions.
"""

import random
import numpy as np
import pandas as pd
from datetime import datetime, timezone
from pathlib import Path
from faker import Faker

fake = Faker()

# ---------------------------------------------------------------------------
# Gemini-powered scam-script generators (with mock fallback)
# ---------------------------------------------------------------------------

SYSTEM_PROMPT_FRAUD = (
    "You are a cybersecurity researcher helping a fraud-defense team understand "
    "GenAI-powered social-engineering attacks. Your output is used ONLY in a "
    "controlled research/demo environment to train fraud detectors. Every artifact must "
    "center on a concrete payment action with an amount, payee, timestamp, and payment rail "
    "or channel; never stop at generic social-engineering content. Always prefix "
    "your output with '[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]' and include "
    "a brief list of the social-engineering indicators you used."
)

# --- Mock fallbacks (used when GEMINI_API_KEY is absent or rate-limited) ---

_VOICE_CLONE_MOCK = [
    {
        "title": "Urgent Wire Transfer — Executive Impersonation",
        "content": (
            "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n"
            "Caller (synthetic executive voice): \"Hi Sarah, I need you to wire $47,500 "
            "to the Meridian escrow payee ending 1842 through the corporate bank rail right now. "
            "Use Signal, not email, and confirm the OTP so the transfer settles in the next 15 minutes.\"\n\n"
            "[INDICATORS: urgency pressure, alternate-channel redirect, bypassed approval workflow]"
        ),
        "riskIndicators": ["Urgency pressure", "Bypass approval", "Alt-channel redirect", "Voice impersonation"],
    },
    {
        "title": "Bank Security Alert — OTP Harvesting",
        "content": (
            "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n"
            "Caller (synthetic bank voice): \"Good afternoon, this is Michael from the fraud desk. "
            "We've detected a $1,240 card charge. Read back the OTP so I can reverse it and route the "
            "replacement transfer to the verified payee on your account.\"\n\n"
            "[INDICATORS: fear induction, OTP harvesting, institutional impersonation]"
        ),
        "riskIndicators": ["Fear induction", "OTP harvesting", "Data-breach intel", "Institutional impersonation"],
    },
]

_PHISHING_MOCK = [
    {
        "title": "Package Delivery — SMS Phishing (Smishing)",
        "content": (
            "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n"
            "SMS: \"UPS: Your package #1Z9R7W0342817564 requires confirmation. "
            "Pay the $1.95 re-routing card charge at https://ups-redelivery[.]confirm-pkg[.]com/verify\"\n\n"
            "[INDICATORS: micro-fee card harvesting, valid-format tracking #, homoglyph domain]"
        ),
        "riskIndicators": ["Micro-fee harvesting", "Valid-format tracking #", "Homoglyph domain", "Delivery urgency"],
    },
    {
        "title": "Corporate IT — Credential Phishing Email",
        "content": (
            "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n"
            "From: security-noreply@company-sso[.]com\n"
            "Subject: [Action Required] Password expires in 2 hours\n\n"
            "Hi [Employee], your SSO password expires today at 6 PM. "
            "Reset now and approve the $860 vendor payment at https://sso-company[.]okta-verify[.]com/reset\n\n"
            "[INDICATORS: spoofed sender, countdown urgency, fake SSO portal]"
        ),
        "riskIndicators": ["Spoofed sender", "Countdown urgency", "Fake SSO portal", "Real tool references"],
    },
]


def _scenario_clause(params: dict) -> str:
    """Append free-text scenario (target profile / urgency / channel) when provided."""
    scenario = (params.get("scenario") or "").strip()
    if not scenario:
        return ""
    return (
        f"\nRespect this analyst scenario (target profile, urgency type, channel): {scenario}\n"
        "Weave those details into the script without contradicting them."
    )


def _fallback_source(exc: Exception) -> str:
    name = type(exc).__name__
    if name == "GeminiConfigError":
        return "Mock (GEMINI_API_KEY not set)"
    if name == "GeminiRateLimitError":
        return "Mock (Gemini rate-limited after retries)"
    return f"Mock (Gemini error: {name})"


def _parse_risk_indicators(text: str) -> list[str]:
    """Extract INDICATORS line items from Gemini's output."""
    for line in text.splitlines():
        if "INDICATORS" in line.upper():
            # e.g. "[INDICATORS: urgency, new payee, ...]"
            inner = line.split(":", 1)[-1].strip().rstrip("]")
            return [s.strip() for s in inner.split(",") if s.strip()]
    return ["AI-generated", "Social engineering", "Urgency cue"]


VECTOR_ARTIFACTS = {
    "deepfake-video": {
        "title": "Deepfake Video Call — Synthetic Bank Support",
        "action": "authorize a synthetic bank transfer",
        "rail": "bank transfer",
        "artifact": "video-call scenario",
        "fallback": "A fabricated bank-support representative appears on a synthetic video call and claims a payment needs urgent review. The representative asks the participant to describe a verification step, but the exercise stops before any real credential is entered. The simulated outcome is an attempted bank transfer.",
    },
    "fake-ecommerce": {
        "title": "AI-Built Fake Storefront — Synthetic Checkout",
        "action": "complete a synthetic card checkout",
        "rail": "card checkout",
        "artifact": "mock storefront and checkout",
        "fallback": "A polished mock storefront advertises a limited-edition product with fabricated reviews and a short delivery window. A triangulated trust story uses copied-looking brand style, social proof, and a support badge before the checkout screen. The simulated outcome is a card checkout payment.",
    },
    "fake-chatbot": {
        "title": "Fake AI Chatbot — Card Verification Conversation",
        "action": "authorize a synthetic card payment",
        "rail": "digital wallet",
        "artifact": "chatbot conversation",
        "fallback": "Bot: Welcome to the synthetic account desk.\nParticipant: I need help with a pending payment.\nBot: This training flow would normally request verification, but no real details should be shared.\nThe simulated outcome is a digital-wallet payment authorization.",
    },
    "deepfake-kyc": {
        "title": "Deepfake Identity Verification Payment Attempt",
        "action": "open a payment account, then authorize a $2,480 card purchase",
        "rail": "card checkout",
        "artifact": "liveness-check video",
        "fallback": "A fabricated applicant submits a synthetic face video for a liveness review during account opening. The exercise highlights inconsistent motion and document-to-face mismatches without attempting to bypass a real provider. The simulated outcome is a card checkout from the newly opened account.",
    },
    "synthetic-identity": {
        "title": "Synthetic Identity Bust-Out Payment Attempt",
        "action": "use a newly opened credit account for a $6,800 purchase",
        "rail": "card-not-present",
        "artifact": "fabricated identity profile",
        "fallback": "Fabricated profile: Name: Avery Rowan; ID record: SYN-4827; address: synthetic residential record; credit history: newly assembled, thin-file profile. The profile is used to model an account-opening review, ending at an attempted card-not-present purchase.",
    },
    "bec-email": {
        "title": "AI-Drafted BEC — Vendor Detail Change",
        "action": "authorize a synthetic vendor bank transfer",
        "rail": "bank transfer",
        "artifact": "vendor-payment email",
        "fallback": "From: synthetic-vendor@example.test\nSubject: Payment detail review for the next invoice\n\nHello Finance Team,\nThis controlled training email models a vendor-detail change request. Verify the request through an independent channel before any payment is approved. The simulated outcome is a bank transfer to a new payee.",
    },
}

CONTEXT_ANGLES = [
    "unexpected deadline pressure",
    "new-device or new-channel warning",
    "familiar-looking support request",
    "invoice or account-detail mismatch",
    "limited-time confirmation request",
]


def _payment_record(vector: str, action: str, rail: str, scenario: str | None = None) -> dict:
    """Return a synthetic payment event attached to every non-conversational artifact."""
    return {
        "transactionId": f"txn_{random.randint(100000, 999999)}",
        "amount": round(random.uniform(80, 6800), 2),
        "currency": "USD",
        "payee": fake.company(),
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": rail,
        "paymentAction": action,
        "vector": vector,
        "scenario": scenario or "Controlled synthetic payment scenario",
    }


def generate_payment_artifact(vector: str, params: dict | None = None) -> dict:
    """Generate a Gemini-backed, vector-specific payment-centered artifact."""
    params = params or {}
    config = VECTOR_ARTIFACTS[vector]
    scenario = (params.get("scenario") or "").strip()
    context_angle = random.choice(CONTEXT_ANGLES)
    payment = _payment_record(vector, config["action"], config["rail"], scenario)
    prompt = (
        f"Create a short synthetic fraud-defense research artifact for the '{config['artifact']}' mechanism of '{vector}'. "
        f"Make the main artifact a {config['artifact']}, not a generic transaction summary. "
        f"Use this varied context angle: {context_angle}. "
        f"Center it on this concrete payment action: {config['action']}. The payment rail is {config['rail']}. "
        f"Use the synthetic amount ${payment['amount']:.2f}, payee '{payment['payee']}', and timestamp '{payment['timestamp']}'. "
        "Explain the attack path in 3-5 sentences, ending at the attempted payment authorization. "
        "Do not provide real credentials, delivery instructions, exploit steps, or instructions for attacking real systems. "
        "Prefix the response with '[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]' and finish with '[INDICATORS: ...]'."
        f"{_scenario_clause(params)}"
    )
    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        content = ask_gemini(prompt, max_tokens=500, system=SYSTEM_PROMPT_FRAUD)
        source = "Gemini API"
        indicators = _parse_risk_indicators(content)
    except Exception as exc:  # noqa: BLE001
        content = (
            "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]\n\n"
            f"{config['fallback']}\n"
            f"Context angle: {context_angle}.\n"
            f"Payment record: ${payment['amount']:.2f} to '{payment['payee']}' via {payment['channel']} at {payment['timestamp']}.\n\n"
            "[INDICATORS: payment authorization pressure, vector-specific artifact, unusual payee, synthetic details]"
        )
        source = _fallback_source(exc)
        indicators = ["Payment authorization pressure", "Unusual payee", "Synthetic details"]
    return {
        "vector": vector,
        "title": config["title"],
        "content": content,
        "riskIndicators": indicators,
        "payment": payment,
        "source": source,
    }


def generate_voice_clone_script(params: dict | None = None) -> dict:
    """Generate a voice-clone social engineering script via Gemini (with mock fallback)."""
    params = params or {}
    target = params.get("target_name") or fake.first_name()
    company = params.get("company") or fake.company()
    amount = params.get("amount") or round(random.uniform(5000, 80000), 2)
    caller_role = params.get("caller_role") or "CFO"
    voice_profile = params.get("voice_profile") or "synthetic adult voice"
    payment = _payment_record(
        "voice-clone", f"authorize a ${amount:,.2f} wire transfer", "bank wire", params.get("scenario")
    )
    payment["amount"] = round(float(amount), 2)

    prompt = (
        f"Write a realistic synthetic voice-clone social-engineering phone script using a {voice_profile}. "
        f"Never imitate a real person or identifiable public figure. The fraudster "
        f"impersonates the {caller_role} of '{company}' and tries to trick an employee named "
        f"'{target}' into authorizing a ${amount:,.2f} wire transfer to a fabricated payee. "
        f"Use payee '{payment['payee']}', timestamp '{payment['timestamp']}', and bank wire as the payment rail. "
        f"Include an explicit OTP or approval step "
        f"that would cause the payment to settle. "
        f"Include realistic dialogue (caller + victim), specific fabricated details to build "
        f"credibility, urgency pressure, and a note directing them to an alternate channel. "
        f"End with a bracketed INDICATORS line listing the social-engineering techniques used."
        f"{_scenario_clause(params)}"
    )

    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        content = ask_gemini(prompt, max_tokens=700, system=SYSTEM_PROMPT_FRAUD)
        source = "Gemini API"
        risk_indicators = _parse_risk_indicators(content)
        # Derive a title from the first non-empty line
        title_line = next((l for l in content.splitlines() if l.strip() and "[SYNTHETIC" not in l), "")
        title = title_line.strip().lstrip("#").strip() or f"Voice-Clone Attack — {company}"
    except Exception as exc:  # noqa: BLE001
        mock = random.choice(_VOICE_CLONE_MOCK)
        content = mock["content"].replace("Sarah", target).replace("David", caller_role).replace(
            "$47,500", f"${amount:,.2f}"
        ).replace("Meridian", company)
        title = mock["title"]
        risk_indicators = mock["riskIndicators"]
        source = _fallback_source(exc)

    return {
        "vector": "voice-clone",
        "title": title,
        "content": content,
        "riskIndicators": risk_indicators,
        "payment": payment,
        "params": {"target": target, "company": company, "amount": amount, "voiceProfile": voice_profile, "scenario": params.get("scenario")},
        "source": source,
    }


def generate_phishing_script(params: dict | None = None) -> dict:
    """Generate a phishing / smishing message via Gemini (with mock fallback)."""
    params = params or {}
    target = params.get("target_name") or fake.first_name()
    brand = params.get("brand") or random.choice(["UPS", "FedEx", "Chase Bank", "PayPal", "Microsoft"])
    lure = params.get("lure") or random.choice(["package delivery", "account security alert", "password expiry", "invoice"])
    channel = params.get("channel") or random.choice(["SMS", "email"])
    payment = _payment_record(
        "llm-phishing", "authorize a payment-link card charge", "card checkout", params.get("scenario")
    )

    prompt = (
        f"Write a realistic synthetic GenAI-crafted {channel} phishing message impersonating '{brand}' "
        f"targeting a person named '{target}'. The lure is: '{lure}'. "
        f"Make it convincing with plausible details (tracking numbers, dollar amounts, payee, payment rail, and deadline). "
        f"Use payee '{payment['payee']}', amount ${payment['amount']:.2f}, and timestamp '{payment['timestamp']}'. "
        f"The message must end at a concrete card charge, bank transfer, wallet payment, or OTP-authorized checkout, not merely a credential request. "
        f"Use a homoglyph or lookalike domain. "
        f"End with a bracketed INDICATORS line listing the phishing techniques used."
        f"{_scenario_clause(params)}"
    )

    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        content = ask_gemini(prompt, max_tokens=500, system=SYSTEM_PROMPT_FRAUD)
        source = "Gemini API"
        risk_indicators = _parse_risk_indicators(content)
        title_line = next((l for l in content.splitlines() if l.strip() and "[SYNTHETIC" not in l), "")
        title = title_line.strip().lstrip("#").strip() or f"{channel} Phishing — {brand} Impersonation"
    except Exception as exc:  # noqa: BLE001
        mock = random.choice(_PHISHING_MOCK)
        content = mock["content"].replace("Sarah", target).replace("[Employee]", target)
        title = mock["title"]
        risk_indicators = mock["riskIndicators"]
        source = _fallback_source(exc)

    return {
        "vector": "llm-phishing",
        "title": title,
        "content": content,
        "riskIndicators": risk_indicators,
        "payment": payment,
        "params": {"target": target, "brand": brand, "lure": lure, "channel": channel, "scenario": params.get("scenario")},
        "source": source,
    }


# ---------------------------------------------------------------------------
# Synthetic transaction layering generator (no LLM needed for numeric features)
# ---------------------------------------------------------------------------

import os

def _generate_legit_transactions(n: int = 200) -> pd.DataFrame:
    """Generate baseline legitimate transactions, preferentially from PaySim sample CSV."""
    data_dir = Path(__file__).resolve().parent / "data"
    paysim_path = data_dir / "paysim_sample.csv"
    
    if paysim_path.exists():
        try:
            df = pd.read_csv(paysim_path)
            # Map PaySim columns to our features roughly
            df = df.rename(columns={
                "amount": "amount",
            })
            
            rows = []
            for _, row in df.head(n).iterrows():
                rows.append({
                    "amount": max(1.0, float(row.get("amount", round(np.random.lognormal(3.5, 1.0), 2)))),
                    "hour": int(row.get("step", np.random.normal(14, 3))) % 24, # step in PaySim is 1 hour of time
                    "is_new_payee": 0, # mostly false for legit
                    "txn_velocity_1h": random.randint(1, 3), # default low
                    "days_since_last_txn": random.randint(0, 10),
                    "is_international": 0,
                    "is_fraud": 0,
                    "source": "paysim_sample",
                    "payee": fake.company(),
                    "timestamp": fake.date_time_between(start_date="-90d", end_date="now").isoformat(),
                    "channel": random.choice(["bank_transfer", "card_checkout", "wallet"]),
                })
                
            # If we didn't have enough rows in CSV, generate the rest
            if len(rows) < n:
                extra = n - len(rows)
                for _ in range(extra):
                    rows.append({
                        "amount": round(np.random.lognormal(mean=3.5, sigma=1.0), 2),
                        "hour": int(np.random.normal(loc=14, scale=3)) % 24,
                        "is_new_payee": int(np.random.random() < 0.08),
                        "txn_velocity_1h": max(1, int(np.random.exponential(scale=1.5))),
                        "days_since_last_txn": max(0, int(np.random.exponential(scale=5))),
                        "is_international": int(np.random.random() < 0.05),
                        "is_fraud": 0,
                        "source": "legitimate",
                        "payee": fake.company(),
                        "timestamp": fake.date_time_between(start_date="-90d", end_date="now").isoformat(),
                        "channel": random.choice(["bank_transfer", "card_checkout", "wallet"]),
                    })
            
            return pd.DataFrame(rows).sample(frac=1).reset_index(drop=True)
            
        except Exception as e:
            print(f"Error loading PaySim: {e}")
            # Fallback to pure generation below
            
    # Pure synthetic fallback
    rows = []
    for _ in range(n):
        rows.append({
            "amount": round(np.random.lognormal(mean=3.5, sigma=1.0), 2),
            "hour": int(np.random.normal(loc=14, scale=3)) % 24,
            "is_new_payee": int(np.random.random() < 0.08),
            "txn_velocity_1h": max(1, int(np.random.exponential(scale=1.5))),
            "days_since_last_txn": max(0, int(np.random.exponential(scale=5))),
            "is_international": int(np.random.random() < 0.05),
            "is_fraud": 0,
            "source": "legitimate",
            "payee": fake.company(),
            "timestamp": fake.date_time_between(start_date="-90d", end_date="now").isoformat(),
            "channel": random.choice(["bank_transfer", "card_checkout", "wallet"]),
        })
    return pd.DataFrame(rows)


DEFAULT_STEALTH_SPEC = {
    "hour_prefer": [9, 10, 11, 12, 13, 14, 15, 16, 17],
    "is_new_payee_rate": 0.06,
    "velocity_max": 3,
    "days_since_min": 2,
    "is_international_rate": 0.04,
    "amount_style": "blend_legit",
    "tactics": "Mimic daytime vendor/payroll payments: lower velocity, existing payees, domestic rails.",
}


def _row_from_evasion_spec(spec: dict, source: str) -> dict:
    """Build one fraud row that blends toward legitimate traffic using an evasion spec."""
    hours = spec.get("hour_prefer") or DEFAULT_STEALTH_SPEC["hour_prefer"]
    hours = [int(h) % 24 for h in hours] or DEFAULT_STEALTH_SPEC["hour_prefer"]
    style = spec.get("amount_style") or "blend_legit"
    if style == "small_cluster":
        amount = round(random.choice([24.99, 39.99, 49.99, 79.99]) + np.random.uniform(-1.5, 1.5), 2)
    else:
        amount = round(np.random.lognormal(mean=3.6, sigma=0.7), 2)

    vel_max = max(1, int(spec.get("velocity_max") or 3))
    days_min = max(0, int(spec.get("days_since_min") or 0))
    new_payee_rate = float(spec.get("is_new_payee_rate") if spec.get("is_new_payee_rate") is not None else 0.06)
    intl_rate = float(spec.get("is_international_rate") if spec.get("is_international_rate") is not None else 0.04)

    return {
        "amount": max(1.0, amount),
        "hour": random.choice(hours),
        "is_new_payee": int(np.random.random() < new_payee_rate),
        "txn_velocity_1h": random.randint(1, vel_max),
        "days_since_last_txn": days_min + int(np.random.exponential(scale=3)),
        "is_international": int(np.random.random() < intl_rate),
        "is_fraud": 1,
        "source": source,
        "payee": fake.company(),
        "timestamp": fake.date_time_between(start_date="-30d", end_date="now").isoformat(),
        "channel": random.choice(["bank_transfer", "card_checkout", "wallet"]),
    }


def _generate_fraud_transactions(
    n: int = 60,
    evasion_spec: dict | None = None,
    source: str = "synthetic_fraud",
) -> pd.DataFrame:
    """Generate synthetic fraud transactions with engineered (or stealth) patterns."""
    rows = []
    for _ in range(n):
        if evasion_spec:
            rows.append(_row_from_evasion_spec(evasion_spec, source))
            continue

        pattern = random.choice(["velocity_burst", "odd_hour", "amount_cluster", "new_payee"])

        base = {
            "is_fraud": 1,
            "source": source,
            "is_new_payee": 0,
            "is_international": int(np.random.random() < 0.25),
            "payee": fake.company(),
            "timestamp": fake.date_time_between(start_date="-30d", end_date="now").isoformat(),
            "channel": random.choice(["bank_transfer", "card_checkout", "wallet"]),
        }

        if pattern == "velocity_burst":
            base["amount"] = round(np.random.uniform(10, 200), 2)
            base["hour"] = random.randint(0, 23)
            base["txn_velocity_1h"] = random.randint(5, 15)
            base["days_since_last_txn"] = 0
        elif pattern == "odd_hour":
            base["amount"] = round(np.random.lognormal(mean=4.5, sigma=0.8), 2)
            base["hour"] = random.choice([1, 2, 3, 4, 5, 23, 0])
            base["txn_velocity_1h"] = max(1, int(np.random.exponential(scale=2)))
            base["days_since_last_txn"] = random.randint(0, 2)
        elif pattern == "amount_cluster":
            cluster_amount = random.choice([49.99, 99.99, 499.99, 999.99])
            base["amount"] = round(cluster_amount + np.random.uniform(-2, 2), 2)
            base["hour"] = random.randint(0, 23)
            base["txn_velocity_1h"] = random.randint(2, 6)
            base["days_since_last_txn"] = random.randint(0, 3)
        else:  # new_payee
            base["amount"] = round(np.random.lognormal(mean=5, sigma=1.2), 2)
            base["hour"] = random.randint(0, 23)
            base["is_new_payee"] = 1
            base["txn_velocity_1h"] = max(1, int(np.random.exponential(scale=2)))
            base["days_since_last_txn"] = random.randint(0, 1)

        rows.append(base)
    return pd.DataFrame(rows)


def generate_synthetic_layering() -> dict:
    """Generate a batch of synthetic transactions (legit + fraud)."""
    legit = _generate_legit_transactions(200)
    fraud = _generate_fraud_transactions(60)
    combined = pd.concat([legit, fraud], ignore_index=True).sample(frac=1, random_state=42).reset_index(drop=True)

    narrative_prompt = (
        "Write a short synthetic fraud-defense research note about a payment-layering attack. "
        "Center it on the attached transaction batch: transfers across fabricated payees and payment rails "
        "with amounts and timestamps that attempt to disguise the movement of funds. Explain the payment action "
        "being modeled in 2-3 sentences. Do not provide real-world evasion instructions. Prefix with "
        "'[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY]'."
    )
    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        payment_narrative = ask_gemini(narrative_prompt, max_tokens=250, system=SYSTEM_PROMPT_FRAUD)
        narrative_source = "Gemini API"
    except Exception as exc:  # noqa: BLE001
        payment_narrative = (
            "[SYNTHETIC — AI-GENERATED FOR RESEARCH ONLY] This batch models a payment-layering chain "
            "across fabricated payees and bank, wallet, and checkout rails. Each record is a concrete amount, "
            "timestamp, and payment action for detector evaluation."
        )
        narrative_source = _fallback_source(exc)

    def _dist_summary(df, label):
        return {
            "label": label,
            "count": len(df),
            "avgAmount": round(df["amount"].mean(), 2),
            "medianAmount": round(df["amount"].median(), 2),
            "avgHour": round(df["hour"].mean(), 1),
            "pctNewPayee": round((df["is_new_payee"].sum() / len(df)) * 100, 1),
            "avgVelocity": round(df["txn_velocity_1h"].mean(), 1),
            "pctInternational": round((df["is_international"].sum() / len(df)) * 100, 1),
            "amountDistribution": _histogram(df["amount"], bins=[0, 50, 100, 250, 500, 1000, 5000]),
            "hourDistribution": _histogram(df["hour"], bins=list(range(0, 25, 3))),
        }

    def _histogram(series, bins):
        counts, edges = np.histogram(series.clip(upper=bins[-1]), bins=bins)
        return [{"bin": f"{int(edges[i])}-{int(edges[i+1])}", "count": int(c)} for i, c in enumerate(counts)]

    return {
        "vector": "synthetic-layering",
        "totalTransactions": len(combined),
        "fraudCount": int(combined["is_fraud"].sum()),
        "legitCount": int((combined["is_fraud"] == 0).sum()),
        "distributions": {
            "legitimate": _dist_summary(legit, "Legitimate Baseline"),
            "fraud": _dist_summary(fraud, "Synthetic Fraud"),
        },
        "sampleTransactions": combined.head(20).to_dict(orient="records"),
        "fullDataset": combined.to_dict(orient="records"),
        "paymentNarrative": payment_narrative,
        "narrativeSource": narrative_source,
    }


# ---------------------------------------------------------------------------
# Replay demo generators (Milestone 1)
# ---------------------------------------------------------------------------

_OS_OPTIONS = ["Windows 11", "macOS 14 Sonoma", "Android 14", "iOS 17"]
_BROWSER_OPTIONS = ["Chrome 124", "Safari 17", "Firefox 126", "Edge 124"]
_CHANNEL_OPTIONS = ["bank_transfer", "card_checkout", "digital_wallet"]
_OCCUPATION_POOL = [
    "Accountant", "Teacher", "Nurse", "Software Engineer", "Retail Manager",
    "HR Coordinator", "Small Business Owner", "Dental Hygienist", "Electrician",
    "Marketing Analyst", "Paralegal", "Physical Therapist",
]


def generate_persona() -> dict:
    """Generate one complete synthetic victim persona for the Attack Replay demo.

    Returns entirely fabricated data — no real PII.
    """
    # Use a fresh local Faker so each call is truly random (not seeded globally)
    f = Faker()
    name = f.name()
    avg_monthly = round(random.uniform(200, 2500), 2)
    usual_payees = [f.company() for _ in range(3)]
    preferred_channel = random.choice(_CHANNEL_OPTIONS)
    typical_hour = random.randint(9, 18)  # daytime pattern
    velocity_baseline = random.randint(1, 3)

    return {
        "name": name,
        "email": f.email(),
        "phone": f.phone_number(),
        "age": random.randint(28, 67),
        "occupation": random.choice(_OCCUPATION_POOL),
        "balance": round(random.uniform(2000, 50000), 2),
        "accountHistory": {
            "avgMonthlyAmount": avg_monthly,
            "avgSingleTxnAmount": round(avg_monthly / random.randint(3, 12), 2),
            "usualPayees": usual_payees,
            "typicalHour": typical_hour,
            "velocityBaseline": velocity_baseline,
            "preferredChannel": preferred_channel,
            "monthsAccountAge": random.randint(6, 144),
        },
        "deviceProfile": {
            "os": random.choice(_OS_OPTIONS),
            "browser": random.choice(_BROWSER_OPTIONS),
            "city": f.city(),
            "country": "US",
            "knownDevice": True,
        },
    }


def generate_replay_payment(persona: dict, vector: str, received_at_iso: str | None = None) -> dict:
    """Generate a synthetic payment attempt that looks anomalous vs the persona's baseline.

    The amount is forced 5–30× above the persona's average single-transaction amount
    to make the anomaly visible. Payee is always new, velocity elevated, hour derived
    from the received_at timestamp + a short delay (as if reacting quickly to the scam).
    """
    f = Faker()
    history = persona.get("accountHistory", {})
    avg_single = history.get("avgSingleTxnAmount", 200)

    # Anomalous amount — much larger than baseline
    multiplier = round(random.uniform(5, 30), 1)
    amount = round(avg_single * multiplier, 2)

    # Derive hour: persona received message → reacted N minutes later
    if received_at_iso:
        try:
            from datetime import datetime as _dt
            received = _dt.fromisoformat(received_at_iso.replace("Z", "+00:00"))
            reaction_minutes = random.randint(3, 22)
            from datetime import timedelta as _td
            attempt_dt = received + _td(minutes=reaction_minutes)
            hour = attempt_dt.hour
            timestamp = attempt_dt.isoformat()
        except Exception:  # noqa: BLE001
            hour = random.randint(9, 21)
            timestamp = datetime.now(timezone.utc).isoformat()
    else:
        hour = random.randint(9, 21)
        timestamp = datetime.now(timezone.utc).isoformat()

    new_payee_name = f.company()
    channel = history.get("preferredChannel", random.choice(_CHANNEL_OPTIONS))
    txn_id = f"RPL-{random.randint(100000, 999999)}"

    return {
        "transactionId": txn_id,
        "amount": amount,
        "currency": "USD",
        "payee": new_payee_name,
        "timestamp": timestamp,
        "channel": channel,
        "vector": vector,
        # ML features matching the trainer's FEATURES list
        "features": {
            "amount": amount,
            "hour": hour,
            "is_new_payee": 1,          # always a new payee in a scam-induced transfer
            "txn_velocity_1h": random.randint(3, 8),  # elevated vs baseline
            "days_since_last_txn": random.randint(0, 1),
            "is_international": int(random.random() < 0.35),
        },
        "anomalyContext": {
            "personaAvgSingleTxn": avg_single,
            "multiplierVsBaseline": multiplier,
            "isNewPayee": True,
            "baselineVelocity": history.get("velocityBaseline", 2),
        },
    }


def generate_chained_attack(vector1: str, vector2: str, params: dict | None = None) -> dict:
    """Generate a compound two-stage attack scenario combining two attack vectors into one payment outcome."""
    params = params or {}
    target_name = params.get("target_name") or fake.name()
    company = params.get("company") or fake.company()
    amount = params.get("amount") or round(random.uniform(8000, 65000), 2)
    payee = fake.company()

    vector_titles = {
        "synthetic-identity": "Synthetic Identity Infiltration",
        "deepfake-kyc": "Deepfake KYC Verification Bypass",
        "voice-clone": "Executive Voice-Clone Social Engineering",
        "llm-phishing": "Targeted Spearphishing & Credential Harvest",
        "deepfake-video": "Deepfake Executive Video Call",
        "fake-ecommerce": "Malicious E-Commerce Storefront",
        "fake-chatbot": "Compromised AI Chatbot Support",
        "bec-email": "AI-Drafted Business Email Compromise",
    }

    # Stage 1: Account Opening / Infiltration
    params_s1 = dict(params)
    params_s1["target_name"] = target_name
    params_s1["company"] = company
    params_s1["scenario"] = f"Stage 1: Establish fraudulent account or access for {target_name} at {company}."

    if vector1 == "voice-clone":
        stage1_res = generate_voice_clone_script(params_s1)
    elif vector1 == "llm-phishing":
        stage1_res = generate_phishing_script(params_s1)
    else:
        stage1_res = generate_payment_artifact(vector1, params_s1)

    # Stage 2: Exploitation / Payment Trigger
    params_s2 = dict(params)
    params_s2["target_name"] = target_name
    params_s2["company"] = company
    params_s2["amount"] = amount
    params_s2["scenario"] = f"Stage 2: Exploit the established account/identity from Stage 1 ({vector_titles.get(vector1, vector1)}) to authorize payment."

    if vector2 == "voice-clone":
        stage2_res = generate_voice_clone_script(params_s2)
    elif vector2 == "llm-phishing":
        stage2_res = generate_phishing_script(params_s2)
    else:
        stage2_res = generate_payment_artifact(vector2, params_s2)

    # Single unified payment outcome
    payment = {
        "transactionId": f"CHN-{random.randint(100000, 999999)}",
        "amount": round(float(amount), 2),
        "currency": "USD",
        "payee": payee,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "channel": random.choice(["bank transfer", "corporate wire", "digital wallet", "card checkout"]),
        "paymentAction": f"execute ${amount:,.2f} transfer from compromised/synthetic account",
        "vector": f"chained:{vector1}+{vector2}",
        "scenario": f"Compound attack: {vector_titles.get(vector1, vector1)} chained into {vector_titles.get(vector2, vector2)}.",
        "features": {
            "amount": round(float(amount), 2),
            "hour": random.randint(1, 5) if random.random() < 0.6 else random.randint(20, 23),
            "is_new_payee": 1,
            "txn_velocity_1h": random.randint(4, 9),
            "days_since_last_txn": 0,
            "is_international": 1,
        },
    }

    combined_indicators = list(dict.fromkeys(
        stage1_res.get("riskIndicators", []) + stage2_res.get("riskIndicators", []) + ["Compound cross-vector chaining", "Multi-stage escalation"]
    ))

    return {
        "isChained": True,
        "vector1": vector1,
        "vector2": vector2,
        "chainLabel": f"{vector_titles.get(vector1, vector1)} ➔ {vector_titles.get(vector2, vector2)}",
        "title": f"Chained Compound Attack: {vector_titles.get(vector1, vector1)} + {vector_titles.get(vector2, vector2)}",
        "stage1": {
            "vector": vector1,
            "stageTitle": "Stage 1: Identity Infiltration / Account Creation",
            "title": stage1_res.get("title"),
            "content": stage1_res.get("content"),
            "riskIndicators": stage1_res.get("riskIndicators", []),
        },
        "stage2": {
            "vector": vector2,
            "stageTitle": "Stage 2: Social Engineering & Payment Authorization",
            "title": stage2_res.get("title"),
            "content": stage2_res.get("content"),
            "riskIndicators": stage2_res.get("riskIndicators", []),
        },
        "payment": payment,
        "riskIndicators": combined_indicators,
        "source": stage2_res.get("source", "Gemini API"),
    }
