import json
import unittest

from red_team.contracts import AttackArtifact
from red_team.attack_registry import AttackRegistry
from simulator.simulator import PaymentSimulator


class AttackArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.simulator = PaymentSimulator()
        cls.simulator.generate_dataset(12, 6, 4, seed=21)
        cls.customer = cls.simulator.customers[0]
        cls.registry = AttackRegistry(cls.simulator)

    def test_transaction_attacks_produce_serializable_artifacts(self):
        cases = [
            ("behavioral_drift", {"number_of_transactions": 2}),
            ("device_switch", {"number_of_transactions": 2}),
            ("velocity_anomaly", {"number_of_transactions": 2}),
            ("sleeper_transaction_pacing", {"sequence_length": 4, "seed": 21}),
        ]
        for attack_type, parameters in cases:
            attack = self.registry.get(attack_type)
            records = attack.generate(self.customer, **parameters)
            artifacts = [attack.to_artifact(record) for record in records]
            self.assertTrue(artifacts)
            for artifact in artifacts:
                serialized = artifact.to_dict()
                json.dumps(serialized)
                self.assertEqual(set(serialized), {
                    "attack_id", "attack_type", "target_user", "modality",
                    "timestamp", "payload", "context", "ground_truth",
                })
                self.assertEqual(serialized["target_user"], self.customer.customer_id)


if __name__ == "__main__":
    unittest.main()