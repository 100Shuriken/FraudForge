import os
import json
import joblib
import pickle


class ModelManager:
    def __init__(self):
        self.backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.models_dir = os.path.join(self.backend_dir, "models")

        self.models = {}
        self.configs = {}

        self.load_all_models()

    def load_pickle_model(self, path):
        return joblib.load(path)

    def load_json(self, path):
        with open(path, "r") as f:
            return json.load(f)

    def load_all_models(self):
        print("\n" + "=" * 50)
        print("BLUE TEAM MODEL LOADER")
        print("=" * 50)

        # -------------------------
        # Transaction
        # -------------------------
        try:
            path = os.path.join(
                self.models_dir,
                "transaction",
                "lgb_transaction_fraud.pkl"
            )

            config_path = os.path.join(
                self.models_dir,
                "transaction",
                "transaction_fraud_config.json"
            )

            self.models["transaction"] = self.load_pickle_model(path)
            self.configs["transaction"] = self.load_json(config_path)

            print("Transaction model:     LOADED")

        except Exception as e:
            print("Transaction model:     FAILED")
            print(f"  {e}")

        # -------------------------
        # Phishing
        # -------------------------
        try:
            model_path = os.path.join(
                self.models_dir,
                "phishing",
                "logistic_regression_phishing_model.joblib"
            )

            vectorizer_path = os.path.join(
                self.models_dir,
                "phishing",
                "tfidf_phishing_vectorizer.joblib"
            )

            self.models["phishing"] = joblib.load(model_path)
            self.models["phishing_vectorizer"] = joblib.load(vectorizer_path)

            print("Phishing model:        LOADED")

        except Exception as e:
            print("Phishing model:        FAILED")
            print(f"  {e}")

        # -------------------------
        # Voice
        # -------------------------
        try:
            path = os.path.join(
                self.models_dir,
                "voice",
                "synthetic_voice_lightgbm.pkl"
            )

            config_path = os.path.join(
                self.models_dir,
                "voice",
                "synthetic_voice_config.json"
            )

            self.models["voice"] = self.load_pickle_model(path)
            self.configs["voice"] = self.load_json(config_path)

            print("Voice model:           LOADED")

        except Exception as e:
            print("Voice model:           FAILED")
            print(f"  {e}")

        # -------------------------
        # Deepfake
        # -------------------------
        try:
            path = os.path.join(
                self.models_dir,
                "deepfake",
                "deepfake_video_lightgbm.pkl"
            )

            config_path = os.path.join(
                self.models_dir,
                "deepfake",
                "deepfake_video_config.json"
            )

            self.models["deepfake"] = self.load_pickle_model(path)
            self.configs["deepfake"] = self.load_json(config_path)

            print("Deepfake model:        LOADED")

        except Exception as e:
            print("Deepfake model:        FAILED")
            print(f"  {e}")

        # -------------------------
        # KYC
        # -------------------------
        try:
            path = os.path.join(
                self.models_dir,
                "kyc",
                "kyc_document_fraud_lightgbm.pkl"
            )

            config_path = os.path.join(
                self.models_dir,
                "kyc",
                "kyc_document_fraud_config.json"
            )

            self.models["kyc"] = self.load_pickle_model(path)
            self.configs["kyc"] = self.load_json(config_path)

            print("KYC model:             LOADED")

        except Exception as e:
            print("KYC model:             FAILED")
            print(f"  {e}")

        # -------------------------
        # Account Takeover
        # -------------------------
        try:
            path = os.path.join(
                self.models_dir,
                "ATO",
                "ato_behavioral_lightgbm.pkl"
            )

            config_path = os.path.join(
                self.models_dir,
                "ATO",
                "ato_behavioral_config.json"
            )

            self.models["ato"] = self.load_pickle_model(path)
            self.configs["ato"] = self.load_json(config_path)

            print("ATO model:             LOADED")

        except Exception as e:
            print("ATO model:             FAILED")
            print(f"  {e}")

        print("=" * 50)

        loaded = len([
            name for name in self.models
            if name != "phishing_vectorizer"
        ])

        print(f"Models loaded: {loaded}/6")
        print("=" * 50)


if __name__ == "__main__":
    manager = ModelManager()
