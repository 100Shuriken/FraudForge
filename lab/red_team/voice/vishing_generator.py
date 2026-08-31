import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class VishingGenerator(AttackStrategy):
    attack_type = "vishing"
    modality = "audio_metadata"

    def generate(self, number_of_records: int = 1, difficulty: str = "medium", intensity: float = 0.5, config: AttackConfig | None = None) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        pressure = {"easy": 0.86, "medium": 0.62, "hard": 0.38}[config.difficulty]
        records = []
        for index in range(number_of_records):
            artifact_id = f"SYN-VISH-{index + 1:04d}"
            payload = {
                "artifact_id": artifact_id,
                "target_type": "fictional account holder",
                "synthetic_transcript": "SYNTHETIC DEMO: confirm this test session with support",
                "speech_rate": round(1 + random.uniform(-0.25, 0.25) * pressure, 2),
                "pause_frequency": round(random.uniform(0.2, 0.7) * (0.6 + pressure), 2),
                "emotional_pressure_score": pressure,
                "impersonation_score": round(pressure * 0.9, 2),
                "synthetic_audio_available": False,
                "attack_type": self.attack_type,
                "is_fraud": True
            }
            records.append(self.make_record(
                artifact_id, "SYNTHETIC-TARGET", config.difficulty, payload,
                {"fictional_identity": True}, config
            ))
        return records
