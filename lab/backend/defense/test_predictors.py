"""Independent smoke checks for model loading and safe prediction inputs."""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from backend.defense.model_manager import ModelManager
from backend.defense.predictors import (
    _FEATURES,
    predict_phishing,
    predict_transaction,
)


EXPECTED_MODELS = {"transaction", "phishing", "voice", "deepfake", "kyc", "ato"}


def _assert_result(result: dict[str, object], model_name: str) -> None:
    assert result["model"] == model_name
    assert 0.0 <= result["fraud_probability"] <= 1.0
    assert isinstance(result["prediction"], str)


def main() -> None:
    manager = ModelManager()
    loaded = {name for name in manager.models if name != "phishing_vectorizer"}
    assert loaded == EXPECTED_MODELS, f"Unexpected loaded models: {loaded}"
    expected_dimensions = {"transaction": 21, "phishing": 6499, "voice": 74, "deepfake": 86, "kyc": 23, "ato": 19}
    for model_name, feature_count in expected_dimensions.items():
        assert manager.models[model_name].n_features_in_ == feature_count
    assert len(manager.models["phishing_vectorizer"].vocabulary_) == 6499

    # These vectors test schema wiring only; they are not accuracy tests.
    transaction = {name: 0.0 for name in _FEATURES["transaction"]}
    categorical_features = manager.configs["transaction"]["categorical_features"]
    categories = manager.models["transaction"].booster_.pandas_categorical
    for index, name in enumerate(categorical_features):
        transaction[name] = categories[index][0]
    _assert_result(predict_transaction(transaction, manager), "transaction")
    _assert_result(predict_phishing("Account verification notice", manager), "phishing")

    for model_name in ("voice", "deepfake", "kyc", "ato"):
        print(f"{model_name}: Model loads successfully, but inference adapter requires the original feature extraction pipeline.")

    print("Loaded all six models and smoke-tested transaction and phishing inference.")
    print("Smoke inputs are schema checks only and do not represent fraud detection accuracy.")


if __name__ == "__main__":
    main()
