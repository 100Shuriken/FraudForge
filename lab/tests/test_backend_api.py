import unittest

from fastapi.testclient import TestClient

from backend.main import app


class BackendApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health_discovery_and_exact_dataset_size(self):
        self.assertEqual(self.client.get("/api/health").status_code, 200)
        response = self.client.post("/api/dataset/generate", json={
            "customers": 7, "merchants": 5, "transactions": 23, "seed": 44,
        })
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["statistics"]["total_transactions"], 23)
        self.assertEqual(len(self.client.get("/api/attacks").json()), 10)
        statistics = self.client.get("/api/dataset/statistics").json()
        self.assertEqual(sum(statistics["customers_by_scenario"].values()), 7)
        self.assertEqual(sum(statistics["transactions_by_scenario"].values()), 23)

    def test_planner_run_run_all_and_invalid_target(self):
        customers = self.client.get("/api/customers").json()
        transactions = self.client.get("/api/transactions").json()
        payload = {"target_id": customers[0]["customer_id"], "transaction_id": transactions[0]["transaction_id"]}
        plan = self.client.post("/api/planner/plan", json=payload)
        self.assertEqual(plan.status_code, 200)
        run = self.client.post("/api/attacks/run", json=payload)
        self.assertEqual(run.status_code, 200)
        self.assertTrue(run.json()["records"])
        self.assertEqual(self.client.get(f"/api/runs/{run.json()['run_id']}").status_code, 200)
        all_run = self.client.post("/api/attacks/run-all", json=payload)
        self.assertEqual(all_run.status_code, 200)
        self.assertEqual(all_run.json()["total"], 10)
        self.assertEqual(self.client.post("/api/planner/plan", json={"target_id": "C9999"}).status_code, 404)

    def test_each_registered_attack_executes(self):
        customer = self.client.get("/api/customers").json()[0]
        for attack in self.client.get("/api/attacks").json():
            response = self.client.post("/api/attacks/run", json={
                "target_id": customer["customer_id"], "attack_type": attack["name"],
            })
            self.assertEqual(response.status_code, 200, attack["name"])
            self.assertTrue(response.json()["records"], attack["name"])

    def test_run_scenario_uses_applicable_planner_context(self):
        customer = self.client.get("/api/customers").json()[0]
        transaction = self.client.get("/api/transactions").json()[0]
        allowed = {
            "TRANSACTION_ANOMALY": {"behavioral_drift", "device_switch", "velocity_anomaly", "account_takeover"},
            "COMMUNICATION_SCAM": {"phishing", "vishing", "account_takeover"},
            "KYC_IDENTITY": {"synthetic_identity", "video_deepfake"},
            "LONGITUDINAL_BEHAVIOR": {"sleeper_transaction_pacing", "behavioral_drift", "velocity_anomaly"},
            "CLASSIFIER_EVALUATION": {"adversarial_probing"},
        }
        for scenario_type, attack_types in allowed.items():
            response = self.client.post("/api/attacks/run", json={
                "target_id": customer["customer_id"],
                "transaction_id": transaction["transaction_id"],
                "scenario_type": scenario_type,
            })
            self.assertEqual(response.status_code, 200, response.text)
            payload = response.json()
            self.assertEqual(payload["scenario"]["scenario_type"], scenario_type)
            self.assertIn(payload["plan"]["attack_type"], attack_types)
            self.assertTrue(payload["records"])
        scenario = self.client.post("/api/scenarios/generate", json={
            "target_id": customer["customer_id"], "scenario_type": "KYC_IDENTITY",
        })
        self.assertEqual(scenario.status_code, 200)
        self.assertEqual(scenario.json()["scenario"]["scenario_type"], "KYC_IDENTITY")
        self.assertEqual(self.client.post("/api/scenarios/generate", json={
            "target_id": customer["customer_id"], "scenario_type": "NOT_A_SCENARIO",
        }).status_code, 422)

    def test_scenario_queries_and_export(self):
        scenarios = self.client.get("/api/scenarios").json()
        self.assertTrue(scenarios)
        scenario_type = scenarios[0]["scenario_type"]
        self.assertTrue(self.client.get(f"/api/scenarios/{scenario_type}").json())
        self.assertTrue(self.client.get("/api/targets/adversarial_probing").json())
        files = self.client.post("/api/dataset/export").json()["files"]
        for path in files.values():
            self.assertTrue(path)


if __name__ == "__main__":
    unittest.main()