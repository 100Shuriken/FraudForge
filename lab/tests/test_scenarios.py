import unittest

from red_team.agent.attack_planner import OfflineFallbackPlanner
from simulator.scenario import SCENARIO_TYPES, ScenarioGenerator
from simulator.simulator import PaymentSimulator


class ScenarioTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.simulator = PaymentSimulator()
        cls.simulator.generate_dataset(30, 12, 10, seed=77)

    def test_same_seed_reproduces_varied_scenario_dataset(self):
        first = ScenarioGenerator(self.simulator, seed=8).generate_dataset(20, seed=8)
        second = ScenarioGenerator(self.simulator, seed=8).generate_dataset(20, seed=8)
        self.assertEqual([item.to_dict() for item in first], [item.to_dict() for item in second])
        self.assertGreater(len({item.scenario_type for item in first}), 1)
        self.assertGreater(len({item.scenario_id for item in first}), 19)

    def test_each_context_family_has_required_observable_fields(self):
        generator = ScenarioGenerator(self.simulator, seed=3)
        customer = self.simulator.customers[0]
        for scenario_type in SCENARIO_TYPES:
            scenario = generator.generate(scenario_type, customer=customer)
            self.assertEqual(scenario.target_id, customer.customer_id)
            observable = scenario.observable_context()
            self.assertNotIn("ground_truth", observable)
            self.assertNotIn("scenario", observable)
            if scenario_type == "TRANSACTION_ANOMALY":
                self.assertIn("amount", scenario.transaction_context)
            elif scenario_type == "COMMUNICATION_SCAM":
                self.assertTrue(scenario.communication_context["communication_scenario"])
            elif scenario_type == "KYC_IDENTITY":
                self.assertTrue(scenario.identity_context["kyc_identity_scenario"])
            elif scenario_type == "LONGITUDINAL_BEHAVIOR":
                self.assertIn("rolling_transaction_total_7d", scenario.timeline_context)
            elif scenario_type == "CLASSIFIER_EVALUATION":
                self.assertTrue(scenario.classifier_context["classifier"])

    def test_planner_respects_scenario_applicability(self):
        generator = ScenarioGenerator(self.simulator, seed=4)
        planner = OfflineFallbackPlanner(seed=4, simulator=self.simulator)
        customer = self.simulator.customers[1]
        allowed = {
            "TRANSACTION_ANOMALY": {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"},
            "COMMUNICATION_SCAM": {"phishing", "vishing", "account_takeover"},
            "KYC_IDENTITY": {"synthetic_identity", "video_deepfake"},
            "LONGITUDINAL_BEHAVIOR": {"sleeper_transaction_pacing", "behavioral_drift", "velocity_anomaly"},
            "CLASSIFIER_EVALUATION": {"adversarial_probing"},
        }
        for scenario_type, attack_types in allowed.items():
            scenario = generator.generate(scenario_type, customer=customer)
            plan = planner.plan(customer, scenario.observable_context())
            self.assertIn(plan.attack_type, attack_types)
            if scenario_type == "KYC_IDENTITY":
                self.assertNotEqual(plan.attack_type, "phishing")
            if scenario_type == "CLASSIFIER_EVALUATION":
                self.assertEqual(plan.attack_type, "adversarial_probing")

    def test_normal_scenario_ground_truth_is_separate(self):
        scenario = ScenarioGenerator(self.simulator, seed=1).generate("COMMUNICATION_SCAM")
        self.assertEqual(scenario.ground_truth, {"is_fraud": False, "attack_type": None})
        self.assertNotIn("ground_truth", scenario.observable_context())

    def test_normal_history_contains_legitimate_device_and_location_variation(self):
        devices = {item.device_id for item in self.simulator.transactions}
        cities = {item.city for item in self.simulator.transactions}
        self.assertGreaterEqual(len(devices), len(self.simulator.customers))
        self.assertGreater(len(cities), 1)


if __name__ == "__main__":
    unittest.main()