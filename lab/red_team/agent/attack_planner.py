from __future__ import annotations

import json
import os
import random
from abc import ABC, abstractmethod
from typing import Any

try:
    from openai import OpenAI
except ImportError:  # pragma: no cover - handled in provider selection
    OpenAI = None

from red_team.agent.planner import AttackPlan, AttackPlanValidator
from red_team.knowledge.attack_knowledge import ATTACK_KNOWLEDGE_BASE


class LLMProvider(ABC):
    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def plan(self, target: Any, context: dict[str, Any]) -> dict[str, Any]:
        raise NotImplementedError


class Planner(ABC):
    @abstractmethod
    def plan(self, target: Any, context: dict[str, Any]) -> AttackPlan:
        raise NotImplementedError


class OfflineFallbackPlanner(Planner):
    ATTACK_PROFILES = {
        "behavioral_drift": {
            "signals": ("spending_regularity", "amount_deviation", "temporal_consistency"),
            "weights": (0.45, 0.40, 0.15),
        },
        "device_switch": {
            "signals": ("device_stability", "location_consistency", "payment_method_stability"),
            "weights": (0.45, 0.30, 0.25),
        },
        "velocity_anomaly": {
            "signals": ("transaction_frequency", "velocity_signal", "rolling_transaction_count"),
            "weights": (0.25, 0.50, 0.25),
        },
        "sleeper_transaction_pacing": {
            "signals": ("spending_regularity", "threshold_proximity", "temporal_consistency"),
            "weights": (0.35, 0.45, 0.20),
        },
        "account_takeover": {
            "signals": ("device_stability", "location_consistency", "payment_method_stability", "amount_deviation"),
            "weights": (0.25, 0.25, 0.20, 0.30),
        },
        "synthetic_identity": {
            "signals": ("identity_profile_inconsistency", "demographic_payment_inconsistency", "onboarding_anomaly"),
            "weights": (0.45, 0.30, 0.25),
        },
        "video_deepfake": {
            "signals": ("kyc_identity_scenario", "identity_profile_inconsistency", "impersonation_opportunity"),
            "weights": (0.35, 0.35, 0.30),
        },
        "phishing": {
            "signals": ("communication_scenario", "link_context", "account_payment_context"),
            "weights": (0.30, 0.45, 0.25),
        },
        "vishing": {
            "signals": ("communication_scenario", "voice_context", "account_payment_context"),
            "weights": (0.25, 0.50, 0.25),
        },
        "adversarial_probing": {
            "signals": ("classifier_target_available",),
            "weights": (1.0,),
        },
    }

    def __init__(self, seed: int | None = None, simulator: Any | None = None):
        self.seed = seed
        self.simulator = simulator
        self.random = random.Random(seed)

    def _get_target_id(self, target: Any) -> str:
        return getattr(target, "customer_id", getattr(target, "id", "UNKNOWN_TARGET"))

    def _history(self, target: Any, context: dict[str, Any]) -> list[Any]:
        if context.get("transaction_history") is not None:
            return list(context["transaction_history"])
        if self.simulator is not None:
            target_id = self._get_target_id(target)
            return [transaction for transaction in self.simulator.transactions if transaction.customer_id == target_id]
        return []

    def extract_signals(self, target: Any, context: dict[str, Any]) -> dict[str, float | bool]:
        scenario = context.get("scenario")
        if scenario is not None and hasattr(scenario, "observable_context"):
            scenario_context = scenario.observable_context()
            scenario_context.update({key: value for key, value in context.items() if key != "scenario"})
            context = scenario_context
        history = self._history(target, context)
        transaction = context.get("transaction")
        if transaction is None:
            transaction = context.get("selected_transaction")
        if transaction is None and history:
            transaction = history[-1]

        average = max(float(getattr(target, "average_transaction_amount", context.get("average_transaction_amount", 1.0))), 1.0)
        expected_daily = max(float(getattr(target, "daily_transaction_count", context.get("daily_transaction_count", 1.0))), 1.0)
        amount = float(getattr(transaction, "amount", context.get("transaction_amount", average)))
        amount_deviation = min(1.0, abs(amount - average) / average)
        amounts = [float(item.amount) for item in history]
        amount_mean = sum(amounts) / max(len(amounts), 1)
        amount_variance = sum((value - amount_mean) ** 2 for value in amounts) / max(len(amounts), 1)
        spending_regularity = max(0.0, min(1.0, 1.0 - (amount_variance ** 0.5) / max(amount_mean, 1.0)))

        transaction_date = getattr(transaction, "timestamp", None)
        recent = [item for item in history if transaction_date is not None and abs((item.timestamp - transaction_date).total_seconds()) <= 7 * 86400]
        rolling_transaction_count = min(1.0, len(recent) / (expected_daily * 7))
        transaction_frequency = min(1.0, len(history) / (expected_daily * 30))
        velocity_signal = min(1.0, rolling_transaction_count * 1.5)

        usual_device = getattr(target, "usual_device", context.get("usual_device"))
        usual_payment = getattr(target, "usual_payment_method", context.get("usual_payment_method"))
        usual_city = getattr(target, "city", context.get("city"))
        start_hour = int(getattr(target, "usual_start_hour", context.get("usual_start_hour", 0)))
        end_hour = int(getattr(target, "usual_end_hour", context.get("usual_end_hour", 23)))
        devices = [item.device_id == usual_device for item in history if hasattr(item, "device_id")]
        payments = [item.payment_method == usual_payment for item in history if hasattr(item, "payment_method")]
        cities = [item.city == usual_city for item in history if hasattr(item, "city")]
        device_stability = sum(devices) / max(len(devices), 1)
        payment_method_stability = sum(payments) / max(len(payments), 1)
        location_consistency = sum(cities) / max(len(cities), 1)

        merchant_categories = context.get("merchant_categories", [])
        preferred = set(getattr(target, "favourite_categories", context.get("preferred_categories", [])) or [])
        category_consistency = sum(category in preferred for category in merchant_categories) / max(len(merchant_categories), 1)
        hour = getattr(transaction_date, "hour", None)
        temporal_consistency = 1.0 if hour is None or start_hour <= hour <= end_hour else 0.0
        threshold = average * 1.6
        threshold_proximity = max(0.0, 1.0 - abs(amount - threshold) / max(threshold, 1.0))
        off_hour_signal = 1.0 - temporal_consistency
        current_merchant = getattr(transaction, "merchant_id", context.get("merchant_id"))
        prior_merchants = {item.merchant_id for item in history if item is not transaction}
        new_merchant_signal = float(bool(current_merchant and current_merchant not in prior_merchants))
        current_city = getattr(transaction, "city", context.get("transaction_city", usual_city))
        new_city_signal = float(current_city != usual_city)

        signals: dict[str, float | bool] = {
            "amount_deviation": round(amount_deviation, 6),
            "transaction_frequency": round(transaction_frequency, 6),
            "velocity_signal": round(velocity_signal, 6),
            "rolling_transaction_count": round(rolling_transaction_count, 6),
            "device_stability": round(device_stability, 6),
            "payment_method_stability": round(payment_method_stability, 6),
            "category_consistency": round(category_consistency, 6),
            "temporal_consistency": round(temporal_consistency, 6),
            "location_consistency": round(location_consistency, 6),
            "spending_regularity": round(spending_regularity, 6),
            "threshold_proximity": round(threshold_proximity, 6),
            "off_hour_signal": round(off_hour_signal, 6),
            "new_merchant_signal": round(new_merchant_signal, 6),
            "new_city_signal": round(new_city_signal, 6),
        }
        signals.update({
            "identity_profile_inconsistency": float(bool(context.get("identity_profile"))),
            "demographic_payment_inconsistency": float(bool(context.get("identity_profile"))),
            "onboarding_anomaly": float(bool(context.get("onboarding_anomaly"))),
            "kyc_identity_scenario": float(bool(context.get("kyc_identity_scenario"))),
            "impersonation_opportunity": float(bool(context.get("impersonation_opportunity") or context.get("video_verification_available"))),
            "communication_scenario": float(bool(context.get("communication_scenario"))),
            "account_payment_context": float(bool(transaction)),
            "classifier_target_available": bool(context.get("classifier")),
            "communication_scenario": float(bool(context.get("communication_scenario"))),
            "sender_anomaly": float(1.0 - float(context.get("sender_trust_score", 1.0))),
            "payment_request_signal": float(bool(context.get("payment_request"))),
            "document_anomaly_score": float(context.get("document_anomaly_score", 0.0)),
            "video_context_available": float(bool(context.get("video_verification_available"))),
            "voice_context": float(bool(context.get("voice_context"))),
            "link_context": float(float(context.get("suspicious_link_indicator", 0.0)) >= 0.5),
            "video_identity_evidence": float(bool(context.get("video_verification_available"))) * (1.0 - float(context.get("liveness_score", 1.0))),
            "longitudinal_context": float(bool(context.get("transaction_sequence_scenario"))),
        })
        for key in ("amount_deviation", "transaction_frequency", "velocity_signal", "rolling_transaction_count", "spending_regularity", "threshold_proximity", "temporal_consistency"):
            if key in context:
                signals[key] = round(float(context[key]), 6)
        return signals

    def _candidate_attack(self, target: Any, context: dict[str, Any]) -> dict[str, Any]:
        scenario = context.get("scenario")
        scenario_type = getattr(scenario, "scenario_type", context.get("scenario_type", "")).upper()
        signals = self.extract_signals(target, context)
        applicable: list[str] = []
        scores: dict[str, float] = {}
        transaction_attacks = {
            "behavioral_drift",
            "device_switch",
            "velocity_anomaly",
            "sleeper_transaction_pacing",
            "account_takeover",
        }
        transaction_available = True
        scenario_attack_types = {
            "TRANSACTION_ANOMALY": {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"},
            "COMMUNICATION_SCAM": {"phishing", "vishing", "account_takeover"},
            "KYC_IDENTITY": {"synthetic_identity", "video_deepfake"},
            "LONGITUDINAL_BEHAVIOR": {"sleeper_transaction_pacing", "behavioral_drift", "velocity_anomaly"},
            "CLASSIFIER_EVALUATION": {"adversarial_probing"},
        }
        for attack_name, profile in self.ATTACK_PROFILES.items():
            if scenario_type in scenario_attack_types and attack_name not in scenario_attack_types[scenario_type]:
                continue
            required = profile["signals"]
            scenario_available = (
                bool(context.get("transaction_sequence_scenario")) if attack_name == "sleeper_transaction_pacing"
                else transaction_available if attack_name in transaction_attacks
                else bool(context.get("identity_profile")) if attack_name == "synthetic_identity"
                else bool(context.get("kyc_identity_scenario")) if attack_name == "video_deepfake"
                else bool(context.get("communication_scenario")) if attack_name in {"phishing", "vishing"}
                else bool(context.get("classifier"))
            )
            if scenario_available and all(signal in signals for signal in required):
                applicable.append(attack_name)
                values = [self._suitability_value(attack_name, signal, float(signals[signal])) for signal in required]
                scores[attack_name] = round(sum(value * weight for value, weight in zip(values, profile["weights"])), 6)
        if not applicable:
            raise ValueError("no applicable offline attack for supplied context")
        chosen = max(applicable, key=lambda name: scores[name])
        knowledge = ATTACK_KNOWLEDGE_BASE[chosen]
        top_signals = sorted(
            ((signal, self._suitability_value(chosen, signal, float(signals[signal])) * weight) for signal, weight in zip(self.ATTACK_PROFILES[chosen]["signals"], self.ATTACK_PROFILES[chosen]["weights"])),
            key=lambda item: item[1], reverse=True
        )
        rationale = self._rationale(chosen, top_signals, signals)
        parameters = {
            "signals": signals,
            "candidate_scores": scores,
            "selected_score": scores[chosen],
            "applicable_attacks": applicable,
        }
        if chosen == "device_switch":
            parameters.update({"device_change_likelihood": round(max(0.1, 1.0 - float(signals["device_stability"])), 3), "session_shift": 0.75})
        elif chosen == "velocity_anomaly":
            parameters.update({"transaction_frequency": round(float(signals["transaction_frequency"]), 3), "frequency_multiplier": round(1.2 + float(signals["velocity_signal"]) * 2.0, 3)})
        elif chosen == "behavioral_drift":
            parameters.update({"amount_deviation": round(float(signals["amount_deviation"]), 3), "spending_shift": round(1.0 - float(signals["spending_regularity"]), 3)})
        elif chosen == "account_takeover":
            parameters.update({"location_change_distance": round(20 + float(signals["amount_deviation"]) * 80, 2), "typing_speed_deviation": round(1.0 - float(signals["device_stability"]), 3), "authentication_risk": round(1.0 - float(signals["location_consistency"]), 3)})
        attack = {
            "attack_type": chosen,
            "difficulty": self._difficulty_for(chosen, {**context, "signals": signals}),
            "intensity": self._intensity_for(chosen, {**context, "signals": signals}),
            "target_id": self._get_target_id(target),
            "rationale": rationale,
            "parameters": parameters,
            "knowledge": knowledge,
        }
        return attack

    def _suitability_value(self, attack_name: str, signal: str, value: float) -> float:
        if attack_name in {"behavioral_drift", "account_takeover"} and signal == "spending_regularity":
            return 1.0 - value
        if attack_name in {"device_switch", "account_takeover"} and signal in {"device_stability", "location_consistency", "payment_method_stability"}:
            return 1.0 - value
        return value

    def _rationale(self, attack_name: str, contributions: list[tuple[str, float]], signals: dict[str, float | bool]) -> str:
        lead_signal, lead_value = contributions[0]
        labels = {
            "transaction_frequency": "Transaction frequency",
            "velocity_signal": "Rolling velocity signal",
            "amount_deviation": "Amount deviation",
            "spending_regularity": "Spending regularity",
            "threshold_proximity": "Threshold proximity",
            "device_stability": "Device stability",
            "location_consistency": "Location consistency",
            "payment_method_stability": "Payment-method stability",
            "temporal_consistency": "Temporal consistency",
            "rolling_transaction_count": "Rolling transaction count",
        }
        lead_label = labels.get(lead_signal, lead_signal.replace("_", " ").title())
        if attack_name == "phishing":
            return f"The active {str(signals.get('communication_channel', 'communication')).lower()} context has sender anomaly {float(signals.get('sender_anomaly', 0.0)):.2f}, a payment-request indicator, and elevated urgency, supporting a synthetic phishing scenario."
        if attack_name == "vishing":
            return f"The synthetic communication context exposes elevated sender anomaly and payment-request evidence on a voice-capable channel, supporting a vishing simulation."
        if attack_name == "synthetic_identity":
            return f"Identity evidence shows document anomaly {float(signals.get('document_anomaly_score', 0.0)):.2f} with cross-field inconsistency, making synthetic_identity the strongest applicable KYC scenario."
        if attack_name == "video_deepfake":
            return f"KYC context includes video verification and identity mismatch evidence, supporting a metadata-only synthetic video identity scenario."
        if attack_name == "sleeper_transaction_pacing":
            return f"The longitudinal history exposes rolling totals and pacing evidence across {int(signals.get('rolling_transaction_count', 0) * 7)} recent observations, supporting sleeper transaction pacing."
        if attack_name == "adversarial_probing":
            return "A local synthetic classifier context is available with a bounded perturbation budget and known baseline score near the decision boundary."
        if attack_name == "velocity_anomaly":
            return f"{lead_label} is {float(signals[lead_signal]):.3f} and the rolling transaction features support a burst scenario, making velocity_anomaly the strongest applicable attack."
        return f"{lead_label} contributes {lead_value:.3f} to the suitability score, making {attack_name} the strongest applicable attack for this observed context."

    def _difficulty_for(self, attack_name: str, context: dict[str, Any]) -> str:
        signals = context.get("signals", context)
        if attack_name in {"device_switch", "account_takeover"}:
            return "hard" if float(signals.get("location_consistency", 0.5)) > 0.9 else "medium"
        if attack_name == "velocity_anomaly":
            return "easy" if float(signals.get("velocity_signal", 0.5)) > 0.5 else "medium"
        return "medium"

    def _intensity_for(self, attack_name: str, context: dict[str, Any]) -> float:
        signals = context.get("signals", context)
        if attack_name == "device_switch":
            return round(0.25 + float(signals.get("device_stability", 0.5)) * 0.45, 3)
        if attack_name == "velocity_anomaly":
            return round(0.2 + float(signals.get("velocity_signal", 0.5)) * 0.7, 3)
        if attack_name == "behavioral_drift":
            return round(0.2 + float(signals.get("amount_deviation", 0.5)) * 0.6, 3)
        return round(0.3 + float(signals.get("amount_deviation", 0.5)) * 0.5, 3)

    def plan(self, target: Any, context: dict[str, Any]) -> AttackPlan:
        candidate = self._candidate_attack(target, context)
        plan = AttackPlan(
            attack_type=candidate["attack_type"],
            difficulty=candidate["difficulty"],
            intensity=candidate["intensity"],
            target_id=candidate["target_id"],
            rationale=candidate["rationale"],
            parameters=candidate["parameters"],
        )
        AttackPlanValidator.validate(plan)
        return plan


class LLMPlanner(Planner):
    def __init__(self, provider: LLMProvider | None = None):
        self.provider = provider
        self.last_mode = "OFFLINE FALLBACK"

    def plan(self, target: Any, context: dict[str, Any]) -> AttackPlan:
        fallback = OfflineFallbackPlanner(seed=0)
        if self.provider is None or not self.provider.is_configured():
            self.last_mode = "OFFLINE FALLBACK"
            return fallback.plan(target, context)

        try:
            raw = self.provider.plan(target, context)
            if isinstance(raw, str):
                try:
                    raw = json.loads(raw)
                except json.JSONDecodeError as exc:
                    raise ValueError("LLM provider returned invalid JSON") from exc
            if not isinstance(raw, dict):
                raise ValueError("LLM provider returned non-dictionary output")

            expected_target_id = getattr(target, "customer_id", getattr(target, "id", None))
            if expected_target_id is not None and raw.get("target_id") not in (None, expected_target_id):
                raise ValueError("LLM target mismatch")

            plan = AttackPlan.from_dict(raw)
            AttackPlanValidator.validate(plan)
            self.last_mode = "GENAI"
            return plan
        except (ValueError, TypeError, AttributeError, KeyError):
            self.last_mode = "OFFLINE FALLBACK"
            return fallback.plan(target, context)


class OpenAIProvider(LLMProvider):
    def __init__(self, api_key: str | None = None, model: str | None = None, client: Any | None = None):
        self.api_key = api_key or os.getenv("OPENAI_API_KEY")
        self.model = model or os.getenv("OPENAI_MODEL_NAME", "gpt-4o-mini")
        self.client = client or (OpenAI(api_key=self.api_key) if OpenAI is not None and self.api_key else None)

    def is_configured(self) -> bool:
        return bool(self.api_key and self.client is not None)

    def _knowledge_subset(self) -> dict[str, dict[str, Any]]:
        relevant = [
            "behavioral_drift",
            "device_switch",
            "velocity_anomaly",
            "phishing",
            "vishing",
            "video_deepfake",
            "synthetic_identity",
            "account_takeover",
        ]
        subset: dict[str, dict[str, Any]] = {}
        for name in relevant:
            item = ATTACK_KNOWLEDGE_BASE.get(name)
            if item:
                subset[name] = {
                    "attack_type": item["attack_type"],
                    "modality": item["modality"],
                    "target_surface": item["target_surface"],
                    "description": item["description"],
                    "observable_signals": item["observable_signals"],
                    "parameter_names": item["parameter_names"],
                }
        return subset

    def _target_payload(self, target: Any, context: dict[str, Any]) -> dict[str, Any]:
        return {
            "customer_id": getattr(target, "customer_id", getattr(target, "id", "UNKNOWN_TARGET")),
            "city": getattr(target, "city", context.get("city")),
            "average_transaction_amount": getattr(target, "average_transaction_amount", context.get("average_transaction_amount")),
            "transaction_frequency": context.get("transaction_frequency"),
            "usual_device": getattr(target, "usual_device", context.get("usual_device")),
            "preferred_categories": list(getattr(target, "favourite_categories", context.get("preferred_categories", [])) or []),
            "behavioral_summary": {
                "daily_transaction_count": getattr(target, "daily_transaction_count", context.get("daily_transaction_count")),
                "usual_start_hour": getattr(target, "usual_start_hour", context.get("usual_start_hour")),
                "usual_end_hour": getattr(target, "usual_end_hour", context.get("usual_end_hour")),
            },
        }

    def plan(self, target: Any, context: dict[str, Any]) -> dict[str, Any]:
        if not self.is_configured():
            raise ValueError("OpenAI provider not configured")

        system_prompt = (
            "You are a defensive Red Team attack planner for a synthetic payment-security laboratory. "
            "Your job is NOT to perform a real-world attack. Your job is to choose an existing synthetic attack tool "
            "that can generate adversarial training/stress-test data. You may ONLY select attack types registered in the supplied attack knowledge base. "
            "You must return a structured AttackPlan. You must NOT invent new attack tools. You must NOT output executable attack instructions. "
            "You must reason using the supplied synthetic customer profile."
        )

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": json.dumps({
                "target": self._target_payload(target, context),
                "attack_knowledge": self._knowledge_subset(),
                "output_schema": {
                    "attack_type": "str",
                    "difficulty": "easy|medium|hard",
                    "intensity": 0.0,
                    "target_id": "str",
                    "rationale": "str",
                    "parameters": {},
                    "component_attacks": []
                },
            }, separators=(",", ":"))}
        ]

        response = self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            response_format={"type": "json_object"},
            temperature=0.2,
            max_tokens=500,
        )

        raw_text = response.choices[0].message.content
        if not raw_text:
            raise ValueError("OpenAI provider returned empty content")
        try:
            parsed = json.loads(raw_text)
        except json.JSONDecodeError as exc:
            raise ValueError("OpenAI provider returned invalid JSON") from exc
        return parsed


def select_planner(provider: LLMProvider | None = None) -> Planner:
    if provider is not None:
        return LLMPlanner(provider=provider) if provider.is_configured() else OfflineFallbackPlanner(seed=0)

    api_key = os.getenv("OPENAI_API_KEY")
    if api_key and OpenAI is not None:
        return LLMPlanner(provider=OpenAIProvider(api_key=api_key))
    return OfflineFallbackPlanner(seed=0)
