/**
 * Parity check: the in-browser LightGBM evaluator vs the Python artifacts.
 *
 * Covers both models over 80 vectors spanning several magnitudes, a fifth of
 * which carry missing values — default_left handling is the easiest thing to
 * get subtly wrong, and a check that never sees a NaN would not catch it.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { predict } = await import(pathToFileURL(path.resolve('lib/lgbm.js')).href);

const expected = JSON.parse(fs.readFileSync('tools/checks/lgbm-expected.json', 'utf8'));
const TOL = 1e-9;

let total = 0, worst = 0, withMissing = 0;
const failures = [];

for (const [name, spec] of Object.entries(expected)) {
  const model = JSON.parse(fs.readFileSync(`lib/models/${name}.json`, 'utf8'));
  for (const { x, p } of spec.cases) {
    const vec = x.map((v) => (v === null ? undefined : v));
    if (vec.some((v) => v === undefined)) withMissing += 1;
    const got = predict(model, vec);
    const delta = Math.abs(got - p);
    if (delta > worst) worst = delta;
    if (delta > TOL) failures.push({ name, python: p, js: got, delta });
    total += 1;
  }
}

console.log(`compared ${total} vectors across ${Object.keys(expected).length} models`);
console.log(`  ${withMissing} of them contained missing values`);
console.log(`largest absolute difference: ${worst.toExponential(2)}  (tolerance ${TOL})`);

if (failures.length) {
  console.log(`\n*** ${failures.length} DIVERGENCE(S) ***`);
  failures.slice(0, 6).forEach((f) =>
    console.log(`  ${f.name}: python ${f.python.toFixed(12)}  js ${f.js.toFixed(12)}  Δ${f.delta.toExponential(2)}`));
  process.exitCode = 1;
} else {
  console.log('\nPASS — the browser matches the Python LightGBM artifacts.');
}
