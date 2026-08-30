"use client";

import { useEffect, useMemo, useState } from "react";
import { Shell, Panel, Stat, Verdict, ErrorNote, PageHead, Bar, pct, money } from "@/components/shell";

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

  return (
    <Shell>
      <div className="space-y-6">
        <ErrorNote>{error}</ErrorNote>

        <PageHead kicker="Analysis" title="Push on it yourself">
          Three things you can drive directly: score a payment you build by hand, move the
          decision threshold and watch the trade move with it, then apply those rates at a
          realistic fraud base rate and see what survives.
        </PageHead>

        {/* ── Manual scorer ─────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel title="Build a payment" className="lg:col-span-5">
            <div className="space-y-4">
              {SLIDERS.map(([label, key, min, max, step, fmt]) => (
                <label key={key} className="block">
                  <span className="mb-1.5 flex items-baseline justify-between">
                    <span className="tag">{label}</span>
                    <span className="font-mono text-xs font-bold text-signal">{fmt(f[key])}</span>
                  </span>
                  <input type="range" min={min} max={max} step={step} value={f[key]}
                    onChange={(e) => set(key, Number(e.target.value))} />
                </label>
              ))}
              <div className="flex flex-wrap gap-2 border-t-2 border-line pt-3">
                {[["New payee", "isNewPayee"], ["Cross-border", "isInternational"], ["New device", "isNewDevice"]].map(
                  ([label, key]) => (
                    <button key={key} type="button" onClick={() => set(key, !f[key])} aria-pressed={f[key]}
                      className={`btn !px-2.5 !py-1.5 ${f[key] ? "btn-primary" : ""}`}>
                      {label}
                    </button>
                  )
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Both detectors, live" className="lg:col-span-7">
            {scored ? (
              <div className="space-y-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Stat label="Risk score" value={scored.hardened.score.toFixed(2)}
                    note={`confidence ${scored.hardened.confidenceLevel.toLowerCase()}`}
                    tone={scored.hardened.flagged ? "signal" : "fail"} />
                  <div className="slab p-4">
                    <p className="tag">Hardened</p>
                    <p className="mt-2">
                      <Verdict action={scored.hardened.action === "block" ? "BLOCK" : scored.hardened.action === "review" ? "STEP_UP" : "ALLOW"} />
                    </p>
                    <p className="mt-2 text-[11px] text-bone-dim">
                      {(f.amount / f.amountBaseline).toFixed(2)}x this account&apos;s baseline
                    </p>
                  </div>
                  <div className="slab p-4">
                    <p className="tag">Legacy rules</p>
                    <p className="mt-2"><Verdict action={scored.legacy.flagged ? "FLAG" : "MISS"} /></p>
                    <p className="mt-2 text-[11px] text-bone-dim">{scored.legacy.reasons[0]}</p>
                  </div>
                </div>

                <div>
                  <p className="tag mb-2.5">Signal contributions</p>
                  <div className="space-y-2">
                    {Object.entries(scored.hardened.contributions).length === 0 ? (
                      <p className="text-xs text-bone-dim">Nothing cleared its reporting floor.</p>
                    ) : (
                      Object.entries(scored.hardened.contributions).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-3 text-xs">
                          <span className="w-28 shrink-0 capitalize text-bone-dim">{k.replace(/_/g, " ")}</span>
                          <Bar value={v} max={0.35} />
                          <span className="w-12 shrink-0 text-right font-mono font-bold text-signal">+{v.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <p className="border-t-2 border-line pt-3 font-mono text-[10px] leading-relaxed text-bone-faint">
                  {scored.hardened.reasons.join(" · ")}
                </p>
              </div>
            ) : (
              <p className="text-xs text-bone-dim">Scoring…</p>
            )}
          </Panel>
        </div>

        {/* ── Policy tuner ──────────────────────────────────────────── */}
        <Panel title="Policy tuner"
          description="The threshold is a business decision, not a property of the model. Move it and watch what you buy and what you pay for it.">
          {policy && curve ? (
            <div className="space-y-5">
              <label className="block">
                <span className="mb-2 flex items-baseline justify-between">
                  <span className="tag">Review threshold</span>
                  <span className="font-mono text-lg font-bold text-signal">{threshold.toFixed(2)}</span>
                </span>
                <input type="range" min={0.05} max={0.95} step={0.01} value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))} />
              </label>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                <Stat label="Recall" value={pct(policy.recall)} note={`${policy.tp} of ${policy.tp + policy.fn}`} tone="signal" />
                <Stat label="Precision" value={pct(policy.precision)} note="alerts that are fraud" />
                <Stat label="False positives" value={policy.fp} note={pct(policy.fpr, 2)} tone={policy.fpr > 0.02 ? "fail" : "warn"} />
                <Stat label="Review load" value={pct(policy.reviewLoad)} note="of all payments" tone="warn" />
                <Stat label="Fraud value missed" value={money(policy.missedValue)} note={`${policy.fn} payments`} tone="fail" />
              </div>

              <p className="font-mono text-[10px] leading-relaxed text-bone-faint">
                Corpus: {curve.fraud} fraudulent, {curve.legit} legitimate, seed {curve.seed}.
                Lowering the threshold catches more fraud and raises the review load on the same
                curve. There is no setting that improves both.
              </p>
            </div>
          ) : (
            <p className="text-xs text-bone-dim">Scoring corpus…</p>
          )}
        </Panel>

        {/* ── Base rate ─────────────────────────────────────────────── */}
        <Panel title="What those rates mean at a real base rate"
          description="Fraud is rare. A detector that looks strong on a balanced corpus can still bury an analyst team once true prevalence is applied.">
          {base && policy ? (
            <div className="space-y-5">
              <div className="grid gap-5 lg:grid-cols-2">
                <label className="block">
                  <span className="mb-2 flex items-baseline justify-between">
                    <span className="tag">Fraud prevalence</span>
                    <span className="font-mono text-sm font-bold text-signal">{(prevalence * 100).toFixed(2)}%</span>
                  </span>
                  <input type="range" min={0.0002} max={0.02} step={0.0002} value={prevalence}
                    onChange={(e) => setPrevalence(Number(e.target.value))} />
                </label>
                <label className="block">
                  <span className="mb-2 flex items-baseline justify-between">
                    <span className="tag">Monthly payment volume</span>
                    <span className="font-mono text-sm font-bold text-signal">{volume.toLocaleString()}</span>
                  </span>
                  <input type="range" min={100000} max={5000000} step={100000} value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))} />
                </label>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="Fraud in the stream" value={Math.round(base.fraudCount).toLocaleString()} note="per month" />
                <Stat label="Alerts raised" value={Math.round(base.alerts).toLocaleString()} note={`${Math.round(base.falsePos).toLocaleString()} of them false`} tone="warn" />
                <Stat label="Real-world precision" value={pct(base.realPrecision)}
                  note={`vs ${pct(policy.precision)} on the balanced corpus`}
                  tone={base.realPrecision < 0.3 ? "fail" : "signal"} />
                <Stat label="Analyst-days per month" value={Math.round(base.analystDays).toLocaleString()} note="at 250 reviews per day" tone="warn" />
              </div>

              <p className="font-mono text-[10px] leading-relaxed text-bone-faint">
                At {(prevalence * 100).toFixed(2)}% prevalence the same detector that scores{" "}
                {pct(policy.precision)} precision on a balanced corpus scores {pct(base.realPrecision)}{" "}
                in production, because almost every payment it sees is legitimate. This is the
                base-rate problem, and it is the most common way a fraud model looks good in
                evaluation and fails in operation.
              </p>
            </div>
          ) : null}
        </Panel>
      </div>
    </Shell>
  );
}
