"""Adversarial retraining loop for the defender models.

The original `/api/train` needed XGBoost and a 785k-row parquet file. Neither
survives a serverless deploy, so the endpoint returned 500 and the UI quietly
swapped in fixed demo constants — which is why the Defend page showed the
same numbers forever.

This module implements the same idea with no dependencies: logistic
regression trained by gradient descent, run through three rounds of the
red-team / blue-team loop.

    round 1   train on ordinary traffic and easy fraud only
              -> evaluate against the full adversarial set, recall is poor
    round 2   mine round 1's false negatives, add them, retrain
    round 3   mine again against harder evasions, retrain

Recall climbing across rounds is the product claim, and here it is measured
rather than asserted. Every metric below comes out of a confusion matrix on
a held-out split.

Pure stdlib — the serverless bundle ships only fastapi+pydantic.
"""

from __future__ import annotations

import math
import random
from typing import Any, Optional

import lab_engine
from cockpit_engine import _legitimate_payments

# Feature order is fixed: weights are reported against these names.
FEATURES = [
    "amount_ratio",
    "velocity_excess",
    "is_new_payee",
    "is_international",
    "is_new_device",
    "hour_oddness",
]

FEATURE_LABELS = {
    "amount_ratio": "Amount vs account baseline",
    "velocity_excess": "Velocity above normal cadence",
    "is_new_payee": "First payment to payee",
    "is_international": "Cross-border routing",
    "is_new_device": "Unrecognized device",
    "hour_oddness": "Unusual hour",
}

DECISION_THRESHOLD = 0.50


# ---------------------------------------------------------------------------
# Feature extraction
# ---------------------------------------------------------------------------

def to_vector(payment: dict) -> list[float]:
    """Turn a raw payment into the model's feature vector.

    Everything is expressed relative to the account's own behaviour, so the
    model learns "unusual for this customer" rather than "large in absolute
    terms" — the distinction the flat-threshold legacy rules cannot make.
    """
    baseline = float(payment.get("amount_baseline") or 1000.0) or 1000.0
    amount = float(payment.get("amount", 0) or 0)
    daily = float(payment.get("daily_txn_baseline") or 1.0)
    velocity = float(payment.get("txn_velocity_1h", 0) or 0)
    hour = int(payment.get("hour", 12) or 12)

    hourly_baseline = max(0.5, daily / 8.0)
    distance = min(abs(hour - 13), 24 - abs(hour - 13))

    return [
        min(4.0, amount / baseline),
        min(5.0, max(0.0, velocity - hourly_baseline)),
        float(bool(payment.get("is_new_payee"))),
        float(bool(payment.get("is_international"))),
        float(bool(payment.get("is_new_device"))),
        min(1.0, max(0.0, (distance - 5) / 6.0)),
    ]


# ---------------------------------------------------------------------------
# Logistic regression
# ---------------------------------------------------------------------------

def _sigmoid(z: float) -> float:
    if z >= 0:
        return 1.0 / (1.0 + math.exp(-z))
    e = math.exp(z)
    return e / (1.0 + e)


class LogisticModel:
    """Binary logistic regression with class weighting and L2 regularisation."""

    def __init__(self, dim: int):
        self.w = [0.0] * dim
        self.b = 0.0
        self.mean = [0.0] * dim
        self.std = [1.0] * dim

    def _standardize(self, x: list[float]) -> list[float]:
        return [(xi - m) / s for xi, m, s in zip(x, self.mean, self.std)]

    def fit(self, X: list[list[float]], y: list[int], epochs: int = 220,
            lr: float = 0.35, l2: float = 1e-4) -> "LogisticModel":
        n, dim = len(X), len(X[0])
        if n == 0:
            return self

        # Standardize so no single feature's scale dominates the gradient.
        for j in range(dim):
            column = [row[j] for row in X]
            m = sum(column) / n
            var = sum((v - m) ** 2 for v in column) / n
            self.mean[j] = m
            self.std[j] = math.sqrt(var) or 1.0

        Z = [self._standardize(row) for row in X]

        # Fraud is the minority class; without this the model can score well
        # by calling everything legitimate.
        positives = sum(y) or 1
        negatives = (n - sum(y)) or 1
        w_pos = n / (2.0 * positives)
        w_neg = n / (2.0 * negatives)

        for _ in range(epochs):
            grad_w = [0.0] * dim
            grad_b = 0.0
            for xi, yi in zip(Z, y):
                p = _sigmoid(sum(w * v for w, v in zip(self.w, xi)) + self.b)
                weight = w_pos if yi == 1 else w_neg
                err = (p - yi) * weight
                for j in range(dim):
                    grad_w[j] += err * xi[j]
                grad_b += err
            for j in range(dim):
                self.w[j] -= lr * (grad_w[j] / n + l2 * self.w[j])
            self.b -= lr * (grad_b / n)

        return self

    def predict_proba(self, x: list[float]) -> float:
        z = self._standardize(x)
        return _sigmoid(sum(w * v for w, v in zip(self.w, z)) + self.b)


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

def _auc(probabilities: list[float], labels: list[int]) -> float:
    """Rank-based AUC (equivalent to the Mann-Whitney U statistic)."""
    pairs = sorted(zip(probabilities, labels))
    positives = sum(labels)
    negatives = len(labels) - positives
    if positives == 0 or negatives == 0:
        return 0.0

    # Average ranks so ties do not bias the statistic.
    ranks = [0.0] * len(pairs)
    i = 0
    while i < len(pairs):
        j = i
        while j + 1 < len(pairs) and pairs[j + 1][0] == pairs[i][0]:
            j += 1
        average = (i + j) / 2.0 + 1.0
        for k in range(i, j + 1):
            ranks[k] = average
        i = j + 1

    rank_sum = sum(r for r, (_, label) in zip(ranks, pairs) if label == 1)
    return (rank_sum - positives * (positives + 1) / 2.0) / (positives * negatives)


def evaluate(model: LogisticModel, X: list[list[float]], y: list[int],
             threshold: float = DECISION_THRESHOLD) -> dict[str, Any]:
    probabilities = [model.predict_proba(x) for x in X]
    tp = fp = tn = fn = 0
    for p, label in zip(probabilities, y):
        flagged = p >= threshold
        if label and flagged:
            tp += 1
        elif label and not flagged:
            fn += 1
        elif not label and flagged:
            fp += 1
        else:
            tn += 1

    precision = tp / (tp + fp) if (tp + fp) else 0.0
    recall = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0.0

    return {
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1": round(f1, 4),
        "auc": round(_auc(probabilities, y), 4),
        "truePositives": tp,
        "falsePositives": fp,
        "trueNegatives": tn,
        "falseNegatives": fn,
        "testSamples": len(y),
    }


def importance(model: LogisticModel) -> dict[str, float]:
    """Normalised |weight| per feature — what the model leans on."""
    magnitudes = [abs(w) for w in model.w]
    total = sum(magnitudes) or 1.0
    return {name: round(m / total, 4) for name, m in zip(FEATURES, magnitudes)}


# ---------------------------------------------------------------------------
# Corpus
# ---------------------------------------------------------------------------

# Families an ordinary detector already handles vs. the evasive ones the
# adversarial rounds are supposed to teach it.
EASY_FAMILIES = ["account_takeover", "video_deepfake", "device_switch"]
EVASIVE_FAMILIES = [
    "sleeper_transaction_pacing", "behavioral_drift", "adversarial_probing",
    "phishing", "vishing", "velocity_anomaly", "synthetic_identity",
]


def _fraud_from(families: list[str], rng: random.Random, per_family: int,
                difficulty: str) -> list[dict]:
    out = []
    for name in families:
        for _ in range(per_family):
            customer = rng.choice(lab_engine.CUSTOMERS)
            records = lab_engine.generate_and_score(
                customer, name, rng, difficulty=difficulty,
                intensity=rng.uniform(0.4, 0.9),
            )
            out.extend(r["features"] for r in records)
    return out


def build_corpus(rng: random.Random) -> dict[str, list[dict]]:
    legitimate = []
    for customer in lab_engine.CUSTOMERS:
        legitimate.extend(_legitimate_payments(customer, rng, 26))

    return {
        "legitimate": legitimate,
        "easy_fraud": _fraud_from(EASY_FAMILIES, rng, 3, "easy"),
        "evasive_fraud": _fraud_from(EVASIVE_FAMILIES, rng, 2, "medium"),
        "hard_fraud": _fraud_from(EVASIVE_FAMILIES, rng, 2, "hard"),
    }


def _split(items: list, rng: random.Random, train_fraction: float = 0.7):
    shuffled = items[:]
    rng.shuffle(shuffled)
    cut = int(len(shuffled) * train_fraction)
    return shuffled[:cut], shuffled[cut:]


# ---------------------------------------------------------------------------
# The loop
# ---------------------------------------------------------------------------

def train(seed: int = 2026) -> dict[str, Any]:
    """Run the three-round adversarial retraining loop and report every metric."""
    rng = random.Random(seed)
    corpus = build_corpus(rng)

    legit_train, legit_test = _split(corpus["legitimate"], rng)
    easy_train, easy_test = _split(corpus["easy_fraud"], rng)
    evasive_train, evasive_test = _split(corpus["evasive_fraud"], rng)
    hard_train, hard_test = _split(corpus["hard_fraud"], rng)

    # One fixed test set for every round, so the rounds are comparable.
    test_payments = legit_test + easy_test + evasive_test + hard_test
    test_labels = (
        [0] * len(legit_test)
        + [1] * (len(easy_test) + len(evasive_test) + len(hard_test))
    )
    X_test = [to_vector(p) for p in test_payments]

    def fit(fraud_train: list[dict]) -> LogisticModel:
        payments = legit_train + fraud_train
        labels = [0] * len(legit_train) + [1] * len(fraud_train)
        return LogisticModel(len(FEATURES)).fit([to_vector(p) for p in payments], labels)

    def false_negatives(model: LogisticModel, pool: list[dict]) -> list[dict]:
        return [p for p in pool if model.predict_proba(to_vector(p)) < DECISION_THRESHOLD]

    rounds = []

    # Round 1 — ordinary traffic and easy fraud only.
    model = fit(easy_train)
    metrics = evaluate(model, X_test, test_labels)
    rounds.append({
        "round": 1,
        "description": "Baseline: trained on ordinary traffic and non-evasive fraud only",
        "trainingSamples": len(legit_train) + len(easy_train),
        "adversarialSamplesAdded": 0,
        **metrics,
        "featureImportance": importance(model),
    })
    baseline_model = model
    baseline_metrics = metrics

    # Rounds 2 and 3 — mine what the previous round missed, add it, retrain.
    fraud_train = easy_train[:]
    for round_number, pool in ((2, evasive_train), (3, hard_train)):
        missed = false_negatives(model, pool)
        # Nothing missed means nothing to learn from; fall back to the pool so
        # the round still exercises the harder distribution.
        mined = missed or pool
        fraud_train = fraud_train + mined
        model = fit(fraud_train)
        metrics = evaluate(model, X_test, test_labels)
        rounds.append({
            "round": round_number,
            "description": (
                f"Round {round_number}: mined {len(mined)} evaded payments from the "
                f"previous model and retrained on them"
            ),
            "trainingSamples": len(legit_train) + len(fraud_train),
            "adversarialSamplesAdded": len(mined),
            **metrics,
            "featureImportance": importance(model),
        })

    augmented_model = model
    augmented_metrics = rounds[-1]

    # The missed set that survives the final model — what the red team would
    # attack next.
    still_missed = [
        p for p, label in zip(test_payments, test_labels)
        if label == 1 and augmented_model.predict_proba(to_vector(p)) < DECISION_THRESHOLD
    ]

    def average(key, items, default=0.0):
        values = [float(p.get(key, 0) or 0) for p in items]
        return round(sum(values) / len(values), 2) if values else default

    flagged = []
    for payment, label in zip(test_payments, test_labels):
        probability = augmented_model.predict_proba(to_vector(payment))
        if probability >= DECISION_THRESHOLD:
            flagged.append({
                "amount": payment["amount"],
                "hour": payment["hour"],
                "txn_velocity_1h": payment["txn_velocity_1h"],
                "is_new_payee": payment.get("is_new_payee", 0),
                "is_international": payment.get("is_international", 0),
                "actual_fraud": label,
                "predicted_fraud_prob": round(probability, 4),
                "confidence": round(abs(probability - DECISION_THRESHOLD) * 2, 4),
                "confidence_level": (
                    "High" if abs(probability - DECISION_THRESHOLD) * 2 >= 0.6
                    else "Medium" if abs(probability - DECISION_THRESHOLD) * 2 >= 0.3
                    else "Low"
                ),
            })
    flagged.sort(key=lambda r: -r["predicted_fraud_prob"])

    return {
        "seed": seed,
        "corpus": {
            "legitimate": len(corpus["legitimate"]),
            "easyFraud": len(corpus["easy_fraud"]),
            "evasiveFraud": len(corpus["evasive_fraud"]),
            "hardFraud": len(corpus["hard_fraud"]),
            "trainSamples": len(legit_train) + len(fraud_train),
            "testSamples": len(test_payments),
        },
        "baseline": {
            "name": "Round 1 baseline (ordinary fraud only)",
            **baseline_metrics,
            "featureImportance": importance(baseline_model),
        },
        "augmented": {
            "name": "Round 3 champion (adversarially hardened)",
            **{k: v for k, v in augmented_metrics.items() if k not in ("round", "description")},
        },
        "improvement": {
            "precision": round(augmented_metrics["precision"] - baseline_metrics["precision"], 4),
            "recall": round(augmented_metrics["recall"] - baseline_metrics["recall"], 4),
            "f1": round(augmented_metrics["f1"] - baseline_metrics["f1"], 4),
            "auc": round(augmented_metrics["auc"] - baseline_metrics["auc"], 4),
            "recall_delta": round(augmented_metrics["recall"] - baseline_metrics["recall"], 4),
            "f1_delta": round(augmented_metrics["f1"] - baseline_metrics["f1"], 4),
        },
        "falseNegatives": {
            "count": len(still_missed),
            "pattern": {
                "avgAmount": average("amount", still_missed),
                "avgHour": average("hour", still_missed),
                "avgVelocity": average("txn_velocity_1h", still_missed),
            },
        },
        "evasionAdvice": _advice(still_missed),
        "rounds": rounds,
        "featureImportanceByRound": [
            {"round": r["round"], **r["featureImportance"]} for r in rounds
        ],
        "featureImportance": importance(augmented_model),
        "featureLabels": FEATURE_LABELS,
        "flaggedTransactions": flagged[:25],
        "provenance": {
            "model": "Logistic regression, gradient descent, class-weighted, L2 regularised",
            "threshold": DECISION_THRESHOLD,
            "syntheticOnly": True,
            "note": "Metrics come from a held-out 30% split that is identical across all three rounds.",
        },
    }


def _advice(missed: list[dict]) -> dict[str, str]:
    if not missed:
        return {
            "text": "The hardened model caught every fraudulent payment in the held-out split. "
                    "Raise the attack difficulty to keep finding blind spots.",
            "source": "Measured from the final round's false negatives",
        }

    ratios = [float(p["amount"]) / float(p.get("amount_baseline") or 1) for p in missed]
    velocities = [float(p.get("txn_velocity_1h", 0)) for p in missed]
    new_payee = sum(1 for p in missed if p.get("is_new_payee"))

    return {
        "text": (
            f"{len(missed)} payments still evade the hardened model. They average "
            f"{sum(ratios) / len(ratios):.2f}x the account baseline at "
            f"{sum(velocities) / len(velocities):.1f} payments/hour, and only "
            f"{new_payee} of {len(missed)} involve a new payee — the attacker is "
            f"staying close to normal behaviour on every axis at once. Target the "
            f"next synthetic batch at that combination."
        ),
        "source": "Measured from the final round's false negatives",
    }
