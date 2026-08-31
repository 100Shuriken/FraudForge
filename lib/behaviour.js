/**
 * Behavioural biometrics capture, for the account-takeover model.
 *
 * The model does not take raw typing — it takes 19 *deviations* from a profile
 * built out of that user's own enrolment sessions. Its config records how that
 * was done:
 *
 *   "Each user's genuine enrolment sessions were used to construct a
 *    personalized profile."
 *   "Test sessions were converted into personalized behavioral deviation
 *    features."
 *   "Zero/near-zero variance was handled using a population variability floor."
 *   "Deviation values were capped at 10."
 *
 * So a deviation is a z-score against the enrolment mean and standard
 * deviation, with a floor under the standard deviation so a perfectly
 * consistent metric cannot divide by zero, clamped to ±10.
 *
 * One honest gap: the exact population variability floor used in training is
 * not recorded in the artifact. FLOORS below is a per-metric floor chosen from
 * the plausible scale of each measurement. The shape of the transform matches
 * the description; the constant does not come from the training run, and the
 * UI says so.
 */

/* Raw metrics, in the order the model's feature names imply. */
export const METRICS = [
  "key_count",
  "mean_key_hold",
  "std_key_hold",
  "median_key_hold",
  "mean_key_interval",
  "std_key_interval",
  "median_key_interval",
  "typing_speed",
  "backspace_count",
  "shift_count",
  "tab_count",
  "space_count",
  "mouse_movement_count",
  "mean_mouse_distance",
  "std_mouse_distance",
  "total_mouse_distance",
  "mean_mouse_speed",
  "std_mouse_speed",
  "mouse_click_count",
];

/* Floors on the enrolment standard deviation, per metric, in that metric's own
   units. Without these, a metric a person happens to repeat exactly turns a
   one-millisecond difference into an enormous z-score. */
const FLOORS = {
  key_count: 1.5,
  mean_key_hold: 4,
  std_key_hold: 4,
  median_key_hold: 4,
  mean_key_interval: 12,
  std_key_interval: 12,
  median_key_interval: 12,
  typing_speed: 0.3,
  backspace_count: 0.8,
  shift_count: 0.8,
  tab_count: 0.5,
  space_count: 1.0,
  mouse_movement_count: 4,
  mean_mouse_distance: 3,
  std_mouse_distance: 3,
  total_mouse_distance: 60,
  mean_mouse_speed: 25,
  std_mouse_speed: 25,
  mouse_click_count: 0.8,
};

const CAP = 10;

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

const std = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
};

const median = (xs) => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.floor(s.length / 2);
  return s.length % 2 ? s[i] : (s[i - 1] + s[i]) / 2;
};

/**
 * Collects one session's raw keyboard and pointer behaviour.
 *
 * Only timings, counts and distances are recorded. The characters typed are
 * never stored — the model does not use them, and keeping them would make this
 * a keylogger rather than a biometric.
 */
export function createSession() {
  const holds = [];        // per-key press duration
  const downs = [];        // keydown timestamps, for intervals
  const down = new Map();  // key -> keydown timestamp
  const moves = [];        // per-move distances
  const speeds = [];       // per-move speeds

  let counts = { backspace: 0, shift: 0, tab: 0, space: 0, clicks: 0, keys: 0 };
  let last = null;         // last pointer sample
  let started = null;
  let ended = null;

  return {
    onKeyDown(e) {
      const t = performance.now();
      if (started === null) started = t;
      ended = t;
      if (!down.has(e.code)) down.set(e.code, t);
      downs.push(t);
      counts.keys += 1;
      if (e.key === "Backspace") counts.backspace += 1;
      else if (e.key === "Shift") counts.shift += 1;
      else if (e.key === "Tab") counts.tab += 1;
      else if (e.key === " ") counts.space += 1;
    },

    onKeyUp(e) {
      const t = performance.now();
      ended = t;
      const start = down.get(e.code);
      if (start !== undefined) {
        holds.push(t - start);
        down.delete(e.code);
      }
    },

    onMouseMove(e) {
      const t = performance.now();
      if (last) {
        const dx = e.clientX - last.x;
        const dy = e.clientY - last.y;
        const dist = Math.hypot(dx, dy);
        const dt = (t - last.t) / 1000;
        if (dist > 0 && dt > 0) {
          moves.push(dist);
          speeds.push(dist / dt);
        }
      }
      last = { x: e.clientX, y: e.clientY, t };
    },

    onClick() {
      counts.clicks += 1;
    },

    /** Raw metrics for this session, before any comparison to a profile. */
    metrics() {
      const intervals = [];
      for (let i = 1; i < downs.length; i += 1) intervals.push(downs[i] - downs[i - 1]);
      const seconds = started !== null && ended !== null ? (ended - started) / 1000 : 0;

      return {
        key_count: counts.keys,
        mean_key_hold: mean(holds),
        std_key_hold: std(holds),
        median_key_hold: median(holds),
        mean_key_interval: mean(intervals),
        std_key_interval: std(intervals),
        median_key_interval: median(intervals),
        typing_speed: seconds > 0 ? counts.keys / seconds : 0,
        backspace_count: counts.backspace,
        shift_count: counts.shift,
        tab_count: counts.tab,
        space_count: counts.space,
        mouse_movement_count: moves.length,
        mean_mouse_distance: mean(moves),
        std_mouse_distance: std(moves),
        total_mouse_distance: moves.reduce((a, b) => a + b, 0),
        mean_mouse_speed: mean(speeds),
        std_mouse_speed: std(speeds),
        mouse_click_count: counts.clicks,
      };
    },

    keystrokes: () => holds.length,
  };
}

/** Mean and standard deviation of every metric across enrolment sessions. */
export function buildProfile(sessions) {
  const profile = {};
  for (const metric of METRICS) {
    const values = sessions.map((s) => s[metric] ?? 0);
    profile[metric] = { mean: mean(values), std: std(values) };
  }
  return profile;
}

/**
 * Turn one session into the 19 deviation features the model expects.
 * Returns them under the model's own feature names.
 */
export function deviations(profile, session) {
  const out = {};
  for (const metric of METRICS) {
    const base = profile[metric] || { mean: 0, std: 0 };
    const spread = Math.max(base.std, FLOORS[metric] ?? 1);
    const z = ((session[metric] ?? 0) - base.mean) / spread;
    out[`${metric}_deviation`] = Math.max(-CAP, Math.min(CAP, z));
  }
  return out;
}

/** The metrics that moved furthest from the profile, for explaining a score. */
export function topDeviations(devs, limit = 5) {
  return Object.entries(devs)
    .map(([name, value]) => ({ name: name.replace(/_deviation$/, ""), value }))
    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
    .slice(0, limit);
}
