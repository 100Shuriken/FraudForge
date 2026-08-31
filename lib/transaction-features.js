/**
 * The 21 features the transaction-fraud model was trained on.
 *
 * This one looked unusable for a long time because the backend's own adapter
 * reports a "schema mismatch": the red team emits business fields (amount,
 * merchant, timestamp) and the model wants IEEE-CIS columns. But the mismatch
 * is only in that direction. Every column is either something a form can state
 * outright or something derived from one that can, and the artifact carries
 * the exact vocabulary for all thirteen categorical columns, so a form can
 * drive the model directly.
 *
 * Supplied by the user:
 *   TransactionAmt, ProductCD, hour, day, DeviceType, DeviceInfo,
 *   id_12 id_15 id_16 id_28 id_29 id_35 id_36 id_37 id_38, id_31
 *
 * Derived here:
 *   log_amount             ln(amount) — the backend adapter uses natural log
 *   TransactionDT          day * 86400 + hour * 3600
 *   is_night               hour < 6
 *   amount_vs_product_avg  amount / product_avg_amount
 *
 * One input, product_avg_amount, is a training-set statistic rather than a
 * property of the transaction: the mean amount for its product category. The
 * artifact does not ship the five means, so it cannot be derived — see
 * PRODUCT_AVG_BOUNDS below for what the artifact *does* reveal about them.
 */

/**
 * What the model knows about product_avg_amount, recovered from its own splits.
 *
 * The feature is split on at exactly four thresholds across all 500 trees.
 * A LightGBM threshold on a feature with few distinct values is the midpoint
 * between two adjacent ones, so four thresholds means the training data held
 * exactly five distinct values — one per product category, as expected.
 *
 * That pins down the five *bands* but not the five values: four midpoints
 * leave five unknowns. So this is an input rather than a derivation, and these
 * are the boundaries a reader can set it against.
 */
export const PRODUCT_AVG_BOUNDS = [51.570921, 66.719774, 113.164307, 160.732368];

/** Which of the five bands a value falls in (0-4). */
export function productAvgBand(value) {
  let band = 0;
  for (const bound of PRODUCT_AVG_BOUNDS) {
    if (value > bound) band += 1;
  }
  return band;
}

/**
 * Night is one binary feature with one split, and the artifact does not record
 * the cutoff that produced it. Under 6am is the usual convention and the one
 * the backend's own simulator uses.
 */
export const NIGHT_BEFORE_HOUR = 6;

/**
 * Build the full 21-feature row.
 *
 * Categorical values stay as strings; lib/lgbm.js encodes them against the
 * model's own vocabulary, so a value the model never saw becomes code -1 and
 * routes exactly the way pandas would have sent it.
 */
export function buildTransaction(input) {
  const amount = Number(input.TransactionAmt);
  const hour = Number(input.hour);
  const day = Number(input.day);
  const productAvg = Number(input.product_avg_amount);

  return {
    TransactionAmt: amount,
    TransactionDT: day * 86400 + hour * 3600,
    ProductCD: input.ProductCD,
    log_amount: amount > 0 ? Math.log(amount) : undefined,
    product_avg_amount: productAvg,
    amount_vs_product_avg: productAvg > 0 ? amount / productAvg : undefined,
    hour,
    day,
    is_night: hour < NIGHT_BEFORE_HOUR ? 1 : 0,
    id_12: input.id_12,
    id_15: input.id_15,
    id_16: input.id_16,
    id_28: input.id_28,
    id_29: input.id_29,
    id_31: input.id_31,
    id_35: input.id_35,
    id_36: input.id_36,
    id_37: input.id_37,
    id_38: input.id_38,
    DeviceType: input.DeviceType,
    DeviceInfo: input.DeviceInfo,
  };
}

/** The four values the form shows as computed rather than entered. */
export function derivedFrom(row) {
  return [
    ["log_amount", "ln(amount)", row.log_amount],
    ["TransactionDT", "day × 86400 + hour × 3600", row.TransactionDT],
    ["amount_vs_product_avg", "amount ÷ category average", row.amount_vs_product_avg],
    ["is_night", `hour < ${NIGHT_BEFORE_HOUR}`, row.is_night],
  ];
}

/**
 * Two starting points, so the panel opens on something rather than nothing and
 * a reader can see the model move without guessing what to type.
 *
 * Neither is a claim about what fraud looks like — they are ordinary and
 * unusual settings of the same controls, and the model's opinion of them is
 * the model's, not this file's.
 */
export const PRESETS = {
  routine: {
    label: "Routine desktop purchase",
    values: {
      TransactionAmt: 68,
      ProductCD: "W",
      hour: 14,
      day: 92,
      product_avg_amount: 135,
      id_12: "Found",
      id_15: "Found",
      id_16: "Found",
      id_28: "Found",
      id_29: "Found",
      id_31: "chrome 63.0",
      id_35: "T",
      id_36: "F",
      id_37: "T",
      id_38: "T",
      DeviceType: "desktop",
      DeviceInfo: "Windows",
    },
  },
  unusual: {
    label: "Large overnight mobile purchase",
    values: {
      TransactionAmt: 1850,
      ProductCD: "C",
      hour: 3,
      day: 92,
      product_avg_amount: 45,
      id_12: "NotFound",
      id_15: "New",
      id_16: "NotFound",
      id_28: "New",
      id_29: "NotFound",
      id_31: "chrome 62.0 for android",
      id_35: "T",
      id_36: "F",
      id_37: "F",
      id_38: "F",
      DeviceType: "mobile",
      DeviceInfo: "SAMSUNG SM-G950F Build/NRD90M",
    },
  },
};

/**
 * Human labels for the identity columns. The IEEE-CIS names are anonymised by
 * design — the dataset never says what id_16 measures — so these describe the
 * shape of the signal without inventing a meaning it does not have.
 */
export const ID_FIELDS = [
  ["id_12", "Identity match 12"],
  ["id_15", "Identity match 15"],
  ["id_16", "Identity match 16"],
  ["id_28", "Identity match 28"],
  ["id_29", "Identity match 29"],
  ["id_35", "Identity flag 35"],
  ["id_36", "Identity flag 36"],
  ["id_37", "Identity flag 37"],
  ["id_38", "Identity flag 38"],
];

export const PRODUCT_LABELS = {
  W: "W — the dataset's largest category",
  C: "C",
  R: "R",
  H: "H",
  S: "S",
};
