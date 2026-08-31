from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class SyntheticIdentityGenerator(AttackStrategy):
    attack_type = "synthetic_identity"
    modality = "identity_document_metadata"

    def generate(self, number_of_records: int = 1, difficulty: str = "medium", intensity: float = 0.5, config: AttackConfig | None = None) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        inconsistency = {"easy": 0.8, "medium": 0.55, "hard": 0.3}[config.difficulty]
        records = []
        for index in range(number_of_records):
            identity_id = f"SYN-ID-{index + 1:04d}"
            payload = {
                "identity_id": identity_id,
                "synthetic_name": f"Synthetic Test Person {index + 1}",
                "synthetic_document_id": f"TEST-DOC-{index + 1:04d}",
                "age": 30 + index,
                "stated_income": 60000 + index * 5000,
                "address_consistency_score": round(1 - inconsistency, 2),
                "document_consistency_score": round(1 - inconsistency * 0.9, 2),
                "identity_linkage_score": round(1 - inconsistency, 2),
                "phone_consistency_score": round(1 - inconsistency * 0.8, 2),
                "email_consistency_score": round(1 - inconsistency * 0.75, 2),
                "duplicate_signal_score": round(inconsistency, 2),
                "document_tampering_score": round(inconsistency * 0.9, 2),
                "attack_type": self.attack_type,
                "is_fraud": True
            }
            records.append(self.make_record(
                identity_id, identity_id, config.difficulty, payload,
                {"synthetic_only": True}, config
            ))
        return records
