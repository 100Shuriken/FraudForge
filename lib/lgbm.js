/**
 * A LightGBM binary classifier, evaluated in the browser.
 *
 * A gradient-boosted tree ensemble is a sum over independent decision trees:
 * walk each tree to a leaf, add the leaf values, squash. There is nothing in
 * that which needs Python, so the models the site actually has feature
 * extractors for can run client-side rather than behind a service.
 *
 * The compact model JSON is produced by lab/scripts/export_lgbm.py, and parity
 * with the Python artifact is asserted in tools/checks/lgbmcheck.mjs.
 */

/**
 * Walk one tree to a leaf.
 *
 * Missing values are the subtle part, and getting them wrong is silent.
 * `m` is the split's missing_type:
 *
 *   0  None  LightGBM converts a missing value to 0 and compares normally.
 *            It does NOT follow default_left. Both of these models were
 *            trained this way.
 *   1  Zero  zero and missing are the same thing; route by default_left.
 *   2  NaN   missing is its own case; route by default_left.
 *
 * Treating every NaN as default_left put one KYC vector on the wrong leaf and
 * moved its probability by 6e-7 — small in output, but a different path.
 *
 * Categorical splits (`c === 1`) do not work like any of that. LightGBM sends
 * a row LEFT when its category code is a member of the split's set, and the
 * rules for absence are its own: a NaN goes right under missing_type NaN and
 * is otherwise read as code 0, and a negative code — which is what pandas
 * gives an unseen category — always goes right. default_left is not consulted.
 */

/** Membership in a sorted array of category codes. */
function inSet(codes, value) {
  let lo = 0;
  let hi = codes.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (codes[mid] === value) return true;
    if (codes[mid] < value) lo = mid + 1;
    else hi = mid - 1;
  }
  return false;
}
function walk(node, features) {
  while (typeof node === "object") {
    let value = features[node.f];
    const absent = value === undefined || value === null || Number.isNaN(value);

    let goLeft;
    if (node.c === 1) {
      // Categorical: set membership, with its own absence rules.
      // A missing value and an unseen category are the same thing here: both
      // go right, and missing_type is not consulted. Reading a NaN as code 0
      // instead moved four of the sixty transaction fixtures, one of them by
      // 0.08 — enough to flip a verdict.
      const code = absent ? -1 : Math.trunc(value);
      goLeft = code >= 0 && inSet(node.t, code);
    } else if (absent && node.m !== 0) {
      goLeft = node.d === 1;
    } else {
      if (absent) value = 0; // missing_type None
      if (node.m === 1 && value === 0) {
        goLeft = node.d === 1;
      } else {
        goLeft = value <= node.t; // numeric threshold split
      }
    }

    node = goLeft ? node.l : node.r;
  }
  return node;
}

/**
 * The category code a model assigns to a value, or -1 if it never saw it.
 * Exposed so a UI can offer exactly the vocabulary the model knows.
 */
export function encode(model, feature, value) {
  const vocabulary = model.cat?.[feature];
  if (!vocabulary) return -1;
  return vocabulary.indexOf(value);
}

/**
 * Raw score: the sum of every tree's leaf, before the link function.
 * Exposed because it is the honest thing to show when a caller wants to know
 * how strongly the ensemble leaned, independent of the sigmoid.
 */
export function rawScore(model, features) {
  let sum = model.b || 0;
  for (let i = 0; i < model.t.length; i += 1) sum += walk(model.t[i], features);
  return sum;
}

/** Probability of the positive class. */
export function predict(model, features) {
  return 1 / (1 + Math.exp(-rawScore(model, features)));
}

/**
 * Score a named feature object against a model, ordering values by the
 * model's own feature list so a caller never has to know the index layout.
 * Missing names are left undefined on purpose: LightGBM handles absence, and
 * substituting zero would be a quiet lie about what was measured.
 */
export function score(model, named) {
  const vector = new Array(model.n);
  for (let i = 0; i < model.f.length; i += 1) {
    const name = model.f[i];
    const v = named[name];
    if (typeof v === "number") {
      vector[i] = v;
    } else if (typeof v === "string" && model.cat && model.cat[name]) {
      // A categorical column is a pandas Categorical, so the model sees the
      // index of the value in its vocabulary. An unseen value is -1, which
      // LightGBM routes right — the same thing pandas would have done.
      vector[i] = encode(model, name, v);
    } else {
      vector[i] = undefined;
    }
  }

  const probability = predict(model, vector);
  const threshold = model.threshold ?? 0.5;

  return {
    model: model.name,
    probability,
    threshold,
    prediction: probability >= threshold ? "fraud" : "legitimate",
    supplied: model.f.filter(
      (n) => named[n] !== undefined && named[n] !== null && named[n] !== ""
    ).length,
    features: model.f.length,
    source: "in-browser",
  };
}
