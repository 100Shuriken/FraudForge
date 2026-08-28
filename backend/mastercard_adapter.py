from datetime import datetime
from typing import Any

from fastapi import HTTPException


def normalize_mastercard_event(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize a Mastercard-sandbox-style event into FraudForge features.

    Mastercard-specific authentication and field mapping belong in this adapter,
    keeping the risk engine independent from the provider contract.
    """
    transaction = payload.get("transaction", payload)
    try:
        normalized = {
            "provider_event_id": str(payload.get("id") or payload.get("event_id") or ""),
            "amount": float(transaction.get("amount", 0)),
            "currency": str(transaction.get("currency", "USD")),
            "merchant_id": str(transaction.get("merchant_id", "unknown")),
            "card_token": str(transaction.get("card_token", "")),
            "hour": int(transaction.get("hour", datetime.utcnow().hour)),
            "is_new_payee": int(bool(transaction.get("is_new_payee", False))),
            "txn_velocity_1h": int(transaction.get("txn_velocity_1h", 0)),
            "days_since_last_txn": int(transaction.get("days_since_last_txn", 0)),
            "is_international": int(bool(transaction.get("is_international", False))),
        }
    except (TypeError, ValueError) as exc:
        raise HTTPException(status_code=422, detail="Invalid Mastercard event fields") from exc

    if not normalized["provider_event_id"]:
        raise HTTPException(status_code=422, detail="Event id is required")
    if normalized["amount"] < 0 or not 0 <= normalized["hour"] <= 23:
        raise HTTPException(status_code=422, detail="Invalid transaction amount or hour")
    return normalized