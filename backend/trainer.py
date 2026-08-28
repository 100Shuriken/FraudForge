"""
trainer.py — XGBoost classifier training for FraudForge defense dashboard.

Trains two models:
  (a) Baseline: real data only (mostly legit, some fraud from reference set)
  (b) Augmented: real data + injected synthetic fraud
Then runs an adversarial loop: false-negative patterns → Gemini evasion advice →
harder Round 2 / Round 3 batches → retrain and compare metrics.
"""

from __future__ import annotations

import datetime
import json
import logging
import re
import random
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import (
    precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix
)
from xgboost import XGBClassifier

from generators import (
    DEFAULT_STEALTH_SPEC,
    _fallback_source,
    _generate_fraud_transactions,
    _generate_legit_transactions,
)

FEATURES = ["amount", "hour", "is_new_payee", "txn_velocity_1h", "days_since_last_txn", "is_international"]

_EVASION_SYSTEM = (
    "You are a cybersecurity researcher on a fraud red-team. Output is used only to "
    "harden a detector in a controlled demo. Never provide advice for real-world crime. "
    "Always include a JSON object with feature adjustments so the synthetic generator can "
    "produce a harder follow-up batch."
)

_MOCK_EVASION = (
    "A fraudster would drop the obvious burst signals: keep hourly velocity at 1–3, "
    "move activity into 9 AM–5 PM, reuse existing payees, and keep amounts in the "
    "everyday vendor range instead of $499.99 clusters. International rails stay rare "
    "so the row looks like a routine domestic payment.\n\n"
    '{"hour_prefer":[9,10,11,12,13,14,15,16,17],"is_new_payee_rate":0.05,'
    '"velocity_max":2,"days_since_min":3,"is_international_rate":0.03,'
    '"amount_style":"blend_legit","tactics":"Mimic daytime domestic vendor payments"}'
)


def _build_reference_data() -> pd.DataFrame:
    """Build a 'real' reference dataset: mostly legit + a small amount of real fraud."""
    legit = _generate_legit_transactions(400)
    real_fraud = _generate_fraud_transactions(20)
    real_fraud["source"] = "real_fraud"
    return pd.concat([legit, real_fraud], ignore_index=True).sample(frac=1, random_state=123).reset_index(drop=True)


def _new_model(y_train) -> XGBClassifier:
    return XGBClassifier(
        n_estimators=100,
        max_depth=4,
        learning_rate=0.1,
        scale_pos_weight=max(1, (y_train == 0).sum() / max(1, (y_train == 1).sum())),
        random_state=42,
        eval_metric="logloss",
    )


def _fit(X_train, y_train) -> XGBClassifier:
    model = _new_model(y_train)
    model.fit(X_train, y_train, verbose=False)
    return model


def _fit_logistic_regression(X_train, y_train):
    pipeline = make_pipeline(
        StandardScaler(),
        LogisticRegression(class_weight="balanced", max_iter=1000, random_state=42)
    )
    pipeline.fit(X_train, y_train)
    return pipeline


def _evaluate_model(model, X_test, y_test, label: str, train_samples: int, fraud_rate_train: float) -> dict:
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]
    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)
    return {
        "label": label,
        "precision": round(precision_score(y_test, y_pred, zero_division=0), 4),
        "recall": round(recall_score(y_test, y_pred, zero_division=0), 4),
        "f1": round(f1_score(y_test, y_pred, zero_division=0), 4),
        "auc": round(roc_auc_score(y_test, y_prob), 4) if len(set(y_test)) > 1 else 0.0,
        "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        "trainSamples": int(train_samples),
        "testSamples": int(len(X_test)),
        "fraudRateTrain": round(float(fraud_rate_train) * 100, 1),
    }


def _train_and_evaluate(X_train, y_train, X_test, y_test, label: str) -> dict:
    """Train an XGBoost model and return evaluation metrics."""
    model = _fit(X_train, y_train)
    return _evaluate_model(
        model, X_test, y_test, label, len(X_train), (y_train == 1).mean()
    )


def _feature_importance(model) -> dict:
    return dict(zip(FEATURES, [round(float(x), 4) for x in model.feature_importances_]))


def _summarize_pattern(df: pd.DataFrame) -> dict:
    if df.empty:
        return {}
    return {
        "count": int(len(df)),
        "avgAmount": round(float(df["amount"].mean()), 2),
        "avgHour": round(float(df["hour"].mean()), 1),
        "pctNewPayee": round(float(df["is_new_payee"].mean()) * 100, 1),
        "avgVelocity": round(float(df["txn_velocity_1h"].mean()), 1),
        "avgDaysSinceLast": round(float(df["days_since_last_txn"].mean()), 1),
        "pctInternational": round(float(df["is_international"].mean()) * 100, 1),
    }


def _collect_missed_fraud(model, probe: pd.DataFrame, limit: int = 8) -> pd.DataFrame:
    """False negatives, or lowest-probability fraud if the model catches everything."""
    X = probe[FEATURES]
    preds = model.predict(X)
    probs = model.predict_proba(X)[:, 1]
    missed = probe.loc[preds == 0].copy()
    if missed.empty:
        order = np.argsort(probs)[:limit]
        missed = probe.iloc[order].copy()
        missed["nearMiss"] = True
    else:
        missed = missed.head(limit).copy()
        missed["nearMiss"] = False
    # Align probability by positional index into the probe frame
    probe_pos = {idx: i for i, idx in enumerate(probe.index)}
    missed["predicted_fraud_prob"] = [
        round(float(probs[probe_pos[idx]]), 4) for idx in missed.index
    ]
    return missed.reset_index(drop=True)


def _parse_evasion_spec(text: str) -> dict:
    spec = dict(DEFAULT_STEALTH_SPEC)
    match = re.search(r"\{[\s\S]*\}", text)
    if not match:
        return spec
    try:
        parsed = json.loads(match.group(0))
    except json.JSONDecodeError:
        return spec
    if not isinstance(parsed, dict):
        return spec
    if isinstance(parsed.get("hour_prefer"), list) and parsed["hour_prefer"]:
        spec["hour_prefer"] = [int(h) % 24 for h in parsed["hour_prefer"]]
    for key in ("is_new_payee_rate", "is_international_rate"):
        if key in parsed:
            spec[key] = float(parsed[key])
    for key in ("velocity_max", "days_since_min"):
        if key in parsed:
            spec[key] = int(parsed[key])
    if parsed.get("amount_style"):
        spec["amount_style"] = str(parsed["amount_style"])
    if parsed.get("tactics"):
        spec["tactics"] = str(parsed["tactics"])
    return spec


def _tighten_spec(spec: dict) -> dict:
    tighter = dict(spec)
    tighter["velocity_max"] = max(1, int(spec.get("velocity_max", 3)) - 1)
    tighter["is_new_payee_rate"] = max(0.02, float(spec.get("is_new_payee_rate", 0.06)) * 0.7)
    tighter["is_international_rate"] = max(0.01, float(spec.get("is_international_rate", 0.04)) * 0.7)
    tighter["days_since_min"] = int(spec.get("days_since_min", 2)) + 1
    tighter["tactics"] = (
        (spec.get("tactics") or "")
        + " Round-3 tightening: even closer to payroll-like domestic traffic."
    )
    return tighter


def _ask_evasion(pattern: dict, samples: list[dict]) -> tuple[str, str, dict]:
    """Return (prose, source, parsed spec) describing how to evade the current detector."""
    prompt = (
        "These synthetic fraud transactions were missed (false negatives) or nearly missed "
        "by an XGBoost payment-fraud detector. Feature means:\n"
        f"{json.dumps(pattern, indent=2)}\n\n"
        "Sample rows:\n"
        f"{json.dumps(samples[:5], indent=2, default=str)}\n\n"
        "In 3-5 sentences, explain how a fraudster would adjust this pattern to keep evading "
        "detection in a research simulation. Then output a single JSON object with keys: "
        "hour_prefer (list of hours 0-23), is_new_payee_rate (0-1), velocity_max (int), "
        "days_since_min (int), is_international_rate (0-1), amount_style "
        "('blend_legit' or 'small_cluster'), tactics (one sentence)."
    )
    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        text = ask_gemini(prompt, max_tokens=500, system=_EVASION_SYSTEM)
        return text, "Gemini API", _parse_evasion_spec(text)
    except Exception as exc:  # noqa: BLE001
        return _MOCK_EVASION, _fallback_source(exc), _parse_evasion_spec(_MOCK_EVASION)


def _split_holdout(df: pd.DataFrame, holdout_frac: float = 0.35):
    n_hold = max(1, int(len(df) * holdout_frac))
    holdout = df.iloc[:n_hold].copy()
    train = df.iloc[n_hold:].copy()
    if train.empty:
        train = df.copy()
    return train, holdout


def _lab_records_frame(lab_records: list[dict]) -> pd.DataFrame:
    """Convert validated AI Defense Lab records into the six training features."""
    if not lab_records:
        return pd.DataFrame(columns=FEATURES + ["is_fraud"]).astype(float)
    rows = []
    for record in lab_records:
        amount = float(record.get("amount", 0))
        if not np.isfinite(amount) or amount <= 0:
            raise ValueError("Lab records must contain positive finite amounts")
        hour = int(record.get("hour", 12))
        if not 0 <= hour <= 23:
            raise ValueError("Lab record hours must be between 0 and 23")
        attack_type = record.get("attackType", "")
        signal = str(record.get("signal", ""))
        velocity = int(record.get("txn_velocity_1h", 1))
        if "txn/hr" in signal:
            velocity = int(float(signal.split(" ", 1)[0]))
        rows.append({
            "amount": amount,
            "hour": hour,
            "is_new_payee": int(attack_type in {"device_switch", "account_takeover"}),
            "txn_velocity_1h": max(1, velocity),
            "days_since_last_txn": 1,
            "is_international": int(attack_type == "account_takeover"),
            "is_fraud": 1,
        })
    df = pd.DataFrame(rows, columns=FEATURES + ["is_fraud"])
    return df.astype({"amount": float, "hour": int, "is_new_payee": int, "txn_velocity_1h": int, "days_since_last_txn": int, "is_international": int, "is_fraud": int})


def train_both_models(lab_records: list[dict] | None = None, lab_run_id: str | None = None) -> dict:
    """Train baseline vs augmented classifiers, optionally including a Lab batch."""
    lab_records = lab_records or []
    reference = _build_reference_data()
    X_ref = reference[FEATURES]
    y_ref = reference["is_fraud"]

    X_train_base, X_test, y_train_base, y_test = train_test_split(
        X_ref, y_ref, test_size=0.3, stratify=y_ref, random_state=42
    )

    baseline_model = _fit(X_train_base, y_train_base)
    baseline_metrics = _evaluate_model(
        baseline_model, X_test, y_test, "XGBoost Baseline (Real Data Only)",
        len(X_train_base), (y_train_base == 1).mean(),
    )

    logistic_model = _fit_logistic_regression(X_train_base, y_train_base)
    logistic_metrics = _evaluate_model(
        logistic_model, X_test, y_test, "Logistic Regression Baseline",
        len(X_train_base), (y_train_base == 1).mean(),
    )

    synthetic_fraud = _generate_fraud_transactions(80, source="synthetic_fraud_r1")
    lab_batch = _lab_records_frame(lab_records)
    if not lab_batch.empty:
        X_train_aug = pd.concat([X_train_base, synthetic_fraud[FEATURES], lab_batch[FEATURES]], ignore_index=True)
        y_train_aug = pd.concat([y_train_base, synthetic_fraud["is_fraud"], lab_batch["is_fraud"]], ignore_index=True)
    else:
        X_train_aug = pd.concat([X_train_base, synthetic_fraud[FEATURES]], ignore_index=True)
        y_train_aug = pd.concat([y_train_base, synthetic_fraud["is_fraud"]], ignore_index=True)

    r1_model = _fit(X_train_aug, y_train_aug)
    augmented_metrics = _evaluate_model(
        r1_model, X_test, y_test, "Augmented (Real + Synthetic)",
        len(X_train_aug), (y_train_aug == 1).mean(),
    )
    importances_r1 = _feature_importance(r1_model)

    y_pred = r1_model.predict(X_test)
    y_prob = r1_model.predict_proba(X_test)[:, 1]
    flagged_idx = np.where(y_pred == 1)[0][:5]
    flagged_txns = []
    for idx in flagged_idx:
        row = X_test.iloc[idx].to_dict()
        prob = round(float(y_prob[idx]), 4)
        conf = round(abs(prob - 0.5) * 2, 4)
        conf_level = "High" if conf >= 0.70 else "Medium" if conf >= 0.35 else "Low"
        row["predicted_fraud_prob"] = prob
        row["confidence"] = conf
        row["confidence_level"] = conf_level
        row["actual_fraud"] = int(y_test.iloc[idx])
        flagged_txns.append(row)

    probe = _generate_fraud_transactions(40, source="probe_r1")
    missed = _collect_missed_fraud(r1_model, probe)
    fn_pattern = _summarize_pattern(missed)
    fn_samples = missed[FEATURES + ["predicted_fraud_prob"]].to_dict(orient="records")
    evasion_text, evasion_source, spec_r2 = _ask_evasion(fn_pattern, fn_samples)

    pool_r2 = _generate_fraud_transactions(120, evasion_spec=spec_r2, source="synthetic_fraud_r2")
    train_r2, hold_r2 = _split_holdout(pool_r2)

    probe_r2 = _generate_fraud_transactions(40, evasion_spec=spec_r2, source="probe_r2")
    missed_r2 = _collect_missed_fraud(r1_model, probe_r2)
    evasion_text_r2, evasion_source_r2, spec_r3_llm = _ask_evasion(
        _summarize_pattern(missed_r2),
        missed_r2[FEATURES + ["predicted_fraud_prob"]].to_dict(orient="records"),
    )
    spec_r3 = _tighten_spec(spec_r3_llm)
    pool_r3 = _generate_fraud_transactions(120, evasion_spec=spec_r3, source="synthetic_fraud_r3")
    train_r3, hold_r3 = _split_holdout(pool_r3)

    X_hold = pd.concat([X_test, hold_r2[FEATURES], hold_r3[FEATURES]], ignore_index=True)
    y_hold = pd.concat(
        [y_test.reset_index(drop=True), hold_r2["is_fraud"], hold_r3["is_fraud"]],
        ignore_index=True,
    )

    X_train_r2 = pd.concat([X_train_aug, train_r2[FEATURES]], ignore_index=True)
    y_train_r2 = pd.concat([y_train_aug, train_r2["is_fraud"]], ignore_index=True)
    r2_model = _fit(X_train_r2, y_train_r2)

    X_train_r3 = pd.concat([X_train_r2, train_r3[FEATURES]], ignore_index=True)
    y_train_r3 = pd.concat([y_train_r2, train_r3["is_fraud"]], ignore_index=True)
    r3_model = _fit(X_train_r3, y_train_r3)

    round_rows = []
    for rnd, model, X_tr, y_tr, label in (
        (1, r1_model, X_train_aug, y_train_aug, "Round 1 — easy synthetic fraud"),
        (2, r2_model, X_train_r2, y_train_r2, "Round 2 — evasion-tuned stealth fraud"),
        (3, r3_model, X_train_r3, y_train_r3, "Round 3 — tightened stealth fraud"),
    ):
        metrics = _evaluate_model(model, X_hold, y_hold, label, len(X_tr), (y_tr == 1).mean())
        fi = _feature_importance(model)
        round_rows.append({
            "round": rnd,
            "label": label,
            "metrics": metrics,
            "featureImportance": fi,
        })

    return {
        "baseline": baseline_metrics,
        "logisticBaseline": logistic_metrics,
        "augmented": augmented_metrics,
        "modelComparison": {
            "logisticVsXgb": {
                "precisionDelta": round(baseline_metrics["precision"] - logistic_metrics["precision"], 4),
                "recallDelta": round(baseline_metrics["recall"] - logistic_metrics["recall"], 4),
                "f1Delta": round(baseline_metrics["f1"] - logistic_metrics["f1"], 4),
                "aucDelta": round(baseline_metrics["auc"] - logistic_metrics["auc"], 4),
            },
            "note": "Logistic Regression fits a linear decision hyperplane with balanced class weights, often achieving decent recall on linear amount/velocity thresholds. In contrast, XGBoost captures non-linear feature interactions (such as high velocity during off-hours with newly added international payees) to significantly reduce false positives and improve overall precision.",
        },
        "featureImportance": importances_r1,
        "flaggedTransactions": flagged_txns,
        "improvement": {
            "precision": round(augmented_metrics["precision"] - baseline_metrics["precision"], 4),
            "recall": round(augmented_metrics["recall"] - baseline_metrics["recall"], 4),
            "f1": round(augmented_metrics["f1"] - baseline_metrics["f1"], 4),
            "auc": round(augmented_metrics["auc"] - baseline_metrics["auc"], 4),
        },
        "falseNegatives": {
            "count": int(fn_pattern.get("count", 0)),
            "pattern": fn_pattern,
            "samples": fn_samples,
        },
        "evasionAdvice": {
            "text": evasion_text,
            "source": evasion_source,
            "spec": spec_r2,
            "round2FollowUp": {
                "text": evasion_text_r2,
                "source": evasion_source_r2,
                "spec": spec_r3,
            },
        },
        "rounds": round_rows,
        "featureImportanceByRound": [
            {"round": r["round"], **r["featureImportance"]} for r in round_rows
        ],
        "labBatch": {
            "runId": lab_run_id,
            "recordsIncluded": len(lab_records),
            "includedIn": "Round 1 augmented training",
        },
    }


def run_live_benchmark() -> dict:
    """Run a compact, single-seed benchmark for the Live Benchmark screen."""
    started = time.perf_counter()
    seed = int(time.time_ns() % 2147483647)
    random.seed(seed)
    np.random.seed(seed)
    reference = _build_reference_data()
    X_ref = reference[FEATURES]
    y_ref = reference["is_fraud"]
    X_train_base, X_test, y_train_base, y_test = train_test_split(
        X_ref, y_ref, test_size=0.3, stratify=y_ref, random_state=seed
    )
    baseline = _train_and_evaluate(
        X_train_base, y_train_base, X_test, y_test,
        "Live baseline (real data only)",
    )
    synthetic_fraud = _generate_fraud_transactions(40, source="live_synthetic_fraud")
    X_train_aug = pd.concat([X_train_base, synthetic_fraud[FEATURES]], ignore_index=True)
    y_train_aug = pd.concat([y_train_base, synthetic_fraud["is_fraud"]], ignore_index=True)
    augmented = _train_and_evaluate(
        X_train_aug, y_train_aug, X_test, y_test,
        "Live augmented (real + synthetic)",
    )
    return {
        "seed": seed,
        "baseline": baseline,
        "augmented": augmented,
        "elapsedSeconds": round(time.perf_counter() - started, 2),
        "source": "backend/trainer.py · run_live_benchmark",
    }


# ---------------------------------------------------------------------------
# Gemini-powered transaction explanation (with mock fallback)
# ---------------------------------------------------------------------------

_EXPLAIN_SYSTEM = (
    "You are a financial fraud analyst AI assistant. Given a transaction's feature values "
    "and its fraud probability score, explain in 2-3 clear sentences why it was flagged. "
    "Be specific, cite the actual numbers, and write as if explaining to a bank ops team. "
    "Do NOT use bullet points — write flowing prose."
)

_MOCK_TEMPLATES = [
    "This transaction was flagged due to an unusually high velocity of {vel} transactions within "
    "one hour, combined with a new payee relationship. The ${amt:.2f} amount falls within a known "
    "testing cluster pattern commonly used in card-testing attacks.",
    "The transaction occurred at {hour}:00 — outside the account holder's typical activity window "
    "(9 AM–6 PM). Combined with the ${amt:.2f} amount to an international recipient and elevated "
    "transaction velocity, this pattern matches synthetic layering behaviour.",
    "This ${amt:.2f} transaction triggered multiple risk signals: new payee ({payee}), high hourly "
    "velocity ({vel} txns/hr), and amount clustering near common fraud thresholds. The combination "
    "yields a {prob:.0%} fraud probability.",
]


def explain_transaction(txn: dict) -> dict:
    """Generate a plain-language explanation for a flagged transaction via Gemini (mock fallback)."""
    amount = txn.get("amount", 0)
    hour = txn.get("hour", 0)
    vel = txn.get("txn_velocity_1h", 1)
    new_payee = txn.get("is_new_payee", 0)
    intl = txn.get("is_international", 0)
    days = txn.get("days_since_last_txn", 0)
    prob = txn.get("predicted_fraud_prob", 0.5)

    prompt = (
        f"A payment transaction has been flagged with {prob:.0%} fraud probability. "
        f"Here are its feature values:\n"
        f"- Amount: ${amount:.2f}\n"
        f"- Hour of day: {hour}:00\n"
        f"- Is new payee: {'yes' if new_payee else 'no'}\n"
        f"- Transaction velocity (last 1 hr): {vel} transactions\n"
        f"- Days since last transaction: {days}\n"
        f"- Is international: {'yes' if intl else 'no'}\n\n"
        f"Explain in 2-3 sentences why this transaction was flagged as likely fraud. "
        f"Be specific with the numbers and use plain language a bank operations team would appreciate."
    )

    try:
        from gemini_client import ask_gemini  # noqa: PLC0415
        explanation = ask_gemini(prompt, max_tokens=200, system=_EXPLAIN_SYSTEM)
        source = "Gemini API"
    except Exception as exc:  # noqa: BLE001
        import random
        template = random.choice(_MOCK_TEMPLATES)
        explanation = template.format(
            vel=vel, amt=amount, hour=hour,
            payee="yes" if new_payee else "no",
            prob=prob,
        )
        source = _fallback_source(exc)

    return {
        "transaction": txn,
        "explanation": explanation,
        "source": source,
    }


# ---------------------------------------------------------------------------
# Milestone 4 — Production Defender Model (multi-dataset, real data)
# ---------------------------------------------------------------------------

_MODELS_DIR = Path(__file__).resolve().parent / "models"
_DEFENDER_MODEL_PATH = _MODELS_DIR / "defender_v1.json"
_DEFENDER_META_PATH = _MODELS_DIR / "defender_v1_meta.json"


def train_defender_model(force_rebuild_data: bool = False) -> dict:
    """Train a production XGBoost model on the merged multi-source fraud dataset.

    Steps:
      1. Load (or build) merged dataset via data_adapters.build_merged_dataset()
      2. Source-stratified train/test split — each source proportionally represented
      3. Assert source_dataset is NOT in the feature set
      4. Train XGBClassifier with scale_pos_weight to handle class imbalance
      5. Evaluate: precision, recall, F1, AUC on held-out test set
      6. Save model → backend/models/defender_v1.json
      7. Save metadata + feature importances → backend/models/defender_v1_meta.json
      8. Return metrics dict

    Returns a dict with keys: precision, recall, f1, auc, feature_importances,
    trainSamples, testSamples, sourceBreakdown, modelPath, trainedAt.
    """
    # Late imports so this function doesn't slow down the rest of the backend
    from data_adapters import build_merged_dataset, get_feature_matrix, MERGED_FEATURES  # noqa: PLC0415

    # ---- 1. Load merged dataset ------------------------------------------
    df = build_merged_dataset(force_rebuild=force_rebuild_data)

    # ---- 2. Source-stratified split --------------------------------------
    # Build a composite stratification key: source × fraud label
    # This ensures each (source, is_fraud) combination appears in both splits.
    df = df.copy()
    df["_strat_key"] = df["source_dataset"].astype(str) + "_" + df["is_fraud"].astype(str)

    from sklearn.model_selection import train_test_split as _tts  # noqa: PLC0415
    train_df, test_df = _tts(
        df,
        test_size=0.25,
        stratify=df["_strat_key"],
        random_state=42,
    )
    train_df = train_df.drop(columns=["_strat_key"])
    test_df = test_df.drop(columns=["_strat_key"])

    # ---- 3. Feature matrix -----------------------------------------------
    X_train, y_train = get_feature_matrix(train_df)
    X_test, y_test = get_feature_matrix(test_df)

    # SAFETY: source_dataset must never be in the feature columns
    assert "source_dataset" not in X_train.columns, (
        "SAFETY VIOLATION: source_dataset found in feature matrix!"
    )

    # ---- 4. Train --------------------------------------------------------
    neg_count = int((y_train == 0).sum())
    pos_count = int((y_train == 1).sum())
    spw = max(1.0, neg_count / max(1, pos_count))

    model = XGBClassifier(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        scale_pos_weight=spw,
        random_state=42,
        eval_metric="auc",
        tree_method="hist",
    )
    model.fit(X_train, y_train, verbose=False)

    # ---- 5. Evaluate -----------------------------------------------------
    y_pred = model.predict(X_test)
    y_prob = model.predict_proba(X_test)[:, 1]

    precision = round(float(precision_score(y_test, y_pred, zero_division=0)), 4)
    recall = round(float(recall_score(y_test, y_pred, zero_division=0)), 4)
    f1 = round(float(f1_score(y_test, y_pred, zero_division=0)), 4)
    auc = round(float(roc_auc_score(y_test, y_prob)) if len(set(y_test)) > 1 else 0.0, 4)

    cm = confusion_matrix(y_test, y_pred)
    tn, fp, fn, tp = cm.ravel() if cm.size == 4 else (0, 0, 0, 0)

    # Per-source breakdown in the test set
    source_breakdown: dict = {}
    for src in test_df["source_dataset"].unique():
        idx = test_df["source_dataset"] == src
        yt = y_test[idx.values]
        yp = y_pred[idx.values]
        ypr = y_prob[idx.values]
        source_breakdown[src] = {
            "testSamples": int(idx.sum()),
            "fraudRows": int(yt.sum()),
            "precision": round(float(precision_score(yt, yp, zero_division=0)), 4),
            "recall": round(float(recall_score(yt, yp, zero_division=0)), 4),
            "f1": round(float(f1_score(yt, yp, zero_division=0)), 4),
            "auc": round(float(roc_auc_score(yt, ypr)) if len(set(yt)) > 1 else 0.0, 4),
        }

    # Feature importances
    feature_importances = {
        feat: round(float(imp), 6)
        for feat, imp in zip(MERGED_FEATURES, model.feature_importances_)
    }

    # ---- 6. Save model ---------------------------------------------------
    _MODELS_DIR.mkdir(parents=True, exist_ok=True)
    model.save_model(str(_DEFENDER_MODEL_PATH))
    logging.getLogger(__name__).info("Saved defender model → %s", _DEFENDER_MODEL_PATH)

    # ---- 7. Save metadata ------------------------------------------------
    trained_at = datetime.datetime.utcnow().isoformat() + "Z"
    meta = {
        "modelPath": str(_DEFENDER_MODEL_PATH),
        "trainedAt": trained_at,
        "trainSamples": int(len(X_train)),
        "testSamples": int(len(X_test)),
        "fraudRateTrain": round(float(y_train.mean()) * 100, 4),
        "metrics": {
            "precision": precision,
            "recall": recall,
            "f1": f1,
            "auc": auc,
            "confusionMatrix": {"tn": int(tn), "fp": int(fp), "fn": int(fn), "tp": int(tp)},
        },
        "sourceBreakdown": source_breakdown,
        "featureImportances": feature_importances,
        "sourceDatasets": list(df["source_dataset"].unique()),
    }
    _DEFENDER_META_PATH.write_text(
        json.dumps(meta, indent=2, default=str), encoding="utf-8"
    )
    logging.getLogger(__name__).info("Saved defender metadata → %s", _DEFENDER_META_PATH)

    return meta


def load_defender_model():
    """Load the persisted defender_v1 model if present; return None otherwise."""
    if not _DEFENDER_MODEL_PATH.exists():
        return None
    model = XGBClassifier()
    model.load_model(str(_DEFENDER_MODEL_PATH))
    return model


def load_defender_meta() -> dict | None:
    """Load defender metadata sidecar JSON, or None if not trained yet."""
    if not _DEFENDER_META_PATH.exists():
        return None
    return json.loads(_DEFENDER_META_PATH.read_text(encoding="utf-8"))
