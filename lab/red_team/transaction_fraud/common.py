import random
from datetime import datetime, timedelta
from typing import Any


def timestamps_for(customer: Any, count: int) -> list[datetime]:
    timestamps = set()
    while len(timestamps) < count:
        timestamp = datetime.now() - timedelta(days=random.randint(1, 30))
        timestamps.add(timestamp.replace(
            hour=random.randint(
                customer.usual_start_hour,
                customer.usual_end_hour
            ),
            minute=random.randint(0, 59),
            second=random.randint(0, 59),
            microsecond=random.randint(0, 999999)
        ))
    return sorted(timestamps)


def merchants_for(simulator: Any, customer: Any) -> list[Any]:
    preferred = [
        merchant for merchant in simulator.merchants
        if merchant.category in customer.favourite_categories
    ]
    return preferred or simulator.merchants


def transaction_payload(transaction: Any) -> dict[str, Any]:
    return {
        "transaction_id": transaction.transaction_id,
        "customer_id": transaction.customer_id,
        "amount": transaction.amount,
        "timestamp": transaction.timestamp,
        "merchant_id": transaction.merchant_id,
        "device_id": transaction.device_id,
        "city": transaction.city,
        "payment_method": transaction.payment_method,
        "is_fraud": transaction.is_fraud,
        "attack_type": transaction.attack_type
    }
