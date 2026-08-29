"""Adversarial attack generation and shadow scoring for the AI Defense Lab.

This module is the single source of truth for Defense Lab runs. Both the
local API (`backend/main.py`) and the serverless API (`api/index.py`) build
runs through here, so the same request produces the same answer in dev and
in production.

Every number a run reports is derived, not asserted:

    profile + attack family + seed  ->  synthetic payment features
    features                        ->  risk.score_transaction()
    scores                          ->  detection / evasion rates

Nothing here hardcodes a detection rate. If the rates look suspiciously
round, that is the generator and the scorer agreeing, not a constant.

Pure stdlib on purpose — the serverless bundle ships only fastapi+pydantic.
"""

from __future__ import annotations

import hashlib
import random
import time
from collections import OrderedDict
from typing import Any, Optional

from risk import (
    BLOCK_THRESHOLD,
    REVIEW_THRESHOLD,
    score_transaction,
)

# ---------------------------------------------------------------------------
# Population
# ---------------------------------------------------------------------------

CUSTOMERS: list[dict[str, Any]] = [
    {"customer_id": "C0001", "name": "Aarav Mehta", "city": "Mumbai", "usual_payment_method": "UPI", "usual_device_id": "D0001", "average_amount": 2028, "daily_txns": 1, "device_stability": 0.94, "spending_regularity": 0.86, "velocity_signal": 0.20},
    {"customer_id": "C0002", "name": "Priya Sharma", "city": "Pune", "usual_payment_method": "CREDIT_CARD", "usual_device_id": "D0002", "average_amount": 3223, "daily_txns": 3, "device_stability": 0.78, "spending_regularity": 0.71, "velocity_signal": 0.65},
    {"customer_id": "C0003", "name": "Vikram Patel", "city": "Bangalore", "usual_payment_method": "NET_BANKING", "usual_device_id": "D0003", "average_amount": 3220, "daily_txns": 3, "device_stability": 0.62, "spending_regularity": 0.58, "velocity_signal": 0.88},
    {"customer_id": "C0004", "name": "Ananya Reddy", "city": "Delhi", "usual_payment_method": "UPI", "usual_device_id": "D0004", "average_amount": 1450, "daily_txns": 2, "device_stability": 0.91, "spending_regularity": 0.82, "velocity_signal": 0.35},
    {"customer_id": "C0005", "name": "Rohan Iyer", "city": "Hyderabad", "usual_payment_method": "DEBIT_CARD", "usual_device_id": "D0005", "average_amount": 2890, "daily_txns": 2, "device_stability": 0.84, "spending_regularity": 0.75, "velocity_signal": 0.45},
    {"customer_id": "C0006", "name": "Kavya Nair", "city": "Chennai", "usual_payment_method": "UPI", "usual_device_id": "D0006", "average_amount": 1980, "daily_txns": 4, "device_stability": 0.69, "spending_regularity": 0.64, "velocity_signal": 0.78},
    {"customer_id": "C0007", "name": "Arjun Banerjee", "city": "Kolkata", "usual_payment_method": "NET_BANKING", "usual_device_id": "D0007", "average_amount": 4150, "daily_txns": 1, "device_stability": 0.95, "spending_regularity": 0.90, "velocity_signal": 0.15},
    {"customer_id": "C0008", "name": "Meera Shah", "city": "Ahmedabad", "usual_payment_method": "CREDIT_CARD", "usual_device_id": "D0008", "average_amount": 3670, "daily_txns": 3, "device_stability": 0.73, "spending_regularity": 0.68, "velocity_signal": 0.60},
    {"customer_id": "C0009", "name": "Kabir Joshi", "city": "Jaipur", "usual_payment_method": "UPI", "usual_device_id": "D0009", "average_amount": 1200, "daily_txns": 2, "device_stability": 0.88, "spending_regularity": 0.79, "velocity_signal": 0.40},
    {"customer_id": "C0010", "name": "Ishita Desai", "city": "Surat", "usual_payment_method": "UPI", "usual_device_id": "D0010", "average_amount": 2540, "daily_txns": 3, "device_stability": 0.80, "spending_regularity": 0.72, "velocity_signal": 0.55},
]


def get_customer(customer_id: Optional[str]) -> dict[str, Any]:
    return next(
        (c for c in CUSTOMERS if c["customer_id"] == customer_id),
        CUSTOMERS[0],
    )


# ---------------------------------------------------------------------------
# Attack families
# ---------------------------------------------------------------------------
#
# Each family describes how an attacker perturbs a payment sequence:
#
#   amount    (start, end) multipliers applied to the account's own baseline
#   velocity  (start, end) payments-per-hour across the sequence
#   payee     probability any given step uses a payee never paid before
#   intl      probability any given step is cross-border
#   device    probability any given step comes from an unrecognized device
#   hours     the window of day the attacker operates in
#   steps     how many payments the sequence contains
#
# The start->end interpolation is what gives each family its shape: a
# velocity burst front-loads risk, sleeper pacing back-loads it.

ATTACK_FAMILIES: list[dict[str, Any]] = [
    {
        "name": "velocity_anomaly",
        "modality": "txn",
        "description": "High-frequency micro-transactions in rapid succession escaping single-event checks.",
        "amount": (1.9, 0.4), "velocity": (5.0, 1.0), "payee": 0.75, "intl": 0.30,
        "device": 0.20, "hours": (13, 18), "steps": 14,
    },
    {
        "name": "behavioral_drift",
        "modality": "txn",
        "description": "Gradual shift in spending amounts and merchant category distributions over time.",
        "amount": (0.8, 2.4), "velocity": (1.0, 2.0), "payee": 0.45, "intl": 0.15,
        "device": 0.10, "hours": (10, 20), "steps": 12,
    },
    {
        "name": "device_switch",
        "modality": "dev",
        "description": "Transaction originating from uncharacteristic device and browser signatures.",
        "amount": (1.1, 1.7), "velocity": (1.0, 2.0), "payee": 0.50, "intl": 0.25,
        "device": 0.95, "hours": (2, 23), "steps": 10,
    },
    {
        "name": "phishing",
        "modality": "com",
        "description": "Targeted synthetic credential harvesting lure crafted from recipient profile metadata.",
        "amount": (1.4, 0.5), "velocity": (2.0, 1.0), "payee": 0.85, "intl": 0.20,
        "device": 0.35, "hours": (9, 17), "steps": 13,
    },
    {
        "name": "vishing",
        "modality": "voi",
        "description": "Deepfake voice-cloned social engineering call simulating trusted banking personnel.",
        "amount": (2.2, 0.9), "velocity": (1.0, 1.0), "payee": 0.90, "intl": 0.35,
        "device": 0.25, "hours": (10, 16), "steps": 9,
    },
    {
        "name": "video_deepfake",
        "modality": "vid",
        "description": "Synthetic video call biometric injection bypassing automated KYC face verification.",
        "amount": (2.6, 1.8), "velocity": (1.0, 2.0), "payee": 0.95, "intl": 0.55,
        "device": 0.80, "hours": (11, 15), "steps": 8,
    },
    {
        "name": "synthetic_identity",
        "modality": "idt",
        "description": "Fabricated customer profile combining real and synthesized KYC identity attributes.",
        "amount": (0.6, 2.8), "velocity": (1.0, 2.0), "payee": 0.70, "intl": 0.40,
        "device": 0.55, "hours": (9, 19), "steps": 11,
    },
    {
        "name": "account_takeover",
        "modality": "crd",
        "description": "Unauthorized account access combining credential breach and device manipulation.",
        "amount": (2.9, 1.5), "velocity": (3.0, 2.0), "payee": 0.90, "intl": 0.70,
        "device": 0.90, "hours": (1, 5), "steps": 9,
    },
    {
        "name": "sleeper_transaction_pacing",
        "modality": "lng",
        "description": "Slowly scaled low-value transactions acclimatizing baselines before cash-out.",
        "amount": (0.2, 2.6), "velocity": (1.0, 4.0), "payee": 0.30, "intl": 0.10,
        "device": 0.05, "hours": (10, 17), "steps": 16,
    },
    {
        "name": "adversarial_probing",
        "modality": "cls",
        "description": "Systematic perturbation of transaction features to discover boundary crossings.",
        "amount": (0.9, 1.6), "velocity": (2.0, 3.0), "payee": 0.50, "intl": 0.20,
        "device": 0.30, "hours": (12, 18), "steps": 15,
    },
]

ATTACK_BY_NAME = {family["name"]: family for family in ATTACK_FAMILIES}

# Which families each scenario type is allowed to select from.
SCENARIO_FAMILIES: dict[str, list[str]] = {
    "TRANSACTION_ANOMALY": ["velocity_anomaly", "behavioral_drift", "device_switch"],
    "COMMUNICATION_SCAM": ["phishing", "vishing", "video_deepfake"],
    "KYC_IDENTITY": ["synthetic_identity", "account_takeover", "video_deepfake"],
    "LONGITUDINAL_BEHAVIOR": ["sleeper_transaction_pacing", "behavioral_drift"],
    "CLASSIFIER_EVALUATION": ["adversarial_probing", "velocity_anomaly"],
}

# How hard the attacker is trying to stay under the threshold. Higher
# difficulty dampens the loud signals, which should push evasion up.
DIFFICULTY_STEALTH = {"easy": 0.0, "medium": 0.25, "hard": 0.5}


# ---------------------------------------------------------------------------
# Planning
# ---------------------------------------------------------------------------

def score_candidates(customer: dict[str, Any], allowed: Optional[list[str]] = None) -> dict[str, float]:
    """Rank attack families by how exposed this specific account is to each.

    The ranking reads the account's own weak spots: an account with low
    device stability is a better device-switch target, one with high
    velocity signal is a better burst target, and so on.
    """
    device_gap = 1.0 - customer["device_stability"]
    regularity_gap = 1.0 - customer["spending_regularity"]
    velocity = customer["velocity_signal"]
    # A predictable account is exactly what sleeper pacing exploits.
    predictability = customer["spending_regularity"]

    raw = {
        "velocity_anomaly": 0.20 + velocity * 0.75,
        "behavioral_drift": 0.25 + regularity_gap * 0.80,
        "device_switch": 0.22 + device_gap * 0.85,
        "account_takeover": 0.18 + device_gap * 0.55 + velocity * 0.25,
        "phishing": 0.30 + regularity_gap * 0.35 + device_gap * 0.20,
        "vishing": 0.26 + regularity_gap * 0.30,
        "video_deepfake": 0.20 + device_gap * 0.45,
        "synthetic_identity": 0.24 + device_gap * 0.35 + regularity_gap * 0.25,
        "sleeper_transaction_pacing": 0.20 + predictability * 0.65,
        "adversarial_probing": 0.35 + velocity * 0.25,
    }
    if allowed is not None:
        raw = {name: value for name, value in raw.items() if name in allowed}
    return {name: round(min(0.99, value), 3) for name, value in raw.items()}


def plan_attack(
    customer: dict[str, Any],
    scenario_type: Optional[str] = None,
    attack_type: Optional[str] = None,
) -> dict[str, Any]:
    allowed = SCENARIO_FAMILIES.get(scenario_type or "") if scenario_type else None
    candidates = score_candidates(customer, allowed)
    if not candidates:
        candidates = score_candidates(customer)

    if attack_type and attack_type in ATTACK_BY_NAME:
        selected = attack_type
    else:
        selected = max(candidates, key=candidates.get)

    family = ATTACK_BY_NAME[selected]
    return {
        "attack_type": selected,
        "modality": family["modality"],
        "candidates": candidates,
        "primary_weakness": _weakness_for(selected),
        "description": family["description"],
    }


def _weakness_for(attack_type: str) -> str:
    return {
        "velocity_anomaly": "velocity_threshold_blindspot",
        "behavioral_drift": "amount_baseline_drift",
        "device_switch": "device_binding_gap",
        "account_takeover": "credential_and_session_trust",
        "phishing": "payee_trust_gap",
        "vishing": "human_verification_gap",
        "video_deepfake": "biometric_liveness_gap",
        "synthetic_identity": "kyc_attribute_correlation",
        "sleeper_transaction_pacing": "baseline_acclimatization",
        "adversarial_probing": "decision_boundary_sensitivity",
    }.get(attack_type, "unclassified")


# ---------------------------------------------------------------------------
# Generation + scoring
# ---------------------------------------------------------------------------

def _lerp(start: float, end: float, t: float) -> float:
    return start + (end - start) * t


def generate_and_score(
    customer: dict[str, Any],
    attack_type: str,
    rng: random.Random,
    difficulty: str = "medium",
    intensity: float = 0.6,
) -> list[dict[str, Any]]:
    """Synthesize an attack sequence and score every step through risk.py."""
    family = ATTACK_BY_NAME[attack_type]
    steps = family["steps"]
    baseline = float(customer["average_amount"])
    daily = float(customer["daily_txns"])
    stealth = DIFFICULTY_STEALTH.get(difficulty, 0.25)

    # Intensity scales how far the attacker pushes; stealth pulls it back.
    push = _lerp(0.55, 1.30, intensity) * (1.0 - stealth * 0.6)

    hour_lo, hour_hi = family["hours"]
    records: list[dict[str, Any]] = []

    for index in range(steps):
        t = index / max(1, steps - 1)

        amount_mult = _lerp(family["amount"][0], family["amount"][1], t)
        # Deviation from 1.0 (the account's normal) is what gets amplified.
        amount_mult = 1.0 + (amount_mult - 1.0) * push
        amount_mult *= rng.uniform(0.88, 1.12)
        amount = max(25.0, round(baseline * amount_mult, 2))

        velocity = _lerp(family["velocity"][0], family["velocity"][1], t)
        velocity = 1.0 + (velocity - 1.0) * push
        velocity = max(1, int(round(velocity + rng.uniform(-0.4, 0.4))))

        # Stealthy runs suppress the loud categorical flags too.
        flag_damping = 1.0 - stealth * 0.5
        is_new_payee = int(rng.random() < family["payee"] * flag_damping)
        is_international = int(rng.random() < family["intl"] * flag_damping)
        is_new_device = int(rng.random() < family["device"] * flag_damping)

        hour = int(round(_lerp(hour_lo, hour_hi, t))) % 24

        features = {
            "amount": amount,
            "amount_baseline": baseline,
            "txn_velocity_1h": velocity,
            "daily_txn_baseline": daily,
            "is_new_payee": is_new_payee,
            "is_international": is_international,
            "is_new_device": is_new_device,
            "hour": hour,
        }

        decision = score_transaction(features)

        records.append({
            "id": f"TXN-{customer['customer_id']}-{index + 1:02d}",
            "attack_id": f"ATK-{attack_type[:3].upper()}-{index + 1:02d}",
            "attack_type": attack_type,
            "modality": family["modality"],
            "amount": amount,
            "hour": hour,
            "signal": _signal_label(attack_type, velocity, amount, baseline),
            "risk_score": decision.score,
            "recommended_action": _action_label(decision.action),
            "status": "flagged" if decision.flagged else "allowed",
            "is_fraud": True,
            "features": features,
            "risk_reasons": decision.reasons,
            "contributions": decision.contributions,
            "confidence": decision.confidence,
            "confidence_level": decision.confidence_level,
            "explanation": _explain(decision, attack_type),
        })

    return records


def _signal_label(attack_type: str, velocity: int, amount: float, baseline: float) -> str:
    if attack_type in ("velocity_anomaly", "adversarial_probing"):
        return f"{velocity} txn/hr"
    if attack_type == "sleeper_transaction_pacing":
        return f"{amount / baseline:.2f}x baseline (pacing)"
    if attack_type == "device_switch":
        return "unrecognized device"
    if attack_type == "account_takeover":
        return "session + device shift"
    if attack_type in ("phishing", "vishing", "video_deepfake"):
        return "social-engineered payee"
    return f"{amount / baseline:.2f}x baseline"


def _action_label(action: str) -> str:
    return {
        "block": "BLOCK",
        "review": "STEP_UP_AUTH",
        "allow": "ALLOW",
    }[action]


def _explain(decision, attack_type: str) -> str:
    reasons = ", ".join(decision.reasons)
    if decision.action == "block":
        return f"Blocked by shadow scorer at {decision.score:.2f} — {reasons}."
    if decision.action == "review":
        return f"Step-up authentication required at {decision.score:.2f} — {reasons}."
    return (
        f"Missed by the scorer (false negative) at {decision.score:.2f}, below the "
        f"{REVIEW_THRESHOLD:.2f} review threshold — {reasons}. "
        f"Extracted as a {attack_type.replace('_', ' ')} evasion sample for retraining."
    )


def summarize(records: list[dict[str, Any]]) -> dict[str, Any]:
    """Derive defense metrics from the scored records."""
    total = len(records)
    if total == 0:
        return {
            "flagged": 0, "total": 0, "blocked": 0, "stepped_up": 0,
            "false_negatives": 0, "detection_rate": 0.0, "evasion_rate": 0.0,
            "mean_risk_score": 0.0,
            "review_threshold": REVIEW_THRESHOLD,
            "block_threshold": BLOCK_THRESHOLD,
        }

    blocked = sum(1 for r in records if r["recommended_action"] == "BLOCK")
    stepped_up = sum(1 for r in records if r["recommended_action"] == "STEP_UP_AUTH")
    flagged = blocked + stepped_up
    missed = total - flagged

    return {
        "flagged": flagged,
        "total": total,
        "blocked": blocked,
        "stepped_up": stepped_up,
        "false_negatives": missed,
        "detection_rate": round(flagged / total, 4),
        "evasion_rate": round(missed / total, 4),
        "mean_risk_score": round(sum(r["risk_score"] for r in records) / total, 4),
        "review_threshold": REVIEW_THRESHOLD,
        "block_threshold": BLOCK_THRESHOLD,
    }


# ---------------------------------------------------------------------------
# Run orchestration
# ---------------------------------------------------------------------------

# Bounded so a long-lived local server cannot grow without limit.
_RUN_STORE: "OrderedDict[str, dict[str, Any]]" = OrderedDict()
_RUN_STORE_LIMIT = 200


def _store_run(run: dict[str, Any]) -> None:
    _RUN_STORE[run["run_id"]] = run
    while len(_RUN_STORE) > _RUN_STORE_LIMIT:
        _RUN_STORE.popitem(last=False)


def get_run(run_id: str) -> Optional[dict[str, Any]]:
    return _RUN_STORE.get(run_id)


def run_attack(
    target_id: str = "C0001",
    attack_type: Optional[str] = None,
    scenario_type: Optional[str] = None,
    difficulty: str = "medium",
    intensity: float = 0.6,
    seed: Optional[int] = None,
) -> dict[str, Any]:
    """Plan, generate, and score one adversarial run end to end."""
    started = time.perf_counter()
    customer = get_customer(target_id)

    # A caller-supplied seed makes a run reproducible; without one each run
    # explores a different draw, which is the point of the lab.
    effective_seed = seed if seed is not None else random.SystemRandom().randrange(2**31)
    rng = random.Random(f"{customer['customer_id']}:{attack_type}:{effective_seed}")

    plan = plan_attack(customer, scenario_type=scenario_type, attack_type=attack_type)
    records = generate_and_score(
        customer, plan["attack_type"], rng,
        difficulty=difficulty, intensity=intensity,
    )
    defense = summarize(records)

    digest = hashlib.sha256(
        f"{customer['customer_id']}:{plan['attack_type']}:{effective_seed}".encode()
    ).hexdigest()[:10].upper()
    run_id = f"RUN-{digest}"

    resolved_scenario = scenario_type or _scenario_for(plan["attack_type"])

    run = {
        "run_id": run_id,
        "seed": effective_seed,
        "elapsed_ms": round((time.perf_counter() - started) * 1000, 2),
        "planner_mode": "AUTONOMOUS ADVERSARIAL" if not attack_type else "DIRECTED",
        "target": customer,
        "scenario": {
            "scenario_id": f"SCN-{customer['customer_id']}-{plan['attack_type'][:4].upper()}",
            "scenario_type": resolved_scenario,
            "target_id": customer["customer_id"],
            "transaction_context": {
                "amount": customer["average_amount"],
                "city": customer["city"],
                "channel": customer["usual_payment_method"],
            },
        },
        "plan": {
            "target_id": customer["customer_id"],
            "attack_type": plan["attack_type"],
            "modality": plan["modality"],
            "difficulty": difficulty,
            "intensity": intensity,
            "primary_weakness": plan["primary_weakness"],
            "rationale": _rationale(customer, plan, defense),
            "parameters": {
                "signals": {
                    "velocity_signal": customer["velocity_signal"],
                    "device_stability": customer["device_stability"],
                    "spending_regularity": customer["spending_regularity"],
                    "amount_baseline": customer["average_amount"],
                    "daily_txn_baseline": customer["daily_txns"],
                },
                "candidate_scores": plan["candidates"],
                "applicable_attacks": list(plan["candidates"].keys()),
            },
        },
        "generator_output": {
            "status": "success",
            "modality": plan["modality"],
            "records": records,
        },
        "records": records,
        "defense_output": defense,
        "events": _events(customer, plan, defense),
        "provenance": {
            "source": "FraudForge lab_engine",
            "scorer": "risk.score_transaction (rule-based, explainable)",
            "syntheticOnly": True,
            "seed": effective_seed,
        },
    }

    _store_run(run)
    return run


def _scenario_for(attack_type: str) -> str:
    for scenario, families in SCENARIO_FAMILIES.items():
        if attack_type in families:
            return scenario
    return "TRANSACTION_ANOMALY"


def _rationale(customer: dict[str, Any], plan: dict[str, Any], defense: dict[str, Any]) -> str:
    top = plan["candidates"].get(plan["attack_type"], 0)
    return (
        f"Target {customer['customer_id']} in {customer['city']} averages "
        f"₹{customer['average_amount']:,} across ~{customer['daily_txns']} payments/day "
        f"(device stability {customer['device_stability']}, spending regularity "
        f"{customer['spending_regularity']}). The planner scored "
        f"{plan['attack_type'].replace('_', ' ')} highest at {top} because the account's "
        f"weakest surface is {plan['primary_weakness'].replace('_', ' ')}. "
        f"The generated sequence cleared {defense['false_negatives']} of "
        f"{defense['total']} payments past the {defense['review_threshold']:.2f} "
        f"review threshold."
    )


def _events(customer: dict[str, Any], plan: dict[str, Any], defense: dict[str, Any]) -> list[dict[str, str]]:
    return [
        {"stage": "target", "status": "complete", "description": f"Target {customer['customer_id']} acquired ({customer['city']})"},
        {"stage": "observe", "status": "complete", "description": f"Baseline loaded: ₹{customer['average_amount']:,} avg, {customer['daily_txns']} txn/day"},
        {"stage": "plan", "status": "complete", "description": f"Planner selected {plan['attack_type']} (weakness: {plan['primary_weakness']})"},
        {"stage": "generate", "status": "complete", "description": f"Synthesized {defense['total']} payment steps in {plan['modality']} modality"},
        {"stage": "execute", "status": "complete", "description": "Sequence scored in shadow mode; no payment was affected"},
        {"stage": "record", "status": "complete", "description": f"{defense['flagged']} flagged, {defense['false_negatives']} evaded — misses extracted for retraining"},
    ]


def run_all_attacks(target_id: str = "C0001", seed: Optional[int] = None) -> dict[str, Any]:
    """Run every attack family against one target and score each."""
    customer = get_customer(target_id)
    results = []
    for offset, family in enumerate(ATTACK_FAMILIES):
        family_seed = None if seed is None else seed + offset
        run = run_attack(
            target_id=customer["customer_id"],
            attack_type=family["name"],
            seed=family_seed,
        )
        defense = run["defense_output"]
        results.append({
            "attack_type": family["name"],
            "modality": family["modality"],
            "status": "complete",
            "run_id": run["run_id"],
            "records_generated": defense["total"],
            "detection_rate": defense["detection_rate"],
            "evasion_rate": defense["evasion_rate"],
            "false_negatives": defense["false_negatives"],
            "mean_risk_score": defense["mean_risk_score"],
        })

    total_records = sum(r["records_generated"] for r in results)
    total_missed = sum(r["false_negatives"] for r in results)

    return {
        "target_id": customer["customer_id"],
        "total_attacks": len(results),
        "successful": len(results),
        "results": results,
        "aggregate": {
            "records_generated": total_records,
            "false_negatives": total_missed,
            "detection_rate": round((total_records - total_missed) / total_records, 4) if total_records else 0.0,
            "evasion_rate": round(total_missed / total_records, 4) if total_records else 0.0,
        },
    }
