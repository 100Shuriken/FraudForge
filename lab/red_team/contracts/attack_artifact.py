from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any


def _json_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, dict):
        return {key: _json_value(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [_json_value(item) for item in value]
    return value


@dataclass(frozen=True)
class AttackArtifact:
    attack_id: str
    attack_type: str
    target_user: str
    modality: str
    timestamp: Any
    payload: dict[str, Any]
    context: dict[str, Any]
    ground_truth: dict[str, Any]

    @classmethod
    def from_record(cls, record: dict[str, Any]) -> "AttackArtifact":
        payload = dict(record.get("payload", {}))
        timestamp = payload.get("timestamp", payload.get("timestamps"))
        return cls(
            attack_id=record["attack_id"],
            attack_type=record["attack_type"],
            target_user=record["target_id"],
            modality=record["modality"],
            timestamp=timestamp,
            payload=payload,
            context=dict(record.get("metadata", {})),
            ground_truth={
                "is_fraud": record.get("is_fraud", True),
                "attack_type": record["attack_type"],
            },
        )

    def to_dict(self) -> dict[str, Any]:
        return _json_value({
            "attack_id": self.attack_id,
            "attack_type": self.attack_type,
            "target_user": self.target_user,
            "modality": self.modality,
            "timestamp": self.timestamp,
            "payload": self.payload,
            "context": self.context,
            "ground_truth": self.ground_truth,
        })

    def to_json(self) -> str:
        return json.dumps(self.to_dict())