/**
 * Parity check: the in-browser phishing classifier vs scikit-learn.
 *
 * The JS implementation is only legitimate if it returns the SAME number the
 * Python artifact does. This compares both across a spread of inputs and fails
 * on any meaningful divergence.
 *
 *   node tools/checks/phishingcheck.mjs [expected.json]
 *
 * `expected.json` is produced by the Python side (see the script this check
 * prints if the file is missing), so the two never drift silently.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const EXPECTED = process.argv[2] || 'tools/checks/phishing-expected.json';

if (!fs.existsSync(EXPECTED)) {
  console.error(`Missing ${EXPECTED}. Regenerate it from the Python artifacts with:

  cd lab && python -c "
import joblib, json
m = joblib.load('backend/models/phishing/logistic_regression_phishing_model.joblib')
v = joblib.load('backend/models/phishing/tfidf_phishing_vectorizer.joblib')
cases = json.load(open('../tools/checks/phishing-cases.json'))
out = [{'text': t, 'p': float(m.predict_proba(v.transform([t]))[0][1])} for t in cases]
json.dump(out, open('../tools/checks/phishing-expected.json','w'), indent=1)
"`);
  process.exit(1);
}

const { scorePhishing } = await import(
  pathToFileURL(path.resolve('lib/phishing-core.js')).href
);
const MODEL = JSON.parse(fs.readFileSync('lib/phishing-model.json', 'utf8'));

const expected = JSON.parse(fs.readFileSync(EXPECTED, 'utf8'));
const TOL = 1e-6;

let worst = 0;
const failures = [];

for (const { text, p } of expected) {
  const got = scorePhishing(MODEL, text).fraud_probability;
  const delta = Math.abs(got - p);
  if (delta > worst) worst = delta;
  if (delta > TOL) failures.push({ text: text.slice(0, 56), sklearn: p, js: got, delta });
}

console.log(`compared ${expected.length} messages against scikit-learn`);
console.log(`largest absolute difference: ${worst.toExponential(2)}  (tolerance ${TOL})`);

if (failures.length) {
  console.log(`\n*** ${failures.length} DIVERGENCE(S) ***`);
  for (const f of failures) {
    console.log(`  sklearn ${f.sklearn.toFixed(9)}  js ${f.js.toFixed(9)}  Δ${f.delta.toExponential(2)}  "${f.text}"`);
  }
  process.exitCode = 1;
} else {
  console.log('\nPASS — the browser returns the same model output as scikit-learn.');
}
