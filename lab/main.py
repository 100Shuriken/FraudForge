from red_team.adversarial_probing import MockClassifier
from red_team.attack_registry import AttackRegistry
from red_team.agent.attack_planner import select_planner
from simulator.simulator import PaymentSimulator


def compact_customer_profile(customer):
    return {
        "customer_id": customer.customer_id,
        "city": customer.city,
        "avg_amount": customer.average_transaction_amount,
        "daily_transactions": customer.daily_transaction_count,
        "usual_device": customer.usual_device,
        "preferred_categories": customer.favourite_categories,
    }


def build_context(customer):
    return {
        "device_consistency": 0.94 if customer.usual_device else 0.5,
        "transaction_frequency": min(1.0, 0.15 + customer.daily_transaction_count / 20),
        "spending_regularity": 0.86 if customer.average_transaction_amount < 5000 else 0.65,
        "authentication_risk": 0.62 if customer.city in {"Pune", "Bangalore"} else 0.48,
    }


if __name__ == "__main__":
    simulator = PaymentSimulator()
    simulator.generate_dataset(
        num_customers=60,
        num_merchants=18,
        transactions_per_customer=12,
        seed=2026,
    )

    registry = AttackRegistry(simulator)
    targets = simulator.customers[:3]
    planner = select_planner()

    print("=" * 60)
    print("AI-Defense-Lab: LLM-powered Red Team attack planner")
    print("=" * 60)
    print("Population size:", len(simulator.customers))
    print("Targets:", [customer.customer_id for customer in targets])
    print("\nCompact customer profiles")
    for customer in targets:
        print(customer.customer_id, compact_customer_profile(customer))

    for target in targets:
        context = build_context(target)
        plan = planner.plan(target, context)
        mode = getattr(planner, "last_mode", "OFFLINE FALLBACK")
        records = registry.execute_plan(plan, target, number_of_transactions=3)

        print("\n" + "=" * 40)
        print(f"TARGET {target.customer_id}")
        print("=" * 40)
        print("Planner mode:", mode)
        print("Attack:", plan.attack_type)
        print("Difficulty:", plan.difficulty)
        print("Intensity:", plan.intensity)
        print("Rationale:", plan.rationale)
        print("Generated records:", len(records))

    print("\n" + "=" * 40)
    print("SECTION 1: SLEEPER TRANSACTION PACING")
    print("=" * 40)
    sleeper = registry.get("sleeper_transaction_pacing")
    sleeper_customer = targets[0]
    sleeper_record = sleeper.generate(sleeper_customer, sequence_length=14, difficulty="medium", intensity=0.6, seed=42)[0]
    payload = sleeper_record["payload"]
    print("Target customer:", sleeper_customer.customer_id)
    print("Sequence length:", payload["sequence_length"])
    print("Duration days:", payload["duration_days"])
    print("Synthetic threshold:", payload["synthetic_threshold"])
    print("Average amount:", round(sum(payload["amounts"]) / len(payload["amounts"]), 2))
    print("Threshold proximity:", payload["threshold_proximity"])
    print("Pacing consistency:", payload["pacing_consistency"])
    print("Cash-out simulated:", payload["final_cashout_simulated"])
    print("Sample transactions:", [(ts.strftime("%Y-%m-%d %H:%M:%S"), round(amount, 2)) for ts, amount in list(zip(payload["timestamps"][:4], payload["amounts"][:4]))])

    print("\n" + "=" * 40)
    print("SECTION 2: ADVERSARIAL PROBING")
    print("=" * 40)
    classifier = MockClassifier(threshold=0.5)
    probing = registry.get("adversarial_probing")
    baseline = {
        "amount": 250.0,
        "hour": 18,
        "merchant_category": "Food",
        "device_risk_signal": 0.2,
        "location_risk_signal": 0.2,
        "velocity_signal": 0.2,
    }
    result = probing.generate(classifier, baseline=baseline, difficulty="medium", intensity=0.6, seed=99)
    print("Original prediction:", result["payload"]["original_prediction"])
    print("Final prediction:", result["payload"]["final_prediction"])
    print("Changed features:", sorted(result["payload"]["changed_features"].keys())[:5])
    print("Total change:", result["payload"]["total_change"])
    print("Attempts:", result["payload"]["number_of_attempts"])
    print("Boundary crossing:", result["payload"]["successful_boundary_crossing"])
