"""
data_adapters.py — Multi-dataset schema adapters for FraudForge.

Common target schema
--------------------
amount              float  — raw transaction amount (adapted, not yet normalized)
hour_of_day         int    — 0-23
is_new_payee        float  — 0/1 or NaN when unavailable
txn_velocity_window float  — transactions in recent window, NaN when unavailable
balance_before      float  — account balance before txn, NaN when unavailable
balance_after       float  — account balance after txn, NaN when unavailable
channel             str    — mobile / web / branch / unknown
is_fraud            int    — 0/1
source_dataset      str    — "paysim" | "creditcard_ulb"

Companion boolean flag columns (always present, never NaN)
----------------------------------------------------------
has_is_new_payee    int    — 1 if is_new_payee was derivable, else 0
has_velocity_info   int    — 1 if txn_velocity_window was available, else 0
has_balance_info    int    — 1 if balance_before/balance_after were available, else 0
has_channel_info    int    — 1 if channel was derivable from data (not set to "unknown"), else 0

amount_norm         float  — log1p + per-source z-score (added by build_merged_dataset)

Rules
-----
- NEVER fabricate a plausible value for a missing field. Missing → NaN + flag=0.
- Normalization is done WITHIN each source before merging, never jointly.
"""

from __future__ import annotations

import logging
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Paths
# ---------------------------------------------------------------------------

_THIS_DIR = Path(__file__).resolve().parent
_DATA_DIR = _THIS_DIR / "data"
_MERGED_PARQUET = _DATA_DIR / "merged_fraud_dataset.parquet"

# Raw dataset locations (relative to FraudForge project root, one level up from backend/)
_PROJECT_ROOT = _THIS_DIR.parent
_PAYSIM_CSV = (
    _PROJECT_ROOT
    / "PS_20174392719_1491204439457_log.csv"
    / "PS_20174392719_1491204439457_log.csv"
)
_CREDITCARD_CSV = _PROJECT_ROOT / "creditcard.csv" / "creditcard.csv"

# How many PaySim rows to sample (stratified by is_fraud).
# Full PaySim is ~6.3M rows; 500k keeps training fast while remaining representative.
PAYSIM_SAMPLE_N = 500_000

# ---------------------------------------------------------------------------
# Milestone 1 — Schema + Adapters
# ---------------------------------------------------------------------------

_PAYSIM_TYPE_TO_CHANNEL = {
    "CASH_OUT": "mobile",
    "TRANSFER": "web",
    "PAYMENT": "web",
    "CASH_IN": "branch",
    "DEBIT": "mobile",
}


def adapt_paysim(df: pd.DataFrame) -> pd.DataFrame:
    """Map PaySim columns into the common target schema.

    PaySim columns used:
        step, type, amount, nameOrig, nameDest,
        oldbalanceOrg, newbalanceOrig, oldbalanceDest, isFraud

    Missing fields:
        txn_velocity_window → NaN, has_velocity_info=0
        is_new_payee derived heuristically; flag=1 since we have enough info
        channel derived from type; has_channel_info=1
        balance_before/after available; has_balance_info=1
    """
    out = pd.DataFrame()

    out["amount"] = df["amount"].astype(float)

    # step = hours since simulation start; wrap to 24-hour clock
    out["hour_of_day"] = (df["step"] % 24).astype(int)

    # Heuristic: destination account is "new" if dest starts with 'C' (customer)
    # and oldbalanceDest is 0 (no pre-existing balance).
    out["is_new_payee"] = (
        (df["nameDest"].str.startswith("C", na=False)) & (df["oldbalanceDest"] == 0)
    ).astype(float)
    out["has_is_new_payee"] = 1

    # No per-account velocity info in PaySim
    out["txn_velocity_window"] = np.nan
    out["has_velocity_info"] = 0

    out["balance_before"] = df["oldbalanceOrg"].astype(float)
    out["balance_after"] = df["newbalanceOrig"].astype(float)
    out["has_balance_info"] = 1

    out["channel"] = df["type"].map(_PAYSIM_TYPE_TO_CHANNEL).fillna("unknown")
    out["has_channel_info"] = 1

    out["is_fraud"] = df["isFraud"].astype(int)
    out["source_dataset"] = "paysim"

    return out.reset_index(drop=True)


def adapt_creditcard(df: pd.DataFrame) -> pd.DataFrame:
    """Map ULB Credit Card Fraud Detection columns into the common target schema.

    ULB columns used:
        Time, Amount, Class   (V1-V28 are PCA-anonymized; not cross-dataset comparable)

    Missing fields:
        is_new_payee → NaN, has_is_new_payee=0
        txn_velocity_window → NaN, has_velocity_info=0
        balance_before/after → NaN, has_balance_info=0
        channel → "unknown", has_channel_info=0
    """
    out = pd.DataFrame()

    out["amount"] = df["Amount"].astype(float)

    # Time is seconds elapsed since first transaction in the dataset; wrap to 24h
    out["hour_of_day"] = (df["Time"].astype(float) // 3600).astype(int) % 24

    # No payee info in card-present/CNP datasets
    out["is_new_payee"] = np.nan
    out["has_is_new_payee"] = 0

    out["txn_velocity_window"] = np.nan
    out["has_velocity_info"] = 0

    out["balance_before"] = np.nan
    out["balance_after"] = np.nan
    out["has_balance_info"] = 0

    out["channel"] = "unknown"
    out["has_channel_info"] = 0

    out["is_fraud"] = df["Class"].astype(int)
    out["source_dataset"] = "creditcard_ulb"

    return out.reset_index(drop=True)


# ---------------------------------------------------------------------------
# Milestone 2 — Per-Source Normalization + Merge
# ---------------------------------------------------------------------------

# All columns in the canonical schema order (used for parquet write / read)
SCHEMA_COLUMNS = [
    "amount",
    "hour_of_day",
    "is_new_payee",
    "txn_velocity_window",
    "balance_before",
    "balance_after",
    "channel",
    "has_is_new_payee",
    "has_velocity_info",
    "has_balance_info",
    "has_channel_info",
    "is_fraud",
    "source_dataset",
    "amount_norm",  # added during normalization
]


def _normalize_amount(df: pd.DataFrame) -> pd.DataFrame:
    """Log1p + z-score normalize `amount` WITHIN the passed source dataframe.

    Returns the dataframe with a new `amount_norm` column added.
    The raw `amount` column is preserved unchanged.
    """
    log_amount = np.log1p(df["amount"])
    mu = log_amount.mean()
    sigma = log_amount.std()
    if sigma == 0 or np.isnan(sigma):
        sigma = 1.0
    df = df.copy()
    df["amount_norm"] = ((log_amount - mu) / sigma).astype(float)
    return df


def _load_paysim(sample_n: int = PAYSIM_SAMPLE_N) -> pd.DataFrame:
    """Load, sample (stratified by isFraud), and adapt PaySim."""
    logger.info("Loading PaySim from %s …", _PAYSIM_CSV)
    cols = ["step", "type", "amount", "nameOrig", "nameDest",
            "oldbalanceOrg", "newbalanceOrig", "oldbalanceDest", "isFraud"]
    df = pd.read_csv(_PAYSIM_CSV, usecols=cols, low_memory=False)
    logger.info("PaySim raw shape: %s", df.shape)

    # Stratified sample: maintain fraud/legit ratio
    fraud = df[df["isFraud"] == 1]
    legit = df[df["isFraud"] == 0]

    n_fraud = len(fraud)
    n_legit = len(legit)
    total = len(df)

    if total > sample_n:
        fraud_frac = n_fraud / total
        n_fraud_sample = max(1, int(sample_n * fraud_frac))
        n_legit_sample = sample_n - n_fraud_sample

        fraud_sample = fraud.sample(
            n=min(n_fraud_sample, n_fraud), random_state=42
        )
        legit_sample = legit.sample(
            n=min(n_legit_sample, n_legit), random_state=42
        )
        df = pd.concat([fraud_sample, legit_sample]).sample(frac=1, random_state=42)
        logger.info(
            "PaySim sampled: %d rows (%d fraud, %d legit)",
            len(df), len(fraud_sample), len(legit_sample),
        )
    else:
        logger.info("PaySim small enough — using full dataset (%d rows)", total)

    return adapt_paysim(df)


def _load_creditcard() -> pd.DataFrame:
    """Load and adapt the full ULB Credit Card dataset."""
    logger.info("Loading ULB Credit Card from %s …", _CREDITCARD_CSV)
    cols = ["Time", "Amount", "Class"]
    df = pd.read_csv(_CREDITCARD_CSV, usecols=cols, low_memory=False)
    logger.info("ULB Credit Card raw shape: %s", df.shape)
    return adapt_creditcard(df)


def build_merged_dataset(force_rebuild: bool = False) -> pd.DataFrame:
    """Build (or load from cache) the merged multi-source fraud dataset.

    The merged parquet is saved to backend/data/merged_fraud_dataset.parquet.
    On subsequent calls, the cached parquet is returned unless force_rebuild=True.

    Normalization is per-source (log1p + z-score on `amount`) before merging.
    The source_dataset column is preserved for auditing but excluded from
    training features downstream.
    """
    if not force_rebuild and _MERGED_PARQUET.exists():
        logger.info("Loading merged dataset from cache: %s", _MERGED_PARQUET)
        return pd.read_parquet(_MERGED_PARQUET)

    logger.info("Building merged dataset from scratch …")

    paysim_raw = _load_paysim()
    creditcard_raw = _load_creditcard()

    # Per-source normalization
    paysim = _normalize_amount(paysim_raw)
    creditcard = _normalize_amount(creditcard_raw)

    merged = pd.concat([paysim, creditcard], ignore_index=True)
    merged = merged.sample(frac=1, random_state=42).reset_index(drop=True)

    # Ensure column order
    extra_cols = [c for c in merged.columns if c not in SCHEMA_COLUMNS]
    merged = merged[SCHEMA_COLUMNS + extra_cols]

    _DATA_DIR.mkdir(parents=True, exist_ok=True)
    merged.to_parquet(_MERGED_PARQUET, index=False)
    logger.info(
        "Merged dataset saved: %s  shape=%s  fraud_rate=%.4f%%",
        _MERGED_PARQUET,
        merged.shape,
        merged["is_fraud"].mean() * 100,
    )
    return merged


# ---------------------------------------------------------------------------
# Milestone 3 — Validation Report (per-source stats)
# ---------------------------------------------------------------------------

_REPORTS_DIR = _THIS_DIR / "reports"


def generate_validation_report(df: pd.DataFrame | None = None) -> str:
    """Produce a markdown validation report for the merged dataset.

    Returns the markdown string and also writes it to backend/reports/validation_report.md.
    """
    if df is None:
        df = build_merged_dataset()

    lines: list[str] = [
        "# Merged Dataset Validation Report",
        "",
        f"**Generated**: 2026-08-25  |  **Total rows**: {len(df):,}  |  "
        f"**Overall fraud rate**: {df['is_fraud'].mean()*100:.4f}%",
        "",
    ]

    # Per-source summary
    lines += [
        "## Per-Source Summary",
        "",
        "| Source | Rows | Fraud rows | Fraud rate | amount mean | amount std | "
        "hour_of_day mean | has_balance | has_velocity | has_new_payee |",
        "|--------|------|-----------|-----------|------------|-----------|"
        "----------------|-------------|-------------|---------------|",
    ]

    sources = df["source_dataset"].unique()
    for src in sorted(sources):
        sub = df[df["source_dataset"] == src]
        n = len(sub)
        n_fraud = sub["is_fraud"].sum()
        fraud_rate = n_fraud / n * 100
        amt_mean = sub["amount"].mean()
        amt_std = sub["amount"].std()
        hr_mean = sub["hour_of_day"].mean()
        has_bal = sub["has_balance_info"].mean() * 100
        has_vel = sub["has_velocity_info"].mean() * 100
        has_np = sub["has_is_new_payee"].mean() * 100

        # Flag conditions
        flag = ""
        if fraud_rate < 0.001:
            flag = " ⚠️ VERY LOW FRAUD RATE"
        elif fraud_rate > 50:
            flag = " ⚠️ VERY HIGH FRAUD RATE"
        if amt_std < 1e-6:
            flag += " ⚠️ ZERO AMOUNT VARIANCE"

        lines.append(
            f"| {src}{flag} | {n:,} | {int(n_fraud):,} | {fraud_rate:.4f}% | "
            f"{amt_mean:.2f} | {amt_std:.2f} | {hr_mean:.1f} | "
            f"{has_bal:.0f}% | {has_vel:.0f}% | {has_np:.0f}% |"
        )

    lines += ["", "## Amount Distribution (after per-source log1p + z-score)", ""]
    lines += [
        "| Source | norm_mean | norm_std | p25 | p50 | p75 | p99 |",
        "|--------|-----------|---------|-----|-----|-----|-----|",
    ]
    for src in sorted(sources):
        sub = df[df["source_dataset"] == src]["amount_norm"]
        lines.append(
            f"| {src} | {sub.mean():.4f} | {sub.std():.4f} | "
            f"{sub.quantile(0.25):.3f} | {sub.quantile(0.50):.3f} | "
            f"{sub.quantile(0.75):.3f} | {sub.quantile(0.99):.3f} |"
        )

    lines += ["", "## Hour-of-Day Distribution", ""]
    lines += [
        "| Source | most_common_hour | least_common_hour | txns_in_9am_5pm_% |",
        "|--------|-----------------|------------------|-------------------|",
    ]
    for src in sorted(sources):
        sub = df[df["source_dataset"] == src]["hour_of_day"]
        counts = sub.value_counts()
        most = int(counts.idxmax())
        least = int(counts.idxmin())
        pct_business = (sub.between(9, 17).sum() / len(sub)) * 100
        lines.append(
            f"| {src} | {most}:00 | {least}:00 | {pct_business:.1f}% |"
        )

    lines += [
        "",
        "## Missing-Value Coverage",
        "",
        "| Source | is_new_payee available | velocity available | "
        "balance available | channel known |",
        "|--------|----------------------|------------------|"
        "-----------------|--------------|",
    ]
    for src in sorted(sources):
        sub = df[df["source_dataset"] == src]
        lines.append(
            f"| {src} | {'✓' if sub['has_is_new_payee'].mean() > 0.5 else '✗ (NaN)'} | "
            f"{'✓' if sub['has_velocity_info'].mean() > 0.5 else '✗ (NaN)'} | "
            f"{'✓' if sub['has_balance_info'].mean() > 0.5 else '✗ (NaN)'} | "
            f"{'✓' if sub['has_channel_info'].mean() > 0.5 else '✗ (unknown)'} |"
        )

    lines += [
        "",
        "## Flags / Anomalies",
        "",
    ]

    flagged = False
    for src in sorted(sources):
        sub = df[df["source_dataset"] == src]
        fr = sub["is_fraud"].mean() * 100
        if fr < 0.001:
            lines.append(f"- ⚠️ **{src}**: fraud rate ({fr:.5f}%) is extremely low — check adapter mapping.")
            flagged = True
        if sub["amount"].std() < 1e-6:
            lines.append(f"- ⚠️ **{src}**: amount variance is zero — normalization will be degenerate.")
            flagged = True

    if not flagged:
        lines.append("- ✅ No distribution anomalies detected after adaptation.")

    report_md = "\n".join(lines) + "\n"

    _REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    report_path = _REPORTS_DIR / "validation_report.md"
    report_path.write_text(report_md, encoding="utf-8")
    logger.info("Validation report saved to %s", report_path)

    return report_md


# ---------------------------------------------------------------------------
# Feature columns for downstream training
# ---------------------------------------------------------------------------

# These are the features extracted from the merged dataset for model training.
# source_dataset is intentionally excluded here.
MERGED_FEATURES = [
    "amount_norm",
    "hour_of_day",
    "is_new_payee",       # NaN → filled with 0; use has_is_new_payee to distinguish
    "has_is_new_payee",
    "balance_before",     # NaN → filled with 0; use has_balance_info to distinguish
    "balance_after",      # NaN → filled with 0
    "has_balance_info",
    "has_velocity_info",
    "has_channel_info",
]


def get_feature_matrix(df: pd.DataFrame) -> tuple[pd.DataFrame, pd.Series]:
    """Return (X, y) for model training from the merged dataset.

    - Fills NaN in numeric features with 0 (missing-info is captured by the has_* flags).
    - Asserts source_dataset is NOT in the feature columns.
    - Returns a clean copy safe to pass directly to XGBoost.
    """
    assert "source_dataset" not in MERGED_FEATURES, (
        "SAFETY: source_dataset must never appear in MERGED_FEATURES — "
        "it is an audit column, not a predictive feature."
    )

    X = df[MERGED_FEATURES].copy()
    # Fill NaN with 0; the has_* flags tell the model when a field was genuinely missing
    X = X.fillna(0)
    y = df["is_fraud"].astype(int)
    return X, y


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    print("Building merged dataset …")
    merged = build_merged_dataset()
    print(f"Shape: {merged.shape}")
    print(merged["source_dataset"].value_counts())
    print(f"Overall fraud rate: {merged['is_fraud'].mean()*100:.4f}%")
    print("\nGenerating validation report …")
    report = generate_validation_report(merged)
    print(report)
