import joblib, numpy as np, json, os
m = joblib.load("backend/models/phishing/logistic_regression_phishing_model.joblib")
v = joblib.load("backend/models/phishing/tfidf_phishing_vectorizer.joblib")

vocab = v.vocabulary_
idf = np.asarray(v.idf_, dtype=float)
coef = np.asarray(m.coef_, dtype=float).ravel()

# terms ordered by feature index so the three arrays share one index space
terms = [None] * len(vocab)
for term, i in vocab.items():
    terms[i] = term

payload = {
    "meta": {
        "source": "logistic_regression_phishing_model.joblib + tfidf_phishing_vectorizer.joblib",
        "vectorizer": "TfidfVectorizer",
        "ngram_range": list(v.ngram_range),
        "sublinear_tf": bool(v.sublinear_tf),
        "norm": v.norm,
        "lowercase": bool(v.lowercase),
        "token_pattern": v.token_pattern,
        "classes": [int(c) for c in m.classes_],
    },
    "terms": terms,
    "idf": [round(float(x), 6) for x in idf],
    "coef": [round(float(x), 6) for x in coef],
    "intercept": float(np.asarray(m.intercept_).ravel()[0]),
}

out = "../lib/phishing-model.json"
with open(out, "w", encoding="utf-8") as f:
    json.dump(payload, f, separators=(",", ":"))
print("wrote", out, os.path.getsize(out) // 1024, "KB")
print("terms", len(terms), "idf", len(idf), "coef", len(coef))
