"""Export a LightGBM classifier to a compact JSON the browser can evaluate.

`booster.dump_model()` carries a great deal that inference never reads —
per-node counts, gains, internal values, feature histograms. Stripping to the
decision structure alone takes the KYC model from 1.2MB to a fraction of that,
and the ATO model from 3.3MB, before gzip.

The emitted shape is deliberately terse because it ships to every visitor:

    {"n": <feature count>, "f": [names], "b": <init score>, "t": [tree, ...]}

    tree   = node
    node   = {"f": featureIdx, "t": threshold, "c": 1 if "==" else 0,
              "d": 1 if default_left else 0,
              "m": 0|1|2 for missing_type None|Zero|NaN,
              "l": node, "r": node}
           | number            (a leaf value)

Run from the lab directory:
    python scripts/export_lgbm.py
"""

from __future__ import annotations

import json
import os
import sys

import joblib

# name -> (artifact, config, output)
MODELS = {
    "kyc": (
        "backend/models/kyc/kyc_document_fraud_lightgbm.pkl",
        "backend/models/kyc/kyc_document_fraud_config.json",
        "../lib/models/kyc.json",
    ),
    "ato": (
        "backend/models/ATO/ato_behavioral_lightgbm.pkl",
        "backend/models/ATO/ato_behavioral_config.json",
        "../lib/models/ato.json",
    ),
}


def compact(node: dict):
    """Reduce one dumped node to the fields inference actually reads."""
    if "leaf_value" in node:
        # Leaf values are summed across 300 trees, so rounding here
        # accumulates. At 7 decimals the ensemble drifted ~6e-7 from Python;
        # full precision costs a little size and removes the drift entirely.
        return float(node["leaf_value"])
    # missing_type decides what a NaN means at this split, and it is not
    # optional: with "None" LightGBM converts missing to 0 and compares
    # normally, it does NOT follow default_left. Treating every NaN as
    # default_left put one KYC vector on the wrong leaf.
    missing = {"None": 0, "Zero": 1, "NaN": 2}.get(node.get("missing_type"), 0)

    return {
        "f": node["split_feature"],
        "t": float(node["threshold"]),
        "c": 1 if node.get("decision_type") == "==" else 0,
        "d": 1 if node.get("default_left") else 0,
        "m": missing,
        "l": compact(node["left_child"]),
        "r": compact(node["right_child"]),
    }


def export(name: str) -> None:
    artifact, config_path, out = MODELS[name]

    model = joblib.load(artifact)
    booster = model.booster_ if hasattr(model, "booster_") else model
    dumped = booster.dump_model()

    with open(config_path, encoding="utf-8") as handle:
        config = json.load(handle)

    features = config.get("feature_names") or config.get("features") or []
    threshold = (
        config.get("optimized_threshold")
        or config.get("threshold")
        or 0.5
    )

    payload = {
        "name": name,
        "n": dumped.get("max_feature_idx", len(features) - 1) + 1,
        "f": features,
        "b": 0.0,
        "threshold": float(threshold),
        "t": [compact(t["tree_structure"]) for t in dumped["tree_info"]],
    }

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))

    size = os.path.getsize(out) // 1024
    print(
        f"{name:4s} -> {out}  {len(payload['t'])} trees, "
        f"{len(features)} features, threshold {threshold:.4f}, {size}KB"
    )


if __name__ == "__main__":
    targets = sys.argv[1:] or list(MODELS)
    for target in targets:
        export(target)
