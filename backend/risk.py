from dataclasses import dataclass


@dataclass(frozen=True)
class RiskDecision:
    score: float
    action: str
    reasons: list[str]
    confidence: float = 0.5
    confidence_level: str = "Medium"


def score_transaction(transaction: dict) -> RiskDecision:
    """Return an explainable shadow-mode decision for a normalized payment."""
    score = 0.02
    reasons = []

    amount = float(transaction.get("amount", 0))
    if amount >= 1000:
        score += 0.25
        reasons.append("high amount")
    if transaction.get("is_new_payee"):
        score += 0.25
        reasons.append("new payee")
    velocity = int(transaction.get("txn_velocity_1h", 0))
    if velocity >= 4:
        score += 0.3
        reasons.append("elevated one-hour velocity")
    if transaction.get("is_international"):
        score += 0.12
        reasons.append("international payment")
    hour = int(transaction.get("hour", 12))
    if hour < 5 or hour > 23:
        score += 0.1
        reasons.append("unusual transaction hour")

    score = min(round(score, 4), 0.99)
    action = "review" if score >= 0.45 else "allow"
    threshold = 0.45
    confidence = round(abs(score - threshold) / max(threshold, 1.0 - threshold), 4)
    confidence_level = "High" if confidence >= 0.70 else "Medium" if confidence >= 0.35 else "Low"
    return RiskDecision(
        score=score,
        action=action,
        reasons=reasons or ["no elevated risk signals"],
        confidence=confidence,
        confidence_level=confidence_level,
    )