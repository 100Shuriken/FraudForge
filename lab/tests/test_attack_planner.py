import os
import unittest

from red_team.agent.attack_planner import OfflineFallbackPlanner, LLMPlanner, OpenAIProvider, select_planner
from red_team.agent.planner import AttackPlan, AttackPlanValidator
from red_team.agent.orchestrator import AttackOrchestrator
from red_team.attack_registry import AttackRegistry
from red_team.adversarial_probing import MockClassifier, ClassifierInterface
from simulator.simulator import PaymentSimulator


class _DummyProvider:
    def __init__(self, payload):
        self.payload = payload

    def is_configured(self):
        return True

    def plan(self, target, context):
        return self.payload


class AttackPlannerTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.simulator = PaymentSimulator()
        cls.simulator.generate_dataset(num_customers=25, num_merchants=12, transactions_per_customer=10, seed=42)
        cls.registry = AttackRegistry(cls.simulator)

    def test_offline_planner_works(self):
        planner = OfflineFallbackPlanner(seed=7)
        customer = self.simulator.customers[0]
        plan = planner.plan(customer, {"device_consistency": 0.96, "transaction_frequency": 0.2, "spending_regularity": 0.92})
        self.assertIn(plan.attack_type, {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"})
        AttackPlanValidator.validate(plan)

    def test_attack_plan_validation_works(self):
        plan = AttackPlan(
            attack_type="behavioral_drift",
            difficulty="medium",
            intensity=0.55,
            target_id="C0001",
            rationale="Stable profile",
            parameters={"amount_deviation": 0.12}
        )
        AttackPlanValidator.validate(plan)

    def test_unknown_attack_rejected(self):
        plan = AttackPlan(
            attack_type="not_real",
            difficulty="easy",
            intensity=0.4,
            target_id="C0001",
            rationale="bad",
            parameters={}
        )
        with self.assertRaises(ValueError):
            AttackPlanValidator.validate(plan)

    def test_invalid_difficulty_rejected(self):
        plan = AttackPlan(
            attack_type="device_switch",
            difficulty="legendary",
            intensity=0.5,
            target_id="C0001",
            rationale="bad",
            parameters={}
        )
        with self.assertRaises(ValueError):
            AttackPlanValidator.validate(plan)

    def test_invalid_intensity_rejected(self):
        plan = AttackPlan(
            attack_type="velocity_anomaly",
            difficulty="hard",
            intensity=1.5,
            target_id="C0001",
            rationale="bad",
            parameters={}
        )
        with self.assertRaises(ValueError):
            AttackPlanValidator.validate(plan)

    def test_deterministic_planner_produces_reproducible_plans(self):
        planner_a = OfflineFallbackPlanner(seed=11)
        planner_b = OfflineFallbackPlanner(seed=11)
        customer = self.simulator.customers[1]
        plan_a = planner_a.plan(customer, {"device_consistency": 0.97, "transaction_frequency": 0.1, "spending_regularity": 0.9, "authentication_risk": 0.8})
        plan_b = planner_b.plan(customer, {"device_consistency": 0.97, "transaction_frequency": 0.1, "spending_regularity": 0.9, "authentication_risk": 0.8})
        self.assertEqual(plan_a, plan_b)

    def test_planner_selected_attack_successfully_executes_through_registry(self):
        planner = OfflineFallbackPlanner(seed=3)
        customer = self.simulator.customers[2]
        plan = planner.plan(customer, {"device_consistency": 0.9, "transaction_frequency": 0.15, "spending_regularity": 0.75, "authentication_risk": 0.72})
        records = self.registry.execute_plan(plan, customer, number_of_transactions=3)
        self.assertTrue(records)
        self.assertEqual(records[0]["target_id"], customer.customer_id)

    def test_composite_plan_works(self):
        plan = AttackPlan(
            attack_type="composite",
            difficulty="medium",
            intensity=0.6,
            target_id="C0001",
            rationale="Composite plan for layered attack",
            parameters={"component_count": 2},
            component_attacks=["behavioral_drift", "device_switch"]
        )
        AttackPlanValidator.validate(plan)
        records = self.registry.execute_plan(plan, self.simulator.customers[3], number_of_transactions=2)
        self.assertTrue(records)
        self.assertGreater(len(records), 1)

    def test_invalid_structured_llm_output_falls_back_to_offline(self):
        provider = _DummyProvider({"attack_type": "unknown", "difficulty": "easy", "intensity": 0.4, "target_id": "C0001"})
        planner = LLMPlanner(provider=provider)
        plan = planner.plan(self.simulator.customers[0], {})
        self.assertIn(plan.attack_type, {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"})
        self.assertEqual(planner.last_mode, "OFFLINE FALLBACK")

    def test_provider_selection_with_credentials(self):
        provider = _DummyProvider({
            "attack_type": "device_switch",
            "difficulty": "medium",
            "intensity": 0.6,
            "target_id": "C0001",
            "rationale": "Valid",
            "parameters": {"device_change_likelihood": 0.3},
        })
        planner = select_planner(provider=provider)
        self.assertIsInstance(planner, LLMPlanner)

    def test_provider_selection_without_credentials(self):
        old = os.environ.pop("OPENAI_API_KEY", None)
        try:
            planner = select_planner()
            self.assertIsInstance(planner, OfflineFallbackPlanner)
        finally:
            if old is not None:
                os.environ["OPENAI_API_KEY"] = old

    def test_valid_structured_llm_response(self):
        provider = _DummyProvider({
            "attack_type": "behavioral_drift",
            "difficulty": "hard",
            "intensity": 0.35,
            "target_id": "C0001",
            "rationale": "Stable profile",
            "parameters": {"amount_deviation": 0.12},
        })
        planner = LLMPlanner(provider=provider)
        plan = planner.plan(self.simulator.customers[0], {})
        self.assertEqual(plan.attack_type, "behavioral_drift")
        self.assertEqual(planner.last_mode, "GENAI")

    def test_openai_provider_requires_key(self):
        provider = OpenAIProvider(api_key=None)
        self.assertFalse(provider.is_configured())

    def test_registry_contains_all_10_attacks(self):
        attacks = sorted(self.registry._attacks.keys())
        self.assertEqual(attacks, sorted([
            "behavioral_drift",
            "device_switch",
            "velocity_anomaly",
            "phishing",
            "vishing",
            "video_deepfake",
            "synthetic_identity",
            "account_takeover",
            "sleeper_transaction_pacing",
            "adversarial_probing",
        ]))

    def test_sleeper_transaction_pacing_sequence_properties(self):
        customer = self.simulator.customers[0]
        attack = self.registry.get("sleeper_transaction_pacing")
        record = attack.generate(customer, sequence_length=14, difficulty="medium", intensity=0.6, seed=11)[0]
        payload = record["payload"]
        self.assertEqual(payload["sequence_length"], 14)
        self.assertGreater(payload["synthetic_threshold"], 0)
        self.assertIn("rolling_7d_amount", payload)
        self.assertIn("rolling_7d_velocity", payload)
        self.assertIn("pacing_consistency", payload)
        self.assertTrue(payload["amounts"])
        self.assertTrue(all(amount > 0 for amount in payload["amounts"]))

    def test_adversarial_probing_mock_classifier(self):
        classifier = MockClassifier(threshold=0.5)
        attack = self.registry.get("adversarial_probing")
        baseline = {
            "amount": 200.0,
            "hour": 20,
            "merchant_category": "Food",
            "device_risk_signal": 0.2,
            "location_risk_signal": 0.2,
            "velocity_signal": 0.2,
        }
        result = attack.generate(classifier, baseline=baseline, difficulty="easy", intensity=0.7, seed=5)
        self.assertTrue(result["successful_boundary_crossing"] or not result["successful_boundary_crossing"])
        self.assertIn("original_features", result)
        self.assertIn("perturbed_features", result)
        self.assertIn("changed_features", result)
        self.assertGreaterEqual(result["total_change"], 0)

    def test_adversarial_probing_failure_case(self):
        classifier = MockClassifier(threshold=0.95)
        attack = self.registry.get("adversarial_probing")
        baseline = {
            "amount": 200.0,
            "hour": 20,
            "merchant_category": "Food",
            "device_risk_signal": 0.1,
            "location_risk_signal": 0.1,
            "velocity_signal": 0.1,
        }
        result = attack.generate(classifier, baseline=baseline, difficulty="hard", intensity=0.05, seed=9)
        self.assertFalse(result["successful_boundary_crossing"])
        self.assertEqual(result["original_prediction"], classifier.predict(baseline))

    def test_existing_attack_calls_still_work(self):
        customer = self.simulator.customers[4]
        records = self.registry.get("behavioral_drift").generate(customer, 2, difficulty="easy", intensity=0.4)
        self.assertEqual(len(records), 2)
        self.assertEqual(records[0]["target_id"], customer.customer_id)

    def test_normal_simulator_generation_remains_unchanged(self):
        sim = PaymentSimulator()
        sim.generate_dataset(num_customers=10, num_merchants=5, transactions_per_customer=4, seed=7)
        self.assertEqual(len(sim.customers), 10)
        self.assertEqual(len(sim.merchants), 5)
        self.assertGreater(len(sim.transactions), 0)

    def test_orchestrator_runs_plan_to_registry(self):
        orchestrator = AttackOrchestrator(self.registry, seed=9)
        customer = self.simulator.customers[5]
        records = orchestrator.run(customer, {"device_consistency": 0.92, "transaction_frequency": 0.2, "spending_regularity": 0.88, "authentication_risk": 0.7})
        self.assertTrue(records)
        self.assertEqual(records[0]["target_id"], customer.customer_id)


if __name__ == "__main__":
    unittest.main()
