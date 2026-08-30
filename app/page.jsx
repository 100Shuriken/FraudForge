"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play, ArrowRight, ArrowsClockwise, ChartBar } from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, Verdict, Spinner, ErrorNote, PageHead, Bar, Footnote,
  EmptyState, StatSkeleton, Hint, DEFS, pct, money,
} from "@/components/shell";
import { SpatialSequence, SequenceDetail } from "@/components/sequence";
import { rateTone, countTone, costTone } from "@/lib/tone";
import { labelFor } from "@/lib/taxonomy";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const describeError = (e) => {
  const m = e?.message || String(e);
  return /failed to fetch|networkerror|load failed/i.test(m)
    ? "Cannot reach the scoring engine. Reload to retry."
    : m;
};

export default function Cockpit() {
  const [meta, setMeta] = useState(null);
  const [targetId, setTargetId] = useState("C0001");
  const [attackType, setAttackType] = useState("auto");
  const [difficulty, setDifficulty] = useState("medium");

  const [run, setRun] = useState(null);
  const [bench, setBench] = useState(null);
  const [busy, setBusy] = useState(false);
  const [benchBusy, setBenchBusy] = useState(false);
  const [error, setError] = useState(null);
  const [selected, setSelected] = useState(0);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMeta)
      .catch((e) => setError(describeError(e)));
  }, []);

  const simulate = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetId,
          attackType: attackType === "auto" ? null : attackType,
          difficulty,
        }),
      });
      if (!res.ok) throw new Error(`Simulation failed, HTTP ${res.status}`);
      setRun(await res.json());
      setSelected(0);
    } catch (e) {
      setRun(null);
      setError(describeError(e));
    } finally {
      setBusy(false);
    }
  }, [targetId, attackType, difficulty]);

  useEffect(() => {
    if (meta) simulate();
  }, [meta, simulate]);

  const runBenchmark = async () => {
    setBenchBusy(true);
    try {
      const res = await fetch(`/api/benchmark?seed=${Math.floor(Math.random() * 99999)}`);
      if (!res.ok) throw new Error(`Benchmark failed, HTTP ${res.status}`);
      setBench(await res.json());
    } catch (e) {
      setError(describeError(e));
    } finally {
      setBenchBusy(false);
    }
  };

  const target = meta?.customers.find((c) => c.id === targetId);
  const active = run?.records[selected];
  const c = run?.comparison;

  return (
    <Shell>
      <div className="space-y-8">
        <ErrorNote>{error}</ErrorNote>

        {/* ── MOTION MOMENT 1 · Mission briefing ─────────────────────────
            Dot grid plus a slow azure-to-ember sweep: the two teams meeting.
            Pure CSS, no JS loop. Budget in DESIGN.md §9. */}
        <div className="hero-field border border-edge px-5 py-8 lg:px-9 lg:py-11">
          <PageHead
            kicker="The closed loop"
            title="Attack an account. Watch both detectors score it."
            action={
              <button
                type="button"
                onClick={simulate}
                disabled={busy || !meta}
                aria-busy={busy}
                className="btn btn-attack"
              >
                {busy ? (
                  <><Spinner /> Scoring</>
                ) : (
                  <><Play size={14} weight="fill" /> Run attack</>
                )}
              </button>
            }
          >
            A red-team planner reads the account, picks the vector it is least
            ready for, and writes a payment sequence. Every step is scored twice:
            by flat threshold rules, and by a scorer that grades against this
            account&apos;s own baseline.
          </PageHead>
        </div>

        {/* ── Controls ─────────────────────────────────────────────────── */}
        <div className="card grid gap-4 p-5 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <label htmlFor="target" className="label mb-1.5 block">
              Target account
            </label>
            <Select value={targetId} onValueChange={setTargetId}>
              <SelectTrigger id="target" className="w-full">
                <SelectValue placeholder="Select an account" />
              </SelectTrigger>
              <SelectContent>
                {meta?.customers.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name} · {x.id} · {x.city} · ${x.baseline.toLocaleString()} avg
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-5">
            <label htmlFor="vector" className="label mb-1.5 block">
              Attack vector
            </label>
            <Select value={attackType} onValueChange={setAttackType}>
              <SelectTrigger id="vector" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto — let the planner choose</SelectItem>
                {meta?.families.map((f) => (
                  <SelectItem key={f.name} value={f.name}>
                    {f.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <label htmlFor="difficulty" className="label mb-1.5 block">
              Difficulty
            </label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger id="difficulty" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* ── Account profile. Secondary weight: context, not headline. ── */}
        {target ? (
          <div className="well grid grid-cols-2 divide-x divide-edge lg:grid-cols-4">
            {[
              ["Baseline payment", `$${target.baseline.toLocaleString()}`],
              ["Usual cadence", `${target.daily}/day`],
              ["Device stability", target.deviceStability],
              ["Spending regularity", target.regularity],
            ].map(([k, v], i) => (
              <div key={k} className={`px-4 py-3 ${i > 1 ? "border-t border-edge lg:border-t-0" : ""}`}>
                <p className="caption">{k}</p>
                <p className="mt-1 font-mono text-[15px] font-semibold tabular-nums">{v}</p>
              </div>
            ))}
          </div>
        ) : null}

        {busy && !run ? <StatSkeleton /> : null}

        {run && c ? (
          <>
            {/* One emphasised tile, three supporting. The old design gave
                twelve tiles identical weight and no entry point. */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {/* Both catch ratios resolve through the SAME band function, so a
                  0/16 renders red whichever detector produced it. Colour tracks
                  performance, never allegiance. */}
              <Stat
                emphasis
                label="Hardened caught"
                value={`${c.hardenedCaught}/${c.total}`}
                note={`${pct(run.defence.detectionRate)} of the sequence`}
                tone={countTone(c.hardenedCaught, c.total)}
                hint={DEFS.recall}
              />
              <Stat label="Legacy caught" value={`${c.legacyCaught}/${c.total}`}
                note={pct(c.legacyDetectionRate)}
                tone={countTone(c.legacyCaught, c.total)} />
              {/* Neutral: a payment count is neither good nor bad. */}
              <Stat label="Payments sent" value={c.total} note={money(c.valueTotal)} />
              {/* Cost: never green. Amber once any value gets through at all. */}
              <Stat label="Value through" value={money(c.valueThrough)}
                note={`${run.defence.evaded} of ${c.total} payments evaded`}
                tone={costTone(c.valueThrough / Math.max(1, c.valueTotal),
                               { warn: 0.001, bad: 0.34 })} />
            </div>

            <Panel
              title="Attack sequence"
              description="An attacker does not send one loud payment; they send a sequence tuned so no single step stands out. The review line is drawn, so a payment that slipped under it is visible rather than arithmetic."
            >
              <SpatialSequence records={run.records} selected={selected} onSelect={setSelected} />
            </Panel>

            {/* ── Adapt: why the planner chose what it chose ───────────── */}
            <Panel
              title={`Planner chose ${run.plan.label}`}
              description={run.plan.rationale}
            >
              {/* A dot plot on a ZOOMED, LABELLED axis.
                  These scores span roughly 0.48-0.60, so bars drawn from zero
                  differed by a few pixels and the ranking this panel exists to
                  show was invisible. Bars cannot honestly be zoomed — a bar
                  implies a zero baseline — so the mark changes to a dot, which
                  carries no such implication, and the domain is printed rather
                  than left for the reader to assume. */}
              {(() => {
                const shown = Object.entries(run.plan.candidates)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 8);
                const vals = shown.map(([, v]) => v);
                const lo = Math.min(...vals);
                const hi = Math.max(...vals);
                const pad = Math.max(0.004, (hi - lo) * 0.12);
                const dMin = lo - pad;
                const dMax = hi + pad;
                const at = (v) => ((v - dMin) / (dMax - dMin)) * 100;

                return (
                  <>
                    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                      <p className="label">
                        Every vector scored against this account&apos;s weak points
                      </p>
                      <p className="caption">
                        Top {shown.length} of {Object.keys(run.plan.candidates).length}
                        {" · "}axis zoomed to{" "}
                        <span className="font-mono tabular-nums">
                          {dMin.toFixed(2)}–{dMax.toFixed(2)}
                        </span>
                      </p>
                    </div>

                    <div className="space-y-0.5">
                      {shown.map(([name, score]) => {
                        const chosen = name === run.plan.attackType;
                        return (
                          <div key={name} className="flex items-center gap-3">
                            <span
                              className={`w-44 shrink-0 truncate text-body-sm ${
                                chosen ? "font-medium text-ember" : "text-fg-muted"
                              }`}
                              title={labelFor(name)}
                            >
                              {labelFor(name)}
                            </span>

                            <span className="relative h-6 flex-1">
                              {/* Axis line the dots sit on. */}
                              <span
                                aria-hidden
                                className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-edge"
                              />
                              {/* Stem back to the weakest score, so the gaps
                                  between ranks are readable at a glance. */}
                              <span
                                aria-hidden
                                className={`absolute top-1/2 h-0.5 -translate-y-1/2 rounded-full ${
                                  chosen ? "bg-ember/45" : "bg-magnitude/30"
                                }`}
                                style={{ left: 0, width: `${at(score)}%` }}
                              />
                              <span
                                aria-hidden
                                className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full ${
                                  chosen
                                    ? "h-3 w-3 bg-ember ring-2 ring-ember/25"
                                    : "h-2 w-2 bg-magnitude"
                                }`}
                                style={{ left: `${at(score)}%` }}
                              />
                            </span>

                            <span
                              className={`w-11 shrink-0 text-right font-mono text-[12px] tabular-nums ${
                                chosen ? "font-semibold text-ember" : "text-fg-subtle"
                              }`}
                            >
                              {score.toFixed(3)}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                      <span className="w-44 shrink-0" />
                      <span className="relative h-4 flex-1">
                        <span className="caption absolute left-0 font-mono tabular-nums">
                          {dMin.toFixed(2)}
                        </span>
                        <span className="caption absolute right-0 font-mono tabular-nums">
                          {dMax.toFixed(2)}
                        </span>
                      </span>
                      <span className="w-11 shrink-0" />
                    </div>
                  </>
                );
              })()}
            </Panel>

            {/* ── Selected payment ─────────────────────────────────────── */}
            {active ? (
              <div className="space-y-4">
                <SequenceDetail record={active} />
                <div className="grid gap-4 lg:grid-cols-12">
                  <Panel
                    title={`Why payment ${active.step} scored ${active.riskScore.toFixed(2)}`}
                    description={active.explanation}
                    className="lg:col-span-7"
                  >
                    <div className="space-y-2.5">
                      {Object.entries(active.contributions).length === 0 ? (
                        <p className="text-body-sm text-fg-subtle">
                          No signal cleared its reporting floor.
                        </p>
                      ) : (
                        Object.entries(active.contributions)
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
                  </Panel>

                  <Panel title="Detector disagreement" className="lg:col-span-5">
                    <div className="space-y-3">
                      {[
                        ["Hardened, per-account", active.action, active.reasons],
                        ["Legacy, static rules", active.legacyFlagged ? "FLAG" : "MISS", active.legacyReasons],
                      ].map(([name, verdict, reasons]) => (
                        <div key={name} className="well p-3.5">
                          <div className="flex items-center justify-between gap-2">
                            <p className="label">{name}</p>
                            <Verdict action={verdict} />
                          </div>
                          <ul className="mt-2 space-y-1">
                            {reasons.map((r) => (
                              <li key={r} className="caption">· {r}</li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </Panel>
                </div>
              </div>
            ) : null}
          </>
        ) : null}

        {/* ── Live benchmark ───────────────────────────────────────────── */}
        <Panel
          title="Measured detector comparison"
          description="Both detectors over one labelled corpus of synthetic fraud and legitimate traffic. Computed per request, not stored."
          action={
            <button
              type="button"
              onClick={runBenchmark}
              disabled={benchBusy}
              aria-busy={benchBusy}
              className="btn"
            >
              {benchBusy ? (
                <><Spinner /> Evaluating</>
              ) : (
                <><ArrowsClockwise size={14} weight="bold" /> {bench ? "Re-run" : "Run benchmark"}</>
              )}
            </button>
          }
        >
          {benchBusy && !bench ? (
            <StatSkeleton count={3} />
          ) : bench ? (
            <div className="space-y-5" aria-live="polite">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Legacy recall" value={pct(bench.legacy.recall)}
                  note={`${bench.legacy.truePositives} of ${bench.legacy.truePositives + bench.legacy.falseNegatives}`}
                  tone={rateTone(bench.legacy.recall)} hint={DEFS.recall} />
                <Stat emphasis label="Hardened recall" value={pct(bench.hardened.recall)}
                  note={`${pct(bench.recallDelta)} better than legacy`}
                  tone={rateTone(bench.hardened.recall)} hint={DEFS.recall} />
                <Stat label="Added false positives" value={pct(bench.frictionDelta, 2)}
                  note={`legacy ${pct(bench.legacy.falsePositiveRate, 2)} → hardened ${pct(bench.hardened.falsePositiveRate, 2)}`}
                  tone={costTone(bench.frictionDelta, { warn: 0.01, bad: 0.05 })}
                  hint={DEFS.fpr} />
              </div>

              <div className="overflow-x-auto">
                <table className="zebra w-full min-w-[560px] text-left">
                  <thead>
                    <tr className="border-b border-edge">
                      <th className="col-head pr-4 pb-2.5">Detector</th>
                      {[["Recall", DEFS.recall], ["Precision", DEFS.precision],
                        ["F1", DEFS.f1], ["FPR", DEFS.fpr]].map(([h, d]) => (
                        <th key={h} className="col-head pr-4 pb-2.5 text-right">
                          <span className="inline-flex items-center gap-1">
                            {h} <Hint>{d}</Hint>
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[["Legacy static rules", bench.legacy, false],
                      ["Hardened per-account", bench.hardened, true]].map(([n, m, best]) => (
                      <tr key={n} className="border-b border-edge/60">
                        <td className={`py-3 pr-4 text-body-sm ${best ? "font-medium text-fg" : "text-fg-muted"}`}>
                          {n}
                        </td>
                        <td className={`py-3 pr-4 text-right font-mono text-[13px] tabular-nums ${
                          { caught: "text-caught", review: "text-review", evaded: "text-evaded" }[rateTone(m.recall)]
                        } ${best ? "font-semibold" : ""}`}>
                          {pct(m.recall)}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-[13px] text-fg-muted tabular-nums">{pct(m.precision)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-[13px] text-fg-muted tabular-nums">{pct(m.f1)}</td>
                        <td className="py-3 text-right font-mono text-[13px] text-fg-muted tabular-nums">{pct(m.falsePositiveRate, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <Footnote>
                Corpus: {bench.corpus.fraudulent} fraudulent, {bench.corpus.legitimate} legitimate,
                seed {bench.seed}. The flat rules almost never fire on ordinary traffic here, so the
                hardened scorer buys a large recall gain for a small amount of added friction rather
                than for free. Recovered value {money(bench.recoveredValue)} of{" "}
                {money(bench.corpus.fraudValue)} is inside this corpus only, not a projection.
              </Footnote>
            </div>
          ) : (
            <EmptyState
              Icon={ChartBar}
              title="No benchmark run yet"
              action={
                <button type="button" onClick={runBenchmark} className="btn btn-primary">
                  <ArrowsClockwise size={14} weight="bold" /> Run benchmark
                </button>
              }
            >
              Scores several hundred synthetic payments through both detectors and
              reports the confusion matrix for each.
            </EmptyState>
          )}
        </Panel>

        <div className="flex flex-wrap gap-3">
          <Link href="/identify" className="btn">
            See all 28 vectors <ArrowRight size={13} weight="bold" />
          </Link>
          <Link href="/defender" className="btn">
            Retrain the defender <ArrowRight size={13} weight="bold" />
          </Link>
        </div>
      </div>
    </Shell>
  );
}
