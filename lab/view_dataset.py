from simulator.simulator import PaymentSimulator

simulator = PaymentSimulator()

data = simulator.generate_dataset(
    num_customers=10,
    num_merchants=5,
    transactions_per_customer=10,
    seed=42
)

transactions = data["transactions"]

# Show one transaction from each of the first 10 customers
seen_customers = set()

print("\n" + "=" * 120)
print("SYNTHETIC PAYMENT DATASET — DIFFERENT CUSTOMERS")
print("=" * 120)

for transaction in transactions:
    if transaction.customer_id not in seen_customers:
        seen_customers.add(transaction.customer_id)

        print(
            f"{transaction.transaction_id} | "
            f"Customer={transaction.customer_id} | "
            f"Merchant={transaction.merchant_id} | "
            f"Amount=₹{transaction.amount:.2f} | "
            f"Time={transaction.timestamp} | "
            f"City={transaction.city} | "
            f"Payment={transaction.payment_method} | "
            f"Fraud={transaction.is_fraud} | "
            f"Attack={transaction.attack_type}"
        )

    if len(seen_customers) == 10:
        break

print("\nCustomers shown:", len(seen_customers))