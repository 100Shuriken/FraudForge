CREATE TABLE IF NOT EXISTS fraud_events (
    id BIGSERIAL PRIMARY KEY,
    provider TEXT NOT NULL,
    provider_event_id TEXT NOT NULL,
    payload JSONB NOT NULL,
    risk_score NUMERIC(6, 4) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
    recommended_action TEXT NOT NULL CHECK (recommended_action IN ('allow', 'review')),
    reasons TEXT[] NOT NULL,
    mode TEXT NOT NULL DEFAULT 'shadow' CHECK (mode = 'shadow'),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_event_id)
);

CREATE INDEX IF NOT EXISTS fraud_events_created_at_idx ON fraud_events (created_at DESC);
CREATE INDEX IF NOT EXISTS fraud_events_action_idx ON fraud_events (recommended_action);