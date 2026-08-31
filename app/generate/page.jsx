"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play, Lightning } from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, Spinner, ErrorNote, PageHead, Footnote, EmptyState,
  StatSkeleton, DEFS, pct,
} from "@/components/shell";
import { SpatialSequence, SequenceDetail } from "@/components/sequence";
import { BlurFade } from "@/components/magic";
import { rateTone } from "@/lib/tone";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

function GenerateInner() {
  const params = useSearchParams();
  const preset = params.get("v");

  const [meta, setMeta] = useState(null);
  const [targetId, setTargetId] = useState("C0001");
  const [sweep, setSweep] = useState(null);
  const [focus, setFocus] = useState(preset || null);
  const [run, setRun] = useState(null);
  const [selected, setSelected] = useState(0);
  const [busy, setBusy] = useState(false);
  const [runBusy, setRunBusy] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/customers")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then(setMeta)
      .catch((e) => setError(e?.message || String(e)));
  }, []);

  const runSweep = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "all", targetId }),
      });
      if (!res.ok) throw new Error(`Sweep failed, HTTP ${res.status}`);
      setSweep(await res.json());
    } catch (e) {
      setSweep(null);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  }, [targetId]);

  useEffect(() => { if (meta) runSweep(); }, [meta, runSweep]);

  const runOne = useCallback(async (attackType) => {
    setFocus(attackType);
    setRunBusy(true);
    try {
      const res = await fetch("/api/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetId, attackType }),
      });
      if (!res.ok) throw new Error(`Generation failed, HTTP ${res.status}`);
      setRun(await res.json());
      setSelected(0);
    } catch (e) {
      setError(e?.message || String(e));
    } finally {
      setRunBusy(false);
    }
  }, [targetId]);

  useEffect(() => { if (meta && preset) runOne(preset); }, [meta, preset, runOne]);

  const sorted = sweep
    ? [...sweep.results].sort((a, b) => a.detectionRate - b.detectionRate)
    : [];
  const active = run?.records[selected];

  return (
    <div className="space-y-8">
      <ErrorNote>{error}</ErrorNote>

      <PageHead
        kicker="Pillar 2 · Generate"
        title="Synthesise every vector, at scale"
        highlight="at scale"
        action={
          <div className="flex items-end gap-2.5">
            <div className="w-[210px]">
              <label htmlFor="gen-target" className="label mb-1.5 block">
                Target
              </label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="gen-target" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {meta?.customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} · {c.id}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <button
              type="button"
              onClick={runSweep}
              disabled={busy || !meta}
              aria-busy={busy}
              className="btn btn-attack"
            >
              {busy ? <><Spinner /> Running</> : <><Play size={13} weight="fill" /> Sweep all</>}
            </button>
          </div>
        }
      >
        Every vector in the taxonomy generated against one account, then scored. Sorted
        worst first, so the account&apos;s weakest surfaces surface immediately. Select any
        family to generate a full sequence and inspect it.
      </PageHead>

      {busy && !sweep ? <StatSkeleton /> : null}

      {sweep ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* Weakest surface and overall detection are both rates, so both
                resolve through the same band function. */}
            <Stat emphasis label="Weakest surface"
              value={sorted[0] ? pct(sorted[0].detectionRate, 0) : "-"}
              note={sorted[0]?.label}
              tone={sorted[0] ? rateTone(sorted[0].detectionRate) : undefined} />
            <Stat label="Overall detection" value={pct(sweep.aggregate.detectionRate)}
              tone={rateTone(sweep.aggregate.detectionRate)} hint={DEFS.recall} />
            {/* Neutral counts. */}
            <Stat label="Vectors generated" value={sweep.results.length} />
            <Stat label="Payments synthesised" value={sweep.aggregate.records} />
          </div>

          {/* ── MOTION MOMENT 2 · the ranked sweep reveal ─────────────────
              The ranking IS the finding, so the cascade carries information:
              rows arrive worst-first. transform+opacity only, done by 500ms. */}
          <Panel
            title="Detection by vector"
            description="Share of each family's generated payments the hardened scorer caught. Low bars are where this account is most exposed."
          >
            {/* Rows grouped into performance zones.
                Previously 28 rows at one pitch down 850px, with the 50%
                reference drawn as a 1px tick inside a 6px track — invisible —
                and a legend duplicated from the sequence panel below. The
                zones now carry the colour meaning, so the legend goes. */}
            {(() => {
              const COLS =
                "grid grid-cols-[13rem_minmax(0,1fr)_3.6rem_5rem] items-center gap-3";
              const ZONES = [
                ["evaded", "Mostly evading", "under a third of payments caught", "bg-evaded", "text-evaded"],
                ["review", "Partially caught", "between a third and two thirds caught", "bg-review", "text-review"],
                ["caught", "Well covered", "two thirds or more caught", "bg-caught", "text-caught"],
              ];

              return (
                <>
                  <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                    <p className="caption">
                      Ranked worst first · select a row to generate that vector
                    </p>
                    <p className="caption">
                      Dashed line marks 50% detection
                    </p>
                  </div>

                  {/* Shared axis, stated once. */}
                  <div className={`${COLS} mb-2`}>
                    <span />
                    <span className="relative block h-3">
                      <span className="caption absolute left-0">0%</span>
                      <span className="caption absolute left-1/2 -translate-x-1/2">50%</span>
                      <span className="caption absolute right-0">100%</span>
                    </span>
                    <span />
                    <span />
                  </div>

                  <div className="relative">
                    {/* One continuous reference line across every zone, drawn
                        over the track column via a matching grid overlay. */}
                    <div className={`${COLS} pointer-events-none absolute inset-0 z-1`} aria-hidden>
                      <span />
                      <span className="relative block h-full">
                        <span
                          data-ref-line
                          className="absolute inset-y-0 left-1/2 w-px border-l border-dashed border-fg-subtle/70"
                        />
                      </span>
                      <span />
                      <span />
                    </div>

                    <div className="space-y-4">
                      {ZONES.map(([key, title, blurb, dot, text]) => {
                        const rows = sorted.filter((r) => rateTone(r.detectionRate) === key);
                        if (!rows.length) return null;
                        return (
                          <div key={key} data-zone={key} className="rounded-md bg-inset/40 py-2">
                            <div className={`${COLS} py-1.5`}>
                              <span className="flex items-center gap-2">
                                <span className={`h-2 w-2 shrink-0 rounded-full ${dot}`} aria-hidden />
                                <span className={`text-[13px] font-semibold ${text}`}>{title}</span>
                              </span>
                              <span className="caption">{blurb}</span>
                              <span className="caption text-right font-mono tabular-nums">
                                {rows.length}
                              </span>
                              <span />
                            </div>

                            {rows.map((r, i) => {
                              const isFocus = focus === r.attackType;
                              return (
                                <BlurFade key={r.attackType} delay={Math.min(i * 0.018, 0.4)}>
                                  <button
                                    type="button"
                                    onClick={() => runOne(r.attackType)}
                                    className={`${COLS} w-full rounded-sm px-0 py-1.5 text-left transition-colors ${
                                      isFocus ? "bg-signal/10" : "hover:bg-overlay/60"
                                    }`}
                                  >
                                    <span
                                      className={`truncate pl-2 text-body-sm ${
                                        isFocus ? "font-medium text-fg" : "text-fg-muted"
                                      }`}
                                    >
                                      {r.label}
                                    </span>
                                    <span className="bar-track">
                                      <span
                                        className={`bar-fill ${dot}`}
                                        style={{ width: `${Math.max(1.5, r.detectionRate * 100)}%` }}
                                      />
                                    </span>
                                    <span className="text-right font-mono text-[13px] font-semibold tabular-nums">
                                      {pct(r.detectionRate, 1)}
                                    </span>
                                    <span className="caption pr-2 text-right font-mono tabular-nums">
                                      {r.evaded}/{r.records} out
                                    </span>
                                  </button>
                                </BlurFade>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </>
              );
            })()}
          </Panel>
        </>
      ) : null}

      {runBusy ? (
        <Panel title="Generating sequence">
          <div className="space-y-3">
            <div className="skeleton h-[104px] w-full rounded-md" />
            <div className="skeleton h-4 w-64 rounded-sm" />
          </div>
        </Panel>
      ) : null}

      {run && !runBusy ? (
        <>
          <Panel
            title={`Generated sequence: ${run.plan.label}`}
            description={`${run.records.length} payments. ${run.comparison.hardenedCaught} caught by the hardened scorer, ${run.comparison.legacyCaught} by flat rules.`}
          >
            <div className="space-y-4">
              <SpatialSequence
                records={run.records}
                selected={selected}
                onSelect={setSelected}
              />
              <SequenceDetail record={active} />
            </div>
          </Panel>

          <Panel
            title="Fidelity: what the generator produced"
            description="Distributions the sequence actually hit, so you can judge whether it resembles real payment behaviour rather than noise."
          >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Amount range",
                  `${Math.min(...run.records.map(r => r.amountRatio))}x – ${Math.max(...run.records.map(r => r.amountRatio))}x`,
                  "of account baseline"],
                ["Velocity range",
                  `${Math.min(...run.records.map(r => r.velocity))} – ${Math.max(...run.records.map(r => r.velocity))}`,
                  "payments per hour"],
                ["New payee rate",
                  pct(run.records.filter(r => r.isNewPayee).length / run.records.length, 0),
                  "of the sequence"],
                ["Cross-border rate",
                  pct(run.records.filter(r => r.isInternational).length / run.records.length, 0),
                  "of the sequence"],
              ].map(([k, v, n]) => (
                <div key={k} className="well p-4">
                  <p className="label">{k}</p>
                  <p className="mt-1.5 font-mono text-[17px] font-semibold tabular-nums">{v}</p>
                  <p className="caption mt-1">{n}</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      {sweep && !run && !runBusy ? (
        <EmptyState Icon={Lightning} title="No sequence generated yet">
          Select any vector in the ranking above to synthesise a full payment
          sequence against this account and inspect it step by step.
        </EmptyState>
      ) : null}

      {sweep ? (
        <Footnote>
          Sweep seed {sweep.seed ?? "drawn per request"}. Every family above was generated
          from the parameters carried on its taxonomy entry and scored by the same engine
          that scores the Cockpit, so the ranking is measured rather than asserted.
        </Footnote>
      ) : null}
    </div>
  );
}

export default function Generate() {
  return (
    <Shell>
      <Suspense fallback={<StatSkeleton />}>
        <GenerateInner />
      </Suspense>
    </Shell>
  );
}
