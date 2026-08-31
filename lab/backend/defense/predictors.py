"""Inference adapters for the six defensive model artifacts.

The adapters intentionally accept extracted features rather than inventing
extraction logic. Model loading and feature extraction are separate concerns:
a model can be loaded while its request-specific input is still unavailable.
"""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from typing import Any

import pandas as pd

from .model_manager import ModelManager


class InferenceUnavailableError(ValueError):
    """Raised when a model has no request-valid feature input."""


_FEATURES = {
    "transaction": [
        "TransactionAmt", "TransactionDT", "ProductCD", "log_amount",
        "product_avg_amount", "amount_vs_product_avg", "hour", "day",
        "is_night", "id_12", "id_15", "id_16", "id_28", "id_29",
        "id_31", "id_35", "id_36", "id_37", "id_38", "DeviceType",
        "DeviceInfo",
    ],
    "voice": [
        "mfcc_1_mean", "mfcc_2_mean", "mfcc_3_mean", "mfcc_4_mean",
        "mfcc_5_mean", "mfcc_6_mean", "mfcc_7_mean", "mfcc_8_mean",
        "mfcc_9_mean", "mfcc_10_mean", "mfcc_11_mean", "mfcc_12_mean",
        "mfcc_13_mean", "mfcc_14_mean", "mfcc_15_mean", "mfcc_16_mean",
        "mfcc_17_mean", "mfcc_18_mean", "mfcc_19_mean", "mfcc_20_mean",
        "mfcc_1_std", "mfcc_2_std", "mfcc_3_std", "mfcc_4_std",
        "mfcc_5_std", "mfcc_6_std", "mfcc_7_std", "mfcc_8_std",
        "mfcc_9_std", "mfcc_10_std", "mfcc_11_std", "mfcc_12_std",
        "mfcc_13_std", "mfcc_14_std", "mfcc_15_std", "mfcc_16_std",
        "mfcc_17_std", "mfcc_18_std", "mfcc_19_std", "mfcc_20_std",
        "spectral_centroid_mean", "spectral_centroid_std",
        "spectral_bandwidth_mean", "spectral_bandwidth_std",
        "spectral_rolloff_mean", "spectral_rolloff_std",
        "zero_crossing_rate_mean", "zero_crossing_rate_std", "rms_mean",
        "rms_std", "chroma_1_mean", "chroma_2_mean", "chroma_3_mean",
        "chroma_4_mean", "chroma_5_mean", "chroma_6_mean", "chroma_7_mean",
        "chroma_8_mean", "chroma_9_mean", "chroma_10_mean",
        "chroma_11_mean", "chroma_12_mean", "chroma_1_std", "chroma_2_std",
        "chroma_3_std", "chroma_4_std", "chroma_5_std", "chroma_6_std",
        "chroma_7_std", "chroma_8_std", "chroma_9_std", "chroma_10_std",
        "chroma_11_std", "chroma_12_std",
    ],
    "kyc": [
        "Width", "Height", "Aspect Ratio", "Brightness Mean", "Brightness Std",
        "Brightness Median", "Brightness Min", "Brightness Max", "B_Mean",
        "B_Std", "G_Mean", "G_Std", "R_Mean", "R_Std", "Laplacian Var",
        "Tenengrad", "Edge Density", "Texture Var Mean", "Texture Var Std",
        "Hist Skewness", "Hist Kurtosis", "Noise Diff H", "Noise Diff V",
    ],
    "ato": [
        "key_count_deviation", "mean_key_hold_deviation", "std_key_hold_deviation",
        "median_key_hold_deviation", "mean_key_interval_deviation",
        "std_key_interval_deviation", "median_key_interval_deviation",
        "typing_speed_deviation", "backspace_count_deviation",
        "shift_count_deviation", "tab_count_deviation", "space_count_deviation",
        "mouse_movement_count_deviation", "mean_mouse_distance_deviation",
        "std_mouse_distance_deviation", "total_mouse_distance_deviation",
        "mean_mouse_speed_deviation", "std_mouse_speed_deviation",
        "mouse_click_count_deviation",
    ],
}


def _features(model_name: str, values: Mapping[str, Any] | Sequence[Any]) -> pd.DataFrame:
    expected = _FEATURES[model_name]
    if isinstance(values, Mapping):
        missing = [name for name in expected if name not in values]
        extra = [name for name in values if name not in expected]
        if missing or extra:
            raise ValueError(f"{model_name} feature schema mismatch: missing={missing}, extra={extra}")
        row = [values[name] for name in expected]
    else:
        row = list(values)
        if len(row) != len(expected):
            raise ValueError(f"{model_name} requires {len(expected)} features, got {len(row)}")
    return pd.DataFrame([row], columns=expected)


def _result(model_name: str, model: Any, features: Any, threshold: float = 0.5, labels: tuple[str, str] = ("legitimate", "fraud")) -> dict[str, Any]:
    probabilities = model.predict_proba(features)[0]
    fraud_probability = float(probabilities[list(model.classes_).index(1)])
    return {
        "model": model_name,
        "fraud_probability": fraud_probability,
        "prediction": labels[1] if fraud_probability >= threshold else labels[0],
    }


def predict_transaction(features: Mapping[str, Any] | Sequence[Any], manager: ModelManager | None = None) -> dict[str, Any]:
    manager = manager or ModelManager()
    frame = _features("transaction", features)
    categories = getattr(manager.models["transaction"].booster_, "pandas_categorical", [])
    for index, name in enumerate(manager.configs["transaction"]["categorical_features"]):
        if index < len(categories):
            frame[name] = pd.Categorical(frame[name], categories=categories[index])
    return _result("transaction", manager.models["transaction"], frame)


def predict_phishing(text: str, manager: ModelManager | None = None) -> dict[str, Any]:
    if not isinstance(text, str) or not text.strip():
        raise ValueError("phishing prediction requires non-empty text")
    manager = manager or ModelManager()
    transformed = manager.models["phishing_vectorizer"].transform([text])
    return _result("phishing", manager.models["phishing"], transformed)


def _predict_extracted(model_name: str, features: Mapping[str, Any] | Sequence[Any], manager: ModelManager | None, threshold: float, labels: tuple[str, str]) -> dict[str, Any]:
    manager = manager or ModelManager()
    frame = _features(model_name, features)
    return _result(model_name, manager.models[model_name], frame, threshold, labels)


def predict_voice(features: Mapping[str, Any] | Sequence[Any], manager: ModelManager | None = None) -> dict[str, Any]:
    return _predict_extracted("voice", features, manager, 0.3153525624357167, ("real", "synthetic"))


def predict_deepfake(features: Mapping[str, Any] | Sequence[Any], manager: ModelManager | None = None) -> dict[str, Any]:
    return _predict_extracted("deepfake", features, manager, 0.1972240173598317, ("real", "deepfake"))


def predict_kyc(features: Mapping[str, Any] | Sequence[Any], manager: ModelManager | None = None) -> dict[str, Any]:
    return _predict_extracted("kyc", features, manager, 0.2800023153334619, ("genuine", "forged"))


def predict_ato(features: Mapping[str, Any] | Sequence[Any], manager: ModelManager | None = None) -> dict[str, Any]:
    return _predict_extracted("ato", features, manager, 0.5, ("legitimate", "account_takeover"))


def inference_requirements() -> dict[str, dict[str, Any]]:
    """Return the documented schema and preprocessing contract."""
    return {
        "transaction": {"features": _FEATURES["transaction"], "preprocessing": "Caller supplies the trained tabular features; categorical values must match the artifact vocabulary."},
        "phishing": {"features": "Saved TF-IDF vocabulary (6499 dimensions)", "preprocessing": "Saved TF-IDF vectorizer transforms text before Logistic Regression."},
        "voice": {"features": _FEATURES["voice"], "preprocessing": "Caller must provide audio feature extraction at 24 kHz; no extractor is present here."},
        "deepfake": {"features": 86, "preprocessing": "Caller must provide the original 86-feature video extractor; no extractor is present here."},
        "kyc": {"features": _FEATURES["kyc"], "preprocessing": "Caller must provide the original 23 image features; no extractor is present here."},
        "ato": {"features": _FEATURES["ato"], "preprocessing": "Caller must provide personalized behavioral deviation features; no extractor is present here."},
    }
