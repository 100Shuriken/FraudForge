"""End-to-end incident report: one attack, start to finish.

The rest of the app shows the loop in pieces — the Lab plans and scores, the
cockpit compares detectors, Defend retrains. This composes all of it into a
single document about a single incident, so the whole causal chain is
readable in one place:

    who was targeted  ->  why this attack  ->  what was sent
                      ->  what each detector said
                      ->  what got through and why
                      ->  what the model learned from the misses

Every phase is computed in the same call against the same run, so the
narrative cannot drift out of sync with the numbers the way three separate
pages can.

Pure stdlib — the serverless bundle ships only fastapi+pydantic.
"""

from __future__ import annotations

import random
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

import cockpit_engine
import defender_engine
import lab_engine
from risk import BLOCK_THRESHOLD, REVIEW_THRESHOLD


def _phase(id_, title, headline, detail, facts=None):
    return {
        "id": id_,
        "title": title,
        "headline": headline,
        "detail": detail,
        "facts": facts or [],
    }


def build_report(
    target_id: str = "C0001",
    vector: Optional[str] = None,
    attack_type: Optional[str] = None,
    seed: Optional[int] = None,
    include_retraining: bool = True,
) -> dict[str, Any]:
    effective_seed = seed if seed is not None else random.SystemRandom().randrange(2**31)
    rng = random.Random(f"incident:{target_id}:{effective_seed}")

    customer = lab_engine.get_customer(target_id)
    family = attack_type or cockpit_engine.VECTOR_FAMILIES.get(vector or "", None)

    # ---- Phase 1-2: profile and plan ------------------------------------
    plan = lab_engine.plan_attack(customer, attack_type=family)
    family = plan["attack_type"]
    ranked = sorted(plan["candidates"].items(), key=lambda kv: -kv[1])

    # ---- Phase 3: synthesis ---------------------------------------------
    records = lab_engine.generate_and_score(
        customer, family, rng, difficulty="medium", intensity=0.7,
    )

    # ---- Phase 4: scoring, both detectors -------------------------------
    started = datetime.now(timezone.utc)
    payments = []
    for index, record in enumerate(records):
        features = record["features"]
        legacy = cockpit_engine.legacy_score(features)
        payments.append({
            "step": index + 1,
            "id": record["id"],
            "at": (started + timedelta(minutes=7 * index)).isoformat(timespec="seconds"),
            "amount": record["amount"],
            "amountRatio": round(record["amount"] / features["amount_baseline"], 2),
            "hour": record["hour"],
            "velocity": features["txn_velocity_1h"],
            "isNewPayee": features["is_new_payee"],
            "isInternational": features["is_international"],
            "isNewDevice": features["is_new_device"],
            "signal": record["signal"],
            "riskScore": record["risk_score"],
            "action": record["recommended_action"],
            "flagged": record["status"] == "flagged",
            "reasons": record["risk_reasons"],
            "contributions": record["contributions"],
            "explanation": record["explanation"],
            "legacyFlagged": legacy["flagged"],
            "legacyReasons": legacy["reasons"],
        })

    total = len(payments)
    hardened_caught = sum(1 for p in payments if p["flagged"])
    legacy_caught = sum(1 for p in payments if p["legacyFlagged"])
    evaded = [p for p in payments if not p["flagged"]]
    blocked = sum(1 for p in payments if p["action"] == "BLOCK")
    stepped_up = sum(1 for p in payments if p["action"] == "STEP_UP_AUTH")

    value_total = round(sum(p["amount"] for p in payments), 2)
    value_stopped = round(sum(p["amount"] for p in payments if p["flagged"]), 2)
    value_through = round(sum(p["amount"] for p in evaded), 2)
    value_legacy_through = round(sum(p["amount"] for p in payments if not p["legacyFlagged"]), 2)

    # ---- Phase 5: why the misses got through ----------------------------
    if evaded:
        avg_ratio = sum(p["amountRatio"] for p in evaded) / len(evaded)
        avg_velocity = sum(p["velocity"] for p in evaded) / len(evaded)
        with_payee = sum(1 for p in evaded if p["isNewPayee"])
        evasion_detail = (
            f"The {len(evaded)} payments that got through averaged {avg_ratio:.2f}x this "
            f"account's baseline at {avg_velocity:.1f} payments/hour, and {with_payee} of "
            f"{len(evaded)} went to a new payee. None accumulated enough signal to reach the "
            f"{REVIEW_THRESHOLD:.2f} review line — each one is individually unremarkable, "
            f"which is the point of the technique."
        )
    else:
        evasion_detail = (
            "Every payment in this sequence crossed the review threshold. Raise the "
            "difficulty to force the attacker into stealthier pacing."
        )

    # ---- Phase 6: what the defender learned -----------------------------
    retraining = defender_engine.train(seed=effective_seed) if include_retraining else None

    phases = [
        _phase(
            "profile", "01 · Target profiled",
            f"{customer.get('name', customer['customer_id'])} in {customer['city']}",
            f"The attacker starts from observable behaviour, not guesswork. This account "
            f"averages ${customer['average_amount']:,} across about {customer['daily_txns']} "
            f"payment(s) a day, on a device it uses {customer['device_stability']:.0%} of the "
            f"time, with spending regularity {customer['spending_regularity']}. Those three "
            f"numbers decide which attack works.",
            [
                {"label": "Account", "value": f"{customer['customer_id']} · {customer['city']}"},
                {"label": "Baseline payment", "value": f"${customer['average_amount']:,}"},
                {"label": "Usual cadence", "value": f"{customer['daily_txns']}/day"},
                {"label": "Device stability", "value": f"{customer['device_stability']}"},
                {"label": "Spending regularity", "value": f"{customer['spending_regularity']}"},
            ],
        ),
        _phase(
            "plan", "02 · Attack selected",
            f"{family.replace('_', ' ').title()} scored highest",
            f"Each attack family is ranked against this specific account's weak points. "
            f"{family.replace('_', ' ').title()} won at {plan['candidates'].get(family, 0)} "
            f"because the account's softest surface is "
            f"{plan['primary_weakness'].replace('_', ' ')}. "
            f"A different account would get a different plan.",
            [{"label": name.replace("_", " ").title(), "value": f"{score}"} for name, score in ranked[:5]],
        ),
        _phase(
            "synthesis", "03 · Payload synthesized",
            f"{total} payments over {total * 7} minutes",
            f"The generator shapes a sequence rather than a single payment: amounts ramp "
            f"between {min(p['amountRatio'] for p in payments)}x and "
            f"{max(p['amountRatio'] for p in payments)}x the account baseline, velocity moves "
            f"between {min(p['velocity'] for p in payments)} and "
            f"{max(p['velocity'] for p in payments)} per hour, worth ${value_total:,.2f} in total.",
            [
                {"label": "Payments", "value": str(total)},
                {"label": "Total value", "value": f"${value_total:,.2f}"},
                {"label": "Amount range", "value": f"{min(p['amountRatio'] for p in payments)}x – {max(p['amountRatio'] for p in payments)}x"},
                {"label": "Modality", "value": plan["modality"]},
            ],
        ),
        _phase(
            "scoring", "04 · Both detectors scored it",
            f"Legacy caught {legacy_caught}, hardened caught {hardened_caught}, of {total}",
            f"Every payment was scored twice: once by flat rules that know nothing about this "
            f"account, and once by the hardened scorer that grades each signal against the "
            f"account's own baseline. Of {total} payments the hardened scorer blocked "
            f"{blocked} outright and sent {stepped_up} to step-up authentication.",
            [
                {"label": "Legacy caught", "value": f"{legacy_caught}/{total}"},
                {"label": "Hardened caught", "value": f"{hardened_caught}/{total}"},
                {"label": "Blocked", "value": str(blocked)},
                {"label": "Step-up", "value": str(stepped_up)},
                {"label": "Value stopped", "value": f"${value_stopped:,.2f}"},
                {"label": "Value through", "value": f"${value_through:,.2f}"},
            ],
        ),
        _phase(
            "evasion", "05 · What got through",
            f"{len(evaded)} of {total} payments evaded detection",
            evasion_detail,
            [
                {"label": "Evaded", "value": f"{len(evaded)}/{total}"},
                {"label": "Value through (hardened)", "value": f"${value_through:,.2f}"},
                {"label": "Value through (legacy)", "value": f"${value_legacy_through:,.2f}"},
            ],
        ),
    ]

    if retraining:
        rounds = retraining["rounds"]
        phases.append(_phase(
            "hardening", "06 · Defender retrained on the misses",
            f"Recall {rounds[0]['recall']:.0%} → {rounds[-1]['recall']:.0%} over "
            f"{len(rounds)} rounds",
            f"The evaded payments become training data. Each round mines what the previous "
            f"model missed and retrains on it, which is why recall climbs while the test "
            f"split stays fixed. Precision moves from {rounds[0]['precision']:.0%} to "
            f"{rounds[-1]['precision']:.0%} — catching stealthier fraud costs some precision, "
            f"and that trade is visible rather than hidden.",
            [
                {"label": f"Round {r['round']} recall", "value": f"{r['recall']:.1%}"}
                for r in rounds
            ] + [
                {"label": "AUC", "value": f"{rounds[0]['auc']:.3f} → {rounds[-1]['auc']:.3f}"},
            ],
        ))

    return {
        "incidentId": f"INC-{customer['customer_id']}-{effective_seed % 100000:05d}",
        "generatedAt": started.isoformat(timespec="seconds"),
        "seed": effective_seed,
        "target": customer,
        "vector": vector,
        "attack": {
            "family": family,
            "modality": plan["modality"],
            "primaryWeakness": plan["primary_weakness"],
            "description": plan["description"],
            "candidates": plan["candidates"],
            "lure": cockpit_engine.VECTOR_LURES.get(
                vector or "", cockpit_engine.VECTOR_LURES["bec-email"]
            ).format(
                name=customer.get("name") or customer["customer_id"],
                amount=max(p["amount"] for p in payments),
            ),
        },
        "phases": phases,
        "payments": payments,
        "summary": {
            "total": total,
            "hardenedCaught": hardened_caught,
            "legacyCaught": legacy_caught,
            "evaded": len(evaded),
            "blocked": blocked,
            "steppedUp": stepped_up,
            "detectionRate": round(hardened_caught / total, 4) if total else 0.0,
            "legacyDetectionRate": round(legacy_caught / total, 4) if total else 0.0,
            "evasionRate": round(len(evaded) / total, 4) if total else 0.0,
            "valueTotal": value_total,
            "valueStopped": value_stopped,
            "valueThrough": value_through,
            "valueThroughLegacy": value_legacy_through,
        },
        "retraining": retraining,
        "thresholds": {"review": REVIEW_THRESHOLD, "block": BLOCK_THRESHOLD},
        "provenance": {
            "generator": "lab_engine attack families",
            "scorers": "legacy static rules vs risk.score_transaction",
            "retraining": "defender_engine, 3-round adversarial loop" if retraining else None,
            "syntheticOnly": True,
        },
    }
