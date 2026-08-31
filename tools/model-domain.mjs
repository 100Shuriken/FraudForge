/**
 * Record the input range each model's trees actually split over.
 *
 * A gradient-boosted ensemble only learned anything in the region its training
 * data covered. Feed it a value outside every threshold it ever split a
 * feature at and every tree takes the same branch for that feature, so the
 * output stops depending on it. Feed it a whole vector of those and the answer
 * is a constant, which looks exactly like a confident verdict.
 *
 * That is not hypothetical here. The KYC model splits Tenengrad only over
 * [66.1, 70.5] and Noise Diff H only over [106.4, 112.7]. A browser-extracted
 * document produces roughly 30,000 and 2 for those, because the names in the
 * config pin down what each feature is but not how the training pipeline
 * computed it, and "Tenengrad" and "Noise Diff" each have several standard
 * definitions that differ by orders of magnitude.
 *
 * So the panels report coverage rather than pretending. Run:
 *     node tools/model-domain.mjs
 */

import fs from "node:fs";
import path from "node:path";

const MODELS = ["kyc", "ato", "voice", "transaction"];

for (const name of MODELS) {
  const file = path.join("lib", "models", `${name}.json`);
  if (!fs.existsSync(file)) continue;
  const model = JSON.parse(fs.readFileSync(file, "utf8"));

  const thresholds = {};
  const walk = (node) => {
    if (typeof node !== "object") return;
    if (node.c !== 1) {
      (thresholds[node.f] ||= []).push(node.t);
    }
    walk(node.l);
    walk(node.r);
  };
  model.t.forEach(walk);

  const features = model.f.map((feature, i) => {
    const t = (thresholds[i] || []).sort((a, b) => a - b);
    return {
      name: feature,
      splits: t.length,
      lo: t.length ? Number(t[0].toFixed(6)) : null,
      hi: t.length ? Number(t[t.length - 1].toFixed(6)) : null,
    };
  });

  const out = path.join("lib", "models", `${name}-domain.json`);
  fs.writeFileSync(
    out,
    JSON.stringify({ model: name, threshold: model.threshold, features })
  );

  const split = features.filter((f) => f.splits).length;
  console.log(
    `${name.padEnd(12)} ${split}/${features.length} features ever split on  ->  ${out}`
  );
}
