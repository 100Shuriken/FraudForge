"use client";

import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Play } from "@phosphor-icons/react";
import { Shell, Panel, Stat, Spinner, ErrorNote, PageHead, Bar, pct } from "@/components/shell";
import { SpatialSequence } from "@/components/sequence";

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

  const sorted = sweep ? [...sweep.results].sort((a, b) => a.detectionRate - b.detectionRate) : [];

  return (
    <div className="space-y-6">
      <ErrorNote>{error}</ErrorNote>

      <PageHead
        kicker="Pillar 2 · Generate"
        title="Synthesise every vector, at scale"
        action={
          <div className="flex items-end gap-2">
            <label>
              <span className="tag mb-1.5 block">Target</span>
              <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="field">
                {meta?.customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.id}</option>)}
              </select>
            </label>
            <button type="button" onClick={runSweep} disabled={busy || !meta} className="btn btn-primary">
              {busy ? <><Spinner /> Running</> : <><Play size={13} weight="fill" /> Sweep all</>}
            </button>
          </div>
        }
      >
        Every vector in the taxonomy generated against one account, then scored. Sorted worst
        first, so the account&apos;s weakest surfaces surface immediately. Click any family to
        generate a full sequence and inspect it.
      </PageHead>

      {sweep ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Vectors generated" value={sweep.results.length} />
            <Stat label="Payments synthesised" value={sweep.aggregate.records} />
            <Stat label="Overall detection" value={pct(sweep.aggregate.detectionRate)} tone="signal" />
            <Stat label="Weakest surface" value={sorted[0] ? pct(sorted[0].detectionRate, 0) : "-"}
              note={sorted[0]?.label} tone="fail" />
          </div>

          <Panel
            title="Detection by vector"
            description="Share of each family's generated payments the hardened scorer caught. Low bars are where this account is most exposed."
          >
            <div className="space-y-2">
              {sorted.map((r) => (
                <button key={r.attackType} type="button" onClick={() => runOne(r.attackType)}
                  className={`flex w-full items-center gap-3 border-2 px-2 py-1.5 text-left text-xs transition-colors ${
                    focus === r.attackType ? "border-signal bg-signal/8" : "border-transparent hover:border-line"
                  }`}>
                  <span className="w-52 shrink-0 truncate font-medium">{r.label}</span>
                  <Bar value={r.detectionRate}
                    tone={r.detectionRate < 0.34 ? "fail" : r.detectionRate < 0.67 ? "warn" : "signal"} />
                  <span className="w-12 shrink-0 text-right font-mono font-bold">{pct(r.detectionRate, 0)}</span>
                  <span className="w-20 shrink-0 text-right font-mono text-[10px] text-bone-faint">
                    {r.evaded}/{r.records} out
                  </span>
                </button>
              ))}
            </div>
          </Panel>
        </>
      ) : null}

      {runBusy ? <p className="tag">Generating sequence…</p> : null}

      {run ? (
        <>
          <Panel
            title={`Generated sequence: ${run.plan.label}`}
            description={`${run.records.length} payments. ${run.comparison.hardenedCaught} caught by the hardened scorer, ${run.comparison.legacyCaught} by flat rules.`}
          >
            <SpatialSequence records={run.records} selected={selected} onSelect={setSelected} />
          </Panel>

          <Panel title="Fidelity: what the generator produced"
            description="Distributions the sequence actually hit, so you can judge whether it resembles real payment behaviour rather than noise.">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Amount range", `${Math.min(...run.records.map(r => r.amountRatio))}x - ${Math.max(...run.records.map(r => r.amountRatio))}x`, "of account baseline"],
                ["Velocity range", `${Math.min(...run.records.map(r => r.velocity))} - ${Math.max(...run.records.map(r => r.velocity))}`, "payments per hour"],
                ["New payee rate", pct(run.records.filter(r => r.isNewPayee).length / run.records.length, 0), "of the sequence"],
                ["Cross-border rate", pct(run.records.filter(r => r.isInternational).length / run.records.length, 0), "of the sequence"],
              ].map(([k, v, n]) => (
                <div key={k} className="slab p-3">
                  <p className="tag">{k}</p>
                  <p className="mt-1.5 font-mono text-base font-bold">{v}</p>
                  <p className="mt-1 text-[10px] text-bone-faint">{n}</p>
                </div>
              ))}
            </div>
          </Panel>
        </>
      ) : null}
    </div>
  );
}

export default function Generate() {
  return (
    <Shell>
      <Suspense fallback={<p className="tag">Loading…</p>}>
        <GenerateInner />
      </Suspense>
    </Shell>
  );
}
