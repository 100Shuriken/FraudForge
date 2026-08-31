ATTACK_KNOWLEDGE_BASE = {
    "behavioral_drift": {
        "attack_type": "behavioral_drift",
        "modality": "transaction",
        "target_surface": "customer spending profile",
        "description": "Subtle spending pattern drift that shifts amounts or merchant choices over time.",
        "GenAI_enablement": "Synthetic trend modeling can amplify realistic spending drift while keeping the attack defensive and paper-based.",
        "observable_signals": [
            "amount inflation",
            "merchant preference drift",
            "recurring timing shifts",
            "transaction amount volatility"
        ],
        "compatible_target_types": ["customer"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["amount_deviation", "spending_shift", "merchant_bias"]
    },
    "device_switch": {
        "attack_type": "device_switch",
        "modality": "transaction",
        "target_surface": "device and session continuity",
        "description": "A legitimate user is temporarily replaced by a new device context during high-risk transactions.",
        "GenAI_enablement": "Synthetic device context generation can create realistic but non-sensitive session variants for testing.",
        "observable_signals": [
            "new device fingerprint",
            "device continuity break",
            "session mismatch",
            "unusual login context"
        ],
        "compatible_target_types": ["customer"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["device_change_likelihood", "session_shift", "device_similarity"]
    },
    "velocity_anomaly": {
        "attack_type": "velocity_anomaly",
        "modality": "transaction",
        "target_surface": "transaction frequency",
        "description": "A burst of unusually frequent transactions that deviates from the customer's historical cadence.",
        "GenAI_enablement": "Generative logic can synthesize realistic burst patterns that are testing-only and stateless.",
        "observable_signals": [
            "transaction burst",
            "high-frequency sequence",
            "timing concentration",
            "above-usual activity volume"
        ],
        "compatible_target_types": ["customer"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["transaction_frequency", "burst_window", "frequency_multiplier"]
    },
    "phishing": {
        "attack_type": "phishing",
        "modality": "text_url",
        "target_surface": "communication channel",
        "description": "Synthetic messages and URLs impersonate trusted support or account workflows to steer a target to a dangerous action.",
        "GenAI_enablement": "Language generation can craft message variants while preserving a defensive, offline-only demonstration context.",
        "observable_signals": [
            "urgent language",
            "URL impersonation",
            "trust spoofing",
            "credential lure language"
        ],
        "compatible_target_types": ["user", "account_holder"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["urgency_score", "impersonation_score", "channel"]
    },
    "vishing": {
        "attack_type": "vishing",
        "modality": "audio_metadata",
        "target_surface": "voice-based contact channel",
        "description": "Synthetic voice scripts combine urgency and impersonation to pressure a target into unsafe behaviors.",
        "GenAI_enablement": "Speech-style synthesis can create scripted interactions without training or real voice cloning.",
        "observable_signals": [
            "pressure tactics",
            "voice impersonation",
            "call urgency",
            "scripted emotional cues"
        ],
        "compatible_target_types": ["user", "account_holder"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["emotional_pressure_score", "impersonation_score", "synthetic_audio_available"]
    },
    "video_deepfake": {
        "attack_type": "video_deepfake",
        "modality": "video_metadata",
        "target_surface": "visual identity verification",
        "description": "Synthetic media attempts to impersonate a trusted subject during visual verification or identity review.",
        "GenAI_enablement": "Generative media can be emulated as metadata-only synthetic artifacts for defensive testing and red-team planning.",
        "observable_signals": [
            "face inconsistency",
            "lip sync mismatch",
            "lighting anomalies",
            "visual identity mismatch"
        ],
        "compatible_target_types": ["user", "identity_subject"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["identity_match_score", "liveness_score", "face_consistency_score"]
    },
    "synthetic_identity": {
        "attack_type": "synthetic_identity",
        "modality": "identity_document_metadata",
        "target_surface": "identity enrollment and document checks",
        "description": "A fabricated identity uses inconsistent identity attributes to pass weak validation systems.",
        "GenAI_enablement": "Generative identity metadata can mimic realistic document variation without real identity theft or credential collection.",
        "observable_signals": [
            "document inconsistency",
            "address mismatch",
            "duplicate signal",
            "identity linkage gaps"
        ],
        "compatible_target_types": ["user", "identity"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["duplicate_signal_score", "document_tampering_score", "identity_linkage_score"]
    },
    "account_takeover": {
        "attack_type": "account_takeover",
        "modality": "behavioral_biometric",
        "target_surface": "session and authentication behavior",
        "description": "Account takeover leverages anomalous login context, device changes, and behavioural deviations to compromise a session.",
        "GenAI_enablement": "Behavioral synthesis can generate realistic anomaly patterns for structured offline planning without live credential theft.",
        "observable_signals": [
            "unexpected device",
            "location drift",
            "failed login burst",
            "session velocity anomaly"
        ],
        "compatible_target_types": ["customer", "account"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["location_change_distance", "typing_speed_deviation", "authentication_risk"]
    },
    "sleeper_transaction_pacing": {
        "attack_type": "sleeper_transaction_pacing",
        "modality": "transaction_sequence",
        "target_surface": "sequence-level spending pattern",
        "description": "A synthetic multi-day pacing pattern that keeps individual transactions plausible while the sequence quietly clusters around a controlled threshold.",
        "GenAI_enablement": "This is a purely synthetic defensive research attack used to test sequence-level detection logic without real-world fraud thresholds.",
        "observable_signals": [
            "sequence-level threshold proximity",
            "rolling-window drift",
            "pacing consistency",
            "day-level activity clustering"
        ],
        "compatible_target_types": ["customer"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["synthetic_threshold", "threshold_proximity", "pacing_consistency", "rolling_7d_velocity"]
    },
    "adversarial_probing": {
        "attack_type": "adversarial_probing",
        "modality": "local_classifier",
        "target_surface": "synthetic classifier boundary",
        "description": "A bounded search that minimally perturbs a local synthetic feature vector to reveal the decision boundary of a mock classifier without targetting real systems.",
        "GenAI_enablement": "This is a synthetic defensive probing attack used to study local model weakness discovery in a controlled lab setting.",
        "observable_signals": [
            "minimal perturbation search",
            "boundary crossing",
            "feature sensitivity",
            "bounded risk signal drift"
        ],
        "compatible_target_types": ["customer", "local_classifier"],
        "suitable_difficulties": ["easy", "medium", "hard"],
        "parameter_names": ["amount", "hour", "device_risk_signal", "location_risk_signal", "velocity_signal", "merchant_category"]
    }
}


def get_attack_knowledge() -> dict[str, dict[str, object]]:
    return ATTACK_KNOWLEDGE_BASE.copy()
