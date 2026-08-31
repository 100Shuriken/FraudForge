import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy
from red_team.contracts.attack_artifact import AttackArtifact
from red_team.transaction_fraud.common import merchants_for, timestamps_for, transaction_payload


class DeviceSwitchAttack(AttackStrategy):
    attack_type = "device_switch"
    modality = "transaction"

    def __init__(self, simulator: Any):
        self.simulator = simulator

    def to_artifact(self, record: dict[str, Any]) -> AttackArtifact:
        return AttackArtifact.from_record(record)

    def generate(self, customer: Any, number_of_transactions: int = 1, difficulty: str = "medium", intensity: float = 0.5, config: AttackConfig | None = None) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        transactions = []
        for index, timestamp in enumerate(timestamps_for(customer, number_of_transactions)):
            merchant = random.choice(merchants_for(self.simulator, customer))
            transaction = self.simulator.create_transaction(
                customer,
                merchant,
                timestamp=timestamp,
                amount=customer.average_transaction_amount * (1.05 + index * 0.02),
                is_fraud=True,
                attack_type=self.attack_type
            )
            transaction.device_id = f"D-ATTACK-{index + 1:04d}"
            transactions.append(self.make_record(
                f"DS-{transaction.transaction_id}", customer.customer_id,
                config.difficulty, transaction_payload(transaction),
                {"new_device": True, "device_change_likelihood": config.intensity},
                config
            ))
        return transactions
