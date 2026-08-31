import random
from datetime import datetime, timedelta


class BehavioralDriftAttack:

    def __init__(self, simulator):
        self.simulator = simulator

    def generate_transactions(self, customer, number_of_transactions):

        if number_of_transactions <= 0:
            return []

        timestamps = set()

        while len(timestamps) < number_of_transactions:
            timestamp = datetime.now() - timedelta(
                days=random.randint(1, 30)
            )
            timestamp = timestamp.replace(
                hour=random.randint(
                    customer.usual_start_hour,
                    customer.usual_end_hour
                ),
                minute=random.randint(0, 59),
                second=random.randint(0, 59),
                microsecond=random.randint(0, 999999)
            )
            timestamps.add(timestamp)

        preferred_merchants = [
            merchant
            for merchant in self.simulator.merchants
            if merchant.category in customer.favourite_categories
        ]
        available_merchants = preferred_merchants or self.simulator.merchants
        average_amount = customer.average_transaction_amount
        attack_transactions = []

        for index, timestamp in enumerate(sorted(timestamps)):
            merchant = random.choice(available_merchants)
            amount = round(average_amount * (1.05 + 0.1 * index), 2)
            transaction = self.simulator.create_transaction(
                customer,
                merchant,
                timestamp=timestamp,
                amount=amount,
                is_fraud=True,
                attack_type="behavioral_drift"
            )
            attack_transactions.append(transaction)

        return attack_transactions