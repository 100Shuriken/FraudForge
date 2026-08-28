"""
build_dataset.py — one-shot builder: loads CSVs, merges, generates validation report.
Run from backend/: python build_dataset.py
"""
import logging
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")

from data_adapters import build_merged_dataset, generate_validation_report

t0 = time.perf_counter()
df = build_merged_dataset()
elapsed = time.perf_counter() - t0

print(f"\n=== BUILD COMPLETE ({elapsed:.1f}s) ===")
print(f"Shape: {df.shape}")
print(df["source_dataset"].value_counts().to_string())
fraud_rate = df["is_fraud"].mean() * 100
print(f"Overall fraud rate: {fraud_rate:.4f}%")

t1 = time.perf_counter()
report = generate_validation_report(df)
print(f"\nValidation report generated ({time.perf_counter()-t1:.1f}s)")
print("\n" + report)
