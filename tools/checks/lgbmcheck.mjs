/**
 * Parity check: the in-browser LightGBM evaluator vs the Python artifacts.
 *
 * Covers every exported model over vectors spanning several magnitudes, a
 * fifth of which carry missing values — default_left handling is the easiest
 * thing to get subtly wrong, and a check that never sees a NaN would not catch
 * it.
 *
 * The transaction cases additionally cover categorical splits, which are set
 * membership rather than equality and have their own absence rules. Three
 * paths matter and all three are silent when wrong: a code inside the split's
 * set, a code outside it, and a value the model never saw during training.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const { predict, score } = await import(pathToFileURL(path.resolve('lib/lgbm.js')).href);

const expected = JSON.parse(fs.readFileSync('tools/checks/lgbm-expected.json', 'utf8'));
const TOL = 1e-9;

let total = 0, worst = 0, withMissing = 0, withUnseen = 0;
const failures = [];

for (const [name, spec] of Object.entries(expected)) {
  const model = JSON.parse(fs.readFileSync(`lib/models/${name}.json`, 'utf8'));
  for (const { x, p } of spec.cases) {
    const vec = x.map((v) => (v === null ? undefined : v));
    if (vec.some((v) => v === undefined)) withMissing += 1;

    let got;
    if (spec.named) {
      // Categorical columns arrive as the strings a UI would supply, so this
      // exercises the encoding path the panels actually use, not just the
      // tree walk.
      const named = {};
      spec.features.forEach((f, i) => { if (vec[i] !== undefined) named[f] = vec[i]; });
      if (Object.values(named).includes('__never_seen__')) withUnseen += 1;
      got = score(model, named).probability;
    } else {
      got = predict(model, vec);
    }

    const delta = Math.abs(got - p);
    if (delta > worst) worst = delta;
    if (delta > TOL) failures.push({ name, python: p, js: got, delta });
    total += 1;
  }
}

console.log(`compared ${total} vectors across ${Object.keys(expected).length} models`);
console.log(`  ${withMissing} of them contained missing values`);
console.log(`  ${withUnseen} of them contained a category the model never saw`);
console.log(`largest absolute difference: ${worst.toExponential(2)}  (tolerance ${TOL})`);

if (failures.length) {
  console.log(`\n*** ${failures.length} DIVERGENCE(S) ***`);
  failures.slice(0, 6).forEach((f) =>
    console.log(`  ${f.name}: python ${f.python.toFixed(12)}  js ${f.js.toFixed(12)}  Δ${f.delta.toExponential(2)}`));
  process.exitCode = 1;
} else {
  console.log('\nPASS — the browser matches the Python LightGBM artifacts.');
}
