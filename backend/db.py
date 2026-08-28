import os
from contextlib import contextmanager
from typing import Iterator

import psycopg


@contextmanager
def connection() -> Iterator[psycopg.Connection]:
    database_url = os.getenv("DATABASE_URL", "").strip()
    if not database_url:
        raise RuntimeError("DATABASE_URL is not configured")
    with psycopg.connect(database_url) as conn:
        yield conn


def save_event(event: dict, decision: dict) -> None:
    with connection() as conn:
        conn.execute(
            """
            INSERT INTO fraud_events (
                provider, provider_event_id, payload, risk_score, recommended_action,
                reasons, mode
            ) VALUES (%s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (provider, provider_event_id) DO NOTHING
            """,
            (
                "mastercard",
                event["provider_event_id"],
                event,
                decision["score"],
                decision["action"],
                decision["reasons"],
                "shadow",
            ),
        )
        conn.commit()