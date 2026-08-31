from __future__ import annotations

import csv
import json
import math
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from simulator.scenario import SCENARIO_TYPES, ScenarioGenerator, export_dataset_files
from simulator.simulator import PaymentSimulator
from red_team.agent.attack_planner import OfflineFallbackPlanner


CUSTOMERS = 1000
MERCHANTS = 120
TRANSACTIONS = 10000
SEED = 2026
FRAUD_RATE = 0.20
OUTPUT_DIR = ROOT / "data" / "latest"


def read_rows(path: Path) -> list[dict[str, str]]:
    with path.open(newline="", encoding="utf-8") as handle:
        return list(csv.DictReader(handle))


def validate(simulator: PaymentSimulator, scenarios: list, files: dict[str, str]) -> dict[str, object]:
    customers = read_rows(Path(files["customers"]))
    merchants = read_rows(Path(files["merchants"]))
    transactions = read_rows(Path(files["transactions"]))
    truth = [json.loads(line) for line in Path(files["ground_truth"]).read_text(encoding="utf-8").splitlines()]
    customer_ids = {row["customer_id"] for row in customers}
    merchant_ids = {row["merchant_id"] for row in merchants}
    transaction_ids = {row["transaction_id"] for row in transactions}
    amounts = [float(row["amount"]) for row in transactions]
    labels = {row["is_fraud"] for row in transactions}
    assert len(customers) == CUSTOMERS
    assert len(merchants) == MERCHANTS
    assert len(transactions) >= TRANSACTIONS
    assert len(truth) == len(transactions)
    assert len(customer_ids) == len(customers)
    assert len(merchant_ids) == len(merchants)
    assert len(transaction_ids) == len(transactions)
    assert len(labels) == 2 and labels <= {"0", "1"}
    assert all(float(row["amount"]) > 0 and math.isfinite(float(row["amount"])) for row in transactions)
    assert all(row["customer_id"] in customer_ids and row["merchant_id"] in merchant_ids for row in transactions)
    assert len({row["merchant_id"] for row in transactions}) > 20
    assert len({row["city"] for row in transactions}) > 1
    assert len({row["payment_method"] for row in transactions}) > 1
    assert len({row["device_id"] for row in transactions}) > CUSTOMERS // 2
    assert "ground_truth" not in transactions[0]
    scenario_counts = Counter(scenario.scenario_type for scenario in scenarios)
    attack_counts = Counter(record["attack_type"] for record in truth if record["attack_type"])
    planner = OfflineFallbackPlanner(seed=SEED, simulator=simulator)
    auto_attack_counts = Counter()
    for scenario in scenarios:
        customer = next(item for item in simulator.customers if item.customer_id == scenario.target_id)
        transaction = next((item for item in simulator.transactions if item.transaction_id == scenario.transaction_id), None)
        plan = planner.plan(customer, scenario.observable_context())
        auto_attack_counts[plan.attack_type] += 1
    return {
        "customers": len(customers),
        "merchants": len(merchants),
        "transactions": len(transactions),
        "fraudulent": sum(row["is_fraud"] == "1" for row in transactions),
        "legitimate": sum(row["is_fraud"] == "0" for row in transactions),
        "cities": len({row["city"] for row in transactions}),
        "categories": len({row["category"] for row in merchants}),
        "payment_methods": len({row["payment_method"] for row in transactions}),
        "devices": len({row["device_id"] for row in transactions}),
        "scenario_counts": scenario_counts,
        "attack_counts": attack_counts,
        "auto_attack_counts": auto_attack_counts,
    }


def write_readme(summary: dict[str, object]) -> None:
    scenario_counts = summary["scenario_counts"]
    attack_counts = summary["attack_counts"]
    auto_attack_counts = summary["auto_attack_counts"]
    (OUTPUT_DIR / "README.md").write_text(f'''# Latest Blue Team Dataset

Generated from the repository's `PaymentSimulator`, `HighFidelityGenerator`, and `ScenarioGenerator`.

- Seed: `{SEED}`
- Customers: {summary["customers"]}
- Merchants: {summary["merchants"]}
- Transactions: {summary["transactions"]}
- Fraudulent transactions: {summary["fraudulent"]}
- Legitimate transactions: {summary["legitimate"]}
- Fraud rate: {summary["fraudulent"] / summary["transactions"]:.2%}
- Cities: {summary["cities"]}
- Merchant categories: {summary["categories"]}
- Payment methods: {summary["payment_methods"]}
- Unique devices: {summary["devices"]}

## Files

- `customers.csv`: one row per synthetic customer, including stable profile and scenario assignment fields.
- `merchants.csv`: one row per synthetic merchant, including category, city, and popularity.
- `transactions.csv`: one row per transaction. The supervised ML target is `is_fraud` (`0` legitimate, `1` synthetic fraud). `scenario_type`, `scenario_id`, `stage`, and `edge_cases` are contextual metadata; do not use them as predictive features for a leakage-safe model.
- `scenarios.jsonl`: observable scenario context. Hidden ground truth is intentionally excluded.
- `ground_truth.jsonl`: Red Team evaluation metadata, including `attack_type`, true label, stage, difficulty, intensity, and seed. Keep this file out of model training features.

## Scenario distribution

{chr(10).join(f"- {name}: {scenario_counts.get(name, 0)}" for name in SCENARIO_TYPES)}

## Attack metadata distribution

{chr(10).join(f"- {name}: {attack_counts.get(name, 0)}" for name in sorted(attack_counts))}

## AUTO attack reachability

This is an evidence-based planner reachability report, not fabricated attack execution. Each scenario was passed through the existing offline planner using observable context only.

{chr(10).join(f"- {name}: {auto_attack_counts.get(name, 0)}" for name in sorted(auto_attack_counts))}

## Regenerate

```bash
./.venv/bin/python scripts/generate_latest_dataset.py
```

All values are synthetic, local, deterministic, and non-deployable. No external APIs or credentials are used.
''', encoding="utf-8")


def main() -> None:
    simulator = PaymentSimulator()
    simulator.generate_dataset(CUSTOMERS, MERCHANTS, TRANSACTIONS // CUSTOMERS, seed=SEED, fraud_rate=FRAUD_RATE)
    scenario_generator = ScenarioGenerator(simulator, seed=SEED)
    scenarios = scenario_generator.generate_balanced_dataset(simulator.customers, seed=SEED)
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    files = export_dataset_files(simulator, scenarios, str(OUTPUT_DIR))
    summary = validate(simulator, scenarios, files)
    write_readme(summary)
    print("=" * 41)
    print("BLUE TEAM DATASET GENERATED")
    print("=" * 41)
    print(f"Customers: {summary['customers']}")
    print(f"Merchants: {summary['merchants']}")
    print(f"Transactions: {summary['transactions']}")
    print(f"Fraudulent transactions: {summary['fraudulent']}")
    print(f"Legitimate transactions: {summary['legitimate']}")
    print(f"Fraud rate: {summary['fraudulent'] / summary['transactions']:.2%}")
    print(f"Cities: {summary['cities']} | Categories: {summary['categories']} | Payment methods: {summary['payment_methods']} | Devices: {summary['devices']}")
    print("\nSCENARIO DISTRIBUTION")
    for name in SCENARIO_TYPES:
        print(f"{name}: {summary['scenario_counts'].get(name, 0)}")
    print("\nATTACK TYPE DISTRIBUTION")
    for name, count in sorted(summary["attack_counts"].items()):
        print(f"{name}: {count}")
    print("\nAUTO ATTACK REACHABILITY")
    for name, count in sorted(summary["auto_attack_counts"].items()):
        print(f"{name}: {count}")
    print("\nOUTPUT FILES")
    for path in files.values():
        print(Path(path).relative_to(ROOT))
    print("data/latest/README.md")


if __name__ == "__main__":
    main()