/**
 * Parity check: the in-browser audio extractor vs librosa.
 *
 * The synthetic-voice model names all 74 of its features but not the frame
 * parameters behind them, so the extractor uses librosa's defaults. That makes
 * librosa the thing to check against — and checks the intermediate stages too,
 * because a wrong mel filterbank and a wrong DCT both show up as "the MFCCs
 * are off" and only the stage breakdown says which.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const mod = await import(pathToFileURL(path.resolve('lib/audio-features.js')).href);
const { extractAudioFeatures } = mod;

const truth = JSON.parse(fs.readFileSync('tools/checks/voice-expected.json', 'utf8'));

/* Relative tolerance. The signals span nine orders of magnitude between an RMS
   value and a rolloff frequency, so an absolute tolerance would be either
   meaningless at one end or unmeetable at the other. */
const TOL = 1e-6;

const rel = (a, b) => {
  const scale = Math.max(Math.abs(a), Math.abs(b), 1e-8);
  return Math.abs(a - b) / scale;
};

let worst = 0;
let worstAt = '';
let compared = 0;
const failures = [];

for (const test of truth.cases) {
  const signal = Float64Array.from(test.signal);
  const got = extractAudioFeatures(signal, truth.sr);

  for (const [name, expected] of Object.entries(test.features)) {
    const actual = got[name];
    compared += 1;
    if (actual === undefined) {
      failures.push({ case: test.name, name, expected, actual: 'missing', d: Infinity });
      continue;
    }
    const d = rel(actual, expected);
    if (d > worst) { worst = d; worstAt = `${test.name}.${name}`; }
    if (d > TOL) failures.push({ case: test.name, name, expected, actual, d });
  }
}

console.log(`compared ${compared} features across ${truth.cases.length} signals`);
console.log(`  librosa ${truth.librosa}, ${truth.sr} Hz, n_fft 2048, hop 512, 128 mels`);
console.log(`largest relative difference: ${worst.toExponential(2)} at ${worstAt}  (tolerance ${TOL.toExponential(0)})`);

if (failures.length) {
  console.log(`\n*** ${failures.length} DIVERGENCE(S) ***`);
  const byName = {};
  for (const f of failures) byName[f.name] = (byName[f.name] || 0) + 1;
  console.log('  affected features:', Object.keys(byName).slice(0, 24).join(', '));
  failures.slice(0, 10).forEach((f) =>
    console.log(`  ${f.case}/${f.name}: librosa ${Number(f.expected).toPrecision(10)}  js ${Number(f.actual).toPrecision?.(10) ?? f.actual}  rel ${Number(f.d).toExponential(2)}`));
  process.exit(1);
}

console.log('\nPASS — the browser extractor matches librosa.');

/* ── The claim the panel makes about this artifact ────────────────────────
   The voice panel states that the model never falls below its own threshold.
   That is a strong claim printed next to a real number, so it is asserted
   here: if a future re-export changes the model, this fails rather than the
   page quietly keeping a sentence that stopped being true. */
const { predict } = await import(pathToFileURL(path.resolve('lib/lgbm.js')).href);
const voice = JSON.parse(fs.readFileSync('lib/models/voice.json', 'utf8'));

// A wide box around the values the extractor actually produces on the fixtures.
const observed = truth.cases.map((c) =>
  voice.f.map((n) => extractAudioFeatures(Float64Array.from(c.signal), truth.sr)[n]));
const lo = voice.f.map((_, i) => Math.min(...observed.map((v) => v[i])));
const hi = voice.f.map((_, i) => Math.max(...observed.map((v) => v[i])));

let seed = 20260831;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

let lowest = 1;
const N = 4000;
for (let k = 0; k < N; k += 1) {
  const v = voice.f.map((_, i) => {
    const span = Math.max(hi[i] - lo[i], Math.abs(lo[i]) * 0.5 + 1e-6);
    return lo[i] - span + rand() * (hi[i] - lo[i] + 2 * span);
  });
  lowest = Math.min(lowest, predict(voice, v));
}

console.log(`\nvoice artifact, ${N} vectors across a wide box around real values:`);
console.log(`  lowest probability produced: ${lowest.toFixed(4)}  (its own threshold ${voice.threshold.toFixed(4)})`);

if (lowest < voice.threshold) {
  console.log('\n*** The voice panel says this model never falls below its threshold.');
  console.log('    It just did. Update components/lab/voice-panel.jsx.');
  process.exit(1);
}
console.log('  PASS — matches what the panel tells the reader.');
