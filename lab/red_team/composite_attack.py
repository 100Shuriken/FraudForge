from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class CompositeAttack(AttackStrategy):
    attack_type = "composite"
    modality = "multi_modal"

    def __init__(self, attacks: list[AttackStrategy]):
        self.attacks = attacks

    def generate(
        self,
        *args: Any,
        difficulty: str = "medium",
        intensity: float = 0.5,
        config: AttackConfig | None = None,
        **kwargs: Any
    ) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        components = []
        for attack in self.attacks:
            components.extend(attack.generate(
                *args, difficulty=config.difficulty,
                intensity=config.intensity, config=config, **kwargs
            ))
        return [self.make_record(
            f"COMPOSITE-{index + 1:06d}",
            record["target_id"], config.difficulty,
            {"component_attack_id": record["attack_id"]},
            {"component_attacks": [record["attack_type"] for record in components]},
            config
        ) for index, record in enumerate(components)]
