import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class PhishingGenerator(AttackStrategy):
    attack_type = "phishing"
    modality = "text_url"

    def generate(self, number_of_records: int = 1, difficulty: str = "medium", channel: str | None = None, intensity: float = 0.5, config: AttackConfig | None = None) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        channels = [channel] if channel else ["email", "sms", "url"]
        records = []
        for index in range(number_of_records):
            selected_channel = random.choice(channels)
            base = {"easy": 0.82, "medium": 0.62, "hard": 0.4}[config.difficulty]
            urgency = round(min(1, base + random.uniform(-0.12, 0.12) * config.intensity), 2)
            impersonation = round(min(1, base * 0.9 + random.uniform(-0.1, 0.1)), 2)
            payload = {
                "artifact_id": f"SYN-PHISH-{index + 1:04d}",
                "channel": selected_channel,
                "sender_profile": "Synthetic support notification",
                "subject_or_message": "DEMO TEST: review your simulation notice",
                "synthetic_url": f"https://secure-check-{index + 1}.phishing-demo.test/DEMO",
                "urgency_score": urgency,
                "impersonation_score": impersonation,
                "suspicious_language_score": round((urgency + impersonation) / 2, 2),
                "attack_type": self.attack_type,
                "is_fraud": True
            }
            records.append(self.make_record(
                payload["artifact_id"], "SYNTHETIC-TARGET", config.difficulty, payload,
                {"safe_artifact": True}, config
            ))
        return records
