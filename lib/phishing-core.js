/**
 * The phishing classifier, running in the browser.
 *
 * This is not a reimplementation or an approximation — it is the same trained
 * model. `lib/phishing-model.json` carries the exported vocabulary, IDF vector
 * and logistic-regression coefficients straight out of the scikit-learn
 * artifacts, and the arithmetic below is what TfidfVectorizer + LogisticRegression
 * actually do at predict time:
 *
 *     tokenize -> 1-2 grams -> sublinear tf -> x idf -> L2 -> sigmoid(w.x + b)
 *
 * Doing it here rather than over the network removes the whole reason the site
 * needed a hosted Python service: no cold start, no CORS, no second bill, and
 * it cannot be asleep during a demo. The Python service remains the source of
 * truth and still serves the five models that genuinely need a runtime.
 *
 * Parity with scikit-learn is asserted in tools/checks/phishingcheck.mjs.
 *
 * The model is passed in rather than imported here so this file loads under
 * plain Node (which requires an import attribute for JSON) as well as under
 * the bundler. lib/phishing.js binds it to the shipped artifact.
 */

/* sklearn's default token_pattern is r"(?u)\b\w\w+\b" — words of two or more
   word-characters. Matching it exactly matters: a different tokenizer produces
   different features and therefore a different, wrong, score. */
const TOKEN = /[0-9A-Za-z_]{2,}/g;

const indexCache = new WeakMap();
function termIndex(MODEL) {
  let index = indexCache.get(MODEL);
  if (!index) {
    index = new Map();
    for (let i = 0; i < MODEL.terms.length; i += 1) index.set(MODEL.terms[i], i);
    indexCache.set(MODEL, index);
  }
  return index;
}

function tokenize(text) {
  return String(text).toLowerCase().match(TOKEN) || [];
}

/** Unigrams and bigrams, matching ngram_range (1, 2). */
function features(tokens) {
  const counts = new Map();
  const bump = (term) => counts.set(term, (counts.get(term) || 0) + 1);
  for (let i = 0; i < tokens.length; i += 1) {
    bump(tokens[i]);
    if (i + 1 < tokens.length) bump(`${tokens[i]} ${tokens[i + 1]}`);
  }
  return counts;
}

/**
 * Score one message.
 * Returns the same shape the Python endpoint returns, so the UI does not care
 * which one produced it.
 */
export function scorePhishing(MODEL, text) {
  const idx = termIndex(MODEL);
  const counts = features(tokenize(text));

  // sublinear tf: 1 + ln(count), then multiply by the fitted idf
  const hits = [];
  let norm = 0;
  for (const [term, count] of counts) {
    const i = idx.get(term);
    if (i === undefined) continue; // out-of-vocabulary terms are dropped
    const value = (1 + Math.log(count)) * MODEL.idf[i];
    hits.push([i, value]);
    norm += value * value;
  }

  // L2 normalise, then the linear model
  norm = Math.sqrt(norm) || 1;
  let z = MODEL.intercept;
  for (const [i, value] of hits) z += (value / norm) * MODEL.coef[i];

  const probability = 1 / (1 + Math.exp(-z));

  return {
    model: "phishing",
    fraud_probability: probability,
    prediction: probability >= 0.5 ? "fraud" : "legitimate",
    characters: String(text).length,
    matched_terms: hits.length,
    vocabulary: MODEL.terms.length,
    source: "in-browser",
  };
}

/** The terms that pushed the score hardest, for showing the reader why. */
export function topContributions(MODEL, text, limit = 6) {
  const idx = termIndex(MODEL);
  const counts = features(tokenize(text));

  const hits = [];
  let norm = 0;
  for (const [term, count] of counts) {
    const i = idx.get(term);
    if (i === undefined) continue;
    const value = (1 + Math.log(count)) * MODEL.idf[i];
    hits.push({ term, i, value });
    norm += value * value;
  }
  norm = Math.sqrt(norm) || 1;

  return hits
    .map((h) => ({ term: h.term, weight: (h.value / norm) * MODEL.coef[h.i] }))
    .sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight))
    .slice(0, limit);
}

