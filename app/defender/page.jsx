"use client";

import { useState } from "react";
import { Play, ShieldCheck, TrendUp, TrendDown } from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, Spinner, ErrorNote, PageHead, PageHero, Bar, Footnote,
  EmptyState, StatSkeleton, Hint, DEFS, pct,
} from "@/components/shell";
import { NumberTicker, BorderBeam, BlurFade } from "@/components/magic";
import { CardSpotlight } from "@/components/aceternity";
import { rateTone, costTone } from "@/lib/tone";

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
      <div className="space-y-8">
        <ErrorNote>{error}</ErrorNote>

        <PageHero>
          <PageHead
            kicker="Pillar 3 · Defend"
            title="The misses become the training data"
            highlight="training data"
            action={
              <button
                type="button"
                onClick={run}
                disabled={busy}
                aria-busy={busy}
                className="btn btn-primary"
              >
                {busy ? (
                  <><Spinner /> Training</>
                ) : (
                  <><Play size={14} weight="fill" /> {result ? "Run again" : "Run three rounds"}</>
                )}
              </button>
            }
          >
            A class-weighted logistic regression trained three times. Each pass mines the
            payments the previous model let through and retrains on them, measured against a
            held-out split that never changes so the rounds stay comparable. Every run draws
            a fresh seed.
          </PageHead>
        </PageHero>

        {busy && !result ? <StatSkeleton /> : null}

        {result ? (
          <div aria-live="polite" className="space-y-8">
            {/* ── MOTION MOMENT 3 · the result lands ─────────────────────
                One card, one beam, one ticker. The recall gain is the entire
                argument of this page, so it gets the emphasis and nothing
                else on the page does. */}
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="card-accent card relative overflow-hidden p-5">
                <BorderBeam />
                <div className="flex items-center gap-1.5">
                  <p className="label">Final recall</p>
                  <Hint>{DEFS.recall}</Hint>
                </div>
                {/* Banded by value. Three rounds that only reached 63% must not
                    render as a success just because it is the final number. */}
                <p className={`mt-2 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                  { caught: "text-caught", review: "text-review", evaded: "text-evaded" }[rateTone(last.recall)]
                }`}>
                  <NumberTicker value={last.recall * 100} decimalPlaces={1} suffix="%" />
                </p>
                {/* Direction follows the sign. Every run draws a fresh seed, so
                    a round can lose recall; the old line rendered a green up
                    arrow and the word "gained" regardless, which is the same
                    colour-by-category fault the rule exists to prevent. */}
                <p className="caption mt-2 flex items-center gap-1">
                  {result.improvement.recall >= 0 ? (
                    <TrendUp size={12} weight="bold" className="text-caught" />
                  ) : (
                    <TrendDown size={12} weight="bold" className="text-evaded" />
                  )}
                  {pct(Math.abs(result.improvement.recall))}{" "}
                  {result.improvement.recall >= 0 ? "gained" : "lost"} over three rounds
                </p>
              </div>

              <Stat label="Starting recall" value={pct(first.recall)}
                note="ordinary fraud only" tone={rateTone(first.recall)} />
              <Stat label="Precision cost" value={pct(result.improvement.precision)}
                note={`${pct(first.precision)} → ${pct(last.precision)}`}
                tone={costTone(Math.abs(result.improvement.precision), { warn: 0.02, bad: 0.15 })}
                hint={DEFS.precision} />
              <Stat label="Still evading" value={result.stillEvading}
                note="in the held-out split"
                tone={costTone(result.stillEvading, { warn: 1, bad: 40 })} />
            </div>

            {/* ── Rounds as a progression, not a flat table ─────────────── */}
            <Panel
              title="Round by round"
              description="One fixed test split across all three rounds, so the numbers are directly comparable."
            >
              <div className="space-y-2.5">
                {rounds.map((r, i) => {
                  const prev = rounds[i - 1];
                  const delta = prev ? r.recall - prev.recall : null;
                  return (
                    <BlurFade key={r.round} delay={i * 0.07}>
                    <CardSpotlight className="rounded-lg">
                    <div
                      className={`corner-node relative z-1 rounded-lg border p-5 ${
                        i === rounds.length - 1
                          ? "border-signal/40 bg-signal/[0.04]"
                          : "border-white/10 bg-inset"
                      }`}
                    >
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <span
                          className={`grid h-6 w-6 shrink-0 place-items-center rounded-full font-mono text-[11px] font-semibold ${
                            i === rounds.length - 1
                              ? "bg-signal/18 text-signal"
                              : "bg-overlay text-fg-muted"
                          }`}
                        >
                          {i + 1}
                        </span>
                        <span className="text-h3">{r.name}</span>

                        <span className="ml-auto flex flex-wrap items-center gap-x-5 gap-y-1">
                          <span className="flex items-baseline gap-1.5">
                            <span className="caption">recall</span>
                            <span className={`font-mono text-[17px] font-semibold tabular-nums ${
                              { caught: "text-caught", review: "text-review", evaded: "text-evaded" }[rateTone(r.recall)]
                            }`}>
                              {pct(r.recall)}
                            </span>
                            {delta !== null ? (
                              <span className={`font-mono text-[11px] tabular-nums ${delta >= 0 ? "text-caught" : "text-evaded"}`}>
                                +{(delta * 100).toFixed(1)}
                              </span>
                            ) : null}
                          </span>
                          {[
                            ["precision", pct(r.precision)],
                            ["F1", pct(r.f1)],
                            ["AUC", r.auc.toFixed(3)],
                            ["mined", r.mined || "—"],
                          ].map(([k, v]) => (
                            <span key={k} className="flex items-baseline gap-1.5">
                              <span className="caption">{k}</span>
                              <span className="font-mono text-[13px] text-fg-muted tabular-nums">
                                {v}
                              </span>
                            </span>
                          ))}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center gap-3">
                        <Bar value={r.recall} tone={rateTone(r.recall)} />
                        <span className="caption w-12 shrink-0 text-right font-mono tabular-nums">
                          {pct(r.recall, 0)}
                        </span>
                      </div>

                      <p className="mt-2.5 text-body-sm text-fg-subtle">{r.description}</p>
                    </div>
                    </CardSpotlight>
                    </BlurFade>
                  );
                })}
              </div>
            </Panel>

            <div className="grid gap-4 lg:grid-cols-2">
              <Panel
                title="What the final model leans on"
                description="Normalised absolute weights."
              >
                <div className="space-y-2.5">
                  {Object.entries(result.featureImportance)
                    .sort((a, b) => b[1] - a[1])
                    .map(([k, v], i) => (
                      <div key={k} className="flex items-center gap-3 text-body-sm">
                        <span
                          className={`w-44 shrink-0 ${
                            i === 0 ? "font-medium text-fg" : "text-fg-muted"
                          }`}
                        >
                          {result.featureLabels[k]}
                        </span>
                        {/* Data bar, so it stays in the data palette. The top
                            feature is distinguished by weight, not by borrowing
                            a chrome colour — see the scope rule in DESIGN.md. */}
                        <Bar value={v} max={0.4} tone="caught" />
                        <span className="w-12 shrink-0 text-right font-mono text-[12px] font-semibold tabular-nums">
                          {v.toFixed(3)}
                        </span>
                      </div>
                    ))}
                </div>
              </Panel>

              <Panel
                title="Where the attacker goes next"
                description="Derived from the payments that still evade the final model."
              >
                <div className="relative flex h-full flex-col justify-center overflow-hidden rounded-lg border border-flame/40 bg-flame/[0.06] p-6">
                  <BorderBeam colorFrom="var(--color-flame)" colorTo="var(--color-gold)" />
                  <p className="overline mb-3 text-flame">Next move</p>
                  <p className="prose-measure text-body text-fg-muted">
                    {result.evasionAdvice}
                  </p>
                </div>
              </Panel>
            </div>

            <Footnote>
              {result.provenance.model}. Decision threshold {result.provenance.threshold}.{" "}
              {result.provenance.note} Corpus: {result.corpus.legitimate} legitimate,{" "}
              {result.corpus.easyFraud + result.corpus.evasiveFraud + result.corpus.hardFraud}{" "}
              fraudulent. Seed {result.seed}, drawn fresh each run. All data synthetic.
            </Footnote>
          </div>
        ) : (
          !busy && (
            <EmptyState
              Icon={ShieldCheck}
              title="No training run yet"
              action={
                <button type="button" onClick={run} className="btn btn-primary">
                  <Play size={14} weight="fill" /> Run three rounds
                </button>
              }
            >
              Three passes of adversarial retraining against a fixed held-out split. Each
              run draws a fresh seed, so the numbers move between runs.
            </EmptyState>
          )
        )}
      </div>
    </Shell>
  );
}
