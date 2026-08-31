"""Adapt Red Team transaction payloads to the trained transaction schema."""

from __future__ import annotations

import math
from collections.abc import Mapping
from datetime import datetime
from typing import Any

from .model_manager import ModelManager
from .predictors import predict_transaction


TRANSACTION_FEATURES = (
    "TransactionAmt", "TransactionDT", "ProductCD", "log_amount",
    "product_avg_amount", "amount_vs_product_avg", "hour", "day",
    "is_night", "id_12", "id_15", "id_16", "id_28", "id_29",
    "id_31", "id_35", "id_36", "id_37", "id_38", "DeviceType",
    "DeviceInfo",
)


def adapt_transaction_payload(payload: Mapping[str, Any]) -> dict[str, Any]:
    """Return model features when every required feature is present.

    Existing Red Team records contain business transaction fields, not the
    original training dataset columns. Only values with an unambiguous mapping
    are derived here; missing training inputs are reported instead.
    """
    if not isinstance(payload, Mapping):
        return {
            "scoreable": False,
            "missing": list(TRANSACTION_FEATURES),
            "reason": "Transaction payload must be a mapping.",
        }

    source = payload.get("payload", payload)
    if not isinstance(source, Mapping):
        return {
            "scoreable": False,
            "missing": list(TRANSACTION_FEATURES),
            "reason": "Transaction payload must contain a mapping payload.",
        }

    features = {name: source[name] for name in TRANSACTION_FEATURES if name in source}
    if "TransactionAmt" not in features and "amount" in source:
        features["TransactionAmt"] = source["amount"]
    if "log_amount" not in features and "TransactionAmt" in features:
        amount = float(features["TransactionAmt"])
        if amount <= 0:
            return {
                "scoreable": False,
                "missing": ["log_amount"],
                "reason": "TransactionAmt must be positive to derive log_amount.",
            }
        features["log_amount"] = math.log(amount)

    missing = [name for name in TRANSACTION_FEATURES if name not in features]
    if missing:
        return {
            "scoreable": False,
            "missing": missing,
            "reason": "The Red Team payload does not contain the original transaction-model training features.",
        }

    ordered_features = {name: features[name] for name in TRANSACTION_FEATURES}
    return {"scoreable": True, "features": ordered_features}


def predict_transaction_payload(
    payload: Mapping[str, Any], manager: ModelManager | None = None
) -> dict[str, Any]:
    """Adapt and score a transaction payload when its schema is complete."""
    adapted = adapt_transaction_payload(payload)
    if not adapted["scoreable"]:
        return adapted
    return {
        "scoreable": True,
        "prediction": predict_transaction(adapted["features"], manager),
    }
