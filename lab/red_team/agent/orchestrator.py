from __future__ import annotations

from typing import Any

from red_team.agent.attack_planner import OfflineFallbackPlanner
from red_team.agent.planner import AttackPlan, AttackPlanValidator
from red_team.attack_registry import AttackRegistry
from red_team.knowledge.attack_knowledge import ATTACK_KNOWLEDGE_BASE


class AttackOrchestrator:
    def __init__(self, registry: AttackRegistry, planner: Any | None = None, seed: int | None = None):
        self.registry = registry
        self.seed = seed
        self.planner = planner or OfflineFallbackPlanner(seed=seed)

    def observe(self, target: Any) -> dict[str, Any]:
        context: dict[str, Any] = {
            "target_id": getattr(target, "customer_id", getattr(target, "id", "UNKNOWN_TARGET")),
            "device_consistency": 0.9,
            "transaction_frequency": 0.5,
            "spending_regularity": 0.7,
            "authentication_risk": 0.5,
        }
        if hasattr(target, "usual_device"):
            context["device_consistency"] = 0.95
        if hasattr(target, "daily_transaction_count"):
            context["transaction_frequency"] = min(1.0, max(0.0, target.daily_transaction_count / 10.0))
        if hasattr(target, "average_transaction_amount"):
            context["spending_regularity"] = 0.75 if target.average_transaction_amount > 3000 else 0.9
        context["authentication_risk"] = 0.65 if getattr(target, "city", "") in {"Pune", "Bangalore", "Delhi"} else 0.45
        return context

    def retrieve_knowledge(self, attack_type: str) -> dict[str, Any]:
        if attack_type not in ATTACK_KNOWLEDGE_BASE:
            raise ValueError(f"unknown attack_type: {attack_type}")
        return ATTACK_KNOWLEDGE_BASE[attack_type]

    def plan(self, target: Any, context: dict[str, Any] | None = None) -> AttackPlan:
        context = context or self.observe(target)
        plan = self.planner.plan(target, context)
        AttackPlanValidator.validate(plan)
        return plan

    def execute(self, plan: AttackPlan | dict[str, Any], target: Any, **kwargs: Any):
        validated = AttackPlanValidator.validate(plan)
        return self.registry.execute_plan(validated, target, **kwargs)

    def run(self, target: Any, context: dict[str, Any] | None = None, **kwargs: Any):
        plan = self.plan(target, context)
        return self.execute(plan, target, **kwargs)
