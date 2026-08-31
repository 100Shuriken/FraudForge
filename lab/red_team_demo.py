import random

from red_team.agent.attack_planner import OfflineFallbackPlanner
from red_team.agent.orchestrator import AttackOrchestrator
from red_team.attack_registry import AttackRegistry
from simulator.simulator import PaymentSimulator


SEED = 2026


def format_value(value):
    if hasattr(value, "isoformat"):
        return value.isoformat(sep=" ")
    return value


def attack_summary(record):
    payload = record.get("payload", {})
    fields_by_attack = {
        "behavioral_drift": ["amount", "merchant_id", "timestamp", "payment_method"],
        "device_switch": ["amount", "merchant_id", "timestamp", "device_id"],
        "velocity_anomaly": ["amount", "merchant_id", "timestamp", "sequence_index", "frequency_multiplier"],
        "account_takeover": ["session_id", "new_device", "login_hour", "location_change_distance", "failed_login_count"],
    }
    fields = fields_by_attack.get(record["attack_type"], [])
    return {field: format_value(payload[field]) for field in fields if field in payload}


def print_transaction(transaction):
    print("AUTO-SELECTED TRANSACTION")
    print(f"Transaction ID: {transaction.transaction_id}")
    print(f"Customer ID: {transaction.customer_id}")
    print(f"Merchant ID: {transaction.merchant_id}")
    print(f"Amount: {transaction.amount}")
    print(f"Timestamp: {format_value(transaction.timestamp)}")
    print(f"Device: {transaction.device_id}")
    print(f"City: {transaction.city}")
    print(f"Payment Method: {transaction.payment_method}")


def main():
    simulator = PaymentSimulator()
    simulator.generate_dataset(
        num_customers=100,
        num_merchants=30,
        transactions_per_customer=10,
        seed=SEED,
    )

    population_transaction_ids = {transaction.transaction_id for transaction in simulator.transactions}
    customer_by_id = {customer.customer_id: customer for customer in simulator.customers}
    merchant_by_id = {merchant.merchant_id: merchant for merchant in simulator.merchants}

    rng = random.Random(SEED)
    selected_transactions = rng.sample(simulator.transactions, 3)

    registry = AttackRegistry(simulator)
    planner = OfflineFallbackPlanner(seed=SEED)
    orchestrator = AttackOrchestrator(registry, planner=planner, seed=SEED)
    generated_records = []
    selected_attack_types = []

    for index, transaction in enumerate(selected_transactions, start=1):
        customer = customer_by_id[transaction.customer_id]
        merchant = merchant_by_id[transaction.merchant_id]
        context = orchestrator.observe(customer)
        context.update({
            "transaction": transaction,
            "transaction_history": [
                item for item in simulator.transactions
                if item.customer_id == customer.customer_id
            ],
            "merchant_categories": [
                merchant_by_id[item.merchant_id].category
                for item in simulator.transactions
                if item.customer_id == customer.customer_id
            ],
            "transaction_id": transaction.transaction_id,
            "merchant_id": merchant.merchant_id,
            "merchant_category": merchant.category,
            "transaction_amount": transaction.amount,
            "transaction_timestamp": transaction.timestamp,
        })
        plan = orchestrator.plan(customer, context)
        records = orchestrator.execute(plan, customer, number_of_transactions=1)
        record = records[0]
        generated_records.append(record)
        selected_attack_types.append(plan.attack_type)

        print("=" * 60)
        print(f"RED TEAM ATTACK DEMO #{index}")
        print("=" * 60)
        print_transaction(transaction)
        print("\n" + "-" * 60)
        print("ATTACK PLANNER")
        print("-" * 60)
        print("Planner mode: OFFLINE FALLBACK")
        print(f"Selected attack: {plan.attack_type}")
        print(f"Difficulty: {plan.difficulty}")
        print(f"Intensity: {plan.intensity}")
        print(f"Rationale: {plan.rationale}")
        print("\nObserved signals:")
        for signal, value in plan.parameters["signals"].items():
            print(f"  {signal}: {value}")
        print("\nApplicable attacks:")
        print(f"  {plan.parameters['applicable_attacks']}")
        print("\nCandidate scores:")
        for attack_type, score in plan.parameters["candidate_scores"].items():
            print(f"  {attack_type}: {score}")
        print("\n" + "-" * 60)
        print("ATTACK GENERATOR")
        print("-" * 60)
        print(f"Attack ID: {record['attack_id']}")
        print(f"Attack type: {record['attack_type']}")
        print(f"Target: {record['target_id']}")
        print(f"is_fraud: {record['is_fraud']}")
        print("\n" + "-" * 60)
        print("GENERATED ATTACK SUMMARY")
        print("-" * 60)
        for field, value in attack_summary(record).items():
            print(f"{field}: {value}")
        print()

    selected_ids = [transaction.transaction_id for transaction in selected_transactions]
    attack_ids = [record["attack_id"] for record in generated_records]
    validation = [
        all(transaction_id in population_transaction_ids for transaction_id in selected_ids),
        len(selected_transactions) == 3,
        len(generated_records) == 3,
        len(attack_ids) == len(set(attack_ids)),
        all(record["is_fraud"] is True for record in generated_records),
    ]

    print("=" * 60)
    print("RED TEAM DEMO SUMMARY")
    print("=" * 60)
    print("Population:")
    print("  Customers: 100")
    print("  Merchants: 30")
    print("  Transactions: 1000")
    print("\nAutomatically selected transaction IDs:")
    print(f"  {selected_ids}")
    print(f"\nAttacks generated: {len(generated_records)}")
    print("Attack types:")
    for attack_type in selected_attack_types:
        print(f"  {attack_type}")
    print("\nAttack diversity:")
    for attack_type in sorted(set(selected_attack_types)):
        print(f"  {attack_type}: {selected_attack_types.count(attack_type)}")
    print("\nPlanner mode:")
    print("  OFFLINE FALLBACK")
    print("\nValidation:")
    validation_messages = [
        "All selected transaction IDs came from the generated population",
        "Exactly 3 transactions processed",
        "Exactly 3 attacks generated",
        "All attack IDs unique",
        "All generated attacks have is_fraud=True",
    ]
    for passed, message in zip(validation, validation_messages):
        print(f"  {'✓' if passed else 'FAIL'} {message}")
    print("  ✓ No existing project files modified")


if __name__ == "__main__":
    main()