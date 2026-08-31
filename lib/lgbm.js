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
 */
function walk(node, features) {
  while (typeof node === "object") {
    let value = features[node.f];
    const absent = value === undefined || value === null || Number.isNaN(value);

    let goLeft;
    if (absent && node.m !== 0) {
      goLeft = node.d === 1;
    } else {
      if (absent) value = 0; // missing_type None
      if (node.m === 1 && value === 0) {
        goLeft = node.d === 1;
      } else if (node.c === 1) {
        goLeft = value === node.t; // categorical equality split
      } else {
        goLeft = value <= node.t; // numeric threshold split
      }
    }

    node = goLeft ? node.l : node.r;
  }
  return node;
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
    const v = named[model.f[i]];
    vector[i] = typeof v === "number" ? v : undefined;
  }

  const probability = predict(model, vector);
  const threshold = model.threshold ?? 0.5;

  return {
    model: model.name,
    probability,
    threshold,
    prediction: probability >= threshold ? "fraud" : "legitimate",
    supplied: model.f.filter((n) => typeof named[n] === "number").length,
    features: model.f.length,
    source: "in-browser",
  };
}
