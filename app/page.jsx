"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Play, ArrowRight, ArrowsClockwise } from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, Verdict, Spinner, ErrorNote, PageHead, Bar, pct, money,
} from "@/components/shell";
import { SpatialSequence } from "@/components/sequence";

const describeError = (e) => {
  const m = e?.message || String(e);
  return /failed to fetch|networkerror|load failed/i.test(m)
    ? "Cannot reach the scoring engine. Reload to retry."
    : m;
};

export default function Cockpit() {
  const [meta, setMeta] = useState(null);
  const [targetId, setTargetId] = useState("C0001");
  const [attackType, setAttackType] = useState("");
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
        body: JSON.stringify({ targetId, attackType: attackType || null, difficulty }),
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
      <div className="space-y-6">
        <ErrorNote>{error}</ErrorNote>

        <PageHead
          kicker="The closed loop"
          title="Attack an account. Watch both detectors score it."
          action={
            <button type="button" onClick={simulate} disabled={busy || !meta} className="btn btn-primary">
              {busy ? <><Spinner /> Scoring</> : <><Play size={14} weight="fill" /> Run attack</>}
            </button>
          }
        >
          A red-team planner reads the account, picks the vector it is least ready for, and
          writes a payment sequence. Every step is scored twice: by flat threshold rules, and
          by a scorer that grades against this account&apos;s own baseline.
        </PageHead>

        {/* ── Controls ─────────────────────────────────────────────── */}
        <div className="slab grid gap-3 p-4 lg:grid-cols-12">
          <label className="lg:col-span-5">
            <span className="tag mb-1.5 block">Target account</span>
            <select value={targetId} onChange={(e) => setTargetId(e.target.value)} className="field">
              {meta?.customers.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.id} · {x.city} · ${x.baseline.toLocaleString()} avg · {x.daily}/day
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-5">
            <span className="tag mb-1.5 block">Attack vector</span>
            <select value={attackType} onChange={(e) => setAttackType(e.target.value)} className="field">
              <option value="">Auto, let the planner choose</option>
              {meta?.families.map((f) => <option key={f.name} value={f.name}>{f.label}</option>)}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="tag mb-1.5 block">Difficulty</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="field">
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
        </div>

        {target ? (
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Baseline payment", `$${target.baseline.toLocaleString()}`],
              ["Usual cadence", `${target.daily}/day`],
              ["Device stability", target.deviceStability],
              ["Spending regularity", target.regularity],
            ].map(([k, v]) => (
              <div key={k} className="slab px-3 py-2.5">
                <p className="tag">{k}</p>
                <p className="mt-1 font-mono text-sm font-bold">{v}</p>
              </div>
            ))}
          </div>
        ) : null}

        {run && c ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Payments sent" value={c.total} note={money(c.valueTotal)} />
              <Stat label="Hardened caught" value={`${c.hardenedCaught}/${c.total}`} note={pct(run.defence.detectionRate)} tone="signal" />
              <Stat label="Legacy caught" value={`${c.legacyCaught}/${c.total}`} note={pct(c.legacyDetectionRate)} tone="fail" />
              <Stat label="Value through" value={money(c.valueThrough)} note={`${run.defence.evaded} payments evaded`} tone="warn" />
            </div>

            {/* ── Spatial sequence ─────────────────────────────────── */}
            <Panel
              title="Attack sequence"
              description="The shape of the attack, in the order it was sent. An attacker does not send one loud payment; they send a sequence tuned so no single step stands out."
            >
              <SpatialSequence records={run.records} selected={selected} onSelect={setSelected} />
            </Panel>

            {/* ── Plan ─────────────────────────────────────────────── */}
            <Panel title={`Planner chose ${run.plan.label}`} description={run.plan.rationale}>
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(run.plan.candidates)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([name, score]) => (
                    <span key={name}
                      className={`border-2 px-2 py-1 font-mono text-[10px] ${
                        name === run.plan.attackType
                          ? "border-signal bg-signal/10 text-signal"
                          : "border-line text-bone-dim"
                      }`}>
                      {name.replace(/_/g, " ")} {score}
                    </span>
                  ))}
              </div>
            </Panel>

            {/* ── Selected payment ─────────────────────────────────── */}
            {active ? (
              <div className="grid gap-4 lg:grid-cols-12">
                <Panel title={`Payment ${active.step} scored ${active.riskScore.toFixed(2)}`}
                  description={active.explanation} className="lg:col-span-7">
                  <div className="space-y-2">
                    {Object.entries(active.contributions).length === 0 ? (
                      <p className="text-xs text-bone-dim">No signal cleared its reporting floor.</p>
                    ) : (
                      Object.entries(active.contributions).sort((a, b) => b[1] - a[1]).map(([k, v]) => (
                        <div key={k} className="flex items-center gap-3 text-xs">
                          <span className="w-28 shrink-0 capitalize text-bone-dim">{k.replace(/_/g, " ")}</span>
                          <Bar value={v} max={0.35} />
                          <span className="w-12 shrink-0 text-right font-mono font-bold text-signal">+{v.toFixed(2)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </Panel>

                <Panel title="Detector disagreement" className="lg:col-span-5">
                  <div className="space-y-3">
                    <div className="slab p-3">
                      <div className="flex items-center justify-between">
                        <p className="tag">Hardened</p>
                        <Verdict action={active.action} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {active.reasons.map((r) => <li key={r} className="text-[11px] text-bone-dim">· {r}</li>)}
                      </ul>
                    </div>
                    <div className="slab p-3">
                      <div className="flex items-center justify-between">
                        <p className="tag">Legacy rules</p>
                        <Verdict action={active.legacyFlagged ? "FLAG" : "MISS"} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {active.legacyReasons.map((r) => <li key={r} className="text-[11px] text-bone-dim">· {r}</li>)}
                      </ul>
                    </div>
                  </div>
                </Panel>
              </div>
            ) : null}
          </>
        ) : null}

        {/* ── Benchmark ────────────────────────────────────────────── */}
        <Panel
          title="Measured detector comparison"
          description="Both detectors over one labelled corpus of synthetic fraud and legitimate traffic. Computed per request, not stored."
          action={
            <button type="button" onClick={runBenchmark} disabled={benchBusy} className="btn">
              {benchBusy ? <><Spinner /> Evaluating</> : <><ArrowsClockwise size={13} weight="bold" /> {bench ? "Re-run" : "Run"}</>}
            </button>
          }
        >
          {bench ? (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Legacy recall" value={pct(bench.legacy.recall)} note={`${bench.legacy.truePositives} of ${bench.legacy.truePositives + bench.legacy.falseNegatives}`} tone="fail" />
                <Stat label="Hardened recall" value={pct(bench.hardened.recall)} note={`${pct(bench.recallDelta)} better`} tone="signal" />
                <Stat label="Added false positives" value={pct(bench.frictionDelta, 2)} note={`legacy ${pct(bench.legacy.falsePositiveRate, 2)}, hardened ${pct(bench.hardened.falsePositiveRate, 2)}`} tone="warn" />
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-line">
                      <th className="tag pr-4 pb-2">Detector</th>
                      <th className="tag pr-4 pb-2 text-right">Recall</th>
                      <th className="tag pr-4 pb-2 text-right">Precision</th>
                      <th className="tag pr-4 pb-2 text-right">F1</th>
                      <th className="tag pb-2 text-right">FPR</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[["Legacy static rules", bench.legacy], ["Hardened per-account", bench.hardened]].map(([n, m]) => (
                      <tr key={n} className="border-b border-line/60">
                        <td className="py-2.5 pr-4 font-medium">{n}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{pct(m.recall)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{pct(m.precision)}</td>
                        <td className="py-2.5 pr-4 text-right font-mono">{pct(m.f1)}</td>
                        <td className="py-2.5 text-right font-mono">{pct(m.falsePositiveRate, 2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="font-mono text-[10px] leading-relaxed text-bone-faint">
                Corpus: {bench.corpus.fraudulent} fraudulent, {bench.corpus.legitimate} legitimate,
                seed {bench.seed}. The flat rules almost never fire on ordinary traffic here, so
                the hardened scorer buys a large recall gain for a small amount of added friction
                rather than for free. Recovered value {money(bench.recoveredValue)} of{" "}
                {money(bench.corpus.fraudValue)} is inside this corpus only, not a projection.
              </p>
            </div>
          ) : (
            <p className="text-xs text-bone-dim">Run the benchmark to score several hundred payments through both detectors.</p>
          )}
        </Panel>

        <div className="flex flex-wrap gap-3">
          <Link href="/identify" className="btn">See all 28 vectors <ArrowRight size={12} weight="bold" /></Link>
          <Link href="/defender" className="btn">Retrain the defender <ArrowRight size={12} weight="bold" /></Link>
        </div>
      </div>
    </Shell>
  );
}
