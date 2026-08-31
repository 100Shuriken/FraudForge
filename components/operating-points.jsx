"use client";

import { useState } from "react";
import { Panel } from "@/components/shell";
import { rateTone } from "@/lib/tone";
import data from "@/lib/operating-points.json";

const pct = (x, dp = 2) => `${(x * 100).toFixed(dp)}%`;

/**
 * Thousands separators, without Number.prototype.toLocaleString.
 *
 * This section is server-rendered, and toLocaleString follows the host locale:
 * Node here groups Indian-style (2,00,000) while the browser produced 200,000,
 * so every grouped number was a hydration mismatch (React error #418). A fixed
 * grouping is identical on both sides by construction.
 */
const num = (n) => String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/* Tailwind's scanner only sees literal class names, so a tone has to resolve
   to one of these rather than being interpolated into `text-${tone}`. */
const TONE = { caught: "text-caught", review: "text-review", evaded: "text-evaded" };
const toneClass = (t) => TONE[t] || "text-fg";

/**
 * What the false-positive rate actually is, and what it costs at a real base
 * rate.
 *
 * Two things were wrong with how this product reported friction, and both
 * flattered it.
 *
 * The first is sample size. The benchmark measures its false-positive rate on
 * 300 legitimate payments. One false positive in 300 reads as 0.33%, and that
 * number went into the product and the write-up — but the 95% Wilson interval
 * on it runs from 0.06% to 1.86%. It cannot resolve the quantity it reports.
 * Measured on 200,000 legitimate payments the rate is roughly twice that, and
 * the interval is narrow enough to plan against.
 *
 * The second is base rate. The benchmark corpus is about half fraud, so its
 * precision figure describes a world where every other payment is an attack.
 * Real fraud runs well under 1% of authorisations, and at that base rate the
 * same detector at the same threshold is right about a third of the time.
 * Nothing about the model changed; only the arithmetic an operator has to do.
 *
 * This still measures a synthetic legitimate distribution. That limit does not
 * go away, and the panel says so rather than letting the precision of the
 * interval imply a precision about production that is not there.
 */
export default function OperatingPoints() {
  const [base, setBase] = useState(0.005);
  const at = data.sweep.find((s) => s.t === data.reviewThreshold);
  const shipped = at.atBase.find((b) => b.base === base);

  return (
    <div className="space-y-4">
      <Panel
        title="What the false-positive rate really is"
        description={`Measured on ${num(data.legitimate)} legitimate payments, not 300.`}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-white/10 bg-inset/50 p-4">
            <p className="overline">Measured on 300 samples</p>
            <p className="mt-1 font-mono text-[26px] leading-none font-semibold text-fg-muted tabular-nums">
              {pct(data.smallSample.rate)}
            </p>
            <p className="caption mt-2">
              1 false positive in 300. The 95% interval runs{" "}
              <span className="font-mono text-fg-muted">
                {pct(data.smallSample.lo)} – {pct(data.smallSample.hi)}
              </span>{" "}
              — a 30-fold range. This estimate could not resolve what it was
              reporting.
            </p>
          </div>

          <div className="rounded-lg border border-signal/40 bg-signal/[0.07] p-4">
            <p className="overline text-signal-text">
              Measured on {num(data.legitimate)} samples
            </p>
            <p className="mt-1 font-mono text-[26px] leading-none font-semibold text-fg tabular-nums">
              {pct(at.fpr)}
            </p>
            <p className="caption mt-2">
              95% interval{" "}
              <span className="font-mono text-fg-muted">
                {pct(at.fprLo)} – {pct(at.fprHi)}
              </span>
              . Roughly double the small-sample estimate, and narrow enough to
              budget against.
            </p>
          </div>
        </div>

        <p className="caption border-t border-white/10 pt-3">
          Almost all of it is step-up, not decline: the legitimate score
          distribution has p99.9 at{" "}
          <span className="font-mono text-fg-muted">{data.legitimateScores.p999}</span>{" "}
          against a block threshold of{" "}
          <span className="font-mono text-fg-muted">{data.blockThreshold}</span>, so
          a legitimate payment is asked for a second factor far more often than
          it is refused. The legacy rules sit at{" "}
          <span className="font-mono text-fg-muted">{pct(data.legacy.fpr)}</span> on
          the same traffic.
        </p>
      </Panel>

      <Panel
        title="What it costs at a real fraud base rate"
        description="The benchmark corpus is half fraud. Production is not."
        action={
          <div className="flex gap-1.5">
            {data.baseRates.map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBase(b)}
                className={`btn btn-sm ${base === b ? "btn-primary" : ""}`}
              >
                {(b * 100).toFixed(b < 0.001 ? 2 : b < 0.01 ? 1 : 0)}%
              </button>
            ))}
          </div>
        }
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Recall", pct(at.recall), rateTone(at.recall)],
            ["Precision", pct(shipped.precision), rateTone(shipped.precision)],
            ["Alerts / million", num(shipped.alertsPerMillion), null],
            ["…of which real", num(shipped.truePerMillion), null],
          ].map(([label, value, tone]) => (
            <div
              key={label}
              className="rounded-lg border border-white/10 bg-inset/50 px-3.5 py-3"
            >
              <p className="caption">{label}</p>
              <p
                className={`mt-1 font-mono text-[20px] leading-none font-semibold tabular-nums ${toneClass(
                  tone
                )}`}
              >
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="caption border-t border-white/10 pt-3">
          At a {(base * 100).toFixed(base < 0.01 ? 2 : 0)}% base rate the
          detector raises {num(shipped.alertsPerMillion)} alerts per
          million payments and {num(shipped.truePerMillion)} of them
          are fraud. The 99% precision the half-and-half benchmark reports is
          true of that corpus and misleading about a payment rail.
        </p>
      </Panel>

      <Panel
        title="Choosing an operating point"
        description={`Review threshold against recall, friction and precision at a ${(base * 100).toFixed(base < 0.01 ? 2 : 0)}% base rate. The shipped default is ${data.reviewThreshold}.`}
      >
        <div className="overflow-x-auto">
          <table className="w-full text-body-sm">
            <thead>
              <tr className="border-b border-white/10 text-left">
                {[
                  ["Threshold", ""],
                  ["Recall", ""],
                  ["False positives", ""],
                  ["95% interval", "hidden sm:table-cell"],
                  ["Precision", ""],
                  ["Alerts / M", ""],
                ].map(([h, cls]) => (
                  <th key={h} className={`caption py-1.5 pr-3 sm:pr-4 font-medium ${cls}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.sweep.map((s) => {
                const b = s.atBase.find((x) => x.base === base);
                const here = s.t === data.reviewThreshold;
                return (
                  <tr
                    key={s.t}
                    className={`border-b border-white/[0.06] ${
                      here ? "bg-signal/[0.07]" : ""
                    }`}
                  >
                    <td className="py-1.5 pr-3 sm:pr-4 font-mono tabular-nums">
                      {s.t.toFixed(2)}
                      {here ? (
                        <span className="ml-2 caption text-signal-text">shipped</span>
                      ) : null}
                    </td>
                    <td className={`py-1.5 pr-3 sm:pr-4 font-mono tabular-nums ${toneClass(rateTone(s.recall))}`}>
                      {pct(s.recall)}
                    </td>
                    <td className="py-1.5 pr-3 sm:pr-4 font-mono tabular-nums text-fg-muted">
                      {pct(s.fpr, 3)}
                    </td>
                    <td className="hidden py-1.5 pr-3 sm:pr-4 font-mono text-[11px] tabular-nums text-fg-subtle sm:table-cell">
                      {pct(s.fprLo, 3)} – {pct(s.fprHi, 3)}
                    </td>
                    <td className={`py-1.5 pr-3 sm:pr-4 font-mono tabular-nums ${toneClass(rateTone(b.precision))}`}>
                      {pct(b.precision, 1)}
                    </td>
                    <td className="py-1.5 pr-3 sm:pr-4 font-mono tabular-nums text-fg-muted">
                      {num(b.alertsPerMillion)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="caption border-t border-white/10 pt-3">
          The threshold is the lever, and it is not free in either direction.
          Moving review from 0.50 to 0.60 cuts false positives roughly ninefold
          and takes precision from {pct(at.atBase.find((b) => b.base === base).precision, 0)} to{" "}
          {pct(
            data.sweep.find((s) => s.t === 0.6).atBase.find((b) => b.base === base).precision,
            0
          )}
          , and gives up{" "}
          {pct(at.recall - data.sweep.find((s) => s.t === 0.6).recall, 0)} of recall
          to do it. Which row is right is a business decision about the cost of
          friction against the cost of loss.
        </p>
      </Panel>

      <p className="caption">
        Still measured on synthetic legitimate traffic generated from the
        10-account population, at seed{" "}
        <span className="font-mono">{data.seed}</span>. Sample size and base-rate
        arithmetic are fixed; the distribution is not real. Confirming these
        numbers needs labelled historical authorisations, and the legitimate
        distribution is the part most likely to move.
      </p>
    </div>
  );
}
