/**
 * Explainable shadow-mode risk scoring.
 *
 * Single source of truth for how a normalized payment becomes a risk score.
 * Rule-based and graded rather than binary: each signal contributes an amount
 * proportional to how far the payment deviates from the account's own
 * baseline, so every score traces back to a reason a human can read.
 *
 * Ported from the Python engine. The maths is identical; only the seeded RNG
 * differs (see lib/rng.js), so absolute figures are regenerated here rather
 * than copied across.
 */

export const REVIEW_THRESHOLD = 0.5;
export const BLOCK_THRESHOLD = 0.75;
const DEFAULT_AMOUNT_BASELINE = 1000;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/**
 * Recognized keys, all optional:
 *   amount, amountBaseline, velocity1h, dailyBaseline,
 *   isNewPayee, isInternational, isNewDevice, hour
 */
export function scoreTransaction(txn) {
  const contributions = {};
  const reasons = [];

  // ---- Amount, relative to what this account normally spends -------------
  const amount = Number(txn.amount) || 0;
  let baseline = Number(txn.amountBaseline) || DEFAULT_AMOUNT_BASELINE;
  if (baseline <= 0) baseline = DEFAULT_AMOUNT_BASELINE;
  const ratio = amount / baseline;
  // Ramps in from 1x baseline, saturates near 2.5x.
  const amountWeight = clamp((ratio - 1) / 1.5, 0, 1) * 0.34;
  if (amountWeight >= 0.02) {
    contributions.amount = Number(amountWeight.toFixed(4));
    reasons.push(`amount ${ratio.toFixed(1)}x account baseline`);
  }

  // ---- Velocity, relative to this account's normal cadence ---------------
  const velocity = Number(txn.velocity1h) || 0;
  const daily = Number(txn.dailyBaseline) || 1;
  // An account that normally makes 4 payments a day is less alarming at 4 in
  // an hour than one that normally makes a single payment a day.
  const hourlyBaseline = Math.max(0.5, daily / 8);
  const excess = Math.max(0, velocity - hourlyBaseline);
  const velocityWeight = clamp(excess / 3, 0, 1) * 0.34;
  if (velocityWeight >= 0.02) {
    contributions.velocity = Number(velocityWeight.toFixed(4));
    reasons.push(`${velocity} payments in one hour`);
  }

  // ---- Categorical trust signals -----------------------------------------
  if (txn.isNewPayee) {
    contributions.new_payee = 0.26;
    reasons.push("first payment to this payee");
  }
  if (txn.isInternational) {
    contributions.international = 0.18;
    reasons.push("cross-border payment");
  }
  if (txn.isNewDevice) {
    contributions.new_device = 0.2;
    reasons.push("unrecognized device");
  }

  // ---- Time of day --------------------------------------------------------
  const hour = Number.isFinite(txn.hour) ? txn.hour : 12;
  // Distance from a 13:00 midpoint, so 03:00 scores above 21:00 rather than
  // both tripping one flat flag.
  const distance = Math.min(Math.abs(hour - 13), 24 - Math.abs(hour - 13));
  const hourWeight = clamp((distance - 6) / 5, 0, 1) * 0.12;
  if (hourWeight >= 0.02) {
    contributions.hour = Number(hourWeight.toFixed(4));
    reasons.push(`payment at ${String(hour).padStart(2, "0")}:00`);
  }

  const total = Object.values(contributions).reduce((a, b) => a + b, 0);
  const score = Math.min(Number((0.02 + total).toFixed(4)), 0.99);

  let action = "allow";
  if (score >= BLOCK_THRESHOLD) action = "block";
  else if (score >= REVIEW_THRESHOLD) action = "review";

  // Confidence is distance from the nearest boundary, normalized by the room
  // the score had to move in that direction.
  const confidence =
    score >= REVIEW_THRESHOLD
      ? (score - REVIEW_THRESHOLD) / Math.max(1e-6, 0.99 - REVIEW_THRESHOLD)
      : (REVIEW_THRESHOLD - score) / REVIEW_THRESHOLD;
  const c = Number(clamp(confidence, 0, 1).toFixed(4));

  return {
    score,
    action,
    flagged: action !== "allow",
    reasons: reasons.length ? reasons : ["no elevated risk signals"],
    contributions,
    confidence: c,
    confidenceLevel: c >= 0.6 ? "High" : c >= 0.3 ? "Medium" : "Low",
  };
}

/**
 * The legacy detector: a static rule engine of the kind a traditional
 * processor runs. Absolute cutoffs, no per-account context. It has no idea
 * what THIS customer normally does, which is exactly what an attacker pacing
 * payments under the limit walks straight through.
 */
export const LEGACY_AMOUNT_THRESHOLD = 5000;
export const LEGACY_VELOCITY_THRESHOLD = 6;

export function legacyScore(txn) {
  const reasons = [];
  if ((Number(txn.amount) || 0) >= LEGACY_AMOUNT_THRESHOLD) {
    reasons.push(`amount over the flat $${LEGACY_AMOUNT_THRESHOLD.toLocaleString()} limit`);
  }
  if ((Number(txn.velocity1h) || 0) >= LEGACY_VELOCITY_THRESHOLD) {
    reasons.push(`${txn.velocity1h} payments/hour over the flat limit`);
  }
  const flagged = reasons.length > 0;
  return {
    flagged,
    action: flagged ? "review" : "allow",
    reasons: flagged ? reasons : ["no static threshold breached"],
  };
}
