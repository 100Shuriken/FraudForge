from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Any


VALID_DIFFICULTIES = {"easy", "medium", "hard"}


@dataclass(frozen=True)
class AttackConfig:
    difficulty: str = "medium"
    intensity: float = 0.5
    duration: int = 1
    variation: float = 0.15
    seed: int | None = None

    def validate(self) -> "AttackConfig":
        if self.difficulty not in VALID_DIFFICULTIES:
            raise ValueError("difficulty must be one of: easy, medium, hard")
        if not 0.0 <= self.intensity <= 1.0:
            raise ValueError("intensity must be between 0.0 and 1.0")
        if self.duration < 1:
            raise ValueError("duration must be at least 1")
        if not 0.0 <= self.variation <= 1.0:
            raise ValueError("variation must be between 0.0 and 1.0")
        return self


class AttackStrategy(ABC):
    attack_type: str
    modality: str

    def validate_difficulty(self, difficulty: str) -> None:
        if difficulty not in VALID_DIFFICULTIES:
            raise ValueError("difficulty must be one of: easy, medium, hard")

    def resolve_config(
        self,
        difficulty: str = "medium",
        intensity: float = 0.5,
        config: AttackConfig | None = None
    ) -> AttackConfig:
        selected = config or AttackConfig(difficulty, intensity)
        if selected.seed is not None:
            import random

            random.seed(selected.seed)
        return selected.validate()

    def make_record(
        self,
        attack_id: str,
        target_id: str,
        difficulty: str,
        payload: dict[str, Any],
        metadata: dict[str, Any] | None = None,
        config: AttackConfig | None = None
    ) -> dict[str, Any]:
        self.validate_difficulty(difficulty)
        metadata = dict(metadata or {})
        metadata["intensity"] = config.intensity if config else 0.5
        metadata.setdefault("scenario_id", f"SCENARIO-{target_id}")
        metadata.setdefault("stage", "attack_peak")
        metadata.setdefault("generation_seed", config.seed if config else None)
        return {
            "attack_id": attack_id,
            "attack_type": self.attack_type,
            "modality": self.modality,
            "difficulty": difficulty,
            "target_id": target_id,
            "is_fraud": True,
            "payload": payload,
            "metadata": metadata or {}
        }

    @abstractmethod
    def generate(self, *args: Any, **kwargs: Any) -> list[dict[str, Any]]:
        raise NotImplementedError
