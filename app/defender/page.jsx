"use client";

import { useState } from "react";
import { Play } from "@phosphor-icons/react";
import { Shell, Panel, Stat, Spinner, ErrorNote, PageHead, Bar, pct } from "@/components/shell";

export default function Defender() {
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/train", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`Training failed, HTTP ${res.status}`);
      setResult(await res.json());
    } catch (e) {
      setResult(null);
      setError(e?.message || String(e));
    } finally {
      setBusy(false);
    }
  };

  const rounds = result?.rounds || [];
  const first = rounds[0];
  const last = rounds[rounds.length - 1];

  return (
    <Shell>
      <div className="space-y-6">
        <ErrorNote>{error}</ErrorNote>

        <PageHead
          kicker="Pillar 3 · Defend"
          title="The misses become the training data"
          action={
            <button type="button" onClick={run} disabled={busy} className="btn btn-primary">
              {busy ? <><Spinner /> Training</> : <><Play size={14} weight="fill" /> Run three rounds</>}
            </button>
          }
        >
          A class-weighted logistic regression trained three times. Each pass mines the payments
          the previous model let through and retrains on them, measured against a held-out split
          that never changes so the rounds stay comparable. Every run draws a fresh seed.
        </PageHead>

        {result ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat label="Starting recall" value={pct(first.recall)} note="ordinary fraud only" tone="fail" />
              <Stat label="Final recall" value={pct(last.recall)} note={`${pct(result.improvement.recall)} gained`} tone="signal" />
              <Stat label="Precision cost" value={pct(result.improvement.precision)} note={`${pct(first.precision)} to ${pct(last.precision)}`} tone="warn" />
              <Stat label="Still evading" value={result.stillEvading} note="in the held-out split" />
            </div>

            <Panel title="Round by round" description="One fixed test split across all three rounds.">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[760px] text-left text-sm">
                  <thead>
                    <tr className="border-b-2 border-line">
                      <th className="tag pr-4 pb-2">Pass</th>
                      <th className="tag pr-4 pb-2 text-right">Recall</th>
                      <th className="tag pr-4 pb-2 text-right">Precision</th>
                      <th className="tag pr-4 pb-2 text-right">F1</th>
                      <th className="tag pr-4 pb-2 text-right">AUC</th>
                      <th className="tag pr-4 pb-2 text-right">Mined</th>
                      <th className="tag pb-2">What changed</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rounds.map((r) => (
                      <tr key={r.round} className="border-b border-line/60 align-top">
                        <td className="py-3 pr-4 font-medium">{r.name}</td>
                        <td className="py-3 pr-4 text-right font-mono font-bold text-signal">{pct(r.recall)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-bone-dim">{pct(r.precision)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-bone-dim">{pct(r.f1)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-bone-dim">{r.auc.toFixed(3)}</td>
                        <td className="py-3 pr-4 text-right font-mono text-bone-dim">{r.mined || "-"}</td>
                        <td className="py-3 max-w-[38ch] text-xs leading-relaxed text-bone-dim">{r.description}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel title="What the final model leans on" description="Normalised absolute weights.">
                <div className="space-y-2.5">
                  {Object.entries(result.featureImportance)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v]) => (
                      <div key={k} className="flex items-center gap-3 text-xs">
                        <span className="w-44 shrink-0 text-bone-dim">{result.featureLabels[k]}</span>
                        <Bar value={v} max={0.4} />
                        <span className="w-12 shrink-0 text-right font-mono font-bold">{v.toFixed(3)}</span>
                      </div>
                    ))}
                </div>
              </Panel>

              <Panel title="Where the attacker goes next" description="Derived from the payments that still evade the final model.">
                <p className="text-sm leading-relaxed text-bone-dim">{result.evasionAdvice}</p>
              </Panel>
            </div>

            <p className="rule pt-4 font-mono text-[10px] leading-relaxed text-bone-faint">
              {result.provenance.model}. Decision threshold {result.provenance.threshold}.{" "}
              {result.provenance.note} Corpus: {result.corpus.legitimate} legitimate,{" "}
              {result.corpus.easyFraud + result.corpus.evasiveFraud + result.corpus.hardFraud} fraudulent.
              Seed {result.seed}, drawn fresh each run. All data synthetic.
            </p>
          </>
        ) : (
          !busy && (
            <div className="slab border-dashed p-12 text-center">
              <p className="font-mono text-sm font-bold">No training run yet</p>
              <p className="mt-1.5 text-xs text-bone-dim">
                Each run draws a fresh seed, so the numbers move between runs.
              </p>
            </div>
          )
        )}
      </div>
    </Shell>
  );
}
