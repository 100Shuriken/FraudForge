import random
from datetime import datetime, timedelta

from simulator.customer import Customer
from simulator.merchant import Merchant
from simulator.transaction import Transaction


class PaymentSimulator:

    def __init__(self):
        self.customers = []
        self.merchants = []
        self.transactions = []
        self.high_fidelity_generator = None

    def generate_dataset(
        self,
        num_customers,
        num_merchants,
        transactions_per_customer,
        seed=None,
        config=None,
        fraud_rate=0.0
    ):
        from simulator.high_fidelity import HighFidelityGenerator

        if self.high_fidelity_generator is None or config is not None:
            self.high_fidelity_generator = HighFidelityGenerator(self, config)
        return self.high_fidelity_generator.generate_dataset(
            num_customers,
            num_merchants,
            transactions_per_customer,
            seed,
            fraud_rate=fraud_rate
        )

    def statistics(self):
        if self.high_fidelity_generator is None:
            from simulator.high_fidelity import HighFidelityGenerator

            self.high_fidelity_generator = HighFidelityGenerator(self)
        return self.high_fidelity_generator.statistics()

    def create_customer(self, customer_number):

        cities = [
            "Pune",
            "Mumbai",
            "Delhi",
            "Bangalore",
            "Hyderabad"
        ]

        payment_methods = [
            "UPI",
            "CARD",
            "NET_BANKING"
        ]

        favourite_category_options = [
            ["Food", "Shopping", "Fuel"],
            ["Electronics", "Shopping", "Travel"],
            ["Food", "Entertainment", "Shopping"],
            ["Fuel", "Travel", "Food"]
        ]

        customer = Customer(
            customer_id=f"C{customer_number:04d}",
            age=random.randint(18, 60),
            city=random.choice(cities),
            income=random.randint(30000, 150000),
            usual_device=f"D{customer_number:04d}",
            usual_payment_method=random.choice(payment_methods),
            average_transaction_amount=random.randint(300, 5000),
            daily_transaction_count=random.randint(1, 6),
            favourite_categories=random.choice(
                favourite_category_options
            ),
            usual_start_hour=random.randint(7, 10),
            usual_end_hour=random.randint(21, 23)
        )

        self.customers.append(customer)

        return customer

    def create_merchant(self, merchant_number):

        categories = [
            "Food",
            "Fuel",
            "Shopping",
            "Electronics",
            "Travel",
            "Entertainment"
        ]

        cities = [
            "Pune",
            "Mumbai",
            "Delhi",
            "Bangalore",
            "Hyderabad"
        ]

        merchant = Merchant(
            merchant_id=f"M{merchant_number:04d}",
            name=f"Merchant_{merchant_number}",
            category=random.choice(categories),
            city=random.choice(cities)
        )

        self.merchants.append(merchant)

        return merchant

    def create_transaction(
        self,
        customer,
        merchant,
        timestamp=None,
        amount=None,
        is_fraud=False,
        attack_type=None
    ):

        if amount is None:
            average_amount = customer.average_transaction_amount
            amount = round(
                max(0.01, random.gauss(average_amount, average_amount * 0.2)),
                2
            )

        transaction = Transaction(
            transaction_id=f"T{len(self.transactions) + 1:06d}",
            customer_id=customer.customer_id,
            merchant_id=merchant.merchant_id,
            amount=amount,
            timestamp=timestamp or datetime.now(),
            device_id=customer.usual_device,
            city=customer.city,
            payment_method=customer.usual_payment_method,
            is_fraud=is_fraud,
            attack_type=attack_type
        )

        self.transactions.append(transaction)

        return transaction
    def generate_normal_transactions(self):

        for customer in self.customers:

            timestamps = set()

            while len(timestamps) < customer.daily_transaction_count:
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

            for timestamp in sorted(timestamps):

                preferred_merchants = [
                    merchant
                    for merchant in self.merchants
                    if merchant.category in customer.favourite_categories
                ]

                if preferred_merchants:
                    merchant = random.choice(preferred_merchants)
                else:
                    merchant = random.choice(self.merchants)

                self.create_transaction(
                    customer,
                    merchant,
                    timestamp
                )