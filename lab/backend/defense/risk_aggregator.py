"""Transparent aggregation of prediction results that were actually supplied."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any


def aggregate_risk(results: Iterable[dict[str, Any]]) -> dict[str, Any]:
    """Average available fraud probabilities and report contributing models."""
    valid_results = [
        result for result in results
        if isinstance(result, dict)
        and isinstance(result.get("model"), str)
        and isinstance(result.get("fraud_probability"), (int, float))
    ]
    scores = {
        result["model"]: float(result["fraud_probability"])
        for result in valid_results
    }
    if not scores:
        return {
            "risk_score": None,
            "risk_level": "UNAVAILABLE",
            "models_used": [],
            "model_scores": {},
        }

    risk_score = round(sum(scores.values()) / len(scores), 6)
    if risk_score >= 0.7:
        risk_level = "HIGH"
    elif risk_score >= 0.3:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"
    return {
        "risk_score": risk_score,
        "risk_level": risk_level,
        "models_used": list(scores),
        "model_scores": scores,
    }
