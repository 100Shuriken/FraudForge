from __future__ import annotations

import json
import csv
import os
import random
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Any, Iterable


SCENARIO_TYPES = (
    "TRANSACTION_ANOMALY",
    "COMMUNICATION_SCAM",
    "KYC_IDENTITY",
    "LONGITUDINAL_BEHAVIOR",
    "CLASSIFIER_EVALUATION",
)


@dataclass
class SyntheticScenario:
    scenario_id: str
    scenario_type: str
    target_id: str
    transaction_id: str | None
    timestamp: datetime
    transaction_context: dict[str, Any] = field(default_factory=dict)
    behavioral_context: dict[str, Any] = field(default_factory=dict)
    device_context: dict[str, Any] = field(default_factory=dict)
    location_context: dict[str, Any] = field(default_factory=dict)
    communication_context: dict[str, Any] = field(default_factory=dict)
    identity_context: dict[str, Any] = field(default_factory=dict)
    classifier_context: dict[str, Any] = field(default_factory=dict)
    timeline_context: dict[str, Any] = field(default_factory=dict)
    ground_truth: dict[str, Any] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    def observable_context(self) -> dict[str, Any]:
        context: dict[str, Any] = {
            "scenario_type": self.scenario_type,
            "transaction": self.transaction_context.get("transaction"),
            "transaction_history": self.timeline_context.get("history", []),
            "merchant_categories": self.transaction_context.get("merchant_categories", []),
        }
        for key, value in self.communication_context.items():
            context[key] = value
        for key, value in self.identity_context.items():
            context[key] = value
        for key, value in self.classifier_context.items():
            context[key] = value
        for block in (self.behavioral_context, self.device_context, self.location_context, self.timeline_context):
            for key, value in block.items():
                if key != "history":
                    context[key] = value
        if self.timeline_context:
            context["transaction_sequence_scenario"] = True
        return context

    def to_dict(self) -> dict[str, Any]:
        return _json_safe(asdict(self))


class ScenarioGenerator:
    """Create evidence-backed, local synthetic contexts for existing attacks."""

    def __init__(self, simulator: Any, seed: int | None = None):
        self.simulator = simulator
        self.seed = seed
        self.random = random.Random(seed)
        self._counter = 0

    def _target(self, customer: Any | None = None) -> Any:
        if customer is not None:
            return customer
        if not self.simulator.customers:
            raise ValueError("scenario generation requires at least one customer")
        return self.random.choice(self.simulator.customers)

    def _transaction(self, customer: Any, transaction: Any | None = None) -> Any | None:
        if transaction is not None:
            return transaction
        history = [item for item in self.simulator.transactions if item.customer_id == customer.customer_id]
        return self.random.choice(history) if history else None

    def generate(
        self,
        scenario_type: str = "AUTO",
        customer: Any | None = None,
        transaction: Any | None = None,
        seed: int | None = None,
    ) -> SyntheticScenario:
        if seed is not None:
            self.random.seed(seed)
        target = self._target(customer)
        selected = self._transaction(target, transaction)
        selected_type = scenario_type.upper()
        if selected_type == "AUTO":
            selected_type = self.random.choice(SCENARIO_TYPES)
        if selected_type not in SCENARIO_TYPES:
            raise ValueError(f"unknown scenario_type: {scenario_type}")
        self._counter += 1
        history = [item for item in self.simulator.transactions if item.customer_id == target.customer_id]
        timestamp = getattr(selected, "timestamp", datetime(2025, 1, 1))
        scenario = SyntheticScenario(
            scenario_id=f"SCN-{self.seed or 0:06d}-{self._counter:04d}",
            scenario_type=selected_type,
            target_id=target.customer_id,
            transaction_id=getattr(selected, "transaction_id", None),
            timestamp=timestamp,
            ground_truth={"is_fraud": False, "attack_type": None},
            metadata={"generation_seed": seed if seed is not None else self.seed, "synthetic_only": True},
        )
        if selected_type == "TRANSACTION_ANOMALY":
            scenario.transaction_context = self._transaction_context(target, selected, history)
            scenario.behavioral_context = {"history_length": len(history), "spending_regularity": self._regularity(history)}
            scenario.device_context = {"usual_device": target.usual_device, "device_stability": self._stability(history, "device_id", target.usual_device)}
            scenario.location_context = {"usual_city": target.city, "location_consistency": self._stability(history, "city", target.city)}
        elif selected_type == "COMMUNICATION_SCAM":
            scenario.communication_context = self._communication_context()
            scenario.transaction_context = self._transaction_context(target, selected, history)
        elif selected_type == "KYC_IDENTITY":
            scenario.identity_context = self._identity_context(target)
        elif selected_type == "LONGITUDINAL_BEHAVIOR":
            scenario.timeline_context = self._timeline_context(history, target)
            scenario.transaction_context = self._transaction_context(target, selected, history)
            scenario.behavioral_context = {"gradual_behavioral_drift": True, "spending_regularity": self._regularity(history)}
        elif selected_type == "CLASSIFIER_EVALUATION":
            baseline = self._transaction_context(target, selected, history)
            scenario.classifier_context = {
                "classifier": True,
                "baseline_transaction": baseline,
                "baseline_score": 0.33,
                "classifier_threshold": 0.5,
                "model_features": {"amount": baseline.get("amount", 250.0), "hour": timestamp.hour, "velocity_signal": 0.2},
                "known_fraud_label": False,
                "perturbation_budget": 0.1,
                "allowed_probes": 25,
            }
        return scenario

    def _transaction_context(self, target: Any, transaction: Any | None, history: list[Any]) -> dict[str, Any]:
        amount = float(getattr(transaction, "amount", target.average_transaction_amount))
        average = max(float(target.average_transaction_amount), 1.0)
        return {"transaction": transaction, "amount": amount, "amount_deviation": round(min(1.0, abs(amount - average) / average), 6), "velocity": round(min(1.0, len(history) / max(target.daily_transaction_count * 7, 1)), 6), "merchant_novelty": 0.0, "city_novelty": float(getattr(transaction, "city", target.city) != target.city), "payment_method_deviation": float(getattr(transaction, "payment_method", target.usual_payment_method) != target.usual_payment_method), "temporal_deviation": float(not (target.usual_start_hour <= getattr(getattr(transaction, "timestamp", None), "hour", target.usual_start_hour) <= target.usual_end_hour)), "merchant_categories": []}

    def _communication_context(self) -> dict[str, Any]:
        channel = self.random.choice(["SMS", "EMAIL", "VOICE"])
        channel = self.random.choices(["SMS", "EMAIL", "VOICE"], weights=[0.38, 0.32, 0.30])[0]
        return {"communication_scenario": True, "communication_channel": channel, "voice_context": channel == "VOICE", "sender_type": "synthetic_support_profile", "sender_trust_score": round(self.random.uniform(0.12, 0.35), 3), "message_urgency": round(self.random.uniform(0.65, 0.95), 3), "payment_request": True, "suspicious_link_indicator": round(self.random.uniform(0.05, 0.25) if channel == "VOICE" else self.random.uniform(0.72, 0.98), 3), "brand_impersonation_indicator": round(self.random.uniform(0.55, 0.9), 3), "account_security_theme": True, "communication_anomaly_score": round(self.random.uniform(0.68, 0.94), 3), "synthetic_url": "https://demo.example.test/notice"}

    def _identity_context(self, target: Any) -> dict[str, Any]:
        video_available = self.random.random() < 0.5
        return {"identity_profile": True, "onboarding_stage": self.random.choice(["enrollment", "review", "verification"]), "identity_completeness": round(self.random.uniform(0.72, 0.98), 3), "document_consistency": round(self.random.uniform(0.18, 0.62), 3), "identity_mismatch_score": round(self.random.uniform(0.42, 0.88), 3), "age_consistency": round(self.random.uniform(0.62, 0.96), 3), "address_consistency": round(self.random.uniform(0.2, 0.72), 3), "document_anomaly_score": round(self.random.uniform(0.46, 0.9), 3), "face_match_score": round(self.random.uniform(0.18, 0.72), 3), "liveness_score": round(self.random.uniform(0.12, 0.7), 3), "face_video_mismatch": round(self.random.uniform(0.45, 0.92), 3), "face_verification_status": "synthetic_review", "liveness_status": "synthetic_review", "video_verification_available": video_available, "kyc_identity_scenario": True, "target_city": target.city}

    def _timeline_context(self, history: list[Any], target: Any) -> dict[str, Any]:
        amounts = [float(item.amount) for item in history]
        evidence_mode = self.random.choice(["pacing", "drift", "velocity"])
        evidence = {"pacing": {"spending_regularity": 0.84, "threshold_proximity": 0.94, "temporal_consistency": 0.96}, "drift": {"spending_regularity": 0.18, "amount_deviation": 0.78, "temporal_consistency": 0.45}, "velocity": {"transaction_frequency": 0.96, "velocity_signal": 0.98, "rolling_transaction_count": 0.95}}[evidence_mode]
        return {"history": history, "days_7": len(history), "days_14": len(history), "days_30": len(history), "rolling_transaction_total_7d": round(sum(amounts[-7:]), 2), "rolling_transaction_total_14d": round(sum(amounts[-14:]), 2), "rolling_transaction_total_30d": round(sum(amounts), 2), "threshold_proximity": round(min(1.0, (sum(amounts[-7:]) / max(target.average_transaction_amount * 7, 1))), 3), "pacing_consistency": round(1.0 - self._regularity(history), 3), "transaction_interval_statistics": {"observations": max(0, len(history) - 1)}, "gradual_behavioral_drift": True, "evidence_mode": evidence_mode, **evidence}

    @staticmethod
    def _stability(history: list[Any], attribute: str, usual: Any) -> float:
        return round(sum(getattr(item, attribute, None) == usual for item in history) / max(len(history), 1), 3)

    @staticmethod
    def _regularity(history: list[Any]) -> float:
        amounts = [float(item.amount) for item in history]
        if not amounts:
            return 0.5
        average = sum(amounts) / len(amounts)
        deviation = sum((amount - average) ** 2 for amount in amounts) / len(amounts)
        return round(max(0.0, min(1.0, 1 - deviation ** 0.5 / max(average, 1))), 3)

    def generate_dataset(self, number_of_scenarios: int, scenario_types: Iterable[str] | None = None, seed: int | None = None) -> list[SyntheticScenario]:
        if number_of_scenarios < 0:
            raise ValueError("number_of_scenarios cannot be negative")
        if seed is not None:
            self.random.seed(seed)
        choices = list(scenario_types or SCENARIO_TYPES)
        return [self.generate(self.random.choice(choices)) for _ in range(number_of_scenarios)]

    def generate_balanced_dataset(
        self,
        customers: Iterable[Any],
        distribution: dict[str, float] | None = None,
        seed: int | None = None,
    ) -> list[SyntheticScenario]:
        customer_list = list(customers)
        if not customer_list:
            return []
        weights = distribution or {scenario_type: 1.0 / len(SCENARIO_TYPES) for scenario_type in SCENARIO_TYPES}
        unknown = set(weights) - set(SCENARIO_TYPES)
        if unknown or not weights or any(value < 0 for value in weights.values()) or sum(weights.values()) <= 0:
            raise ValueError("scenario distribution must contain valid scenario types and non-negative weights")
        if seed is not None:
            self.random.seed(seed)
        normalized = {key: value / sum(weights.values()) for key, value in weights.items()}
        counts = {key: int(len(customer_list) * value) for key, value in normalized.items()}
        remainder = len(customer_list) - sum(counts.values())
        ranked = sorted(normalized, key=lambda key: normalized[key] - counts[key] / max(len(customer_list), 1), reverse=True)
        for index in range(remainder):
            counts[ranked[index % len(ranked)]] += 1
        assignments = [scenario_type for scenario_type, count in counts.items() for _ in range(count)]
        self.random.shuffle(assignments)
        return [
            self.generate(scenario_type, customer=customer)
            for customer, scenario_type in zip(customer_list, assignments)
        ]

    @staticmethod
    def statistics(scenarios: Iterable[SyntheticScenario]) -> dict[str, Any]:
        scenario_list = list(scenarios)
        counts = {scenario_type: sum(item.scenario_type == scenario_type for item in scenario_list) for scenario_type in SCENARIO_TYPES}
        return {
            "total_scenarios": len(scenario_list),
            "scenarios_by_type": counts,
            "communication_scenario_count": counts["COMMUNICATION_SCAM"],
            "identity_scenario_count": counts["KYC_IDENTITY"],
            "longitudinal_scenario_count": counts["LONGITUDINAL_BEHAVIOR"],
            "classifier_scenario_count": counts["CLASSIFIER_EVALUATION"],
        }

    @staticmethod
    def export_jsonl(scenarios: Iterable[SyntheticScenario], path: str) -> None:
        with open(path, "w", encoding="utf-8") as handle:
            for scenario in scenarios:
                handle.write(json.dumps(scenario.to_dict(), default=str) + "\n")


def export_dataset_files(simulator: Any, scenarios: Iterable[SyntheticScenario], directory: str) -> dict[str, str]:
    os.makedirs(directory, exist_ok=True)
    scenario_list = list(scenarios)
    customer_path = os.path.join(directory, "customers.csv")
    merchant_path = os.path.join(directory, "merchants.csv")
    transaction_path = os.path.join(directory, "transactions.csv")
    scenario_path = os.path.join(directory, "scenarios.jsonl")
    ground_truth_path = os.path.join(directory, "ground_truth.jsonl")
    scenario_by_customer = {scenario.target_id: scenario for scenario in scenario_list}
    customers = []
    for customer in simulator.customers:
        profile = getattr(customer, "behavioral_profile", None)
        customers.append({
            "customer_id": customer.customer_id,
            "age": customer.age,
            "city": customer.city,
            "income": customer.income,
            "usual_device": customer.usual_device,
            "usual_payment_method": customer.usual_payment_method,
            "average_transaction_amount": customer.average_transaction_amount,
            "daily_transaction_count": customer.daily_transaction_count,
            "favourite_categories": "|".join(customer.favourite_categories),
            "preferred_payment_methods": "|".join(getattr(customer, "preferred_payment_methods", [])),
            "usual_start_hour": customer.usual_start_hour,
            "usual_end_hour": customer.usual_end_hour,
            "weekend_activity_multiplier": getattr(customer, "weekend_activity_multiplier", None),
            "morning_preference": getattr(customer, "morning_preference", None),
            "spending_variability": getattr(customer, "spending_variability", None),
            "merchant_loyalty": getattr(customer, "merchant_loyalty", None),
            "travel_tendency": getattr(customer, "travel_tendency", None),
            "large_purchase_tendency": getattr(customer, "large_purchase_tendency", None),
            "scenario_id": getattr(scenario_by_customer.get(customer.customer_id), "scenario_id", None),
            "scenario_type": getattr(scenario_by_customer.get(customer.customer_id), "scenario_type", None),
        })
    merchants = [_json_safe({
        "merchant_id": merchant.merchant_id,
        "name": merchant.name,
        "category": merchant.category,
        "city": merchant.city,
        "popularity": getattr(merchant, "popularity", None),
    }) for merchant in simulator.merchants]
    transactions = []
    ground_truth = []
    for transaction in simulator.transactions:
        scenario = scenario_by_customer.get(transaction.customer_id)
        scenario_id = getattr(transaction, "scenario_id", getattr(scenario, "scenario_id", None))
        scenario_type = getattr(scenario, "scenario_type", None)
        transactions.append({
            "transaction_id": transaction.transaction_id,
            "customer_id": transaction.customer_id,
            "merchant_id": transaction.merchant_id,
            "amount": transaction.amount,
            "timestamp": transaction.timestamp,
            "city": transaction.city,
            "payment_method": transaction.payment_method,
            "device_id": transaction.device_id,
            "is_fraud": int(bool(transaction.is_fraud)),
            "scenario_id": scenario_id,
            "scenario_type": scenario_type,
            "stage": getattr(transaction, "stage", "baseline"),
            "edge_cases": "|".join(getattr(transaction, "edge_cases", [])),
        })
        ground_truth.append({
            "transaction_id": transaction.transaction_id,
            "customer_id": transaction.customer_id,
            "scenario_id": scenario_id,
            "scenario_type": scenario_type,
            "true_fraud_label": int(bool(transaction.is_fraud)),
            "attack_type": transaction.attack_type,
            "attack_id": getattr(transaction, "attack_id", None),
            "stage": getattr(transaction, "stage", "baseline"),
            "difficulty": getattr(transaction, "difficulty", None),
            "intensity": getattr(transaction, "intensity", 0.0),
            "generation_seed": getattr(transaction, "generation_seed", None),
        })
    for path, rows in ((customer_path, customers), (merchant_path, merchants), (transaction_path, transactions)):
        keys = sorted({key for row in rows for key in row})
        with open(path, "w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=keys, extrasaction="ignore")
            writer.writeheader()
            writer.writerows(rows)
    with open(scenario_path, "w", encoding="utf-8") as handle:
        for scenario in scenario_list:
            handle.write(json.dumps(_scenario_observable_dict(scenario), default=str) + "\n")
    with open(ground_truth_path, "w", encoding="utf-8") as handle:
        for record in ground_truth:
            handle.write(json.dumps(_json_safe(record), default=str) + "\n")
    return {"customers": customer_path, "merchants": merchant_path, "transactions": transaction_path, "scenarios": scenario_path, "ground_truth": ground_truth_path}


def _scenario_observable_dict(scenario: SyntheticScenario) -> dict[str, Any]:
    payload = scenario.to_dict()
    payload.pop("ground_truth", None)
    return payload


def _json_safe(value: Any) -> Any:
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_safe(item) for item in value]
    if hasattr(value, "__dict__"):
        return {key: _json_safe(item) for key, item in value.__dict__.items() if not key.startswith("_")}
    return value
