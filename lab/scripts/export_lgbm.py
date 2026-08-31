"""Export a LightGBM classifier to a compact JSON the browser can evaluate.

`booster.dump_model()` carries a great deal that inference never reads —
per-node counts, gains, internal values, feature histograms. Stripping to the
decision structure alone takes the KYC model from 1.2MB to a fraction of that,
and the ATO model from 3.3MB, before gzip.

The emitted shape is deliberately terse because it ships to every visitor:

    {"n": <feature count>, "f": [names], "b": <init score>, "t": [tree, ...],
     "cat": {name: [vocabulary]}}     categorical columns, if any

    tree   = node
    node   = {"f": featureIdx, "t": threshold, "c": 1 if "==" else 0,
              "d": 1 if default_left else 0,
              "m": 0|1|2 for missing_type None|Zero|NaN,
              "l": node, "r": node}
           | number            (a leaf value)

A categorical split is set membership, not equality: LightGBM dumps its
threshold as a "||"-joined list of category indices and sends a row LEFT when
its code is in that set. `t` is that list, sorted, so the evaluator can binary
search it. The transaction model is the first one here with categorical
columns, and reading "==" as a single-value comparison would have quietly
routed every multi-category split wrong.

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
    "transaction": (
        "backend/models/transaction/lgb_transaction_fraud.pkl",
        "backend/models/transaction/transaction_fraud_config.json",
        "../lib/models/transaction.json",
    ),
    "voice": (
        "backend/models/voice/synthetic_voice_lightgbm.pkl",
        "backend/models/voice/synthetic_voice_config.json",
        "../lib/models/voice.json",
    ),
    "deepfake": (
        "backend/models/deepfake/deepfake_video_lightgbm.pkl",
        "backend/models/deepfake/deepfake_video_config.json",
        "../lib/models/deepfake.json",
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

    categorical = node.get("decision_type") == "=="
    if categorical:
        # "3||7||11" is a set of category codes, and the row goes left when its
        # code is a member. Sorted so the evaluator can binary search rather
        # than scan — DeviceInfo alone has 1786 categories.
        threshold = sorted(int(v) for v in str(node["threshold"]).split("||"))
    else:
        threshold = float(node["threshold"])

    return {
        "f": node["split_feature"],
        "t": threshold,
        "c": 1 if categorical else 0,
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

    # The transaction and voice boosters were trained on arrays, so their own
    # feature_name() is Column_0..Column_n. The real names live in the config
    # (and, for transaction, in the backend's schema), which is why the config
    # is the source of truth here rather than the artifact.
    features = (
        config.get("feature_names")
        or config.get("features_used")
        or config.get("features")
        or []
    )
    # The deepfake config records a count and no names, and the booster agrees:
    # it was trained on a bare array. There is nothing to recover, so the
    # positional names are carried through as they are rather than invented.
    if not features:
        count = config.get("num_features") or config.get("n_features")
        if count:
            features = [f"Column_{i}" for i in range(int(count))]
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

    # Categorical columns are pandas Categoricals, so the model sees a code:
    # the index of the value in this vocabulary. The browser has to encode the
    # same way, so the vocabularies ship with the model.
    categorical = config.get("categorical_features") or []
    vocabularies = dumped.get("pandas_categorical") or []
    if categorical and vocabularies:
        if len(categorical) != len(vocabularies):
            raise SystemExit(
                f"{name}: {len(categorical)} categorical columns but "
                f"{len(vocabularies)} vocabularies — the pairing is positional, "
                "so a mismatch would encode every one of them wrong."
            )
        payload["cat"] = dict(zip(categorical, vocabularies))

    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, "w", encoding="utf-8") as handle:
        json.dump(payload, handle, separators=(",", ":"))

    size = os.path.getsize(out) // 1024
    cats = len(payload.get("cat", {}))
    print(
        f"{name:12s} -> {out}  {len(payload['t'])} trees, "
        f"{len(features)} features, {cats} categorical, "
        f"threshold {threshold:.4f}, {size}KB"
    )


if __name__ == "__main__":
    targets = sys.argv[1:] or list(MODELS)
    for target in targets:
        export(target)
