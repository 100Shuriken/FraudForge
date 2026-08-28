from __future__ import annotations

import sys
from dataclasses import replace
import hashlib
import json
from pathlib import Path
from typing import Any


# The project root contains the original, runnable AI-Defense-Lab checkout.
# ``AI-Defense-Lab (2)`` is a downloaded archive wrapper whose inner directory
# is byte-for-byte identical, so using it here would make local behavior depend
# on an accidental duplicate.  Keep the production adapter anchored to the
# canonical lab source.
LAB_ROOT = Path(__file__).resolve().parents[1] / "AI-Defense-Lab"
if str(LAB_ROOT) not in sys.path:
    sys.path.insert(0, str(LAB_ROOT))

from red_team.agent.attack_planner import OfflineFallbackPlanner  # noqa: E402
from red_team.attack_registry import AttackRegistry  # noqa: E402
from simulator.simulator import PaymentSimulator  # noqa: E402
from risk import score_transaction  # noqa: E402


ATTACK_LABELS = {
    "velocity_anomaly": ("Velocity anomaly", "Transaction frequency"),
    "device_switch": ("Device switch", "Device stability"),
    "behavioral_drift": ("Behavioral drift", "Spending regularity"),
    "account_takeover": ("Account takeover", "Authentication risk"),
}

TRACKED_ATTACK_LABELS = {
    "voice-clone": "Voice Cloning",
    "deepfake-video": "Deepfake Video Calls",
    "llm-phishing": "Hyper-Personalized Phishing",
    "fake-ecommerce": "AI-Built Fake E-Commerce Sites",
    "fake-chatbot": "Fake AI Chatbots",
    "synthetic-identity": "Synthetic Identity Fraud",
    "deepfake-kyc": "Deepfake Identity Verification",
    "bec-email": "AI-Drafted BEC",
}


def _profile(customer: Any, context: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": customer.customer_id,
        "city": customer.city,
        "average": round(customer.average_transaction_amount),
        "daily": customer.daily_transaction_count,
        "device": customer.usual_device,
        "stability": round(float(context.get("device_consistency", 0.5)), 3),
        "frequency": round(float(context.get("transaction_frequency", 0.5)), 3),
        "regularity": round(float(context.get("spending_regularity", 0.5)), 3),
    }


def _record(record: dict[str, Any], index: int) -> dict[str, Any]:
    payload = record.get("payload", {})
    timestamp = payload.get("timestamp")
    attack_type = record.get("attack_type", "unknown")
    signal = {
        "velocity_anomaly": f"{payload.get('frequency_multiplier', 2):g} txn/hr",
        "device_switch": "new device",
        "behavioral_drift": "amount shift",
        "account_takeover": "session shift",
    }.get(attack_type, record.get("modality", "synthetic signal"))
    features = {
        "amount": float(payload.get("amount", 0)),
        "hour": getattr(timestamp, "hour", 12),
        "is_new_payee": int(attack_type in {"device_switch", "account_takeover"}),
        "txn_velocity_1h": max(1, int(round(float(payload.get("frequency_multiplier", 1))))) if attack_type == "velocity_anomaly" else 1,
        "is_international": int(attack_type == "account_takeover"),
    }
    decision = score_transaction(features)
    return {
        "id": record.get("attack_id") or f"{attack_type.upper()}-{index:04d}",
        "amount": round(float(payload.get("amount", 0)), 2),
        "hour": getattr(timestamp, "hour", None),
        "signal": signal,
        "attackType": attack_type,
        "isFraud": bool(record.get("is_fraud", True)),
        "riskScore": decision.score,
        "recommendedAction": decision.action,
        "riskReasons": decision.reasons,
        "confidence": decision.confidence,
        "confidenceLevel": decision.confidence_level,
    }


def run_lab(target_id: str, difficulty: str, intensity: float, seed: int = 2026, selected_vector: str | None = None) -> dict[str, Any]:
    simulator = PaymentSimulator()
    simulator.generate_dataset(
        num_customers=3,
        num_merchants=8,
        transactions_per_customer=10,
        seed=seed,
    )
    target = next((customer for customer in simulator.customers if customer.customer_id == target_id), None)
    if target is None:
        raise ValueError("Unknown synthetic target")

    context = {
        "transaction_history": [item for item in simulator.transactions if item.customer_id == target.customer_id],
        "device_consistency": 0.94 if target.usual_device else 0.5,
        "transaction_frequency": min(1.0, 0.15 + target.daily_transaction_count / 20),
        "spending_regularity": 0.86 if target.average_transaction_amount < 5000 else 0.65,
        "authentication_risk": 0.62 if target.city in {"Pune", "Bangalore"} else 0.48,
    }
    planner = OfflineFallbackPlanner(seed=seed, simulator=simulator)
    plan = planner.plan(target, context)
    plan = replace(plan, difficulty=difficulty, intensity=intensity)
    registry = AttackRegistry(simulator)
    records = registry.execute_plan(plan, target, number_of_transactions=3)
    label, signal = ATTACK_LABELS.get(plan.attack_type, (plan.attack_type.replace("_", " ").title(), plan.attack_type))
    candidates = plan.parameters.get("candidate_scores", {})
    serialized_records = [_record(record, index) for index, record in enumerate(records, 1)]
    flagged = sum(item["recommendedAction"] == "review" for item in serialized_records)
    run_id = hashlib.sha256(json.dumps({"target": target_id, "difficulty": difficulty, "intensity": intensity, "seed": seed}, sort_keys=True).encode()).hexdigest()[:12]
    return {
        "runId": f"LAB-{run_id.upper()}",
        "mode": "OFFLINE FALLBACK",
        "provenance": {
            "source": "AI-Defense-Lab teammate module",
            "generator": "PaymentSimulator + AttackRegistry",
            "scorer": "FraudForge shadow risk scorer",
            "seed": seed,
            "syntheticOnly": True,
        },
        "target": _profile(target, context),
        "plan": {
            "attackType": plan.attack_type,
            "label": label,
            "signal": signal,
            "difficulty": plan.difficulty,
            "intensity": plan.intensity,
            "rationale": plan.rationale,
            "candidates": candidates,
        },
        "trackedAttack": {
            "id": selected_vector,
            "label": TRACKED_ATTACK_LABELS.get(selected_vector, selected_vector or label),
            "plannerSpecialization": plan.attack_type,
        } if selected_vector else None,
        "records": serialized_records,
        "defense": {
            "flagged": flagged,
            "total": len(serialized_records),
            "flagRate": round(flagged / len(serialized_records), 2) if serialized_records else 0,
            "action": "review" if flagged else "allow",
        },
    }
