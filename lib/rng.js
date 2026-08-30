/**
 * Seeded pseudo-random number generator.
 *
 * JavaScript's Math.random cannot be seeded, and every run in this app must be
 * reproducible from a printed seed. mulberry32 is small, fast and has good
 * enough distribution for generating synthetic payment features.
 *
 * This is NOT the Mersenne Twister that Python's `random` uses, so a given
 * seed produces a different draw here than in the Python engine. Determinism
 * within this app is what matters: the same seed always rebuilds the same run.
 */

function hashString(str) {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i += 1) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
}

export function makeRng(seed) {
  let a = typeof seed === "string" ? hashString(seed) : seed >>> 0;

  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  return {
    /** Float in [0, 1). */
    random: next,
    /** Float in [lo, hi). */
    uniform: (lo, hi) => lo + next() * (hi - lo),
    /** Integer in [lo, hi]. */
    int: (lo, hi) => Math.floor(lo + next() * (hi - lo + 1)),
    /** One element of an array. */
    choice: (arr) => arr[Math.floor(next() * arr.length)],
    /** Approximately normal, via the central limit theorem. */
    gauss: (mean, sd) => {
      let s = 0;
      for (let i = 0; i < 6; i += 1) s += next();
      return mean + ((s - 3) / 1.2247) * sd;
    },
    /** In-place Fisher-Yates. */
    shuffle: (arr) => {
      for (let i = arr.length - 1; i > 0; i -= 1) {
        const j = Math.floor(next() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    },
  };
}

/** A fresh seed for runs the caller did not pin. */
export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);
