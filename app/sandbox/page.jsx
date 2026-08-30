"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Shell, Panel, Stat, Verdict, ErrorNote, PageHead, Bar, Footnote,
  Hint, Skeleton, AccentScope, DEFS, pct, money,
} from "@/components/shell";
import { Slider } from "@/components/ui/slider";
import { rateTone, costTone, scoreTone, verdictFor } from "@/lib/tone";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** One labelled slider row: label, live value, and the control. */
function Control({ label, value, display, min, max, step, onChange, hint }) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <span className="label flex items-center gap-1.5">
          {label}
          {hint ? <Hint>{hint}</Hint> : null}
        </span>
        <span className="font-mono text-[13px] font-semibold text-fg tabular-nums">
          {display}
        </span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={([v]) => onChange(v)}
        aria-label={label}
      />
    </div>
  );
}

export default function Sandbox() {
  /* ---- 1. Manual scorer ------------------------------------------------ */
  const [f, setF] = useState({
    amount: 4200, amountBaseline: 2000, velocity1h: 2, dailyBaseline: 1,
    isNewPayee: true, isInternational: false, isNewDevice: false, hour: 14,
  });
  const [scored, setScored] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    const t = setTimeout(() => {
      fetch("/api/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(f),
      })
        .then((r) => r.json())
        .then(setScored)
        .catch(() => {});
    }, 110);
    return () => clearTimeout(t);
  }, [f]);

  /* ---- 2. Policy tuner ------------------------------------------------- */
  const [curve, setCurve] = useState(null);
  const [threshold, setThreshold] = useState(0.5);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/curve")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setCurve)
      .catch((e) => setError(e?.message || String(e)));
  }, []);

  // Sweeping is arithmetic over an already-scored corpus, so it recomputes
  // instantly rather than hitting the network on every slider step.
  const policy = useMemo(() => {
    if (!curve) return null;
    let tp = 0, fp = 0, tn = 0, fn = 0, missedValue = 0;
    for (const p of curve.points) {
      const flagged = p.s >= threshold;
      if (p.y === 1) {
        if (flagged) tp += 1;
        else { fn += 1; missedValue += p.amount; }
      } else if (flagged) fp += 1;
      else tn += 1;
    }
    const recall = tp + fn ? tp / (tp + fn) : 0;
    const precision = tp + fp ? tp / (tp + fp) : 0;
    return {
      tp, fp, tn, fn, recall, precision, missedValue,
      fpr: fp + tn ? fp / (fp + tn) : 0,
      reviewLoad: (tp + fp) / curve.points.length,
    };
  }, [curve, threshold]);

  /* ---- 3. Base rate ---------------------------------------------------- */
  const [prevalence, setPrevalence] = useState(0.002);
  const [volume, setVolume] = useState(1000000);
  const base = useMemo(() => {
    if (!policy) return null;
    const fraudCount = volume * prevalence;
    const truePos = fraudCount * policy.recall;
    const falsePos = (volume - fraudCount) * policy.fpr;
    const alerts = truePos + falsePos;
    return {
      fraudCount, truePos, falsePos, alerts,
      realPrecision: alerts ? truePos / alerts : 0,
      analystDays: alerts / 250,
    };
  }, [policy, prevalence, volume]);

  const SLIDERS = [
    ["Amount", "amount", 50, 20000, 50, (v) => money(v)],
    ["Account baseline", "amountBaseline", 200, 8000, 100, (v) => money(v)],
    ["Payments this hour", "velocity1h", 1, 10, 1, (v) => `${v}/hr`],
    ["Usual payments per day", "dailyBaseline", 1, 8, 1, (v) => `${v}/day`],
    ["Hour of day", "hour", 0, 23, 1, (v) => `${String(v).padStart(2, "0")}:00`],
  ];

  const FLAGS = [
    ["New payee", "isNewPayee"],
    ["Cross-border", "isInternational"],
    ["New device", "isNewDevice"],
  ];

  const activeFlags = FLAGS.filter(([, k]) => f[k]).map(([, k]) => k);

  return (
    <Shell>
      <div className="space-y-8">
        <ErrorNote>{error}</ErrorNote>

        <PageHead kicker="Analysis" title="Push on it yourself">
          Three things you can drive directly: score a payment you build by hand, move the
          decision threshold and watch the trade move with it, then apply those rates at a
          realistic fraud base rate and see what survives.
        </PageHead>

        {/* ── 1 · AI Defense Lab ────────────────────────────────────────── */}
        <section className="space-y-4">
          <Stage n={1} title="Score a payment you build by hand"
            blurb="Both detectors run live on every change." />

          <div className="grid gap-4 lg:grid-cols-12">
            <Panel title="Build a payment" className="lg:col-span-5">
              <div className="space-y-5">
                {SLIDERS.map(([label, key, min, max, step, fmt]) => (
                  <Control
                    key={key}
                    label={label}
                    value={f[key]}
                    display={fmt(f[key])}
                    min={min}
                    max={max}
                    step={step}
                    onChange={(v) => set(key, v)}
                  />
                ))}

                <div className="border-t border-edge pt-4">
                  <p className="label mb-2.5">Signals present</p>
                  <ToggleGroup
                    type="multiple"
                    value={activeFlags}
                    onValueChange={(next) => {
                      FLAGS.forEach(([, k]) => set(k, next.includes(k)));
                    }}
                    className="flex flex-wrap justify-start gap-1.5"
                  >
                    {FLAGS.map(([label, key]) => (
                      <ToggleGroupItem
                        key={key}
                        value={key}
                        className="rounded-sm border border-edge px-3"
                      >
                        {label}
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </div>
              </div>
            </Panel>

            <Panel title="Both detectors, live" className="lg:col-span-7">
              {scored ? (
                <div className="space-y-5">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {/* A score and the action it produced are ONE event, so they
                        carry one colour. 0.70 leading to STEP_UP renders amber,
                        not green sitting beside an amber badge. */}
                    <Stat
                      emphasis
                      label="Risk score"
                      value={scored.hardened.score.toFixed(2)}
                      note={`confidence ${scored.hardened.confidenceLevel.toLowerCase()}`}
                      tone={scoreTone(verdictFor(scored.hardened.action))}
                    />
                    <div className="card p-4">
                      <p className="label">Hardened</p>
                      <p className="mt-2.5">
                        <Verdict action={verdictFor(scored.hardened.action)} />
                      </p>
                      <p className="caption mt-2.5">
                        {(f.amount / f.amountBaseline).toFixed(2)}x this account&apos;s baseline
                      </p>
                    </div>
                    <div className="card p-4">
                      <p className="label">Legacy rules</p>
                      <p className="mt-2.5">
                        <Verdict action={scored.legacy.flagged ? "FLAG" : "MISS"} />
                      </p>
                      <p className="caption mt-2.5">{scored.legacy.reasons[0]}</p>
                    </div>
                  </div>

                  <div>
                    <p className="label mb-2.5">Signal contributions</p>
                    <div className="space-y-2.5">
                      {Object.entries(scored.hardened.contributions).length === 0 ? (
                        <p className="text-body-sm text-fg-subtle">
                          Nothing cleared its reporting floor.
                        </p>
                      ) : (
                        Object.entries(scored.hardened.contributions)
                          .sort((a, b) => b[1] - a[1])
                          .map(([k, v]) => (
                            <div key={k} className="flex items-center gap-3 text-body-sm">
                              <span className="w-28 shrink-0 capitalize text-fg-muted">
                                {k.replace(/_/g, " ")}
                              </span>
                              <Bar value={v} max={0.35} />
                              <span className="w-12 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums">
                                +{v.toFixed(2)}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <p className="caption border-t border-edge pt-3">
                    {scored.hardened.reasons.join(" · ")}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[0, 1, 2].map((i) => (
                      <div key={i} className="card p-4">
                        <Skeleton className="h-3 w-16" />
                        <Skeleton className="mt-3 h-6 w-20" />
                      </div>
                    ))}
                  </div>
                  <Skeleton className="h-24 w-full" />
                </div>
              )}
            </Panel>
          </div>
        </section>

        {/* ── 2 · Policy tuner ──────────────────────────────────────────── */}
        <section className="space-y-4">
          <Stage n={2} title="Move the decision threshold"
            blurb="The threshold is a business decision, not a property of the model." />

          <Panel>
            {policy && curve ? (
              <div className="space-y-5">
                <div className="max-w-md">
                  <Control
                    label="Review threshold"
                    value={threshold}
                    display={threshold.toFixed(2)}
                    min={0.05}
                    max={0.95}
                    step={0.01}
                    onChange={setThreshold}
                  />
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  <Stat label="Recall" value={pct(policy.recall)}
                    note={`${policy.tp} of ${policy.tp + policy.fn}`}
                    tone={rateTone(policy.recall)} hint={DEFS.recall} />
                  <Stat label="Precision" value={pct(policy.precision)}
                    note="alerts that are fraud" tone={rateTone(policy.precision)}
                    hint={DEFS.precision} />
                  <Stat label="False positives" value={policy.fp}
                    note={pct(policy.fpr, 2)}
                    tone={costTone(policy.fpr, { warn: 0.005, bad: 0.02 })}
                    hint={DEFS.fpr} />
                  <Stat label="Review load" value={pct(policy.reviewLoad)}
                    note="of all payments"
                    tone={costTone(policy.reviewLoad, { warn: 0.05, bad: 0.25 })} />
                  <Stat label="Fraud value missed" value={money(policy.missedValue)}
                    note={`${policy.fn} payments`}
                    tone={costTone(policy.fn / Math.max(1, policy.tp + policy.fn),
                                   { warn: 0.05, bad: 0.34 })} />
                </div>

                <Footnote>
                  Corpus: {curve.fraud} fraudulent, {curve.legit} legitimate, seed {curve.seed}.
                  Lowering the threshold catches more fraud and raises the review load on the
                  same curve. There is no setting that improves both.
                </Footnote>
              </div>
            ) : (
              <div className="space-y-4">
                <Skeleton className="h-5 w-64" />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="card p-4">
                      <Skeleton className="h-3 w-16" />
                      <Skeleton className="mt-3 h-6 w-20" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Panel>
        </section>

        {/* ── 3 · Reality check ─────────────────────────────────────────
            The most important argument on the site, so it gets the accent
            treatment that nothing else on this page gets. */}
        <section className="space-y-4">
          <Stage
            n={3}
            title="What those rates mean at a real base rate"
            blurb="Fraud is rare. A detector that looks strong on a balanced corpus can still bury an analyst team once true prevalence is applied."
            accent
          />

          {base && policy ? (
            <AccentScope className="p-5">
              <div className="grid gap-6 lg:grid-cols-2">
                <Control
                  label="Fraud prevalence"
                  value={prevalence}
                  display={`${(prevalence * 100).toFixed(2)}%`}
                  min={0.0002}
                  max={0.02}
                  step={0.0002}
                  onChange={setPrevalence}
                  hint={DEFS.baseRate}
                />
                <Control
                  label="Monthly payment volume"
                  value={volume}
                  display={volume.toLocaleString()}
                  min={100000}
                  max={5000000}
                  step={100000}
                  onChange={setVolume}
                />
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {/* Neutral facts: how much fraud exists and how many alerts
                    fire are counts, not judgements. Colouring them diluted the
                    one number on this page that carries the argument. */}
                <Stat label="Fraud in the stream"
                  value={Math.round(base.fraudCount).toLocaleString()} note="per month" />
                <Stat label="Alerts raised"
                  value={Math.round(base.alerts).toLocaleString()}
                  note={`${Math.round(base.falsePos).toLocaleString()} of them false`} />
                <Stat emphasis label="Real-world precision" value={pct(base.realPrecision)}
                  note={`vs ${pct(policy.precision)} on the balanced corpus`}
                  tone={rateTone(base.realPrecision)} />
                <Stat label="Analyst-days per month"
                  value={Math.round(base.analystDays).toLocaleString()}
                  note="at 250 reviews per day"
                  tone={costTone(base.analystDays, { warn: 20, bad: 100 })} />
              </div>

              <p className="prose-measure mt-5 border-t border-edge pt-4 text-body-sm text-fg-muted">
                At {(prevalence * 100).toFixed(2)}% prevalence the same detector that scores{" "}
                <span className="font-mono text-fg tabular-nums">{pct(policy.precision)}</span>{" "}
                precision on a balanced corpus scores{" "}
                <span className={`font-mono font-semibold tabular-nums ${
                  { caught: "text-caught", review: "text-review", evaded: "text-evaded" }[
                    rateTone(base.realPrecision)
                  ]
                }`}>
                  {pct(base.realPrecision)}
                </span>{" "}
                in production, because almost every payment it sees is legitimate. This is the
                base-rate problem, and it is the most common way a fraud model looks good in
                evaluation and fails in operation.
              </p>
            </AccentScope>
          ) : null}
        </section>
      </div>
    </Shell>
  );
}

/** Numbered stage header, so three tools read as a sequence not a pile. */
function Stage({ n, title, blurb, accent = false }) {
  return (
    <div className="flex items-start gap-3.5">
      <span
        className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full font-mono text-[12px] font-semibold ${
          accent ? "bg-azure/18 text-azure" : "bg-inset text-fg-muted"
        }`}
      >
        {n}
      </span>
      <div className="min-w-0">
        <h2 className="text-h2">{title}</h2>
        <p className="prose-measure mt-1 text-body-sm text-fg-subtle">{blurb}</p>
      </div>
    </div>
  );
}
