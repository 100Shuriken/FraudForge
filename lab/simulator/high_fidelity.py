from collections import Counter
from dataclasses import dataclass, field
from datetime import datetime, timedelta
import math
from statistics import mean, median
from typing import Any
import random

from simulator.customer import Customer
from simulator.merchant import Merchant
from simulator.transaction import Transaction
from simulator.timeline import BehavioralTimeline, TimelineEvent


CITIES = ["Pune", "Mumbai", "Delhi", "Bangalore", "Hyderabad"]
CATEGORIES = [
    "Food", "Fuel", "Shopping", "Electronics", "Travel", "Entertainment"
]
PAYMENT_METHODS = ["UPI", "CARD", "NET_BANKING"]


@dataclass(frozen=True)
class EdgeCaseRates:
    large_purchase: float = 0.04
    new_merchant: float = 0.05
    new_city: float = 0.025
    alternate_payment_method: float = 0.04
    off_hour: float = 0.03
    unusually_small_purchase: float = 0.03
    weekend_spike: float = 0.04
    travel_episode: float = 0.03


@dataclass(frozen=True)
class GenerationConfig:
    history_days: int = 30
    edge_case_rates: EdgeCaseRates = field(default_factory=EdgeCaseRates)
    rare_outlier_rate: float = 0.01
    large_purchase_rate: float = 0.04


@dataclass(frozen=True)
class BehavioralProfile:
    income: int
    average_transaction_amount: float
    daily_transaction_count: int
    favourite_categories: tuple[str, ...]
    preferred_payment_methods: tuple[str, ...]
    usual_city: str
    active_hours: tuple[int, int]
    weekend_activity_multiplier: float
    spending_variability: float
    merchant_loyalty: float
    travel_tendency: float
    large_purchase_tendency: float


class HighFidelityGenerator:
    """Generate reproducible, behaviorally correlated synthetic payment data."""

    def __init__(self, simulator: Any, config: GenerationConfig | None = None):
        self.simulator = simulator
        self.config = config or GenerationConfig()
        self._edge_case_counts = Counter()
        self._rng = random.Random()
        self._generation_seed = None
        self._timelines: dict[str, BehavioralTimeline] = {}

    def generate_dataset(
        self,
        num_customers: int,
        num_merchants: int,
        transactions_per_customer: int,
        seed: int | None = None,
        fraud_rate: float = 0.0
    ) -> dict[str, Any]:
        if min(num_customers, num_merchants, transactions_per_customer) < 0:
            raise ValueError("population sizes cannot be negative")
        if not 0.0 <= fraud_rate <= 1.0:
            raise ValueError("fraud_rate must be between 0.0 and 1.0")

        self._rng.seed(seed)
        self._generation_seed = seed
        self._edge_case_counts.clear()
        self._timelines = {}
        self.simulator.customers.clear()
        self.simulator.merchants.clear()
        self.simulator.transactions.clear()

        for customer_number in range(1, num_customers + 1):
            self._create_customer(customer_number)
        for merchant_number in range(1, num_merchants + 1):
            self._create_merchant(merchant_number)

        for customer in self.simulator.customers:
            customer.preferred_merchant_ids = self._preferred_merchants(customer)
            self._timelines[customer.customer_id] = BehavioralTimeline(customer.customer_id)
            self._create_customer_transactions(
                customer, transactions_per_customer
            )

        if fraud_rate:
            self._create_fraud_progressions(fraud_rate)

        return {
            "customers": self.simulator.customers,
            "merchants": self.simulator.merchants,
            "transactions": self.simulator.transactions,
            "timelines": list(self._timelines.values())
        }

    def statistics(self) -> dict[str, Any]:
        transactions = self.simulator.transactions
        amounts = [transaction.amount for transaction in transactions]
        fraud_transactions = [transaction for transaction in transactions if transaction.is_fraud]
        customers_with_transactions = Counter(transaction.customer_id for transaction in transactions)
        merchants_by_customer = {}
        for transaction in transactions:
            merchants_by_customer.setdefault(transaction.customer_id, set()).add(transaction.merchant_id)
        return {
            "customers": len(self.simulator.customers),
            "merchants": len(self.simulator.merchants),
            "transactions": len(transactions),
            "total_customers": len(self.simulator.customers),
            "total_merchants": len(self.simulator.merchants),
            "total_transactions": len(transactions),
            "normal_transactions": len(transactions) - len(fraud_transactions),
            "fraudulent_transactions": len(fraud_transactions),
            "fraud_rate": round(len(fraud_transactions) / len(transactions), 4) if transactions else 0,
            "attack_type_counts": dict(Counter(transaction.attack_type for transaction in fraud_transactions)),
            "difficulty_counts": dict(Counter(getattr(transaction, "difficulty", None) for transaction in transactions)),
            "mean_transaction_amount": round(mean(amounts), 2) if amounts else 0,
            "median_transaction_amount": round(median(amounts), 2) if amounts else 0,
            "transaction_amount_range": (
                round(min(amounts), 2), round(max(amounts), 2)
            ) if amounts else (0, 0),
            "transactions_by_payment_method": Counter(
                transaction.payment_method for transaction in transactions
            ),
            "transactions_by_category": Counter(
                self._merchant(transaction.merchant_id).category
                for transaction in transactions
            ),
            "transactions_by_city": Counter(
                transaction.city for transaction in transactions
            ),
            "transactions_by_hour": Counter(
                transaction.timestamp.hour for transaction in transactions
            ),
            "legitimate_edge_case_counts": dict(self._edge_case_counts),
            "transactions_per_customer": round(mean(customers_with_transactions.values()), 2) if customers_with_transactions else 0,
            "transactions_per_day": round(len(transactions) / len({transaction.timestamp.date() for transaction in transactions}), 2) if transactions else 0,
            "unique_merchants_per_customer": {
                customer_id: len(merchant_ids)
                for customer_id, merchant_ids in merchants_by_customer.items()
            },
        }

    def _create_customer(self, customer_number: int) -> Customer:
        age = self._rng.randint(18, 70)
        city = self._rng.choices(CITIES, weights=[24, 22, 20, 18, 16])[0]
        income = max(24000, int(28000 + age * 1600 + self._rng.gauss(0, 14000)))
        payment = self._rng.choices(
            PAYMENT_METHODS,
            weights=[45, 42 + income / 20000, 18]
        )[0]
        average_amount = max(
            150,
            round(income / self._rng.uniform(28, 45), 2)
        )
        frequency = max(1, min(12, int(self._rng.gauss(income / 35000, 1.4))))
        category_count = 2 if self._rng.random() < 0.7 else 3
        favourites = self._rng.sample(CATEGORIES, category_count)
        start_hour = self._rng.choice([6, 7, 8, 9, 10])
        end_hour = self._rng.choice([20, 21, 22, 23])
        customer = Customer(
            customer_id=f"C{customer_number:04d}", age=age, city=city,
            income=income, usual_device=f"D{customer_number:04d}",
            usual_payment_method=payment,
            average_transaction_amount=average_amount,
            daily_transaction_count=frequency,
            favourite_categories=favourites,
            usual_start_hour=start_hour, usual_end_hour=end_hour
        )
        customer.weekend_activity_multiplier = self._rng.uniform(0.7, 1.5)
        customer.morning_preference = self._rng.uniform(0.2, 0.8)
        customer.spending_variability = self._rng.uniform(0.12, 0.35)
        customer.merchant_loyalty = self._rng.uniform(0.45, 0.9)
        customer.travel_tendency = self._rng.uniform(0.02, 0.25)
        customer.large_purchase_tendency = self._rng.uniform(0.02, 0.12)
        customer.preferred_payment_methods = [payment] + [
            method for method in PAYMENT_METHODS if method != payment
        ]
        customer.behavioral_profile = BehavioralProfile(
            income=income,
            average_transaction_amount=average_amount,
            daily_transaction_count=frequency,
            favourite_categories=tuple(favourites),
            preferred_payment_methods=tuple(customer.preferred_payment_methods),
            usual_city=city,
            active_hours=(start_hour, end_hour),
            weekend_activity_multiplier=customer.weekend_activity_multiplier,
            spending_variability=customer.spending_variability,
            merchant_loyalty=customer.merchant_loyalty,
            travel_tendency=customer.travel_tendency,
            large_purchase_tendency=customer.large_purchase_tendency,
        )
        self.simulator.customers.append(customer)
        return customer

    def _create_merchant(self, merchant_number: int) -> Merchant:
        merchant = Merchant(
            merchant_id=f"M{merchant_number:04d}",
            name=f"Synthetic_Merchant_{merchant_number}",
            category=self._rng.choice(CATEGORIES),
            city=self._rng.choices(CITIES, weights=[24, 22, 20, 18, 16])[0]
        )
        merchant.popularity = self._rng.uniform(0.3, 1.0)
        self.simulator.merchants.append(merchant)
        return merchant

    def _preferred_merchants(self, customer: Customer) -> list[str]:
        merchants = [
            merchant for merchant in self.simulator.merchants
            if merchant.category in customer.favourite_categories
        ]
        merchants.sort(
            key=lambda merchant: (
                merchant.city == customer.city,
                merchant.popularity
            ),
            reverse=True
        )
        return [merchant.merchant_id for merchant in merchants[:5]]

    def _create_customer_transactions(
        self, customer: Customer, count: int
    ) -> None:
        if not self.simulator.merchants:
            return
        base_date = datetime(2025, 1, 1) + timedelta(days=(self._generation_seed or 0) % 365)
        burst_day = self._rng.randint(1, self.config.history_days)
        timestamps = []
        for index in range(count):
            is_burst = index > 0 and self._rng.random() < 0.18
            day_offset = burst_day if is_burst else self._rng.randint(
                1, self.config.history_days
            )
            timestamp = base_date - timedelta(days=day_offset)
            weekend = timestamp.weekday() >= 5
            if weekend and self._rng.random() > customer.weekend_activity_multiplier / 1.5:
                timestamp -= timedelta(days=2)
            hour = self._activity_hour(customer)
            timestamp = timestamp.replace(
                hour=hour,
                minute=self._rng.randint(0, 59),
                second=self._rng.randint(0, 59)
            )
            timestamps.append(timestamp)

        for timestamp in sorted(timestamps):
            self._create_transaction(customer, timestamp)

    def _activity_hour(self, customer: Customer) -> int:
        if self._rng.random() < customer.morning_preference:
            return self._rng.randint(
                customer.usual_start_hour,
                min(customer.usual_start_hour + 4, customer.usual_end_hour)
            )
        return self._rng.randint(
            max(customer.usual_start_hour, customer.usual_end_hour - 5),
            customer.usual_end_hour
        )

    def _create_transaction(self, customer: Customer, timestamp: datetime) -> Transaction:
        rates = self.config.edge_case_rates
        edge_cases = []
        merchant = self._merchant_for(customer)
        city = customer.city
        payment_method = customer.usual_payment_method
        device_id = customer.usual_device
        amount = self._sample_amount(customer)

        if self._rng.random() < max(rates.large_purchase, customer.large_purchase_tendency):
            amount *= self._rng.uniform(2.0, 4.0)
            edge_cases.append("large_purchase")
        if self._rng.random() < rates.new_merchant:
            merchant = self._rng.choice(self.simulator.merchants)
            edge_cases.append("new_merchant")
        if self._rng.random() < rates.new_city:
            city = self._rng.choice([value for value in CITIES if value != customer.city])
            edge_cases.append("new_city")
        if self._rng.random() < rates.alternate_payment_method:
            payment_method = self._rng.choice([
                value for value in PAYMENT_METHODS
                if value != customer.usual_payment_method
            ])
            edge_cases.append("alternate_payment_method")
        if self._rng.random() < rates.off_hour:
            timestamp = timestamp.replace(
                hour=(customer.usual_start_hour - self._rng.randint(1, 3)) % 24
            )
            edge_cases.append("off_hour")
        if self._rng.random() < rates.unusually_small_purchase:
            amount *= self._rng.uniform(0.08, 0.35)
            edge_cases.append("unusually_small_purchase")
        if timestamp.weekday() >= 5 and self._rng.random() < rates.weekend_spike:
            amount *= self._rng.uniform(1.2, 1.8)
            edge_cases.append("weekend_spike")
        if self._rng.random() < rates.travel_episode * customer.travel_tendency / 0.12:
            city = self._rng.choice([value for value in CITIES if value != customer.city])
            edge_cases.append("travel_episode")

        transaction = Transaction(
            transaction_id=f"T{len(self.simulator.transactions) + 1:06d}",
            customer_id=customer.customer_id,
            merchant_id=merchant.merchant_id,
            amount=round(amount, 2), timestamp=timestamp,
            device_id=device_id, city=city,
            payment_method=payment_method
        )
        transaction.edge_cases = edge_cases
        transaction.scenario_id = f"SCENARIO-{customer.customer_id}"
        transaction.generation_seed = self._generation_seed
        transaction.stage = "baseline"
        transaction.difficulty = None
        transaction.intensity = 0.0
        for edge_case in edge_cases:
            self._edge_case_counts[edge_case] += 1
        self.simulator.transactions.append(transaction)
        self._timelines[customer.customer_id].add_event(TimelineEvent(
            timestamp=timestamp,
            stage="baseline",
            event_type="transaction",
            customer_id=customer.customer_id,
            transaction_id=transaction.transaction_id,
            metadata={"edge_cases": list(edge_cases), "generation_seed": self._generation_seed},
        ))
        return transaction

    def _sample_amount(self, customer: Customer) -> float:
        everyday = self._rng.lognormvariate(
            math.log(customer.average_transaction_amount),
            customer.spending_variability,
        )
        if self._rng.random() < self.config.rare_outlier_rate:
            return max(0.01, everyday * self._rng.uniform(2.5, 6.0))
        return max(0.01, everyday)

    def _create_fraud_progressions(self, fraud_rate: float) -> None:
        attack_types = ("behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover")
        targets = max(1, round(len(self.simulator.customers) * fraud_rate)) if self.simulator.customers else 0
        for index, customer in enumerate(self.simulator.customers[:targets]):
            attack_type = attack_types[index % len(attack_types)]
            timestamp = datetime(2025, 1, 2) + timedelta(days=self.config.history_days + index)
            merchant = self._merchant_for(customer)
            transaction = self.simulator.create_transaction(
                customer, merchant, timestamp=timestamp,
                amount=round(customer.average_transaction_amount * (1.4 + 0.2 * index), 2),
                is_fraud=True, attack_type=attack_type,
            )
            transaction.scenario_id = f"SCENARIO-{customer.customer_id}"
            transaction.attack_id = f"ATTACK-{customer.customer_id}-{index + 1:04d}"
            transaction.stage = "attack_peak"
            transaction.difficulty = "medium"
            transaction.intensity = min(1.0, 0.55 + index * 0.02)
            transaction.generation_seed = self._generation_seed
            self._timelines[customer.customer_id].add_event(TimelineEvent(
                timestamp=timestamp - timedelta(days=2), stage="reconnaissance",
                event_type="behavioral_observation", customer_id=customer.customer_id,
                attack_type=attack_type, metadata={"scenario_id": transaction.scenario_id},
            ))
            self._timelines[customer.customer_id].add_event(TimelineEvent(
                timestamp=timestamp - timedelta(days=1), stage="escalation",
                event_type="synthetic_attack_setup", customer_id=customer.customer_id,
                attack_type=attack_type, metadata={"intensity": transaction.intensity},
            ))
            self._timelines[customer.customer_id].add_event(TimelineEvent(
                timestamp=timestamp, stage="attack_peak", event_type="transaction",
                customer_id=customer.customer_id, transaction_id=transaction.transaction_id,
                is_fraud=True, attack_type=attack_type,
                metadata={"attack_id": transaction.attack_id, "difficulty": transaction.difficulty},
            ))

    def _merchant_for(self, customer: Customer) -> Merchant:
        preferred = [
            self._merchant(merchant_id)
            for merchant_id in customer.preferred_merchant_ids
        ]
        nearby = [merchant for merchant in preferred if merchant.city == customer.city]
        choices = nearby or preferred or self.simulator.merchants
        return self._rng.choices(
            choices,
            weights=[getattr(merchant, "popularity", 1.0) for merchant in choices]
        )[0]

    def _merchant(self, merchant_id: str) -> Merchant:
        return next(
            merchant for merchant in self.simulator.merchants
            if merchant.merchant_id == merchant_id
        )
