import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class VideoDeepfakeGenerator(AttackStrategy):
    attack_type = "video_deepfake"
    modality = "video_metadata"

    def generate(self, number_of_records: int = 1, difficulty: str = "medium", intensity: float = 0.5, config: AttackConfig | None = None) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        deviation = {"easy": 0.35, "medium": 0.2, "hard": 0.08}[config.difficulty]
        records = []
        for index in range(number_of_records):
            artifact_id = f"SYN-VIDEO-{index + 1:04d}"
            payload = {
                "artifact_id": artifact_id,
                "subject_id": f"SYNTHETIC-SUBJECT-{index + 1:04d}",
                "synthetic_identity": True,
                "face_consistency_score": round(1 - random.uniform(0.5, 1) * deviation, 2),
                "lip_sync_score": round(1 - random.uniform(0.5, 1) * deviation, 2),
                "frame_consistency_score": round(1 - random.uniform(0.5, 1) * deviation, 2),
                "lighting_consistency_score": round(1 - random.uniform(0.5, 1) * deviation, 2),
                "identity_match_score": round(1 - random.uniform(0.5, 1) * deviation, 2),
                "liveness_score": round(1 - random.uniform(0.5, 1) * deviation, 2),
                "attack_type": self.attack_type,
                "is_fraud": True
            }
            records.append(self.make_record(
                artifact_id, payload["subject_id"], config.difficulty, payload,
                {"synthetic_media_generated": False}, config
            ))
        return records
