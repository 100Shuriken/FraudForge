"use client";

import { useState } from "react";
import { Panel, Bar, Stat } from "@/components/shell";
import { BlurFade } from "@/components/magic";
import anatomy from "@/lib/models/deepfake-anatomy.json";

const SHOWN = 16;

/**
 * The deepfake model, which cannot be driven — and what can be shown instead.
 *
 * The other five artifacts name their features. This one does not: its config
 * records `num_features: 86` and nothing else, and the booster's own names are
 * Column_0..Column_85, which is what LightGBM writes when a model is trained on
 * a bare array. So there is no way to know what to measure, and any extractor
 * written here would be a guess whose output happened to have 86 numbers in it.
 * Feeding that to the model would produce a confident percentage that means
 * nothing, which is worse than an empty panel.
 *
 * What is knowable is how the model is built, and that is worth showing on its
 * own terms: 86 columns, every one of them used, no single column dominant.
 * A reader can see both that the model is real and why it cannot be driven.
 */
export default function DeepfakePanel() {
  const [expanded, setExpanded] = useState(false);
  const columns = expanded ? anatomy.columns : anatomy.columns.slice(0, SHOWN);
  const maxGain = anatomy.columns[0]?.g || 1;
  const { metrics } = anatomy;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel
        title="Why this one has no input"
        className="lg:col-span-5"
        description="The only model here that stays undriveable, and the reason is specific."
      >
        <div className="space-y-3 text-body-sm text-fg-muted">
          <p>
            Every other artifact names its features. The KYC model lists 23
            image statistics; the voice model lists 74 MFCC and spectral names;
            the transaction model lists 21 columns and ships the vocabulary for
            all 13 categorical ones. Each of those is a specification you can
            build an extractor from, which is what was done.
          </p>
          <p>
            This config records a feature <em>count</em> — 86 — and no names.
            The booster agrees: its own feature names are{" "}
            <span className="font-mono text-[12px] text-fg">Column_0</span>{" "}
            through{" "}
            <span className="font-mono text-[12px] text-fg">Column_85</span>,
            which is what LightGBM writes when a model is trained on a bare
            array rather than a labelled frame.
          </p>
          <p className="text-fg">
            So there is nothing to rebuild from. An extractor written here would
            be a guess that happens to emit 86 numbers, and the model would
            return a confident percentage about them — a number that looks
            exactly like the real ones on this page and means nothing. That is
            the one thing this page will not do.
          </p>
        </div>

        <p className="caption border-t border-white/10 pt-3">
          Recovering the names would need the training script or the feature
          table it was built from. Neither ships with the artifact.
        </p>
      </Panel>

      <div className="space-y-4 lg:col-span-7">
        <Panel
          title="What the artifact does report"
          description="Held-out metrics recorded at training time."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ROC-AUC" value={metrics.roc_auc?.toFixed(4)} />
            <Stat label="Accuracy" value={metrics.accuracy?.toFixed(4)} />
            <Stat label="Precision" value={metrics.precision?.toFixed(4)} />
            <Stat label="Recall" value={metrics.recall?.toFixed(4)} />
          </div>
          <p className="caption border-t border-white/10 pt-3">
            These are the model&apos;s own claims about itself, not something
            measured here — there is no way to measure it here. Its tuned
            threshold is {metrics.optimized_threshold?.toFixed(4)}, well below the
            default 0.5, which is what you would expect from a model tuned to
            favour recall: {(metrics.recall * 100).toFixed(1)}% of deepfakes
            caught at {(metrics.precision * 100).toFixed(1)}% precision.
          </p>
        </Panel>

        <Panel
          title="How the ensemble uses its 86 columns"
          description={`${anatomy.trees} trees, ${anatomy.leaves.toLocaleString()} leaves, all ${anatomy.used} columns split on at least once.`}
          action={
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="btn btn-sm"
            >
              {expanded ? "Show top 16" : `Show all ${anatomy.features}`}
            </button>
          }
        >
          <BlurFade>
            <div className="space-y-1.5">
              {columns.map((c) => (
                <div key={c.i} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 font-mono text-[11px] text-fg-subtle tabular-nums">
                    Column_{c.i}
                  </span>
                  {/* Bar must be a direct flex child: .bar-track is a span
                      with a height, and only flex blockifies it. Wrapping it
                      in a div left it display:inline and it collapsed. */}
                  <Bar value={c.g} max={maxGain} />
                  <span className="w-12 shrink-0 text-right font-mono text-[11px] text-fg-muted tabular-nums">
                    {(c.g * 100).toFixed(2)}%
                  </span>
                  <span className="w-16 shrink-0 text-right font-mono text-[11px] text-fg-subtle tabular-nums">
                    {c.s.toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          </BlurFade>

          <div className="mt-3 flex justify-end gap-3 border-t border-white/10 pt-2">
            <span className="caption">share of total split gain · splits</span>
          </div>

          <p className="caption border-t border-white/10 pt-3">
            No column carries more than{" "}
            {(anatomy.columns[0].g * 100).toFixed(1)}% of the total gain and every
            one of the 86 is used, so the model is not leaning on a handful of
            signals it could be told about — the whole vector matters, which is
            exactly why a partial guess at it would not do.
          </p>
        </Panel>
      </div>
    </div>
  );
}
