"""Baseline-vs-hardened comparison for the one-page cockpit.

The cockpit claims a legacy detector misses generative fraud that a hardened
detector catches. This module makes that claim measurable instead of
asserted: it builds a labelled corpus (synthetic fraud from the attack
families, plus legitimate traffic modelled on each customer's own baseline),
runs both detectors over it, and reports the confusion-matrix numbers that
fall out.

Two detectors, deliberately different in kind:

  legacy_score   A static rule engine of the sort a traditional processor
                 runs: absolute amount and velocity thresholds, no per-account
                 context. It has no idea what *this* customer normally does.

  risk.score_transaction
                 The hardened scorer: every signal is graded against the
                 account's own baseline.

The gap between them is the product claim, and it is computed, not typed in.

Pure stdlib — the serverless bundle ships only fastapi+pydantic.
"""

from __future__ import annotations

import random
from typing import Any, Optional

import lab_engine
from risk import REVIEW_THRESHOLD, score_transaction

# ---------------------------------------------------------------------------
# The legacy baseline detector
# ---------------------------------------------------------------------------

# A traditional static rule set: fixed cutoffs applied to every account alike.
LEGACY_AMOUNT_THRESHOLD = 5000.0
LEGACY_VELOCITY_THRESHOLD = 6


def legacy_score(transaction: dict) -> dict[str, Any]:
    """Score a payment the way a pre-ML rule engine would.

    No account baseline, no payee history, no device binding — just absolute
    thresholds. This is what an attacker pacing payments under the limit is
    built to walk straight through.
    """
    amount = float(transaction.get("amount", 0) or 0)
    velocity = float(transaction.get("txn_velocity_1h", 0) or 0)

    reasons = []
    if amount >= LEGACY_AMOUNT_THRESHOLD:
        reasons.append(f"amount over the flat ${LEGACY_AMOUNT_THRESHOLD:,.0f} limit")
    if velocity >= LEGACY_VELOCITY_THRESHOLD:
        reasons.append(f"{velocity:g} payments/hour over the flat limit")

    flagged = bool(reasons)
    return {
        "flagged": flagged,
        "action": "review" if flagged else "allow",
        "reasons": reasons or ["no static threshold breached"],
    }


# ---------------------------------------------------------------------------
# Corpus construction
# ---------------------------------------------------------------------------

def _legitimate_payments(customer: dict[str, Any], rng: random.Random, count: int) -> list[dict]:
    """Ordinary spending for one account — the false-positive control group."""
    baseline = float(customer["average_amount"])
    daily = float(customer["daily_txns"])
    regularity = float(customer["spending_regularity"])
    out = []

    for _ in range(count):
        # A regular spender varies less around their own mean.
        spread = 0.45 * (1.2 - regularity)
        amount = max(20.0, round(baseline * rng.gauss(1.0, max(0.08, spread)), 2))
        out.append({
            "amount": amount,
            "amount_baseline": baseline,
            "txn_velocity_1h": max(1, int(rng.gauss(max(1, daily / 8), 0.6))),
            "daily_txn_baseline": daily,
            # Real customers do occasionally pay someone new or travel.
            "is_new_payee": int(rng.random() < 0.08),
            "is_international": int(rng.random() < 0.03),
            "is_new_device": int(rng.random() < 0.05),
            "hour": rng.choice([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
        })
    return out


def _fraud_payments(rng: random.Random, per_family: int) -> list[dict]:
    """Attack traffic drawn from every family the lab can generate."""
    out = []
    for family in lab_engine.ATTACK_FAMILIES:
        for _ in range(per_family):
            customer = rng.choice(lab_engine.CUSTOMERS)
            records = lab_engine.generate_and_score(
                customer, family["name"], rng,
                difficulty=rng.choice(["easy", "medium", "hard"]),
                intensity=rng.uniform(0.4, 0.9),
            )
            out.extend(r["features"] for r in records)
    return out


def _confusion(payments: list[dict], labels: list[int], predict) -> dict[str, Any]:
    tp = fp = tn = fn = 0
    for payment, is_fraud in zip(payments, labels):
        flagged = predict(payment)
        if is_fraud and flagged:
            tp += 1
        elif is_fraud and not flagged:
            fn += 1
        elif not is_fraud and flagged:
            fp += 1
        else:
            tn += 1

    recall = tp / (tp + fn) if (tp + fn) else 0.0
    precision = tp / (tp + fp) if (tp + fp) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0
    fpr = fp / (fp + tn) if (fp + tn) else 0.0

    return {
        "truePositives": tp,
        "falsePositives": fp,
        "trueNegatives": tn,
        "falseNegatives": fn,
        "recall": round(recall, 4),
        "precision": round(precision, 4),
        "f1": round(f1, 4),
        "falsePositiveRate": round(fpr, 4),
    }


def benchmark(seed: int = 2026, per_family: int = 3, legit_per_customer: int = 30) -> dict[str, Any]:
    """Run both detectors over one labelled corpus and compare them."""
    rng = random.Random(seed)

    fraud = _fraud_payments(rng, per_family)
    legit = []
    for customer in lab_engine.CUSTOMERS:
        legit.extend(_legitimate_payments(customer, rng, legit_per_customer))

    payments = fraud + legit
    labels = [1] * len(fraud) + [0] * len(legit)

    legacy = _confusion(payments, labels, lambda p: legacy_score(p)["flagged"])
    hardened = _confusion(payments, labels, lambda p: score_transaction(p).flagged)

    # Value the hardened detector recovers: fraud it stops that the legacy
    # rules would have let through. Reported for this corpus only — no
    # extrapolation to a monthly figure the data cannot support.
    recovered_value = sum(
        float(p["amount"])
        for p, is_fraud in zip(payments, labels)
        if is_fraud and score_transaction(p).flagged and not legacy_score(p)["flagged"]
    )
    fraud_value = sum(float(p["amount"]) for p, is_fraud in zip(payments, labels) if is_fraud)

    return {
        "seed": seed,
        "corpus": {
            "fraudulent": len(fraud),
            "legitimate": len(legit),
            "total": len(payments),
            "fraudValue": round(fraud_value, 2),
        },
        "legacy": legacy,
        "hardened": hardened,
        "recallDelta": round(hardened["recall"] - legacy["recall"], 4),
        "f1Delta": round(hardened["f1"] - legacy["f1"], 4),
        "frictionDelta": round(hardened["falsePositiveRate"] - legacy["falsePositiveRate"], 4),
        "recoveredValue": round(recovered_value, 2),
        "reviewThreshold": REVIEW_THRESHOLD,
        "provenance": {
            "legacyModel": f"Static rules: amount >= ${LEGACY_AMOUNT_THRESHOLD:,.0f} or velocity >= {LEGACY_VELOCITY_THRESHOLD}/hr",
            "hardenedModel": "risk.score_transaction — per-account graded signals",
            "syntheticOnly": True,
        },
    }


# ---------------------------------------------------------------------------
# One showcase attack for the cockpit
# ---------------------------------------------------------------------------

# Each cockpit vector maps onto the attack family that actually generates it.
VECTOR_FAMILIES = {
    "voice-clone": "vishing",
    "deepfake-video": "video_deepfake",
    "synthetic-identity": "synthetic_identity",
    "bec-email": "phishing",
    "fake-ecommerce": "behavioral_drift",
    "fake-chatbot": "phishing",
}

VECTOR_LURES = {
    "voice-clone": "Caller (cloned voice of the CFO): \"{name}, I'm in a vendor board meeting. Please authorise the ${amount:,.0f} supplier invoice to Apex Meridian Global before the cutoff.\"",
    "deepfake-video": "Live face-swapped video call impersonating the account holder during step-up KYC, authorising a ${amount:,.0f} transfer to a newly registered beneficiary.",
    "synthetic-identity": "Fabricated applicant profile blending a genuine identity number with synthesised biometrics, opening an account that immediately moves ${amount:,.0f}.",
    "bec-email": "Reply injected into a live supplier invoice thread: \"Please note our updated remittance details — kindly settle the outstanding ${amount:,.0f} to the account below.\"",
    "fake-ecommerce": "Autonomous storefront with generated listings and reviews takes a ${amount:,.0f} order it will never fulfil.",
    "fake-chatbot": "Fake in-app support agent walks the customer through \"verification\", harvesting the one-time code that releases ${amount:,.0f}.",
}


def _annotate(features: dict) -> dict[str, Any]:
    """Score one payment with both detectors and describe the disagreement."""
    decision = score_transaction(features)
    legacy = legacy_score(features)
    return {
        "features": features,
        "hardened": {
            "score": decision.score,
            "action": decision.action,
            "flagged": decision.flagged,
            "reasons": decision.reasons,
            "contributions": decision.contributions,
            "confidence": decision.confidence,
            "confidenceLevel": decision.confidence_level,
        },
        "legacy": legacy,
    }


def simulate(vector: str, target_id: str = "C0001", seed: Optional[int] = None) -> dict[str, Any]:
    """Generate one attack for this vector and target, and score it both ways."""
    customer = lab_engine.get_customer(target_id)
    family = VECTOR_FAMILIES.get(vector, "phishing")

    effective_seed = seed if seed is not None else random.SystemRandom().randrange(2**31)
    rng = random.Random(f"cockpit:{vector}:{customer['customer_id']}:{effective_seed}")

    records = lab_engine.generate_and_score(customer, family, rng, difficulty="medium", intensity=0.7)
    scored = [_annotate(r["features"]) for r in records]

    # Prefer a payment that demonstrates the gap — hardened catches it, legacy
    # does not. That is the whole claim, so lead with a real instance of it
    # rather than the loudest payment in the batch.
    showcase = next(
        (s for s in scored if s["hardened"]["flagged"] and not s["legacy"]["flagged"]),
        max(scored, key=lambda s: s["hardened"]["score"]),
    )
    demonstrates_gap = showcase["hardened"]["flagged"] and not showcase["legacy"]["flagged"]

    features = showcase["features"]
    amount = features["amount"]

    caught_by_hardened = sum(1 for s in scored if s["hardened"]["flagged"])
    caught_by_legacy = sum(1 for s in scored if s["legacy"]["flagged"])

    return {
        "vector": vector,
        "attackFamily": family,
        "seed": effective_seed,
        "target": customer,
        "lure": VECTOR_LURES.get(vector, VECTOR_LURES["bec-email"]).format(
            name=customer.get("name") or customer["customer_id"],
            amount=amount,
        ),
        "transaction": {
            "id": f"TXN-{rng.randrange(100000, 999999)}",
            "amount": amount,
            "amountBaseline": features["amount_baseline"],
            "amountRatio": round(amount / features["amount_baseline"], 2),
            "velocity1h": features["txn_velocity_1h"],
            "isNewPayee": features["is_new_payee"],
            "isInternational": features["is_international"],
            "isNewDevice": features["is_new_device"],
            "hour": features["hour"],
            "payee": "Apex Meridian Global Escrow Ltd.",
            "channel": customer["usual_payment_method"],
        },
        "verdict": {
            "legacy": showcase["legacy"],
            "hardened": showcase["hardened"],
            "demonstratesGap": demonstrates_gap,
        },
        "sequence": {
            "total": len(scored),
            "caughtByHardened": caught_by_hardened,
            "caughtByLegacy": caught_by_legacy,
            "records": [
                {
                    "amount": s["features"]["amount"],
                    "hour": s["features"]["hour"],
                    "velocity": s["features"]["txn_velocity_1h"],
                    "hardenedScore": s["hardened"]["score"],
                    "hardenedFlagged": s["hardened"]["flagged"],
                    "legacyFlagged": s["legacy"]["flagged"],
                }
                for s in scored
            ],
        },
    }
