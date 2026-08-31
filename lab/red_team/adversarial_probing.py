from __future__ import annotations

import math
import random
from typing import Any

from red_team.attack_strategy import AttackConfig, AttackStrategy


class ClassifierInterface:
    def predict(self, features: dict[str, Any]) -> bool:
        raise NotImplementedError

    def score(self, features: dict[str, Any]) -> float:
        raise NotImplementedError


class MockClassifier(ClassifierInterface):
    """A tiny deterministic local classifier for synthetic testing only.

    It scores a feature dictionary using a simple linear rule with a threshold.
    This is intentionally small and local to the red-team harness.
    """

    def __init__(self, threshold: float = 0.5, seed: int | None = None):
        self.threshold = threshold
        self.seed = seed
        self.random = random.Random(seed)

    def score(self, features: dict[str, Any]) -> float:
        amount = float(features.get("amount", 0.0)) / 1000.0
        hour = float(features.get("hour", 12.0)) / 24.0
        device = float(features.get("device_risk_signal", 0.0))
        location = float(features.get("location_risk_signal", 0.0))
        velocity = float(features.get("velocity_signal", 0.0))
        merchant = {"Food": 0.25, "Fuel": 0.3, "Shopping": 0.4, "Travel": 0.2, "Electronics": 0.35}.get(
            features.get("merchant_category", "Food"), 0.2
        )
        score = 0.35 * amount + 0.20 * hour + 0.15 * device + 0.15 * location + 0.10 * velocity + 0.05 * merchant
        return min(max(score, 0.0), 1.0)

    def predict(self, features: dict[str, Any]) -> bool:
        return self.score(features) >= self.threshold


class AdversarialProbingAttack(AttackStrategy):
    attack_type = "adversarial_probing"
    modality = "local_classifier"

    def __init__(self, classifier: ClassifierInterface | None = None):
        self.classifier = classifier or MockClassifier()

    def _allowed_categories(self) -> list[str]:
        return ["Food", "Fuel", "Shopping", "Travel", "Electronics"]

    def _allowed_locations(self) -> list[str]:
        return ["Pune", "Mumbai", "Delhi", "Bangalore", "Hyderabad"]

    def _perturb_features(self, features: dict[str, Any], difficulty: str, intensity: float, seed: int | None = None) -> tuple[dict[str, Any], dict[str, Any], float]:
        rng = random.Random(seed)
        difficulty_budget = {"easy": 0.18, "medium": 0.10, "hard": 0.05}[difficulty]
        scale = difficulty_budget * (0.5 + intensity)

        perturbed = dict(features)
        amount_delta = float(features.get("amount", 100.0)) * scale * rng.uniform(-1.0, 1.0)
        perturbed["amount"] = max(1.0, features.get("amount", 100.0) + amount_delta)

        hour_shift = int(round(rng.uniform(-3, 3) * (1.0 + intensity)))
        perturbed["hour"] = max(0, min(23, int(features.get("hour", 12)) + hour_shift))

        perturbed["device_risk_signal"] = max(0.0, min(1.0, float(features.get("device_risk_signal", 0.2)) + rng.uniform(-0.08, 0.08) * (1.0 + intensity)))
        perturbed["location_risk_signal"] = max(0.0, min(1.0, float(features.get("location_risk_signal", 0.2)) + rng.uniform(-0.08, 0.08) * (1.0 + intensity)))
        perturbed["velocity_signal"] = max(0.0, min(1.0, float(features.get("velocity_signal", 0.2)) + rng.uniform(-0.06, 0.06) * (1.0 + intensity)))

        category = features.get("merchant_category", "Food")
        if rng.random() < 0.5:
            options = [c for c in self._allowed_categories() if c != category]
            perturbed["merchant_category"] = rng.choice(options)
        else:
            perturbed["merchant_category"] = category

        changed = {k: (features.get(k), perturbed.get(k)) for k in sorted(set(features) | set(perturbed)) if features.get(k) != perturbed.get(k)}
        total_change = sum(
            abs(float(perturbed.get(k, 0.0)) - float(features.get(k, 0.0)))
            for k in ["amount", "hour", "device_risk_signal", "location_risk_signal", "velocity_signal"]
            if k in features or k in perturbed
        )
        return features, perturbed, total_change, changed

    def generate(
        self,
        classifier: ClassifierInterface | None = None,
        baseline: dict[str, Any] | None = None,
        difficulty: str = "medium",
        intensity: float = 0.5,
        config: AttackConfig | None = None,
        seed: int | None = None,
        max_attempts: int = 25,
    ) -> dict[str, Any]:
        config = self.resolve_config(difficulty, intensity, config)
        classifier = classifier or self.classifier
        baseline = baseline or {
            "amount": 250.0,
            "hour": 18,
            "merchant_category": "Food",
            "device_risk_signal": 0.2,
            "location_risk_signal": 0.2,
            "velocity_signal": 0.2,
        }
        original_prediction = bool(classifier.predict(baseline))
        perturbed = dict(baseline)
        total_change = 0.0
        changed: dict[str, Any] = {}
        successful_boundary_crossing = False
        attempts = 0

        for _ in range(max_attempts):
            attempts += 1
            _, candidate, total_change, changed = self._perturb_features(perturbed, difficulty, config.intensity, seed=(seed + attempts) if seed is not None else None)
            candidate_prediction = bool(classifier.predict(candidate))
            if candidate_prediction != original_prediction:
                successful_boundary_crossing = True
                perturbed = candidate
                break
            perturbed = candidate

        result = {
            "attack_id": f"AP-{seed or 1:06d}",
            "attack_type": self.attack_type,
            "modality": self.modality,
            "difficulty": config.difficulty,
            "target_id": "LOCAL-CLASSIFIER",
            "is_fraud": True,
            "original_features": baseline,
            "perturbed_features": perturbed,
            "changed_features": changed,
            "total_change": round(total_change, 6),
            "original_prediction": original_prediction,
            "final_prediction": bool(classifier.predict(perturbed)),
            "number_of_attempts": attempts,
            "successful_boundary_crossing": successful_boundary_crossing,
            "payload": {
                "original_features": baseline,
                "perturbed_features": perturbed,
                "changed_features": changed,
                "total_change": round(total_change, 6),
                "original_prediction": original_prediction,
                "final_prediction": bool(classifier.predict(perturbed)),
                "number_of_attempts": attempts,
                "successful_boundary_crossing": successful_boundary_crossing,
            },
            "metadata": {
                "difficulty": config.difficulty,
                "intensity": config.intensity,
                "model_threshold": getattr(classifier, "threshold", None),
                "max_attempts": max_attempts,
            },
        }
        return result
