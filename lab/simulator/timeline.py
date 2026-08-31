from dataclasses import dataclass, field
from datetime import datetime
from typing import Any


TIMELINE_STAGES = (
    "baseline",
    "reconnaissance",
    "subtle_deviation",
    "escalation",
    "attack_peak",
    "cash_out",
)


@dataclass
class TimelineEvent:
    timestamp: datetime
    stage: str
    event_type: str
    customer_id: str
    transaction_id: str | None = None
    is_fraud: bool = False
    attack_type: str | None = None
    metadata: dict[str, Any] = field(default_factory=dict)


@dataclass
class BehavioralTimeline:
    customer_id: str
    events: list[TimelineEvent] = field(default_factory=list)

    def add_event(self, event: TimelineEvent) -> TimelineEvent:
        if event.customer_id != self.customer_id:
            raise ValueError("event customer_id does not match timeline")
        if event.stage not in TIMELINE_STAGES:
            raise ValueError(f"unknown timeline stage: {event.stage}")
        self.events.append(event)
        self.events.sort(key=lambda item: item.timestamp)
        return event

    @property
    def transactions(self) -> list[TimelineEvent]:
        return [event for event in self.events if event.transaction_id is not None]

    def stage_counts(self) -> dict[str, int]:
        return {stage: sum(event.stage == stage for event in self.events) for stage in TIMELINE_STAGES}
