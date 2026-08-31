# Latest Blue Team Dataset

Generated from the repository's `PaymentSimulator`, `HighFidelityGenerator`, and `ScenarioGenerator`.

- Seed: `2026`
- Customers: 1000
- Merchants: 120
- Transactions: 10200
- Fraudulent transactions: 200
- Legitimate transactions: 10000
- Fraud rate: 1.96%
- Cities: 5
- Merchant categories: 6
- Payment methods: 3
- Unique devices: 1000

## Files

- `customers.csv`: one row per synthetic customer, including stable profile and scenario assignment fields.
- `merchants.csv`: one row per synthetic merchant, including category, city, and popularity.
- `transactions.csv`: one row per transaction. The supervised ML target is `is_fraud` (`0` legitimate, `1` synthetic fraud). `scenario_type`, `scenario_id`, `stage`, and `edge_cases` are contextual metadata; do not use them as predictive features for a leakage-safe model.
- `scenarios.jsonl`: observable scenario context. Hidden ground truth is intentionally excluded.
- `ground_truth.jsonl`: Red Team evaluation metadata, including `attack_type`, true label, stage, difficulty, intensity, and seed. Keep this file out of model training features.

## Scenario distribution

- TRANSACTION_ANOMALY: 200
- COMMUNICATION_SCAM: 200
- KYC_IDENTITY: 200
- LONGITUDINAL_BEHAVIOR: 200
- CLASSIFIER_EVALUATION: 200

## Attack metadata distribution

- account_takeover: 50
- behavioral_drift: 50
- device_switch: 50
- velocity_anomaly: 50

## AUTO attack reachability

This is an evidence-based planner reachability report, not fabricated attack execution. Each scenario was passed through the existing offline planner using observable context only.

- account_takeover: 21
- adversarial_probing: 200
- behavioral_drift: 67
- device_switch: 196
- phishing: 131
- sleeper_transaction_pacing: 69
- synthetic_identity: 94
- velocity_anomaly: 68
- video_deepfake: 106
- vishing: 48

## Regenerate

```bash
./.venv/bin/python scripts/generate_latest_dataset.py
```

All values are synthetic, local, deterministic, and non-deployable. No external APIs or credentials are used.
