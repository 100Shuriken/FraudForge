"use client";

import { useState } from "react";
import { Verdict, VerdictLegend } from "./shell";
import { presentStates } from "@/lib/tone";

/**
 * Attack sequence.
 *
 * The thesis is unchanged and it is a good one: an attack is a sequence
 * advancing through time, and a flat table cannot show that a later payment is
 * deliberately quieter than an earlier one.
 *
 * The execution is what changed. The previous version rendered each payment on
 * a card rotated -14deg and pushed back along Z, which put every number on a
 * skewed plane and read worse than the table it replaced — and a
 * `:hover` rule reset all cards at once, so pointing at the chart made the
 * whole thing jump.
 *
 * This version keeps the sequence reading and makes it measurable:
 *
 *   · risk lane   — score 0..1 per payment, with the 0.50 review threshold
 *                   DRAWN across it. "It slipped under the bar" becomes
 *                   something you see rather than something you compute.
 *   · amount lane — payment size, so the shape of the ramp is visible.
 *   · verdict     — colour, always paired with a word, never colour alone.
 */

const REVIEW = 0.5;
const RISK_H = 104;
const AMOUNT_H = 44;

const toneFor = (r) =>
  r.flagged
    ? r.action === "BLOCK"
      ? { bar: "bg-caught", text: "text-caught" }
      : { bar: "bg-review", text: "text-review" }
    : { bar: "bg-evaded", text: "text-evaded" };

export function SpatialSequence({ records, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  if (!records?.length) return null;

  const amounts = records.map((r) => r.amount);
  const maxAmount = Math.max(...amounts);
  const minAmount = Math.min(...amounts);

  /* Risk domain fits the data instead of always spanning 0..1.
     A stealth sequence peaks around 0.25-0.45, so on a fixed 0..1 axis every
     bar sat in the bottom third and the review line — the entire point of the
     chart — was never approached. The domain always keeps headroom above the
     0.50 threshold so "it stayed under the line" remains legible, and the axis
     prints its own top value so the zoom is never implied. */
  const maxRisk = Math.max(...records.map((r) => r.riskScore));
  const domainMax = Math.min(1, Math.max(REVIEW * 1.2, maxRisk * 1.25));
  const zoomed = domainMax < 0.999;
  const y = (v) => (v / domainMax) * RISK_H;

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto">
        <div className="min-w-max">
          {/* ── Risk lane ─────────────────────────────────────────────── */}
          <div className="flex">
            {/* Axis */}
            <div
              className="relative w-9 shrink-0"
              style={{ height: RISK_H }}
              aria-hidden
            >
              <span className="caption absolute top-0 right-2 leading-none font-mono tabular-nums">
                {domainMax.toFixed(2)}
              </span>
              <span
                className="caption absolute right-2 leading-none font-mono tabular-nums"
                style={{ top: RISK_H - y(REVIEW) - 5 }}
              >
                {REVIEW.toFixed(2)}
              </span>
              <span className="caption absolute right-2 bottom-0 leading-none font-mono">
                0
              </span>
            </div>

            <div
              className="relative flex items-end gap-1.5 border-b border-edge"
              style={{ height: RISK_H }}
            >
              {/* The review line, drawn. This is the whole point of the chart. */}
              <div
                className="pointer-events-none absolute inset-x-0 z-1 border-t border-dashed border-fg-subtle/70"
                style={{ bottom: y(REVIEW) }}
              >
                <span className="caption absolute -top-4 right-0 bg-raised pl-1.5 text-fg-subtle">
                  review threshold
                </span>
              </div>

              {records.map((r, i) => {
                const isActive = i === selected;
                const isHover = i === hover;
                const tone = toneFor(r);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => onSelect?.(i)}
                    onMouseEnter={() => setHover(i)}
                    onMouseLeave={() => setHover(null)}
                    aria-label={`Payment ${r.step}, $${Math.round(
                      r.amount
                    ).toLocaleString()}, risk ${r.riskScore.toFixed(2)}, ${r.action}`}
                    aria-pressed={isActive}
                    className="group relative flex w-11 shrink-0 items-end justify-center rounded-t-sm transition-colors"
                    style={{ height: RISK_H }}
                  >
                    {/* Selection is chrome, so it stays quieter than the data
                        it marks. Previously a full-height azure column with a
                        ring, which made "you clicked here" the loudest mark on
                        a chart about fraud. Now: a hairline underline only. */}
                    <span
                      className={`absolute inset-0 rounded-t-sm transition-colors ${
                        isHover && !isActive ? "bg-overlay/40" : "bg-transparent"
                      }`}
                    />
                    <span
                      className={`relative w-5 rounded-t-[3px] transition-all duration-200 ${tone.bar} ${
                        isActive ? "" : "opacity-80 group-hover:opacity-100"
                      }`}
                      style={{ height: Math.max(3, y(r.riskScore)) }}
                    />
                    {isActive ? (
                      <span className="absolute inset-x-1.5 -bottom-px h-0.5 rounded-full bg-azure" />
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Amount strip ─────────────────────────────────────────────
                Was a mirrored bar lane scaled 0..max, pressed right against
                the risk baseline. Because an attack sequence deliberately
                keeps amounts uniform, every bar came out the same height: a
                second series that crowded the zero line and carried almost no
                information.

                Now a slim strip, set off from the axis, scaled across the
                run's OWN min..max so the ramp is actually visible, with the
                range printed so the zoom is not implied. */}
          <div className="mt-3 flex border-t border-edge/60 pt-2.5" data-amount-lane>
            <div className="w-9 shrink-0 pr-2 text-right">
              <span className="caption leading-none">amt</span>
            </div>
            <div className="flex items-end gap-1.5" style={{ height: AMOUNT_H }}>
              {records.map((r, i) => (
                <div
                  key={r.id}
                  className="flex w-11 shrink-0 items-end justify-center"
                  aria-hidden
                >
                  <span
                    className={`w-5 rounded-[2px] transition-colors ${
                      i === selected ? "bg-fg-subtle/80" : "bg-fg-subtle/35"
                    }`}
                    style={{
                      height:
                        maxAmount === minAmount
                          ? AMOUNT_H * 0.5
                          : 4 +
                            ((r.amount - minAmount) / (maxAmount - minAmount)) *
                              (AMOUNT_H - 4),
                    }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Step + verdict ────────────────────────────────────────── */}
          <div className="flex">
            <div className="w-9 shrink-0" />
            <div className="flex gap-1.5 pt-2.5">
              {records.map((r, i) => {
                const tone = toneFor(r);
                return (
                  <div key={r.id} className="w-11 shrink-0 text-center">
                    <p
                      className={`font-mono text-[11px] leading-none font-semibold tabular-nums ${
                        i === selected ? tone.text : "text-fg-muted"
                      }`}
                    >
                      {r.riskScore.toFixed(2)}
                    </p>
                    <p className="caption mt-1 leading-none">#{r.step}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-edge pt-3">
        <VerdictLegend states={presentStates(records)} />
        <p className="caption">
          Risk axis {zoomed ? (
            <>
              <span className="font-mono tabular-nums">0–{domainMax.toFixed(2)}</span>,
              fitted to this run
            </>
          ) : (
            <span className="font-mono tabular-nums">0–1.00</span>
          )}
          {" · "}Amount{" "}
          <span className="font-mono tabular-nums">
            ${Math.round(minAmount).toLocaleString()}–$
            {Math.round(maxAmount).toLocaleString()}
          </span>
          . Select a payment to inspect it.
        </p>
      </div>
    </div>
  );
}

/** Compact detail for the currently selected payment. */
export function SequenceDetail({ record }) {
  if (!record) return null;
  const tone = toneFor(record);
  return (
    <div className="well flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3">
      <span className="caption">
        Payment <span className="font-mono text-fg">#{record.step}</span>
      </span>
      <span className="caption">
        Amount{" "}
        <span className="font-mono text-fg tabular-nums">
          ${Math.round(record.amount).toLocaleString()}
        </span>{" "}
        <span className="text-fg-subtle">({record.amountRatio}x baseline)</span>
      </span>
      <span className="caption">
        Velocity{" "}
        <span className="font-mono text-fg tabular-nums">{record.velocity}/hr</span>
      </span>
      <span className="caption">
        Risk{" "}
        <span className={`font-mono font-semibold tabular-nums ${tone.text}`}>
          {record.riskScore.toFixed(2)}
        </span>
      </span>
      <Verdict action={record.action} />
    </div>
  );
}
