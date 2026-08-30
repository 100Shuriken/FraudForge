"use client";

import { useCallback, useEffect, useState } from "react";
import { Play, ArrowsClockwise } from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, Verdict, Spinner, ErrorNote, pct, money,
} from "@/components/shell";

const describeError = (err) => {
  const m = err?.message || String(err);
  return /failed to fetch|networkerror|load failed/i.test(m)
    ? "Cannot reach the scoring engine. Reload the page to retry."
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
      const data = await res.json();
      setRun(data);
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
    setError(null);
    try {
      const res = await fetch(`/api/benchmark?seed=${Math.floor(Math.random() * 100000)}`);
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

  return (
    <Shell>
      <div className="space-y-6">
        <ErrorNote>{error}</ErrorNote>

        {/* ── Controls ────────────────────────────────────────────── */}
        <div className="space-y-5">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight lg:text-3xl">
              Attack an account, watch both detectors score it
            </h1>
            <p className="mt-2 max-w-[76ch] text-sm leading-relaxed text-bone-dim">
              A red-team planner reads the account, picks the attack it is least ready for,
              and writes a payment sequence. Every step is scored twice: once by flat
              threshold rules, once by a scorer that grades against this account&apos;s own
              baseline.
            </p>
          </div>

          <div className="grid gap-3 lg:grid-cols-12">
            <label className="lg:col-span-4">
              <span className="mb-1.5 block text-xs font-medium text-bone-faint uppercase tracking-wide">
                Target account
              </span>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-bone"
              >
                {meta?.customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.id} · {c.city} · ${c.baseline.toLocaleString()} avg
                  </option>
                ))}
              </select>
            </label>

            <label className="lg:col-span-4">
              <span className="mb-1.5 block text-xs font-medium text-bone-faint uppercase tracking-wide">
                Attack family
              </span>
              <select
                value={attackType}
                onChange={(e) => setAttackType(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-bone"
              >
                <option value="">Auto, let the planner choose</option>
                {meta?.families.map((f) => (
                  <option key={f.name} value={f.name}>{f.label}</option>
                ))}
              </select>
            </label>

            <label className="lg:col-span-2">
              <span className="mb-1.5 block text-xs font-medium text-bone-faint uppercase tracking-wide">
                Difficulty
              </span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full cursor-pointer rounded-lg border border-line bg-ink px-3 py-2.5 text-sm text-bone"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard, stealthier</option>
              </select>
            </label>

            <div className="flex items-end lg:col-span-2">
              <button
                type="button"
                onClick={simulate}
                disabled={busy || !meta}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-signal px-4 py-2.5 text-sm font-semibold text-ink hover:bg-signal-deep hover:text-bone disabled:opacity-50"
              >
                {busy ? <><Spinner /> Scoring</> : <><Play size={15} weight="fill" /> Run attack</>}
              </button>
            </div>
          </div>

          {target ? (
            <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                ["Baseline payment", `$${target.baseline.toLocaleString()}`],
                ["Usual cadence", `${target.daily}/day`],
                ["Device stability", target.deviceStability],
                ["Spending regularity", target.regularity],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg border border-line bg-ink-raised px-3 py-2.5">
                  <dt className="text-[11px] text-bone-faint">{k}</dt>
                  <dd className="font-mono text-sm font-semibold">{v}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>

        {run ? (
          <>
            {/* ── Headline result ─────────────────────────────────── */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Payments sent" value={run.comparison.total} note={money(run.comparison.valueTotal)} />
              <Stat
                label="Hardened caught"
                value={`${run.comparison.hardenedCaught}/${run.comparison.total}`}
                note={pct(run.defence.detectionRate)}
                tone="signal"
              />
              <Stat
                label="Legacy caught"
                value={`${run.comparison.legacyCaught}/${run.comparison.total}`}
                note={pct(run.comparison.legacyDetectionRate)}
                tone="fail"
              />
              <Stat
                label="Value through"
                value={money(run.comparison.valueThrough)}
                note={`${run.defence.evaded} payments evaded`}
                tone="warn"
              />
            </div>

            {/* ── Plan ────────────────────────────────────────────── */}
            <Panel
              title={`Planner chose ${run.plan.label}`}
              description={run.plan.rationale}
            >
              <div className="flex flex-wrap gap-2">
                {Object.entries(run.plan.candidates)
                  .sort((a, b) => b[1] - a[1])
                  .map(([name, score]) => (
                    <span
                      key={name}
                      className={`rounded-lg border px-2.5 py-1 font-mono text-[11px] ${
                        name === run.plan.attackType
                          ? "border-signal/40 bg-signal/12 text-signal"
                          : "border-line bg-ink text-bone-dim"
                      }`}
                    >
                      {name.replace(/_/g, " ")} {score}
                    </span>
                  ))}
              </div>
            </Panel>

            {/* ── Ledger ──────────────────────────────────────────── */}
            <Panel
              title="Payment-by-payment ledger"
              description="Click any row to inspect why it scored the way it did. Both detector verdicts are shown side by side."
            >
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-bone-faint">
                      <th className="pb-2 pr-4 font-medium">#</th>
                      <th className="pb-2 pr-4 font-medium">Amount</th>
                      <th className="pb-2 pr-4 text-right font-medium">vs base</th>
                      <th className="pb-2 pr-4 text-right font-medium">Vel</th>
                      <th className="pb-2 pr-4 text-right font-medium">Risk</th>
                      <th className="pb-2 pr-4 font-medium">Hardened</th>
                      <th className="pb-2 font-medium">Legacy</th>
                    </tr>
                  </thead>
                  <tbody>
                    {run.records.map((r, i) => (
                      <tr
                        key={r.id}
                        onClick={() => setSelected(i)}
                        className={`cursor-pointer border-b border-line/60 transition-colors ${
                          i === selected ? "bg-signal/8" : "hover:bg-ink"
                        }`}
                      >
                        <td className="py-2.5 pr-4 font-mono text-bone-faint">{r.step}</td>
                        <td className="py-2.5 pr-4 font-mono font-semibold">${r.amount.toLocaleString()}</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-bone-dim">{r.amountRatio}x</td>
                        <td className="py-2.5 pr-4 text-right font-mono text-bone-dim">{r.velocity}</td>
                        <td className="py-2.5 pr-4 text-right font-mono font-semibold">{r.riskScore.toFixed(2)}</td>
                        <td className="py-2.5 pr-4"><Verdict action={r.action} /></td>
                        <td className="py-2.5"><Verdict action={r.legacyFlagged ? "FLAG" : "MISS"} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            {/* ── Why this payment scored ─────────────────────────── */}
            {active ? (
              <Panel
                title={`Why payment ${active.step} scored ${active.riskScore.toFixed(2)}`}
                description={active.explanation}
              >
                <div className="grid gap-6 lg:grid-cols-2">
                  <div>
                    <p className="mb-3 text-xs font-medium text-bone-faint uppercase tracking-wide">
                      Signal contributions
                    </p>
                    <div className="space-y-2">
                      {Object.entries(active.contributions).length === 0 ? (
                        <p className="text-xs text-bone-dim">No signal cleared its reporting floor.</p>
                      ) : (
                        Object.entries(active.contributions)
                          .sort((a, b) => b[1] - a[1])
                          .map(([k, v]) => (
                            <div key={k} className="flex items-center gap-3 text-xs">
                              <span className="w-32 shrink-0 capitalize text-bone-dim">
                                {k.replace(/_/g, " ")}
                              </span>
                              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-ink">
                                <span
                                  className="block h-full rounded-full bg-signal"
                                  style={{ width: `${Math.min(100, (v / 0.35) * 100)}%` }}
                                />
                              </span>
                              <span className="w-12 shrink-0 text-right font-mono font-semibold text-signal">
                                +{v.toFixed(2)}
                              </span>
                            </div>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <p className="mb-1.5 font-medium text-bone-faint uppercase tracking-wide">
                        Hardened scorer
                      </p>
                      <ul className="space-y-1 text-bone-dim">
                        {active.reasons.map((r) => <li key={r}>· {r}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="mb-1.5 font-medium text-bone-faint uppercase tracking-wide">
                        Legacy rules
                      </p>
                      <ul className="space-y-1 text-bone-dim">
                        {active.legacyReasons.map((r) => <li key={r}>· {r}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              </Panel>
            ) : null}
          </>
        ) : null}

        {/* ── Benchmark ───────────────────────────────────────────── */}
        <Panel
          title="Measured detector comparison"
          description="Both detectors run over one labelled corpus of synthetic fraud and legitimate traffic. These are the resulting confusion-matrix figures, computed per request."
          action={
            <button
              type="button"
              onClick={runBenchmark}
              disabled={benchBusy}
              className="flex items-center gap-2 rounded-lg border border-line bg-ink px-3.5 py-2 text-xs font-semibold hover:border-bone-faint disabled:opacity-50"
            >
              {benchBusy ? <><Spinner /> Evaluating</> : <><ArrowsClockwise size={14} weight="bold" /> {bench ? "Re-run" : "Run benchmark"}</>}
            </button>
          }
        >
          {bench ? (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Stat label="Legacy recall" value={pct(bench.legacy.recall)} note={`${bench.legacy.truePositives} of ${bench.legacy.truePositives + bench.legacy.falseNegatives} caught`} tone="fail" />
                <Stat label="Hardened recall" value={pct(bench.hardened.recall)} note={`${pct(bench.recallDelta)} better`} tone="signal" />
                <Stat label="Added false positives" value={pct(bench.frictionDelta, 2)} note={`legacy ${pct(bench.legacy.falsePositiveRate, 2)}, hardened ${pct(bench.hardened.falsePositiveRate, 2)}`} tone={bench.frictionDelta > 0 ? "warn" : "signal"} />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-line text-xs text-bone-faint">
                      <th className="pb-2 pr-4 font-medium">Detector</th>
                      <th className="pb-2 pr-4 text-right font-medium">Recall</th>
                      <th className="pb-2 pr-4 text-right font-medium">Precision</th>
                      <th className="pb-2 pr-4 text-right font-medium">F1</th>
                      <th className="pb-2 text-right font-medium">False positive rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[["Legacy static rules", bench.legacy], ["Hardened per-account scorer", bench.hardened]].map(
                      ([name, m]) => (
                        <tr key={name} className="border-b border-line/60">
                          <td className="py-2.5 pr-4 font-medium">{name}</td>
                          <td className="py-2.5 pr-4 text-right font-mono">{pct(m.recall)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono">{pct(m.precision)}</td>
                          <td className="py-2.5 pr-4 text-right font-mono">{pct(m.f1)}</td>
                          <td className="py-2.5 text-right font-mono">{pct(m.falsePositiveRate, 2)}</td>
                        </tr>
                      )
                    )}
                  </tbody>
                </table>
              </div>

              <p className="text-xs leading-relaxed text-bone-faint">
                Corpus: {bench.corpus.fraudulent.toLocaleString()} synthetic fraudulent and{" "}
                {bench.corpus.legitimate.toLocaleString()} legitimate payments, seed {bench.seed}.
                Legacy is {bench.provenance.legacy}. The flat rules almost never fire on ordinary
                traffic in this population, so the hardened scorer buys a large recall gain for a
                small amount of added friction rather than for free. Recovered value,{" "}
                {money(bench.recoveredValue)} of {money(bench.corpus.fraudValue)}, is fraud the
                hardened scorer stops and the flat rules do not, inside this corpus only. It is not
                a monthly projection.
              </p>
            </div>
          ) : (
            <p className="text-xs text-bone-dim">
              Run the benchmark to score several hundred payments through both detectors.
            </p>
          )}
        </Panel>
      </div>
    </Shell>
  );
}
