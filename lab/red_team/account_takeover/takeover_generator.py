import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class AccountTakeoverGenerator(AttackStrategy):
    attack_type = "account_takeover"
    modality = "behavioral_biometric"

    def generate(
        self,
        customer: Any,
        number_of_records: int = 1,
        difficulty: str = "medium",
        intensity: float = 0.5,
        config: AttackConfig | None = None
    ) -> list[dict[str, Any]]:
        config = self.resolve_config(difficulty, intensity, config)
        deviation = {"easy": 0.85, "medium": 0.6, "hard": 0.3}[config.difficulty]
        deviation *= 0.5 + config.intensity
        records = []
        for index in range(number_of_records):
            session_id = f"SYN-SESSION-{index + 1:04d}"
            payload = {
                "customer_id": customer.customer_id,
                "session_id": session_id,
                "device_id": f"SYN-ATO-DEVICE-{index + 1:04d}",
                "new_device": True,
                "login_hour": (customer.usual_start_hour + 12 + index) % 24,
                "usual_login_hour": customer.usual_start_hour,
                "location_change_distance": round(25 + deviation * 100, 2),
                "typing_speed_deviation": round(deviation, 2),
                "mouse_pattern_deviation": round(deviation * 0.9, 2),
                "navigation_pattern_deviation": round(deviation * 0.85, 2),
                "transaction_velocity": 4 + index,
                "failed_login_count": 1 + index,
                "session_duration": random.randint(5, 30),
                "behavioural_deviation_score": round(deviation, 2),
                "attack_type": self.attack_type,
                "is_fraud": True
            }
            records.append(self.make_record(
                session_id, customer.customer_id, config.difficulty, payload,
                {"difficulty_signal": "subtle" if config.difficulty == "hard" else "obvious"},
                config
            ))
        return records
