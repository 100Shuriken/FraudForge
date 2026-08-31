"""Ground truth for the JS LightGBM parity check.

Generates random-but-deterministic feature vectors in a plausible range for
each model and records Python's probability for each, so the browser
implementation can be compared against the artifact rather than against a
reimplementation of itself.
"""
import joblib, json, numpy as np, os

SPECS = {
    "kyc": ("backend/models/kyc/kyc_document_fraud_lightgbm.pkl",
            "backend/models/kyc/kyc_document_fraud_config.json"),
    "ato": ("backend/models/ATO/ato_behavioral_lightgbm.pkl",
            "backend/models/ATO/ato_behavioral_config.json"),
}

out = {}
rng = np.random.default_rng(2026)

for name, (art, cfg) in SPECS.items():
    model = joblib.load(art)
    conf = json.load(open(cfg, encoding="utf-8"))
    feats = conf.get("feature_names") or conf.get("features")

    # A spread of magnitudes, plus rows with missing values, because
    # default_left handling is the easiest thing to get wrong.
    rows = []
    for i in range(40):
        v = rng.normal(0, 1, len(feats)) * rng.choice([0.1, 1, 10, 250])
        if i % 5 == 0:
            for j in rng.choice(len(feats), size=3, replace=False):
                v[j] = np.nan
        rows.append(v)

    X = np.array(rows, dtype=float)
    p = model.predict_proba(X)[:, 1]
    out[name] = {
        "features": feats,
        "cases": [{"x": [None if np.isnan(a) else float(a) for a in row],
                   "p": float(prob)} for row, prob in zip(X, p)],
    }
    print(f"{name}: {len(rows)} cases, {len(feats)} features")

os.makedirs("../tools/checks", exist_ok=True)
json.dump(out, open("../tools/checks/lgbm-expected.json", "w"), separators=(",", ":"))
print("wrote ../tools/checks/lgbm-expected.json")
