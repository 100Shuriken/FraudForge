from collections import Counter
import random
from statistics import mean
from typing import Any

from red_team.account_takeover.takeover_generator import AccountTakeoverGenerator
from red_team.adversarial_probing import AdversarialProbingAttack
from red_team.agent.planner import AttackPlan, AttackPlanValidator
from red_team.attack_strategy import AttackConfig
from red_team.composite_attack import CompositeAttack
from red_team.identity.synthetic_identity_generator import SyntheticIdentityGenerator
from red_team.phishing.phishing_generator import PhishingGenerator
from red_team.sleeper_transaction_pacing import SleeperTransactionPacingAttack
from red_team.transaction_fraud.behavioral_drift import BehavioralDriftAttack
from red_team.transaction_fraud.device_switch import DeviceSwitchAttack
from red_team.transaction_fraud.velocity_anomaly import VelocityAnomalyAttack
from red_team.video.deepfake_generator import VideoDeepfakeGenerator
from red_team.voice.vishing_generator import VishingGenerator


class AttackRegistry:

    def __init__(self, simulator: Any):
        self._attacks = {}
        self.register("behavioral_drift", BehavioralDriftAttack(simulator))
        self.register("device_switch", DeviceSwitchAttack(simulator))
        self.register("velocity_anomaly", VelocityAnomalyAttack(simulator))
        self.register("phishing", PhishingGenerator())
        self.register("vishing", VishingGenerator())
        self.register("video_deepfake", VideoDeepfakeGenerator())
        self.register("synthetic_identity", SyntheticIdentityGenerator())
        self.register("account_takeover", AccountTakeoverGenerator())
        self.register("sleeper_transaction_pacing", SleeperTransactionPacingAttack(simulator))
        self.register("adversarial_probing", AdversarialProbingAttack())

    def register(self, name: str, attack: Any) -> None:
        self._attacks[name] = attack

    def get(self, name: str) -> Any:
        return self._attacks[name]

    def composite(self, names: list[str]) -> CompositeAttack:
        return CompositeAttack([self.get(name) for name in names])

    def generate_attack_dataset(
        self,
        attack_type: str,
        count: int,
        difficulty: str = "medium",
        intensity: float = 0.5,
        target_population: list[Any] | None = None,
        seed: int | None = None
    ) -> list[dict[str, Any]]:
        if count < 0:
            raise ValueError("count cannot be negative")
        config = AttackConfig(difficulty, intensity, duration=count)
        if seed is not None:
            random.seed(seed)
        attack = self.get(attack_type)
        records = []
        for index in range(count):
            target = target_population[index % len(target_population)] if target_population else None
            if target is None and attack_type in {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"}:
                raise ValueError("target_population is required for this attack type")
            if target is None:
                records.extend(attack.generate(1, config=config))
            else:
                records.extend(attack.generate(target, 1, config=config))
        for index, record in enumerate(records, 1):
            record["attack_id"] = f"{attack_type.upper()}-{index:06d}"
        return records

    def execute_plan(
        self,
        plan: AttackPlan | dict[str, Any],
        target: Any,
        number_of_transactions: int = 1,
        **kwargs: Any
    ) -> list[dict[str, Any]]:
        validated = AttackPlanValidator.validate(plan)
        if validated.attack_type == "composite":
            composite = self.composite(validated.component_attacks or [])
            return composite.generate(
                target,
                difficulty=validated.difficulty,
                intensity=validated.intensity,
                number_of_transactions=number_of_transactions,
                **kwargs,
            )

        attack = self.get(validated.attack_type)
        if validated.attack_type in {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"}:
            return attack.generate(
                target,
                number_of_transactions,
                difficulty=validated.difficulty,
                intensity=validated.intensity,
                **kwargs,
            )

        return attack.generate(
            number_of_transactions,
            difficulty=validated.difficulty,
            intensity=validated.intensity,
            **kwargs,
        )

    def statistics(self, records: list[dict[str, Any]]) -> dict[str, Any]:
        amounts = [
            record["payload"]["amount"] for record in records
            if "amount" in record["payload"]
        ]
        return {
            "total_attacks": len(records),
            "attacks_by_type": dict(Counter(record["attack_type"] for record in records)),
            "attacks_by_difficulty": dict(Counter(record["difficulty"] for record in records)),
            "attacks_by_modality": dict(Counter(record["modality"] for record in records)),
            "average_intensity": round(mean(record["metadata"]["intensity"] for record in records), 3) if records else 0,
            "amount_mean": round(mean(amounts), 2) if amounts else 0,
            "amount_range": (min(amounts), max(amounts)) if amounts else (0, 0)
        }
