import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy
from red_team.contracts.attack_artifact import AttackArtifact
from red_team.transaction_fraud.common import merchants_for, timestamps_for, transaction_payload


class VelocityAnomalyAttack(AttackStrategy):
    attack_type = "velocity_anomaly"
    modality = "transaction"

    def __init__(self, simulator: Any):
        self.simulator = simulator

    def to_artifact(self, record: dict[str, Any]) -> AttackArtifact:
        return AttackArtifact.from_record(record)

    def generate(self, customer: Any, number_of_transactions: int = 5, difficulty: str = "medium", intensity: float = 0.5, config: AttackConfig | None = None) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        transactions = []
        timestamps = timestamps_for(customer, number_of_transactions)
        for index, timestamp in enumerate(timestamps):
            merchant = random.choice(merchants_for(self.simulator, customer))
            transaction = self.simulator.create_transaction(
                customer,
                merchant,
                timestamp=timestamp,
                amount=round(customer.average_transaction_amount * (1 + random.uniform(0, 0.2)), 2),
                is_fraud=True,
                attack_type=self.attack_type
            )
            transactions.append(self.make_record(
                f"VA-{transaction.transaction_id}", customer.customer_id,
                config.difficulty, transaction_payload(transaction),
                {
                    "sequence_index": index,
                    "high_frequency": True,
                    "frequency_multiplier": 1.5 + config.intensity * 3
                },
                config
            ))
        return transactions
