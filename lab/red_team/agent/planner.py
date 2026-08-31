from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from red_team.knowledge.attack_knowledge import ATTACK_KNOWLEDGE_BASE

VALID_DIFFICULTIES = {"easy", "medium", "hard"}


def _attack_parameter_names(attack_type: str) -> set[str]:
    if attack_type == "composite":
        return set()
    knowledge = ATTACK_KNOWLEDGE_BASE.get(attack_type, {})
    return set(knowledge.get("parameter_names", []) or [])


@dataclass(frozen=True)
class AttackPlan:
    attack_type: str
    difficulty: str
    intensity: float
    target_id: str
    rationale: str
    parameters: dict[str, Any] = field(default_factory=dict)
    component_attacks: list[str] | None = None

    @classmethod
    def from_dict(cls, payload: dict[str, Any]) -> "AttackPlan":
        if not isinstance(payload, dict):
            raise ValueError("structured plan payload must be a dictionary")
        required = ["attack_type", "difficulty", "intensity", "target_id", "rationale"]
        missing = [key for key in required if key not in payload]
        if missing:
            raise ValueError(f"missing required plan fields: {', '.join(missing)}")
        return cls(
            attack_type=payload["attack_type"],
            difficulty=payload["difficulty"],
            intensity=float(payload["intensity"]),
            target_id=str(payload["target_id"]),
            rationale=payload["rationale"],
            parameters=dict(payload.get("parameters", {}) or {}),
            component_attacks=list(payload.get("component_attacks", []) or []) if payload.get("component_attacks") is not None else None,
        )


class AttackPlanValidator:
    @staticmethod
    def validate(plan: AttackPlan | dict[str, Any]) -> AttackPlan:
        if isinstance(plan, dict):
            plan = AttackPlan.from_dict(plan)

        if not isinstance(plan, AttackPlan):
            raise ValueError("plan must be an AttackPlan or mapping")
        if not plan.attack_type:
            raise ValueError("attack_type is required")
        if plan.attack_type not in ATTACK_KNOWLEDGE_BASE and plan.attack_type != "composite":
            raise ValueError(f"unknown attack_type: {plan.attack_type}")
        if plan.difficulty not in VALID_DIFFICULTIES:
            raise ValueError("difficulty must be one of: easy, medium, hard")
        if not 0.0 <= float(plan.intensity) <= 1.0:
            raise ValueError("intensity must be between 0.0 and 1.0")
        if not plan.target_id:
            raise ValueError("target_id is required")
        if not plan.rationale:
            raise ValueError("rationale is required")
        if not isinstance(plan.parameters, dict):
            raise ValueError("parameters must be a dictionary")
        if plan.attack_type == "composite":
            if not plan.component_attacks:
                raise ValueError("composite plans require component_attacks")
            for name in plan.component_attacks:
                if name not in ATTACK_KNOWLEDGE_BASE:
                    raise ValueError(f"unknown composite component: {name}")
            valid = set(plan.parameters.keys())
            if valid and not valid.issubset({"component_count", "component_attacks"}):
                raise ValueError("unsupported composite parameters")
        elif plan.component_attacks is not None:
            for name in plan.component_attacks:
                if name not in ATTACK_KNOWLEDGE_BASE:
                    raise ValueError(f"unknown component attack: {name}")

        planner_metadata = {"signals", "candidate_scores", "selected_score", "applicable_attacks"}
        attack_parameters = set(plan.parameters) - planner_metadata
        if plan.parameters:
            allowed = _attack_parameter_names(plan.attack_type)
            if plan.attack_type != "composite" and not attack_parameters.issubset(allowed):
                unsupported = sorted(attack_parameters - allowed)
                raise ValueError(f"unsupported parameters for {plan.attack_type}: {unsupported}")

        return plan
