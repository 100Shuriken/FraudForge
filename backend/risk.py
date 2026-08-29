"""Explainable shadow-mode risk scoring.

This is the single source of truth for how a normalized payment becomes a
risk score. Both the local API (`backend/main.py`) and the serverless API
(`api/index.py`) score through here, so a transaction gets the same verdict
wherever it is evaluated.

The scorer is deliberately rule-based and graded rather than binary: each
signal contributes a continuous amount proportional to how far the payment
deviates from the account's own baseline. That keeps every score traceable
to a reason a human can read, and lets genuinely similar transactions land
on genuinely similar scores instead of snapping to a handful of constants.

Pure stdlib on purpose — the serverless bundle ships only fastapi+pydantic.
"""

from dataclasses import dataclass, field

# Decision thresholds. Exported so the API and the UI describe the same
# policy instead of each hardcoding its own cutoffs.
REVIEW_THRESHOLD = 0.50
BLOCK_THRESHOLD = 0.75

# Used only when a caller gives no per-account baseline to compare against.
DEFAULT_AMOUNT_BASELINE = 1000.0


@dataclass(frozen=True)
class RiskDecision:
    score: float
    action: str
    reasons: list[str] = field(default_factory=list)
    confidence: float = 0.5
    confidence_level: str = "Medium"
    contributions: dict[str, float] = field(default_factory=dict)

    @property
    def flagged(self) -> bool:
        """True when the payment is not cleared outright."""
        return self.action in ("review", "block")


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def score_transaction(transaction: dict) -> RiskDecision:
    """Return an explainable shadow-mode decision for a normalized payment.

    Recognized keys (all optional):
        amount              float   payment value
        amount_baseline     float   the account's usual payment value
        txn_velocity_1h     int     payments by this account in the last hour
        daily_txn_baseline  float   the account's usual daily payment count
        is_new_payee        bool
        is_international    bool
        is_new_device       bool
        hour                int     0-23, local time of the payment
    """
    contributions: dict[str, float] = {}
    reasons: list[str] = []

    # ---- Amount, relative to what this account normally spends ----------
    amount = float(transaction.get("amount", 0) or 0)
    baseline = float(transaction.get("amount_baseline") or DEFAULT_AMOUNT_BASELINE)
    if baseline <= 0:
        baseline = DEFAULT_AMOUNT_BASELINE
    ratio = amount / baseline
    # Ramps in from 1x baseline and saturates around 2.5x.
    amount_weight = _clamp((ratio - 1.0) / 1.5, 0.0, 1.0) * 0.34
    if amount_weight >= 0.02:
        contributions["amount"] = round(amount_weight, 4)
        reasons.append(f"amount {ratio:.1f}x account baseline")

    # ---- Velocity, relative to this account's normal cadence ------------
    velocity = float(transaction.get("txn_velocity_1h", 0) or 0)
    daily_baseline = float(transaction.get("daily_txn_baseline") or 1.0)
    # An account that normally makes 4 payments a day is less alarming at
    # 4 in an hour than one that normally makes a single payment a day.
    hourly_baseline = max(0.5, daily_baseline / 8.0)
    excess = max(0.0, velocity - hourly_baseline)
    velocity_weight = _clamp(excess / 3.0, 0.0, 1.0) * 0.34
    if velocity_weight >= 0.02:
        contributions["velocity"] = round(velocity_weight, 4)
        plural = "" if velocity == 1 else "s"
        reasons.append(f"{velocity:g} payment{plural} in one hour")

    # ---- Categorical trust signals --------------------------------------
    if transaction.get("is_new_payee"):
        contributions["new_payee"] = 0.26
        reasons.append("first payment to this payee")

    if transaction.get("is_international"):
        contributions["international"] = 0.18
        reasons.append("cross-border payment")

    if transaction.get("is_new_device"):
        contributions["new_device"] = 0.20
        reasons.append("unrecognized device")

    # ---- Time of day -----------------------------------------------------
    hour = int(transaction.get("hour", 12) or 12)
    # Distance from a 13:00 midpoint of normal waking activity, so 03:00
    # scores higher than 21:00 rather than both tripping the same flag.
    distance = min(abs(hour - 13), 24 - abs(hour - 13))
    hour_weight = _clamp((distance - 6) / 5.0, 0.0, 1.0) * 0.12
    if hour_weight >= 0.02:
        contributions["hour"] = round(hour_weight, 4)
        reasons.append(f"payment at {hour:02d}:00")

    score = min(round(0.02 + sum(contributions.values()), 4), 0.99)

    if score >= BLOCK_THRESHOLD:
        action = "block"
    elif score >= REVIEW_THRESHOLD:
        action = "review"
    else:
        action = "allow"

    # Confidence is distance from the nearest decision boundary, normalized
    # by how much room the score had to move in that direction.
    if score >= REVIEW_THRESHOLD:
        confidence = (score - REVIEW_THRESHOLD) / max(1e-6, 0.99 - REVIEW_THRESHOLD)
    else:
        confidence = (REVIEW_THRESHOLD - score) / REVIEW_THRESHOLD
    confidence = round(_clamp(confidence, 0.0, 1.0), 4)
    confidence_level = "High" if confidence >= 0.60 else "Medium" if confidence >= 0.30 else "Low"

    return RiskDecision(
        score=score,
        action=action,
        reasons=reasons or ["no elevated risk signals"],
        confidence=confidence,
        confidence_level=confidence_level,
        contributions=contributions,
    )
