from __future__ import annotations

import random
from datetime import datetime, timedelta
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy
from red_team.contracts.attack_artifact import AttackArtifact


class SleeperTransactionPacingAttack(AttackStrategy):
    attack_type = "sleeper_transaction_pacing"
    modality = "transaction_sequence"

    def __init__(self, simulator: Any | None = None):
        self.simulator = simulator

    def to_artifact(self, record: dict[str, Any]) -> AttackArtifact:
        return AttackArtifact.from_record(record)

    def _threshold_for(self, customer: Any, difficulty: str, intensity: float) -> float:
        base = float(getattr(customer, "average_transaction_amount", 1000.0))
        difficulty_factor = {"easy": 0.18, "medium": 0.12, "hard": 0.08}[difficulty]
        return base * (1.0 + intensity * 0.8 + difficulty_factor)

    def _generate_timestamps(self, customer: Any, sequence_length: int, duration_days: int, seed: int | None = None) -> list[datetime]:
        rng = random.Random(seed)
        start = datetime.now() - timedelta(days=duration_days)
        timestamps: list[datetime] = []
        for index in range(sequence_length):
            offset_days = rng.randint(0, duration_days)
            hour = max(8, min(22, int(customer.usual_start_hour + index % 5)))
            minute = rng.randint(0, 59)
            second = rng.randint(0, 59)
            timestamps.append(start + timedelta(days=offset_days, hours=hour - start.hour, minutes=minute, seconds=second))
        return sorted(timestamps)

    def generate(
        self,
        customer: Any,
        sequence_length: int = 14,
        difficulty: str = "medium",
        intensity: float = 0.5,
        config: AttackConfig | None = None,
        seed: int | None = None,
    ) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        rng = random.Random(seed or config.seed)
        duration_days = max(7, int(sequence_length * (1.2 if difficulty == "easy" else 1.0 if difficulty == "medium" else 0.85)))
        threshold = self._threshold_for(customer, config.difficulty, config.intensity)
        timestamps = self._generate_timestamps(customer, sequence_length, duration_days, seed=seed or config.seed)
        base_average = float(getattr(customer, "average_transaction_amount", 1000.0))
        amounts: list[float] = []
        for index in range(sequence_length):
            anchor = 1.0 + (index % 4) * 0.02
            variance = rng.uniform(-0.20, 0.20) * (1.0 + (1.0 - config.intensity))
            if difficulty == "easy":
                proximity = 0.95 + (config.intensity * 0.2)
            elif difficulty == "hard":
                proximity = 0.85 + (config.intensity * 0.1)
            else:
                proximity = 0.9 + (config.intensity * 0.15)
            synthetic_bias = threshold * (1.0 + variance) * proximity
            amount = max(1.0, base_average * (0.8 + (index % 5) * 0.04) + synthetic_bias * 0.08 * (1.0 + config.intensity))
            if difficulty == "hard":
                amount = max(1.0, base_average * (0.7 + rng.uniform(0.0, 0.25)) + threshold * (0.04 + 0.02 * config.intensity))
            amounts.append(round(amount, 2))

        rolling_7d_amount = [sum(amounts[max(0, idx - 6):idx + 1]) for idx in range(len(amounts))]
        rolling_7d_velocity = [max(0.0, (rolling_7d_amount[idx] / max(1, idx + 1))) for idx in range(len(amounts))]
        threshold_proximity = [abs(amount - threshold) / max(threshold, 1.0) for amount in amounts]
        pacing_consistency = round(sum(abs(x - sum(threshold_proximity) / max(len(threshold_proximity), 1)) for x in threshold_proximity) / max(len(threshold_proximity), 1), 6)
        amount_variance = round(float((sum((x - (sum(amounts) / max(len(amounts), 1))) ** 2 for x in amounts) / max(len(amounts), 1))), 6)
        days_active = len({ts.date().isoformat() for ts in timestamps})
        final_cashout_simulated = any(a >= threshold for a in amounts)

        payload = {
            "sequence_length": sequence_length,
            "duration_days": duration_days,
            "synthetic_threshold": round(threshold, 2),
            "threshold_proximity": round(sum(threshold_proximity) / max(len(threshold_proximity), 1), 6),
            "rolling_7d_amount": rolling_7d_amount,
            "rolling_7d_velocity": rolling_7d_velocity,
            "pacing_consistency": pacing_consistency,
            "amount_variance": amount_variance,
            "days_active": days_active,
            "final_cashout_simulated": final_cashout_simulated,
            "amounts": amounts,
            "timestamps": timestamps,
            "customer_id": getattr(customer, "customer_id", "UNKNOWN"),
        }

        record = self.make_record(
            attack_id=f"SP-{seed or 1:06d}",
            target_id=getattr(customer, "customer_id", "UNKNOWN"),
            difficulty=config.difficulty,
            payload=payload,
            metadata={
                "sequence_length": sequence_length,
                "duration_days": duration_days,
                "synthetic_threshold": round(threshold, 2),
                "pacing_consistency": pacing_consistency,
                "final_cashout_simulated": final_cashout_simulated,
                "intensity": config.intensity,
            },
            config=config,
        )
        return [record]
