"""Smoke-test transaction adaptation against the existing Red Team generators."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.defense.model_manager import ModelManager
from backend.defense.transaction_adapter import (
    adapt_transaction_payload,
    predict_transaction_payload,
)
from red_team.account_takeover.takeover_generator import AccountTakeoverGenerator
from red_team.sleeper_transaction_pacing import SleeperTransactionPacingAttack
from red_team.transaction_fraud.behavioral_drift import BehavioralDriftAttack
from red_team.transaction_fraud.device_switch import DeviceSwitchAttack
from red_team.transaction_fraud.velocity_anomaly import VelocityAnomalyAttack
from simulator.simulator import PaymentSimulator


def main() -> None:
    simulator = PaymentSimulator()
    simulator.generate_dataset(2, 2, 3, seed=2026)
    customer = simulator.customers[0]

    attacks = {
        "behavioral_drift": BehavioralDriftAttack(simulator).generate(customer, number_of_transactions=1)[0],
        "device_switch": DeviceSwitchAttack(simulator).generate(customer, number_of_transactions=1)[0],
        "velocity_anomaly": VelocityAnomalyAttack(simulator).generate(customer, number_of_transactions=1)[0],
        "sleeper_transaction_pacing": SleeperTransactionPacingAttack(simulator).generate(customer, sequence_length=3, seed=2026)[0],
    }

    manager = ModelManager()
    for attack_name, record in attacks.items():
        adapted = adapt_transaction_payload(record)
        if adapted["scoreable"]:
            scored = predict_transaction_payload(record, manager)
            prediction = scored["prediction"]
            assert 0.0 <= prediction["fraud_probability"] <= 1.0
            print(f"{attack_name}: scoreable=true, prediction={prediction}")
        else:
            assert adapted["missing"]
            print(f"{attack_name}: scoreable=false, missing={adapted['missing']}, reason={adapted['reason']}")

    print("Transaction adapter smoke test completed; no accuracy claim is made.")


if __name__ == "__main__":
    main()
