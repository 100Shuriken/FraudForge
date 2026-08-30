/**
 * Colour semantics.
 *
 * THE RULE: colour encodes what a number means for the defence, computed from
 * the number itself — never from which model produced it, which page it is on,
 * or what kind of element it is.
 *
 * The test any coloured value must pass: if the hardened and legacy figures
 * were swapped, would the colours swap with them? If not, the colour is lying.
 *
 * Every data colour in the application resolves through this file. Nothing
 * hard-codes a tone from context.
 */

/* Bands for "higher is better": recall, precision, detection rate, F1, AUC. */
const GOOD = 0.67;
const FAIR = 0.34;

/**
 * Tier 2 — performance rate, higher is better.
 * Accepts a 0..1 ratio. 0/16 is 0.0 and therefore "poor", whichever detector
 * produced it. This is the whole point of the rule.
 */
export function rateTone(ratio) {
  if (ratio == null || Number.isNaN(Number(ratio))) return undefined;
  const r = Number(ratio);
  if (r >= GOOD) return "caught";
  if (r >= FAIR) return "review";
  return "evaded";
}

/** Convenience for "n of total" figures such as 3/14. */
export const countTone = (n, total) =>
  total ? rateTone(Number(n) / Number(total)) : undefined;

/**
 * Tier 3 — cost, lower is better: false positives, review load, friction,
 * value that got through, analyst load, payments still evading.
 *
 * A cost NEVER renders green. Avoiding a cost is not an achievement in the
 * same currency as catching fraud, and painting it green was part of what made
 * the old palette read as cheerleading.
 *
 * `warn` and `bad` are the tolerances for this particular measure.
 */
export function costTone(value, { warn, bad }) {
  if (value == null || Number.isNaN(Number(value))) return undefined;
  const v = Number(value);
  if (v >= bad) return "evaded";
  if (v >= warn) return "review";
  return undefined; // neutral — below tolerance is simply unremarkable
}

/**
 * Tier 1 — outcome of a single payment. The verdict is already a fact about
 * that payment, so it maps directly.
 */
export function actionTone(action) {
  switch (action) {
    case "BLOCK":
    case "FLAG":
      return "caught";
    case "STEP_UP":
      return "review";
    case "ALLOW":
    case "MISS":
      return "evaded";
    default:
      return undefined;
  }
}

/** Normalises the scorer's lowercase action into the display verdict. */
export const verdictFor = (action) =>
  action === "block" ? "BLOCK" : action === "review" ? "STEP_UP" : "ALLOW";

/**
 * A risk score and the action it produced are ONE event, so they carry one
 * colour. 0.70 that results in STEP_UP is amber, not green sitting beside an
 * amber badge.
 */
export const scoreTone = (action) => actionTone(action);

/** Which of caught/review/evaded actually occur in this set of records. */
export function presentStates(records = []) {
  const seen = new Set();
  for (const r of records) {
    const t = r.flagged ? (r.action === "BLOCK" ? "caught" : "review") : "evaded";
    seen.add(t);
  }
  return seen;
}
