/**
 * The shipped phishing classifier: the exported scikit-learn artifact bound to
 * the pure implementation in phishing-core.js.
 */

import MODEL from "./phishing-model.json";
import { scorePhishing as score, topContributions as top } from "./phishing-core";

export const scorePhishing = (text) => score(MODEL, text);
export const topContributions = (text, limit) => top(MODEL, text, limit);

export const MODEL_META = MODEL.meta;
export const VOCAB_SIZE = MODEL.terms.length;
