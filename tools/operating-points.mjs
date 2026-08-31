/**
 * Measure the detector's operating points, and write them to a committed
 * artifact the product renders.
 *
 * This exists because the shipped benchmark measured its false-positive rate
 * on 300 legitimate payments. One false positive in 300 reads as 0.33%, but
 * the 95% Wilson interval on that estimate runs from 0.06% to 1.86% — it
 * cannot resolve the quantity it is reporting. Measured on 200,000 legitimate
 * payments the rate is 0.65%, roughly double, and the confidence interval is
 * narrow enough to act on.
 *
 * The second problem was the base rate. The benchmark corpus is about half
 * fraud, so its precision figure (99%) describes a world where every other
 * payment is an attack. Real fraud runs well under 1% of volume, and at that
 * base rate the same detector is right about a third of the time. Both numbers
 * are correct; only one of them answers an operator's question.
 *
 * Run:  node tools/operating-points.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const load = (p) => import(pathToFileURL(path.resolve(p)).href);

const { makeRng } = await load("lib/rng.js");
const R = await load("lib/risk.js");
const L = await load("lib/lab-engine.js");

const LEGIT_PER_CUSTOMER = 20_000;
const FRAUD_ROUNDS = 12;
const SEED = "operating:2026";

/* Mirrors the legitimate generator in lib/benchmark-engine.js. Kept here
   rather than exported from there so this measurement cannot silently drift
   into scoring a different distribution than the benchmark does. */
function legitimatePayments(customer, rng, count) {
  const out = [];
  for (let i = 0; i < count; i += 1) {
    const spread = 0.45 * (1.2 - customer.regularity);
    out.push({
      amount: Math.max(
        20,
        Number((customer.baseline * rng.gauss(1, Math.max(0.08, spread))).toFixed(2))
      ),
      amountBaseline: customer.baseline,
      velocity1h: Math.max(1, Math.round(rng.gauss(Math.max(1, customer.daily / 8), 0.6))),
      dailyBaseline: customer.daily,
      isNewPayee: rng.random() < 0.08 ? 1 : 0,
      isInternational: rng.random() < 0.03 ? 1 : 0,
      isNewDevice: rng.random() < 0.05 ? 1 : 0,
      hour: rng.choice([9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]),
    });
  }
  return out;
}

/**
 * Wilson score interval.
 *
 * The normal approximation is wrong for proportions this small — at 3 events
 * in 200,000 it produces a lower bound below zero. Wilson stays inside [0, 1]
 * and is the reason a rate of 0.0015% can be quoted with a straight face.
 */
function wilson(k, n, z = 1.96) {
  if (!n) return [0, 0];
  const p = k / n;
  const d = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / d;
  const half = (z / d) * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n));
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

/** Count of values >= t in a sorted array. */
function atOrAbove(sorted, t) {
  let lo = 0;
  let hi = sorted.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sorted[mid] < t) lo = mid + 1;
    else hi = mid;
  }
  return sorted.length - lo;
}

const rng = makeRng(SEED);

const legit = [];
let legacyFalsePositives = 0;
for (const c of L.CUSTOMERS) {
  for (const p of legitimatePayments(c, rng, LEGIT_PER_CUSTOMER)) {
    legit.push(R.scoreTransaction(p).score);
    if (R.legacyScore(p).flagged) legacyFalsePositives += 1;
  }
}

const fraud = [];
for (let round = 0; round < FRAUD_ROUNDS; round += 1) {
  for (const family of L.ATTACK_FAMILIES) {
    for (const c of L.CUSTOMERS) {
      const recs = L.generateAndScore(c, family.name, rng, "medium", rng.uniform(0.4, 0.9));
      for (const r of recs) fraud.push(r.riskScore);
    }
  }
}

legit.sort((a, b) => a - b);
fraud.sort((a, b) => a - b);

/* Base rates to project onto. Card fraud runs in the low tenths of a percent
   of authorisations; the higher rows are here because portfolios differ, not
   because any of them is "the" number. */
const BASE_RATES = [0.0005, 0.001, 0.005, 0.01];

const THRESHOLDS = [0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75];

const sweep = THRESHOLDS.map((t) => {
  const tp = atOrAbove(fraud, t);
  const fp = atOrAbove(legit, t);
  const recall = tp / fraud.length;
  const fpr = fp / legit.length;
  const [lo, hi] = wilson(fp, legit.length);
  return {
    t,
    recall: Number(recall.toFixed(6)),
    fpr: Number(fpr.toFixed(8)),
    fprLo: Number(lo.toFixed(8)),
    fprHi: Number(hi.toFixed(8)),
    // What an operator actually budgets for, at each base rate.
    atBase: BASE_RATES.map((b) => {
      const alerts = b * recall + (1 - b) * fpr;
      return {
        base: b,
        precision: Number((alerts ? (b * recall) / alerts : 0).toFixed(6)),
        alertsPerMillion: Math.round(alerts * 1e6),
        truePerMillion: Math.round(b * recall * 1e6),
      };
    }),
  };
});

const quantile = (a, q) => a[Math.min(a.length - 1, Math.floor(q * a.length))];
const [legacyLo, legacyHi] = wilson(legacyFalsePositives, legit.length);

const payload = {
  generatedBy: "tools/operating-points.mjs",
  seed: SEED,
  legitimate: legit.length,
  fraudulent: fraud.length,
  reviewThreshold: R.REVIEW_THRESHOLD,
  blockThreshold: R.BLOCK_THRESHOLD,
  baseRates: BASE_RATES,
  sweep,
  legacy: {
    falsePositives: legacyFalsePositives,
    fpr: Number((legacyFalsePositives / legit.length).toFixed(8)),
    fprLo: Number(legacyLo.toFixed(8)),
    fprHi: Number(legacyHi.toFixed(8)),
  },
  legitimateScores: {
    p50: Number(quantile(legit, 0.5).toFixed(4)),
    p90: Number(quantile(legit, 0.9).toFixed(4)),
    p99: Number(quantile(legit, 0.99).toFixed(4)),
    p999: Number(quantile(legit, 0.999).toFixed(4)),
    max: Number(legit[legit.length - 1].toFixed(4)),
  },
  // The estimate the shipped benchmark could produce from 300 samples, kept
  // so the product can show why the sample size mattered.
  smallSample: (() => {
    const [lo, hi] = wilson(1, 300);
    return { events: 1, n: 300, rate: 1 / 300, lo: Number(lo.toFixed(6)), hi: Number(hi.toFixed(6)) };
  })(),
};

const out = "lib/operating-points.json";
fs.writeFileSync(out, JSON.stringify(payload));

const at = sweep.find((s) => s.t === R.REVIEW_THRESHOLD);
console.log(`scored ${legit.length.toLocaleString()} legitimate and ${fraud.length.toLocaleString()} fraudulent payments`);
console.log(
  `at the shipped review threshold ${R.REVIEW_THRESHOLD}: ` +
    `recall ${(at.recall * 100).toFixed(2)}%, FPR ${(at.fpr * 100).toFixed(4)}% ` +
    `[${(at.fprLo * 100).toFixed(4)}%, ${(at.fprHi * 100).toFixed(4)}%]`
);
console.log(
  `  precision at a 0.5% fraud base rate: ` +
    `${(at.atBase.find((b) => b.base === 0.005).precision * 100).toFixed(1)}% ` +
    `(${at.atBase.find((b) => b.base === 0.005).alertsPerMillion.toLocaleString()} alerts per million)`
);
console.log(`wrote ${out} (${(fs.statSync(out).size / 1024).toFixed(1)} KB)`);
