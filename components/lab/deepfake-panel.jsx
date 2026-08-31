"use client";

import { useMemo, useState } from "react";
import { ArrowsClockwise, Shuffle } from "@phosphor-icons/react";
import { Panel, Bar, Stat } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { predict } from "@/lib/lgbm";
import anatomy from "@/lib/models/deepfake-anatomy.json";

const SHOWN = 12;
const DRIVERS = 8;

/**
 * The deepfake model, driven directly.
 *
 * This is the one artifact whose features have no names: its config records
 * `num_features: 86` and the booster's own names are Column_0..Column_85,
 * which is what LightGBM writes when a model is trained on a bare array. So
 * there is no extractor to rebuild, and a panel that took a video upload and
 * produced a percentage would be inventing the mapping between the two.
 *
 * That is a reason not to fake an extractor. It is not a reason to leave the
 * model unusable, because the ensemble itself is real and it responds: across
 * 4,000 vectors sampled inside its own split ranges it returns anywhere from
 * 0.003 to 0.999, and 12% land below its tuned threshold. Unlike the voice
 * artifact, this one discriminates.
 *
 * So the panel drives the 86-dimensional input directly and lets a reader move
 * the columns the ensemble is most sensitive to. What it reports is the real
 * output of the real model. What it does not claim is that any particular
 * column means "lip-sync error" — nothing in the artifact says that.
 *
 * Each slider is bounded by the range the trees actually split that column
 * over. Outside that range every tree returns the same leaf and the control
 * would do nothing, which would look broken rather than honest.
 */
export default function DeepfakePanel({ model }) {
  const cols = anatomy.byGain;
  const byIndex = useMemo(() => {
    const m = {};
    for (const c of cols) m[c.i] = c;
    return m;
  }, [cols]);

  const baseline = useMemo(
    () => Object.fromEntries(cols.map((c) => [c.i, c.mid])),
    [cols]
  );

  const [values, setValues] = useState(baseline);
  const [expanded, setExpanded] = useState(false);

  const vector = useMemo(() => {
    const v = new Array(anatomy.features);
    for (let i = 0; i < anatomy.features; i += 1) v[i] = values[i];
    return v;
  }, [values]);

  const probability = useMemo(() => predict(model, vector), [model, vector]);
  const threshold = anatomy.threshold;
  const fake = probability >= threshold;

  const drivers = anatomy.bySwing.slice(0, DRIVERS).map((i) => byIndex[i]);

  const randomise = () => {
    const next = {};
    for (const c of cols) next[c.i] = c.lo + Math.random() * (c.hi - c.lo);
    setValues(next);
  };

  const shown = expanded ? cols : cols.slice(0, SHOWN);
  const maxGain = cols[0]?.g || 1;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <Panel
          title="Drive the model"
          description={`The ${DRIVERS} columns this ensemble is most sensitive to, each bounded by the range its trees actually split over.`}
          action={
            <div className="flex gap-2">
              <button type="button" onClick={randomise} className="btn btn-sm">
                <Shuffle size={13} weight="bold" /> Randomise
              </button>
              <button
                type="button"
                onClick={() => setValues(baseline)}
                className="btn btn-sm"
              >
                <ArrowsClockwise size={13} weight="bold" /> Reset
              </button>
            </div>
          }
        >
          <div className="space-y-2">
            {drivers.map((c) => {
              const span = c.hi - c.lo;
              const at = (values[c.i] - c.lo) / (span || 1);
              return (
                <label
                  key={c.i}
                  className="block rounded-lg border border-white/10 bg-inset/40 px-3.5 py-2.5"
                >
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="font-mono text-[12px] text-fg">
                      Column_{c.i}
                    </span>
                    <span className="caption">
                      swings the score {(c.sw * 100).toFixed(0)} points
                    </span>
                    <span className="font-mono text-[12px] text-fg-muted tabular-nums">
                      {values[c.i].toFixed(2)}
                    </span>
                  </span>
                  <input
                    type="range"
                    min={c.lo}
                    max={c.hi}
                    step={span / 200}
                    value={values[c.i]}
                    onChange={(e) =>
                      setValues((p) => ({ ...p, [c.i]: Number(e.target.value) }))
                    }
                    className="mt-1.5 w-full accent-signal"
                    aria-label={`Column ${c.i}`}
                  />
                  <span className="mt-0.5 flex justify-between">
                    <span className="caption font-mono">{c.lo.toFixed(1)}</span>
                    <span className="caption">{(at * 100).toFixed(0)}% of range</span>
                    <span className="caption font-mono">{c.hi.toFixed(1)}</span>
                  </span>
                </label>
              );
            })}
          </div>

          <p className="caption border-t border-white/10 pt-3">
            The other {anatomy.features - DRIVERS} columns are held at the midpoint
            of their own split ranges. Every value here is fed to the real
            {" "}{anatomy.trees}-tree ensemble; the percentage beside it is that
            model&apos;s actual output, computed in this tab.
          </p>
        </Panel>

        <Panel
          title="Why there is no video upload"
          description="The only artifact here whose features cannot be reconstructed."
        >
          <div className="space-y-3 text-body-sm text-fg-muted">
            <p>
              Every other model names its features. KYC lists 23 image
              statistics; voice lists 74 MFCC and spectral names; transaction
              lists 21 columns and ships the vocabulary for all 13 categorical
              ones. Each of those is a specification an extractor was rebuilt
              from.
            </p>
            <p>
              This config records a feature <em>count</em> — 86 — and no names.
              The booster agrees: its feature names are{" "}
              <span className="font-mono text-[12px] text-fg">Column_0</span>{" "}
              through{" "}
              <span className="font-mono text-[12px] text-fg">Column_85</span>,
              and there is no{" "}
              <span className="font-mono text-[12px] text-fg">
                feature_names_in_
              </span>{" "}
              on the estimator either — both are what you get when a model is
              fitted on a bare array rather than a labelled frame.
            </p>
            <p className="text-fg">
              So a video upload would require inventing which measurement maps to
              which column. The model would then return a confident percentage
              that looks exactly like the real ones elsewhere on this page and
              means nothing. Driving the vector directly is the honest version of
              the same interaction: the model is real, the output is real, and
              nothing claims to know what Column_14 measures.
            </p>
          </div>
        </Panel>
      </div>

      <div className="space-y-4 lg:col-span-5">
        <Panel title="Model output">
          <BlurFade key={probability.toFixed(4)}>
            <div
              className="relative overflow-hidden rounded-lg border p-5"
              style={{
                borderColor: fake
                  ? "rgb(251 110 104 / 0.45)"
                  : "rgb(53 214 164 / 0.45)",
                background: fake
                  ? "rgb(251 110 104 / 0.07)"
                  : "rgb(53 214 164 / 0.07)",
              }}
            >
              <BorderBeam
                colorFrom={fake ? "#fb6e68" : "#35d6a4"}
                colorTo="var(--color-signal)"
              />
              <p className="overline">Deepfake likelihood</p>
              <p
                className={`mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                  fake ? "text-evaded" : "text-caught"
                }`}
              >
                {(probability * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-body-sm text-fg-muted">
                {anatomy.features} features · {anatomy.trees} trees · tuned
                threshold {threshold.toFixed(4)}
              </p>
              <p className="mt-3 rounded-md border border-white/10 bg-white/[0.03] px-3 py-2 text-body-sm text-fg-muted">
                This is the ensemble&apos;s real output for the vector you set.
                It is not a verdict about a video — no video was measured, and
                the artifact does not say what its columns are.
              </p>
            </div>
          </BlurFade>
        </Panel>

        <Panel
          title="What the artifact reports"
          description="Held-out metrics recorded at training time."
        >
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="ROC-AUC" value={anatomy.metrics.roc_auc?.toFixed(4)} />
            <Stat label="Accuracy" value={anatomy.metrics.accuracy?.toFixed(4)} />
            <Stat label="Precision" value={anatomy.metrics.precision?.toFixed(4)} />
            <Stat label="Recall" value={anatomy.metrics.recall?.toFixed(4)} />
          </div>
          <p className="caption border-t border-white/10 pt-3">
            The model&apos;s own claims about itself, not something measured
            here. Its tuned threshold of {threshold.toFixed(4)} sits well below
            the default 0.5, which is what a model tuned to favour recall looks
            like: {(anatomy.metrics.recall * 100).toFixed(1)}% of deepfakes
            caught at {(anatomy.metrics.precision * 100).toFixed(1)}% precision.
          </p>
        </Panel>

        <Panel
          title="How it spends its gain"
          description={`${anatomy.trees} trees, ${anatomy.leaves.toLocaleString()} leaves, all ${anatomy.used} columns split on.`}
          action={
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              className="btn btn-sm"
            >
              {expanded ? `Show top ${SHOWN}` : `Show all ${anatomy.features}`}
            </button>
          }
        >
          <div className="space-y-1.5">
            {shown.map((c) => (
              <div key={c.i} className="flex items-center gap-3">
                <span className="w-[74px] shrink-0 font-mono text-[11px] text-fg-subtle tabular-nums">
                  Column_{c.i}
                </span>
                {/* Bar must be a direct flex child: .bar-track is a span with a
                    height, and only flex blockifies it. */}
                <Bar value={c.g} max={maxGain} />
                <span className="w-11 shrink-0 text-right font-mono text-[11px] text-fg-muted tabular-nums">
                  {(c.g * 100).toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
          <p className="caption border-t border-white/10 pt-3">
            No column carries more than {(cols[0].g * 100).toFixed(1)}% of total
            gain and every one of the {anatomy.features} is used, which is also
            why a partial guess at the extractor would not have worked — the
            whole vector matters.
          </p>
        </Panel>
      </div>
    </div>
  );
}
