/**
 * Adversarial attack generation and shadow scoring.
 *
 * Every number a run reports is derived, not asserted:
 *
 *   profile + attack family + seed  ->  synthetic payment features
 *   features                        ->  scoreTransaction()
 *   scores                          ->  detection / evasion rates
 *
 * Nothing here hardcodes a detection rate. If the rates look round, that is
 * the generator and the scorer agreeing, not a constant.
 */

import { makeRng, randomSeed } from "./rng.js";
import { scoreTransaction, REVIEW_THRESHOLD, BLOCK_THRESHOLD } from "./risk.js";
import { VECTORS } from "./taxonomy.js";

export const CUSTOMERS = [
  { id: "C0001", name: "Aarav Mehta", city: "Mumbai", method: "UPI", baseline: 2028, daily: 1, deviceStability: 0.94, regularity: 0.86, velocitySignal: 0.2 },
  { id: "C0002", name: "Priya Sharma", city: "Pune", method: "Credit card", baseline: 3223, daily: 3, deviceStability: 0.78, regularity: 0.71, velocitySignal: 0.65 },
  { id: "C0003", name: "Vikram Patel", city: "Bangalore", method: "Net banking", baseline: 3220, daily: 3, deviceStability: 0.62, regularity: 0.58, velocitySignal: 0.88 },
  { id: "C0004", name: "Ananya Reddy", city: "Delhi", method: "UPI", baseline: 1450, daily: 2, deviceStability: 0.91, regularity: 0.82, velocitySignal: 0.35 },
  { id: "C0005", name: "Rohan Iyer", city: "Hyderabad", method: "Debit card", baseline: 2890, daily: 2, deviceStability: 0.84, regularity: 0.75, velocitySignal: 0.45 },
  { id: "C0006", name: "Kavya Nair", city: "Chennai", method: "UPI", baseline: 1980, daily: 4, deviceStability: 0.69, regularity: 0.64, velocitySignal: 0.78 },
  { id: "C0007", name: "Arjun Banerjee", city: "Kolkata", method: "Net banking", baseline: 4150, daily: 1, deviceStability: 0.95, regularity: 0.9, velocitySignal: 0.15 },
  { id: "C0008", name: "Meera Shah", city: "Ahmedabad", method: "Credit card", baseline: 3670, daily: 3, deviceStability: 0.73, regularity: 0.68, velocitySignal: 0.6 },
  { id: "C0009", name: "Kabir Joshi", city: "Jaipur", method: "UPI", baseline: 1200, daily: 2, deviceStability: 0.88, regularity: 0.79, velocitySignal: 0.4 },
  { id: "C0010", name: "Ishita Desai", city: "Surat", method: "UPI", baseline: 2540, daily: 3, deviceStability: 0.8, regularity: 0.72, velocitySignal: 0.55 },
];

export const getCustomer = (id) => CUSTOMERS.find((c) => c.id === id) || CUSTOMERS[0];

/**
 * Each family describes how an attacker perturbs a payment sequence.
 *   amount   [start, end] multipliers on the account's own baseline
 *   velocity [start, end] payments per hour across the sequence
 *   payee / intl / device: probability any step trips that signal
 *   hours    the window of day the attacker works in
 *   steps    how many payments the sequence contains
 *
 * The start-to-end interpolation gives each family its shape: a velocity
 * burst front-loads risk, sleeper pacing back-loads it.
 */
/**
 * Attack families are derived from the taxonomy, not duplicated here. Every
 * vector the Identify pillar lists with a `gen` block is generatable, which
 * is what keeps Identify and Generate from drifting apart.
 */
export const ATTACK_FAMILIES = VECTORS.filter((v) => v.gen).map((v) => ({
  name: v.id,
  label: v.name,
  modality: v.category,
  description: v.genai,
  rails: v.rails,
  surface: v.surface,
  signals: v.signals,
  ...v.gen,
}));

export const familyByName = (n) => ATTACK_FAMILIES.find((f) => f.name === n);

const DIFFICULTY_STEALTH = { easy: 0, medium: 0.25, hard: 0.5 };

const weaknessFor = (id) => {
  const v = VECTORS.find((x) => x.id === id);
  return v ? `${v.surface.toLowerCase()} exposure on ${v.rails[0]}` : "unclassified";
};

/**
 * Rank every family by the attacker's expected payoff against this account.
 *
 * This deliberately is NOT "which attack is loudest". An earlier version
 * scored families by how hard they leaned on device, velocity and amount,
 * which are precisely the signals a detector reads, so the planner kept
 * selecting the attack most likely to be caught. A competent attacker does
 * the opposite.
 *
 * Payoff = exploitability x stealth.
 *   exploitability  how well the family's mechanism matches this account's
 *                   actual weak spot
 *   stealth         how little the family trips the signals a detector reads
 */
export function scoreCandidates(customer) {
  const deviceGap = 1 - customer.deviceStability;
  const regularityGap = 1 - customer.regularity;
  const velocity = customer.velocitySignal;
  const predictability = customer.regularity;

  const out = {};
  for (const f of ATTACK_FAMILIES) {
    const amountPeak = Math.min(1, Math.max(...f.amount) / 3);
    const velocityLean = Math.min(1, Math.max(...f.velocity) / 6);
    const amountSwing = Math.min(1, Math.abs(f.amount[1] - f.amount[0]) / 2.5);
    const longGame = Math.min(1, f.steps / 18);

    // Loud signals are the ones a detector keys on.
    const loudness = f.device * 0.34 + f.intl * 0.24 + amountPeak * 0.24 + velocityLean * 0.18;
    const stealth = 1 - loudness;

    // Does this family's mechanism actually fit this account's weakness?
    const exploitability =
      0.25 +
      deviceGap * f.device * 0.5 +
      velocity * velocityLean * 0.45 +
      regularityGap * amountSwing * 0.4 +
      predictability * longGame * 0.5;

    // Stealth dominates: an attacker would rather succeed quietly than fit
    // the profile perfectly and get caught.
    const payoff = Math.min(1, exploitability) * (0.35 + stealth * 0.65);
    out[f.name] = Number(Math.min(0.99, payoff).toFixed(3));
  }
  return out;
}

export function planAttack(customer, attackType, rng = null) {
  const candidates = scoreCandidates(customer);
  let selected;
  if (attackType && familyByName(attackType)) {
    selected = attackType;
  } else {
    // Sample from the top handful rather than always taking the argmax, so a
    // real attacker's choice varies between campaigns against one account.
    const ranked = Object.entries(candidates).sort((a, b) => b[1] - a[1]);
    const pool = ranked.slice(0, 5);
    const total = pool.reduce((a, [, v]) => a + v, 0);
    let r = (rng ? rng.random() : Math.random()) * total;
    selected = pool[pool.length - 1][0];
    for (const [name, v] of pool) {
      r -= v;
      if (r <= 0) { selected = name; break; }
    }
  }
  const family = familyByName(selected);
  return {
    attackType: selected,
    label: family.label,
    modality: family.modality,
    description: family.description,
    candidates,
    primaryWeakness: weaknessFor(selected),
  };
}

const lerp = (a, b, t) => a + (b - a) * t;

const signalLabel = (type, velocity, amount, baseline) => {
  if (type === "velocity_anomaly" || type === "adversarial_probing") return `${velocity} txn/hr`;
  if (type === "sleeper_transaction_pacing") return `${(amount / baseline).toFixed(2)}x baseline`;
  if (type === "device_switch") return "unrecognised device";
  if (type === "account_takeover") return "session and device shift";
  if (["phishing", "vishing", "video_deepfake"].includes(type)) return "social-engineered payee";
  return `${(amount / baseline).toFixed(2)}x baseline`;
};

const ACTION_LABEL = { block: "BLOCK", review: "STEP_UP", allow: "ALLOW" };

function explain(decision, attackType) {
  const reasons = decision.reasons.join(", ");
  if (decision.action === "block") return `Blocked at ${decision.score.toFixed(2)}. ${reasons}.`;
  if (decision.action === "review") return `Step-up authentication required at ${decision.score.toFixed(2)}. ${reasons}.`;
  return `Missed at ${decision.score.toFixed(2)}, below the ${REVIEW_THRESHOLD.toFixed(2)} review line. ${reasons}. Extracted as a ${attackType.replace(/_/g, " ")} evasion sample.`;
}

/** Synthesize an attack sequence and score every step. */
export function generateAndScore(customer, attackType, rng, difficulty = "medium", intensity = 0.7) {
  const family = familyByName(attackType);
  const steps = family.steps;
  const baseline = customer.baseline;
  const stealth = DIFFICULTY_STEALTH[difficulty] ?? 0.25;
  // Intensity scales how far the attacker pushes; stealth pulls it back.
  const push = lerp(0.55, 1.3, intensity) * (1 - stealth * 0.6);
  const [hourLo, hourHi] = family.hours;
  const records = [];

  for (let i = 0; i < steps; i += 1) {
    const t = steps === 1 ? 0 : i / (steps - 1);

    let amountMult = lerp(family.amount[0], family.amount[1], t);
    // Deviation from the account's normal is what gets amplified.
    amountMult = 1 + (amountMult - 1) * push;
    amountMult *= rng.uniform(0.88, 1.12);
    const amount = Math.max(25, Number((baseline * amountMult).toFixed(2)));

    let velocity = lerp(family.velocity[0], family.velocity[1], t);
    velocity = 1 + (velocity - 1) * push;
    velocity = Math.max(1, Math.round(velocity + rng.uniform(-0.4, 0.4)));

    // Stealthier runs suppress the loud categorical flags too.
    const damping = 1 - stealth * 0.5;
    const isNewPayee = rng.random() < family.payee * damping ? 1 : 0;
    const isInternational = rng.random() < family.intl * damping ? 1 : 0;
    const isNewDevice = rng.random() < family.device * damping ? 1 : 0;
    const hour = Math.round(lerp(hourLo, hourHi, t)) % 24;

    const features = {
      amount,
      amountBaseline: baseline,
      velocity1h: velocity,
      dailyBaseline: customer.daily,
      isNewPayee,
      isInternational,
      isNewDevice,
      hour,
    };

    const decision = scoreTransaction(features);

    records.push({
      id: `TXN-${customer.id}-${String(i + 1).padStart(2, "0")}`,
      step: i + 1,
      attackType,
      amount,
      amountRatio: Number((amount / baseline).toFixed(2)),
      hour,
      velocity,
      isNewPayee,
      isInternational,
      isNewDevice,
      signal: signalLabel(attackType, velocity, amount, baseline),
      riskScore: decision.score,
      action: ACTION_LABEL[decision.action],
      flagged: decision.flagged,
      reasons: decision.reasons,
      contributions: decision.contributions,
      confidenceLevel: decision.confidenceLevel,
      explanation: explain(decision, attackType),
      features,
    });
  }
  return records;
}

/** Derive defence metrics from the scored records. Nothing asserted. */
export function summarize(records) {
  const total = records.length;
  if (!total) {
    return { total: 0, flagged: 0, blocked: 0, steppedUp: 0, evaded: 0,
      detectionRate: 0, evasionRate: 0, meanRisk: 0,
      reviewThreshold: REVIEW_THRESHOLD, blockThreshold: BLOCK_THRESHOLD };
  }
  const blocked = records.filter((r) => r.action === "BLOCK").length;
  const steppedUp = records.filter((r) => r.action === "STEP_UP").length;
  const flagged = blocked + steppedUp;
  const evaded = total - flagged;
  return {
    total,
    flagged,
    blocked,
    steppedUp,
    evaded,
    detectionRate: Number((flagged / total).toFixed(4)),
    evasionRate: Number((evaded / total).toFixed(4)),
    meanRisk: Number((records.reduce((a, r) => a + r.riskScore, 0) / total).toFixed(4)),
    reviewThreshold: REVIEW_THRESHOLD,
    blockThreshold: BLOCK_THRESHOLD,
  };
}

/** Plan, generate and score one adversarial run end to end. */
export function runAttack({ targetId = "C0001", attackType = null, difficulty = "medium", intensity = 0.7, seed = null } = {}) {
  const customer = getCustomer(targetId);
  const effectiveSeed = seed ?? randomSeed();
  const rng = makeRng(`${customer.id}:${attackType}:${effectiveSeed}`);
  const plan = planAttack(customer, attackType, rng);
  const records = generateAndScore(customer, plan.attackType, rng, difficulty, intensity);
  const defence = summarize(records);

  return {
    runId: `RUN-${String(effectiveSeed).slice(-6).padStart(6, "0")}`,
    seed: effectiveSeed,
    target: customer,
    plan: {
      ...plan,
      difficulty,
      intensity,
      rationale:
        `${customer.name} averages $${customer.baseline.toLocaleString()} across about ` +
        `${customer.daily} payment(s) a day, on a device used ${Math.round(customer.deviceStability * 100)}% ` +
        `of the time. The planner scored ${plan.label.toLowerCase()} highest at ` +
        `${plan.candidates[plan.attackType]} because the softest surface is ${plan.primaryWeakness}.`,
    },
    records,
    defence,
  };
}

/** Run every family against one target. */
export function runAllAttacks(targetId = "C0001", seed = null) {
  const customer = getCustomer(targetId);
  const base = seed ?? randomSeed();
  const results = ATTACK_FAMILIES.map((f, i) => {
    const run = runAttack({ targetId: customer.id, attackType: f.name, seed: base + i });
    return {
      attackType: f.name,
      label: f.label,
      modality: f.modality,
      records: run.defence.total,
      detectionRate: run.defence.detectionRate,
      evasionRate: run.defence.evasionRate,
      evaded: run.defence.evaded,
      meanRisk: run.defence.meanRisk,
    };
  });
  const totalRecords = results.reduce((a, r) => a + r.records, 0);
  const totalEvaded = results.reduce((a, r) => a + r.evaded, 0);
  return {
    target: customer,
    seed: base,
    results,
    aggregate: {
      records: totalRecords,
      evaded: totalEvaded,
      detectionRate: totalRecords ? Number(((totalRecords - totalEvaded) / totalRecords).toFixed(4)) : 0,
      evasionRate: totalRecords ? Number((totalEvaded / totalRecords).toFixed(4)) : 0,
    },
  };
}
