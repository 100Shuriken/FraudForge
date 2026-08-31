"""Ground truth for the JS LightGBM parity check.

Generates random-but-deterministic feature vectors in a plausible range for
each model and records Python's probability for each, so the browser
implementation can be compared against the artifact rather than against a
reimplementation of itself.
"""
import joblib, json, numpy as np, os
import pandas as pd

SPECS = {
    "kyc": ("backend/models/kyc/kyc_document_fraud_lightgbm.pkl",
            "backend/models/kyc/kyc_document_fraud_config.json"),
    "ato": ("backend/models/ATO/ato_behavioral_lightgbm.pkl",
            "backend/models/ATO/ato_behavioral_config.json"),
    "voice": ("backend/models/voice/synthetic_voice_lightgbm.pkl",
              "backend/models/voice/synthetic_voice_config.json"),
}

# Scored separately: its 13 categorical columns have to go in as pandas
# Categoricals with the artifact's own vocabularies, or LightGBM sees different
# codes and the comparison is meaningless.
TRANSACTION = ("backend/models/transaction/lgb_transaction_fraud.pkl",
               "backend/models/transaction/transaction_fraud_config.json")

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

# ── transaction ──────────────────────────────────────────────────────────
# Categorical splits are set membership, and three paths through them are easy
# to get wrong and silent when you do: a code in the set, a code outside it,
# and a value the model never saw (pandas gives it code -1, which LightGBM
# always sends right). All three are exercised here.
model = joblib.load(TRANSACTION[0])
conf = json.load(open(TRANSACTION[1], encoding="utf-8"))
feats = conf["features_used"]
cat_cols = conf["categorical_features"]
vocabs = dict(zip(cat_cols, model.booster_.dump_model()["pandas_categorical"]))

rows = []
for i in range(60):
    row = {}
    for name in feats:
        if name in vocabs:
            vocab = vocabs[name]
            if i % 7 == 3:
                row[name] = "__never_seen__"      # code -1
            elif i % 11 == 5:
                row[name] = None                  # genuinely missing
            else:
                row[name] = vocab[int(rng.integers(len(vocab)))]
        elif name == "TransactionAmt":
            row[name] = float(rng.uniform(1, 4000))
        elif name == "TransactionDT":
            row[name] = float(rng.integers(86_400, 15_800_000))
        elif name == "log_amount":
            row[name] = float(np.log(row["TransactionAmt"]))
        elif name == "product_avg_amount":
            row[name] = float(rng.uniform(30, 200))
        elif name == "amount_vs_product_avg":
            row[name] = row["TransactionAmt"] / row["product_avg_amount"]
        elif name == "hour":
            row[name] = float(rng.integers(0, 24))
        elif name == "day":
            row[name] = float(rng.integers(0, 182))
        elif name == "is_night":
            row[name] = float(row["hour"] < 6)
        else:
            row[name] = float(rng.normal(0, 1))
    rows.append(row)

frame = pd.DataFrame(rows, columns=feats)
for name in cat_cols:
    frame[name] = pd.Categorical(frame[name], categories=vocabs[name])

p = model.predict_proba(frame)[:, 1]

def cell(name, value):
    """What the browser will be handed: a string for categoricals, else float."""
    if value is None or (isinstance(value, float) and np.isnan(value)):
        return None
    return value if name in vocabs else float(value)

out["transaction"] = {
    "features": feats,
    "named": True,
    "cases": [{"x": [cell(n, row[n]) for n in feats], "p": float(prob)}
              for row, prob in zip(rows, p)],
}
print(f"transaction: {len(rows)} cases, {len(feats)} features, {len(cat_cols)} categorical")

os.makedirs("../tools/checks", exist_ok=True)
json.dump(out, open("../tools/checks/lgbm-expected.json", "w"), separators=(",", ":"))
print("wrote ../tools/checks/lgbm-expected.json")
