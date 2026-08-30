/**
 * End-to-end incident report.
 *
 * The rest of the app shows the loop in pieces. This composes all of it into
 * one document about one incident, computed in a single pass, so the narrative
 * cannot drift out of sync with the numbers the way separate pages can.
 */

import { makeRng, randomSeed } from "./rng.js";
import { getCustomer, planAttack, generateAndScore, summarize } from "./lab-engine.js";
import { legacyScore, REVIEW_THRESHOLD, BLOCK_THRESHOLD } from "./risk.js";
import { train } from "./benchmark-engine.js";
import { labelFor } from "./taxonomy.js";

const LURES = {
  vishing: (n, a) =>
    `Caller, using a cloned voice of the CFO: "${n}, I'm in a vendor board meeting. Please authorise the $${a} supplier invoice to Apex Meridian Global before the cutoff."`,
  video_deepfake: (n, a) =>
    `A face-swapped video call stands in for ${n} during step-up identity verification, authorising a $${a} transfer to a newly registered beneficiary.`,
  synthetic_identity: (n, a) =>
    `An applicant profile blends a genuine identity number with synthesised biometrics, opening an account that immediately moves $${a}.`,
  phishing: (n, a) =>
    `A reply is injected into a live supplier invoice thread: "Please note our updated remittance details. Kindly settle the outstanding $${a} to the account below."`,
  behavioral_drift: (n, a) =>
    `An autonomous storefront with generated listings and reviews takes a $${a} order it will never fulfil.`,
  account_takeover: (n, a) =>
    `Breached credentials and a spoofed device open a session as ${n}, then move $${a} to a beneficiary added minutes earlier.`,
  device_switch: (n, a) =>
    `A payment for $${a} arrives from a device and browser fingerprint this account has never used.`,
  velocity_anomaly: (n, a) =>
    `A burst of payments peaking at $${a} is pushed through inside one hour, each one individually unremarkable.`,
  sleeper_transaction_pacing: (n, a) =>
    `Small payments warm the account's baseline over several days before a $${a} cash-out.`,
  adversarial_probing: (n, a) =>
    `Feature values are nudged one at a time around a $${a} payment, hunting for the exact point the detector stops firing.`,
};

const fmt = (n) => Math.round(n).toLocaleString("en-US");

export function buildReport({ targetId = "C0001", attackType = null, seed = null, includeTraining = true } = {}) {
  const effectiveSeed = seed ?? randomSeed();
  const customer = getCustomer(targetId);
  const rng = makeRng(`incident:${customer.id}:${effectiveSeed}`);

  const plan = planAttack(customer, attackType);
  const raw = generateAndScore(customer, plan.attackType, rng, "medium", 0.7);
  const defence = summarize(raw);
  const started = new Date();

  const payments = raw.map((r, i) => {
    const legacy = legacyScore(r.features);
    return {
      ...r,
      at: new Date(started.getTime() + i * 7 * 60000).toISOString(),
      legacyFlagged: legacy.flagged,
      legacyReasons: legacy.reasons,
    };
  });

  const total = payments.length;
  const hardenedCaught = payments.filter((p) => p.flagged).length;
  const legacyCaught = payments.filter((p) => p.legacyFlagged).length;
  const evaded = payments.filter((p) => !p.flagged);
  const valueTotal = payments.reduce((a, p) => a + p.amount, 0);
  const valueStopped = payments.filter((p) => p.flagged).reduce((a, p) => a + p.amount, 0);
  const valueThroughLegacy = payments.filter((p) => !p.legacyFlagged).reduce((a, p) => a + p.amount, 0);

  const ranked = Object.entries(plan.candidates).sort((a, b) => b[1] - a[1]);
  const training = includeTraining ? train(effectiveSeed) : null;

  const evasionDetail = evaded.length
    ? `The ${evaded.length} payments that got through averaged ${(
        evaded.reduce((a, p) => a + p.amountRatio, 0) / evaded.length
      ).toFixed(2)}x this account's baseline at ${(
        evaded.reduce((a, p) => a + p.velocity, 0) / evaded.length
      ).toFixed(1)} payments per hour, and ${evaded.filter((p) => p.isNewPayee).length} of ${
        evaded.length
      } went to a new payee. None accumulated enough signal to reach the ${REVIEW_THRESHOLD.toFixed(
        2
      )} review line. Each one is individually unremarkable, which is the point of the technique.`
    : "Every payment in this sequence crossed the review threshold. Raise the difficulty to force stealthier pacing.";

  const phases = [
    {
      id: "profile",
      title: "Target profiled",
      headline: `${customer.name} in ${customer.city}`,
      detail: `The attacker starts from observable behaviour, not guesswork. This account averages $${fmt(customer.baseline)} across about ${customer.daily} payment(s) a day, on a device it uses ${Math.round(customer.deviceStability * 100)}% of the time, with spending regularity ${customer.regularity}. Those three numbers decide which attack works.`,
      facts: [
        { label: "Account", value: `${customer.id} · ${customer.city}` },
        { label: "Baseline payment", value: `$${fmt(customer.baseline)}` },
        { label: "Usual cadence", value: `${customer.daily}/day` },
        { label: "Device stability", value: String(customer.deviceStability) },
        { label: "Spending regularity", value: String(customer.regularity) },
      ],
    },
    {
      id: "plan",
      title: "Attack selected",
      headline: `${plan.label} scored highest`,
      detail: `Every attack family is ranked against this specific account's weak points. ${plan.label} won at ${plan.candidates[plan.attackType]} because the softest surface is ${plan.primaryWeakness}. A different account gets a different plan.`,
      facts: ranked.slice(0, 5).map(([k, v]) => ({
        label: labelFor(k),
        value: String(v),
      })),
    },
    {
      id: "synthesis",
      title: "Payload synthesised",
      headline: `${total} payments over ${total * 7} minutes`,
      detail: `The generator shapes a sequence rather than a single payment. Amounts ramp between ${Math.min(...payments.map((p) => p.amountRatio))}x and ${Math.max(...payments.map((p) => p.amountRatio))}x the account baseline, velocity moves between ${Math.min(...payments.map((p) => p.velocity))} and ${Math.max(...payments.map((p) => p.velocity))} per hour, worth $${fmt(valueTotal)} in total.`,
      facts: [
        { label: "Payments", value: String(total) },
        { label: "Total value", value: `$${fmt(valueTotal)}` },
        { label: "Modality", value: plan.modality },
      ],
    },
    {
      id: "scoring",
      title: "Both detectors scored it",
      headline: `Legacy caught ${legacyCaught}, hardened caught ${hardenedCaught}, of ${total}`,
      detail: `Every payment was scored twice: once by flat rules that know nothing about this account, and once by a scorer that grades each signal against the account's own baseline. The hardened scorer blocked ${defence.blocked} outright and sent ${defence.steppedUp} to step-up authentication.`,
      facts: [
        { label: "Legacy caught", value: `${legacyCaught}/${total}` },
        { label: "Hardened caught", value: `${hardenedCaught}/${total}` },
        { label: "Blocked", value: String(defence.blocked) },
        { label: "Step-up", value: String(defence.steppedUp) },
        { label: "Value stopped", value: `$${fmt(valueStopped)}` },
      ],
    },
    {
      id: "evasion",
      title: "What got through",
      headline: `${evaded.length} of ${total} payments evaded detection`,
      detail: evasionDetail,
      facts: [
        { label: "Evaded", value: `${evaded.length}/${total}` },
        { label: "Value through, hardened", value: `$${fmt(valueTotal - valueStopped)}` },
        { label: "Value through, legacy", value: `$${fmt(valueThroughLegacy)}` },
      ],
    },
  ];

  if (training) {
    const r = training.rounds;
    phases.push({
      id: "hardening",
      title: "Defender retrained on the misses",
      headline: `Recall ${Math.round(r[0].recall * 100)}% to ${Math.round(r[r.length - 1].recall * 100)}% over ${r.length} rounds`,
      detail: `The evaded payments become training data. Each round mines what the previous model missed and retrains on it, which is why recall climbs while the test split stays fixed. Precision moves from ${Math.round(r[0].precision * 100)}% to ${Math.round(r[r.length - 1].precision * 100)}%. Catching stealthier fraud costs some precision, and that trade is visible rather than hidden.`,
      facts: r
        .map((x) => ({ label: `${x.name} recall`, value: `${(x.recall * 100).toFixed(1)}%` }))
        .concat([{ label: "AUC", value: `${r[0].auc.toFixed(3)} to ${r[r.length - 1].auc.toFixed(3)}` }]),
    });
  }

  const peak = Math.max(...payments.map((p) => p.amount));

  return {
    incidentId: `INC-${customer.id}-${String(effectiveSeed % 100000).padStart(5, "0")}`,
    generatedAt: started.toISOString(),
    seed: effectiveSeed,
    target: customer,
    attack: {
      family: plan.attackType,
      label: plan.label,
      modality: plan.modality,
      primaryWeakness: plan.primaryWeakness,
      candidates: plan.candidates,
      lure: (LURES[plan.attackType] || LURES.phishing)(customer.name, fmt(peak)),
    },
    phases,
    payments,
    summary: {
      total,
      hardenedCaught,
      legacyCaught,
      evaded: evaded.length,
      blocked: defence.blocked,
      steppedUp: defence.steppedUp,
      detectionRate: Number((hardenedCaught / total).toFixed(4)),
      legacyDetectionRate: Number((legacyCaught / total).toFixed(4)),
      evasionRate: Number((evaded.length / total).toFixed(4)),
      valueTotal: Number(valueTotal.toFixed(2)),
      valueStopped: Number(valueStopped.toFixed(2)),
      valueThrough: Number((valueTotal - valueStopped).toFixed(2)),
      valueThroughLegacy: Number(valueThroughLegacy.toFixed(2)),
    },
    training,
    thresholds: { review: REVIEW_THRESHOLD, block: BLOCK_THRESHOLD },
    provenance: {
      generator: "lab-engine attack families",
      scorers: "legacy static rules vs per-account graded scorer",
      training: training ? "3-round adversarial loop, logistic regression" : null,
      syntheticOnly: true,
    },
  };
}
