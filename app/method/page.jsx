"use client";

import { Shell, Panel, PageHead, Footnote } from "@/components/shell";
import { TAXONOMY_STATS } from "@/lib/taxonomy";

const LOOP = [
  ["Identify", "Map the attack surface. 28 vectors across 6 categories, 17 rails and 24 surfaces, each carrying the generator parameters that make it reproducible."],
  ["Generate", "Synthesise a payment sequence shaped to the chosen vector against a specific account. Amounts and velocity interpolate across the sequence, so a burst front-loads risk and pacing back-loads it."],
  ["Score", "Run every step past two detectors: flat threshold rules, and a scorer grading each signal against the account's own baseline."],
  ["Mine", "Collect the payments that cleared the review line. Those false negatives are the training data."],
  ["Defend", "Fold the misses into training and re-measure on a held-out split that never changes, so rounds stay comparable."],
  ["Feed back", "Vectors that still evade become the next round's attack ideas, which closes the loop rather than ending it."],
];

const CLAIMS = [
  {
    title: "What is measured",
    tone: "signal",
    points: [
      "Every rate is computed from a confusion matrix at request time. Nothing on this site is a stored constant.",
      "The three training rounds share one fixed held-out split, so recall across rounds is directly comparable.",
      "Detection and evasion always total 100% because both derive from the same scored records.",
      "Seeds are printed wherever they matter. Pinning a seed reproduces a run exactly.",
    ],
  },
  {
    title: "What is not claimed",
    tone: "warn",
    points: [
      "All data is synthetic. No real customer, payment, account or institution is represented.",
      "The hardened scorer is a graded rule engine, not a deep model. Explainable by construction, which is the point, but not state of the art.",
      "Recovered value is measured inside one labelled corpus. It is not an annual saving and not a projection.",
      "The population is 10 accounts. Results would move on a real portfolio.",
    ],
  },
  {
    title: "Known weaknesses",
    tone: "fail",
    points: [
      "Targeted feature suppression scores near-zero detection. An attacker who holds every signal just under its own trigger defeats this scorer, and the sweep shows it rather than hiding it.",
      "The flat baseline almost never fires on ordinary traffic here, so the hardened scorer buys recall at a small friction cost, not for free.",
      "Precision falls as recall climbs across the training rounds. That trade is real and shown.",
      "The attack generator and the scorer share an author, so the generator is not an independent adversary.",
    ],
  },
];

const FEASIBILITY = [
  ["Where it would sit", "Shadow mode alongside an existing rule engine, scoring the same stream without touching authorisation, so disagreement can be measured before anything is enforced."],
  ["What it needs", "Per-account baselines: usual amount, cadence, device and payee history. Most processors already compute these for other purposes."],
  ["What breaks first", "Base rate. At realistic prevalence, precision collapses. The Sandbox demonstrates this directly, and it is the single most common way a fraud model looks strong in evaluation and fails in operation."],
  ["Why explainable matters", "Every score decomposes into named contributions. A step-up challenge a bank cannot justify to a regulator or a customer is not deployable, whatever its AUC."],
];

const STACK = [
  ["Scoring", "Graded rule engine. Each signal contributes proportionally to deviation from the account baseline."],
  ["Legacy baseline", "Static thresholds: amount over $5,000, or six payments per hour. No per-account context."],
  ["Defender model", "Logistic regression, gradient descent, class-weighted for the minority class, L2 regularised."],
  ["Evaluation", "Confusion matrix plus rank-based AUC, equivalent to the Mann-Whitney U statistic."],
  ["Determinism", "mulberry32 seeded PRNG. Every run reproducible from its printed seed."],
  ["Runtime", "Next.js route handlers. No Python, no external service, no database, no API keys."],
];

export default function Method() {
  return (
    <Shell>
      <div className="space-y-8">
        <PageHead kicker="Evidence" title="How it works, and what it does not claim"
          highlight="does not claim">
          The honest version. What the loop does step by step, which numbers are measured,
          where the approach is weak, and what deploying it would actually involve.
        </PageHead>

        {/* ── The loop, as a real numbered sequence ─────────────────────────
            The previous version faked progression with an inline
            paddingLeft: i * 1.1rem indent, which drifted the copy further
            right on every row and broke the reading column. */}
        <Panel title="The closed loop" description="The order the engine executes.">
          <ol className="relative space-y-0">
            {LOOP.map(([verb, body], i) => (
              <li key={verb} className="relative flex gap-4 pb-6 last:pb-0">
                {/* Connector rail */}
                {i < LOOP.length - 1 ? (
                  <span
                    aria-hidden
                    className="absolute top-8 bottom-0 left-[13px] w-px bg-edge"
                  />
                ) : null}
                <span className="relative z-1 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-signal/15 font-mono text-[12px] font-semibold text-signal">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 pt-0.5">
                  <h3 className="text-h3">{verb}</h3>
                  <p className="prose-measure mt-1.5 text-body text-fg-muted">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>

        {/* ── Claims. Three distinct treatments, because they say three
              different kinds of thing. ─────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-3">
          {CLAIMS.map((c) => {
            const accent =
              c.tone === "signal"
                ? { border: "border-caught/40", text: "text-caught", dot: "bg-caught" }
                : c.tone === "warn"
                  ? { border: "border-review/40", text: "text-review", dot: "bg-review" }
                  : { border: "border-evaded/40", text: "text-evaded", dot: "bg-evaded" };
            return (
              <section
                key={c.title}
                className={`card border ${accent.border} flex flex-col p-5`}
              >
                <h2 className={`text-h3 ${accent.text}`}>{c.title}</h2>
                <ul className="mt-4 space-y-3">
                  {c.points.map((p) => (
                    <li key={p} className="flex gap-2.5 text-body-sm text-fg-muted">
                      <span
                        aria-hidden
                        className={`mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full ${accent.dot}`}
                      />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>

        <Panel
          title="Real-world feasibility"
          description="What it would take to run this against live payments."
        >
          <div className="grid gap-3 md:grid-cols-2">
            {FEASIBILITY.map(([k, v]) => (
              <div key={k} className="well p-4">
                <p className="text-h3">{k}</p>
                <p className="mt-2 text-body-sm text-fg-muted">{v}</p>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Stack">
          <dl className="divide-y divide-edge">
            {STACK.map(([k, v]) => (
              <div key={k} className="grid gap-1 py-3.5 first:pt-0 last:pb-0 md:grid-cols-12 md:gap-6">
                <dt className="text-body-sm font-medium text-fg md:col-span-3">{k}</dt>
                <dd className="text-body-sm text-fg-muted md:col-span-9">{v}</dd>
              </div>
            ))}
          </dl>
          <Footnote className="mt-5">
            Taxonomy: {TAXONOMY_STATS.vectors} vectors, {TAXONOMY_STATS.rails.length} rails,{" "}
            {TAXONOMY_STATS.surfaces.length} surfaces. All generatable, all scored by the same
            engine.
          </Footnote>
        </Panel>
      </div>
    </Shell>
  );
}
