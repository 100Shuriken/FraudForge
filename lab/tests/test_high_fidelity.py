import unittest

from simulator.high_fidelity import EdgeCaseRates, GenerationConfig
from simulator.simulator import PaymentSimulator


class HighFidelityTests(unittest.TestCase):
    def test_seed_reproduces_dataset_and_statistics(self):
        first = PaymentSimulator()
        second = PaymentSimulator()
        first.generate_dataset(12, 8, 10, seed=41, fraud_rate=0.25)
        second.generate_dataset(12, 8, 10, seed=41, fraud_rate=0.25)
        signature = lambda simulator: [
            (item.transaction_id, item.customer_id, item.amount,
             item.timestamp, item.is_fraud, item.attack_type)
            for item in simulator.transactions
        ]
        self.assertEqual(signature(first), signature(second))
        self.assertEqual(first.statistics(), second.statistics())

    def test_profiles_and_preferences_are_customer_specific(self):
        simulator = PaymentSimulator()
        simulator.generate_dataset(20, 20, 12, seed=9)
        profiles = [customer.behavioral_profile for customer in simulator.customers]
        self.assertGreater(len({profile.average_transaction_amount for profile in profiles}), 1)
        self.assertGreater(len({profile.favourite_categories for profile in profiles}), 1)
        self.assertTrue(all(customer.preferred_merchant_ids for customer in simulator.customers))

    def test_configured_edge_cases_and_ground_truth(self):
        config = GenerationConfig(edge_case_rates=EdgeCaseRates(
            large_purchase=0.0, new_merchant=1.0, new_city=1.0,
            alternate_payment_method=1.0, off_hour=1.0,
            unusually_small_purchase=1.0, weekend_spike=1.0,
            travel_episode=1.0,
        ))
        simulator = PaymentSimulator()
        simulator.generate_dataset(5, 10, 8, seed=12, config=config, fraud_rate=0.4)
        self.assertTrue(any(item.edge_cases for item in simulator.transactions if not item.is_fraud))
        self.assertTrue(all(not item.is_fraud and item.attack_type is None
                            for item in simulator.transactions if item.stage == "baseline"))
        self.assertTrue(all(item.is_fraud and item.attack_type and item.attack_id
                            for item in simulator.transactions if item.is_fraud))

    def test_scale_and_unique_ids(self):
        simulator = PaymentSimulator()
        simulator.generate_dataset(100, 30, 10, seed=5)
        self.assertEqual(len(simulator.transactions), 1000)
        self.assertEqual(len({item.customer_id for item in simulator.customers}), 100)
        self.assertEqual(len({item.merchant_id for item in simulator.merchants}), 30)
        self.assertEqual(len({item.transaction_id for item in simulator.transactions}), 1000)
        self.assertTrue(all(item.amount > 0 for item in simulator.transactions))
        self.assertTrue(all(item.timestamp.tzinfo is None for item in simulator.transactions))


if __name__ == "__main__":
    unittest.main()