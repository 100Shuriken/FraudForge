import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy
from red_team.contracts.attack_artifact import AttackArtifact
from red_team.transaction_fraud.common import merchants_for, timestamps_for, transaction_payload


class BehavioralDriftAttack(AttackStrategy):
    attack_type = "behavioral_drift"
    modality = "transaction"

    def __init__(self, simulator: Any):
        self.simulator = simulator

    def to_artifact(self, record: dict[str, Any]) -> AttackArtifact:
        return AttackArtifact.from_record(record)

    def generate(
        self,
        customer: Any,
        number_of_transactions: int = 1,
        difficulty: str = "medium",
        intensity: float = 0.5,
        config: AttackConfig | None = None
    ) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        start, step = {
            "easy": (1.02, 0.04),
            "medium": (1.05, 0.10),
            "hard": (1.02, 0.06)
        }[config.difficulty]
        transactions = []
        timestamps = timestamps_for(customer, number_of_transactions)
        for index, timestamp in enumerate(timestamps):
            merchant = random.choice(merchants_for(self.simulator, customer))
            transaction = self.simulator.create_transaction(
                customer,
                merchant,
                timestamp=timestamp,
                amount=round(
                    customer.average_transaction_amount * (
                        start + step * index * config.intensity
                    ),
                    2
                ),
                is_fraud=True,
                attack_type=self.attack_type
            )
            transactions.append(transaction)
        records = []
        for transaction in transactions:
            payload = {
                "transaction_id": transaction.transaction_id,
                "customer_id": transaction.customer_id,
                "amount": transaction.amount,
                "timestamp": transaction.timestamp,
                "merchant_id": transaction.merchant_id,
                "device_id": transaction.device_id,
                "city": transaction.city,
                "payment_method": transaction.payment_method
            }
            records.append(self.make_record(
                attack_id=f"BD-{transaction.transaction_id}",
                target_id=customer.customer_id,
                difficulty=config.difficulty,
                payload=payload,
                metadata={"source": "legacy_behavioral_drift"},
                config=config
            ))
        return records
