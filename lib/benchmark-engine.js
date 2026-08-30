/**
 * Legacy-versus-hardened comparison, and the adversarial retraining loop.
 *
 * The product claim is that a per-account scorer beats flat threshold rules.
 * This module makes that measurable instead of asserted: it builds a labelled
 * corpus, runs both detectors over it, and reports the confusion matrix that
 * falls out.
 */

import { makeRng, randomSeed } from "./rng.js";
import { scoreTransaction, legacyScore, LEGACY_AMOUNT_THRESHOLD, LEGACY_VELOCITY_THRESHOLD } from "./risk.js";
import { CUSTOMERS, ATTACK_FAMILIES, generateAndScore, getCustomer } from "./lab-engine.js";

/* ------------------------------------------------------------------ *
 * Corpus
 * ------------------------------------------------------------------ */

/** Ordinary spending for one account. This is the false-positive control. */
function legitimatePayments(customer, rng, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    // A regular spender varies less around their own mean.
    const spread = 0.45 * (1.2 - customer.regularity);
    const amount = Math.max(20, Number((customer.baseline * rng.gauss(1, Math.max(0.08, spread))).toFixed(2)));
    out.push({
      amount,
      amountBaseline: customer.baseline,
      velocity1h: Math.max(1, Math.round(rng.gauss(Math.max(1, customer.daily / 8), 0.6))),
      dailyBaseline: customer.daily,
      // Real customers do occasionally pay someone new, or travel.
      isNewPayee: rng.random() < 0.08 ? 1 : 0,
      isInternational: rng.random() < 0.03 ? 1 : 0,
      isNewDevice: rng.random() < 0.05 ? 1 : 0,
      hour: rng.choice([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
    });
  }
  return out;
}

function fraudFrom(families, rng, perFamily, difficulty) {
  const out = [];
  for (const name of families) {
    for (let i = 0; i < perFamily; i += 1) {
      const customer = rng.choice(CUSTOMERS);
      const recs = generateAndScore(customer, name, rng, difficulty, rng.uniform(0.4, 0.9));
      out.push(...recs.map((r) => r.features));
    }
  }
  return out;
}

function confusion(payments, labels, predict) {
  let tp = 0, fp = 0, tn = 0, fn = 0;
  payments.forEach((p, i) => {
    const flagged = predict(p);
    if (labels[i] && flagged) tp += 1;
    else if (labels[i] && !flagged) fn += 1;
    else if (!labels[i] && flagged) fp += 1;
    else tn += 1;
  });
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    truePositives: tp, falsePositives: fp, trueNegatives: tn, falseNegatives: fn,
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    falsePositiveRate: Number((fp + tn ? fp / (fp + tn) : 0).toFixed(4)),
  };
}

/** Run both detectors over one labelled corpus and compare them. */
export function benchmark(seed = 2026, perFamily = 1, legitPerCustomer = 30) {
  const rng = makeRng(`bench:${seed}`);
  const fraud = fraudFrom(ATTACK_FAMILIES.map((f) => f.name), rng, perFamily, "medium");
  const legit = [];
  for (const c of CUSTOMERS) legit.push(...legitimatePayments(c, rng, legitPerCustomer));

  const payments = [...fraud, ...legit];
  const labels = [...fraud.map(() => 1), ...legit.map(() => 0)];

  const legacy = confusion(payments, labels, (p) => legacyScore(p).flagged);
  const hardened = confusion(payments, labels, (p) => scoreTransaction(p).flagged);

  // Value the hardened scorer recovers: fraud it stops that the flat rules
  // would have let through. Reported for this corpus only.
  let recovered = 0;
  let fraudValue = 0;
  payments.forEach((p, i) => {
    if (!labels[i]) return;
    fraudValue += p.amount;
    if (scoreTransaction(p).flagged && !legacyScore(p).flagged) recovered += p.amount;
  });

  return {
    seed,
    corpus: { fraudulent: fraud.length, legitimate: legit.length, total: payments.length, fraudValue: Number(fraudValue.toFixed(2)) },
    legacy,
    hardened,
    recallDelta: Number((hardened.recall - legacy.recall).toFixed(4)),
    frictionDelta: Number((hardened.falsePositiveRate - legacy.falsePositiveRate).toFixed(4)),
    recoveredValue: Number(recovered.toFixed(2)),
    provenance: {
      legacy: `Static rules: amount >= $${LEGACY_AMOUNT_THRESHOLD.toLocaleString()} or velocity >= ${LEGACY_VELOCITY_THRESHOLD}/hr`,
      hardened: "Per-account graded signals",
      syntheticOnly: true,
    },
  };
}

/* ------------------------------------------------------------------ *
 * Adversarial retraining: logistic regression by gradient descent
 * ------------------------------------------------------------------ */

export const FEATURES = ["amountRatio", "velocityExcess", "isNewPayee", "isInternational", "isNewDevice", "hourOddness"];
export const FEATURE_LABELS = {
  amountRatio: "Amount vs account baseline",
  velocityExcess: "Velocity above normal cadence",
  isNewPayee: "First payment to payee",
  isInternational: "Cross-border routing",
  isNewDevice: "Unrecognised device",
  hourOddness: "Unusual hour",
};
const THRESHOLD = 0.5;

/** Express every payment relative to the account, not in absolute terms. */
function toVector(p) {
  const baseline = p.amountBaseline || 1000;
  const daily = p.dailyBaseline || 1;
  const hourlyBaseline = Math.max(0.5, daily / 8);
  const distance = Math.min(Math.abs(p.hour - 13), 24 - Math.abs(p.hour - 13));
  return [
    Math.min(4, p.amount / baseline),
    Math.min(5, Math.max(0, p.velocity1h - hourlyBaseline)),
    p.isNewPayee ? 1 : 0,
    p.isInternational ? 1 : 0,
    p.isNewDevice ? 1 : 0,
    Math.min(1, Math.max(0, (distance - 5) / 6)),
  ];
}

const sigmoid = (z) => (z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z)));

class LogisticModel {
  constructor(dim) {
    this.w = new Array(dim).fill(0);
    this.b = 0;
    this.mean = new Array(dim).fill(0);
    this.std = new Array(dim).fill(1);
  }

  standardize(x) {
    return x.map((v, j) => (v - this.mean[j]) / this.std[j]);
  }

  fit(X, y, epochs = 220, lr = 0.35, l2 = 1e-4) {
    const n = X.length;
    if (!n) return this;
    const dim = X[0].length;

    // Standardize so no single feature's scale dominates the gradient.
    for (let j = 0; j < dim; j += 1) {
      const col = X.map((r) => r[j]);
      const m = col.reduce((a, b) => a + b, 0) / n;
      const varr = col.reduce((a, b) => a + (b - m) ** 2, 0) / n;
      this.mean[j] = m;
      this.std[j] = Math.sqrt(varr) || 1;
    }
    const Z = X.map((r) => this.standardize(r));

    // Fraud is the minority class. Without weighting, the model scores well
    // by calling everything legitimate.
    const pos = y.reduce((a, b) => a + b, 0) || 1;
    const neg = n - pos || 1;
    const wPos = n / (2 * pos);
    const wNeg = n / (2 * neg);

    for (let e = 0; e < epochs; e += 1) {
      const gw = new Array(dim).fill(0);
      let gb = 0;
      for (let i = 0; i < n; i += 1) {
        let z = this.b;
        for (let j = 0; j < dim; j += 1) z += this.w[j] * Z[i][j];
        const err = (sigmoid(z) - y[i]) * (y[i] === 1 ? wPos : wNeg);
        for (let j = 0; j < dim; j += 1) gw[j] += err * Z[i][j];
        gb += err;
      }
      for (let j = 0; j < dim; j += 1) this.w[j] -= lr * (gw[j] / n + l2 * this.w[j]);
      this.b -= lr * (gb / n);
    }
    return this;
  }

  proba(x) {
    const z = this.standardize(x);
    let s = this.b;
    for (let j = 0; j < this.w.length; j += 1) s += this.w[j] * z[j];
    return sigmoid(s);
  }
}

/** Rank-based AUC, equivalent to the Mann-Whitney U statistic. */
function auc(probs, labels) {
  const pairs = probs.map((p, i) => [p, labels[i]]).sort((a, b) => a[0] - b[0]);
  const pos = labels.reduce((a, b) => a + b, 0);
  const neg = labels.length - pos;
  if (!pos || !neg) return 0;
  const ranks = new Array(pairs.length).fill(0);
  let i = 0;
  while (i < pairs.length) {
    let j = i;
    while (j + 1 < pairs.length && pairs[j + 1][0] === pairs[i][0]) j += 1;
    const avg = (i + j) / 2 + 1;
    for (let k = i; k <= j; k += 1) ranks[k] = avg;
    i = j + 1;
  }
  let rankSum = 0;
  pairs.forEach((p, idx) => { if (p[1] === 1) rankSum += ranks[idx]; });
  return (rankSum - (pos * (pos + 1)) / 2) / (pos * neg);
}

function evaluate(model, X, y) {
  const probs = X.map((x) => model.proba(x));
  let tp = 0, fp = 0, tn = 0, fn = 0;
  probs.forEach((p, i) => {
    const flagged = p >= THRESHOLD;
    if (y[i] && flagged) tp += 1;
    else if (y[i] && !flagged) fn += 1;
    else if (!y[i] && flagged) fp += 1;
    else tn += 1;
  });
  const precision = tp + fp ? tp / (tp + fp) : 0;
  const recall = tp + fn ? tp / (tp + fn) : 0;
  const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  return {
    precision: Number(precision.toFixed(4)),
    recall: Number(recall.toFixed(4)),
    f1: Number(f1.toFixed(4)),
    auc: Number(auc(probs, y).toFixed(4)),
    truePositives: tp, falsePositives: fp, falseNegatives: fn, testSamples: y.length,
  };
}

const importance = (model) => {
  const mags = model.w.map(Math.abs);
  const total = mags.reduce((a, b) => a + b, 0) || 1;
  return Object.fromEntries(FEATURES.map((f, i) => [f, Number((mags[i] / total).toFixed(4))]));
};

/**
 * Split families into the loud ones an ordinary detector already handles and
 * the quiet ones the adversarial rounds exist to teach it.
 *
 * Derived from each family's own generator shape rather than a hardcoded
 * name list, which previously went stale the moment the taxonomy grew.
 * Loudness is how hard a family leans on the signals a detector reads
 * easily: unrecognised devices, cross-border routing, and large amounts.
 */
const loudness = (f) =>
  f.device * 0.4 + f.intl * 0.3 + Math.min(1, Math.max(...f.amount) / 3) * 0.3;

const RANKED = [...ATTACK_FAMILIES].sort((a, b) => loudness(b) - loudness(a));
const EASY = RANKED.slice(0, Math.ceil(RANKED.length / 3)).map((f) => f.name);
const EVASIVE = RANKED.slice(Math.ceil(RANKED.length / 3)).map((f) => f.name);

const split = (items, rng, frac = 0.7) => {
  const s = rng.shuffle([...items]);
  const cut = Math.floor(s.length * frac);
  return [s.slice(0, cut), s.slice(cut)];
};

/** Three rounds of the red-team / blue-team loop. */
export function train(seed = null) {
  const effectiveSeed = seed ?? randomSeed();
  const rng = makeRng(`train:${effectiveSeed}`);

  const legitAll = [];
  for (const c of CUSTOMERS) legitAll.push(...legitimatePayments(c, rng, 26));
  const easyAll = fraudFrom(EASY, rng, 2, "easy");
  const evasiveAll = fraudFrom(EVASIVE, rng, 1, "medium");
  const hardAll = fraudFrom(EVASIVE, rng, 1, "hard");

  const [legitTrain, legitTest] = split(legitAll, rng);
  const [easyTrain, easyTest] = split(easyAll, rng);
  const [evasiveTrain, evasiveTest] = split(evasiveAll, rng);
  const [hardTrain, hardTest] = split(hardAll, rng);

  // One fixed test set for every round, so the rounds are comparable.
  const testPayments = [...legitTest, ...easyTest, ...evasiveTest, ...hardTest];
  const testLabels = [
    ...legitTest.map(() => 0),
    ...easyTest.map(() => 1),
    ...evasiveTest.map(() => 1),
    ...hardTest.map(() => 1),
  ];
  const XTest = testPayments.map(toVector);

  const fit = (fraudTrain) => {
    const payments = [...legitTrain, ...fraudTrain];
    const labels = [...legitTrain.map(() => 0), ...fraudTrain.map(() => 1)];
    return new LogisticModel(FEATURES.length).fit(payments.map(toVector), labels);
  };

  const rounds = [];
  let model = fit(easyTrain);
  let metrics = evaluate(model, XTest, testLabels);
  rounds.push({
    round: 1, name: "Baseline", mined: 0,
    description: "Trained on ordinary traffic and non-evasive fraud only.",
    ...metrics, featureImportance: importance(model),
  });
  const baselineMetrics = metrics;

  let fraudTrain = [...easyTrain];
  const pools = [["Second pass", evasiveTrain], ["Third pass", hardTrain]];
  pools.forEach(([name, pool], idx) => {
    const missed = pool.filter((p) => model.proba(toVector(p)) < THRESHOLD);
    const mined = missed.length ? missed : pool;
    fraudTrain = [...fraudTrain, ...mined];
    model = fit(fraudTrain);
    metrics = evaluate(model, XTest, testLabels);
    rounds.push({
      round: idx + 2, name, mined: mined.length,
      description: `Mined ${mined.length} payments the previous model missed, then retrained on them.`,
      ...metrics, featureImportance: importance(model),
    });
  });

  const stillMissed = testPayments.filter((p, i) => testLabels[i] === 1 && model.proba(toVector(p)) < THRESHOLD);

  return {
    seed: effectiveSeed,
    corpus: { legitimate: legitAll.length, easyFraud: easyAll.length, evasiveFraud: evasiveAll.length, hardFraud: hardAll.length, testSamples: testPayments.length },
    rounds,
    improvement: {
      recall: Number((metrics.recall - baselineMetrics.recall).toFixed(4)),
      precision: Number((metrics.precision - baselineMetrics.precision).toFixed(4)),
      auc: Number((metrics.auc - baselineMetrics.auc).toFixed(4)),
    },
    featureImportance: importance(model),
    featureLabels: FEATURE_LABELS,
    stillEvading: stillMissed.length,
    evasionAdvice: advice(stillMissed),
    provenance: {
      model: "Logistic regression, gradient descent, class-weighted, L2 regularised",
      threshold: THRESHOLD,
      note: "Metrics come from a held-out 30% split that is identical across all three rounds.",
      syntheticOnly: true,
    },
  };
}

function advice(missed) {
  if (!missed.length) {
    return "The hardened model caught every fraudulent payment in the held-out split. Raise the attack difficulty to keep finding blind spots.";
  }
  const ratios = missed.map((p) => p.amount / (p.amountBaseline || 1));
  const vels = missed.map((p) => p.velocity1h);
  const newPayee = missed.filter((p) => p.isNewPayee).length;
  const mean = (a) => a.reduce((x, y) => x + y, 0) / a.length;
  return (
    `${missed.length} payments still evade the hardened model. They average ` +
    `${mean(ratios).toFixed(2)}x the account baseline at ${mean(vels).toFixed(1)} payments/hour, ` +
    `and only ${newPayee} of ${missed.length} involve a new payee. The attacker is staying ` +
    `close to normal behaviour on every axis at once. Point the next synthetic batch there.`
  );
}
