"use client";

import { useState } from "react";
import { Verdict } from "./shell";

/**
 * Spatial attack sequence.
 *
 * Depth here is doing real work: an attack is a sequence advancing through
 * time, and a flat table cannot show that a later payment is deliberately
 * quieter than an earlier one. Each card sits further back along the Z axis
 * in the order it was sent, so the shape of the attack is visible at a
 * glance before you read a single number.
 *
 * This is the ONLY place in the app that uses spatial depth. Everything else
 * is flat and brutalist by design.
 */
export function SpatialSequence({ records, selected, onSelect }) {
  const [hover, setHover] = useState(null);
  if (!records?.length) return null;

  const maxAmount = Math.max(...records.map((r) => r.amount));

  return (
    <div className="spatial-stage overflow-x-auto pb-4">
      <div className="flex min-w-max items-end gap-2 px-1 pt-8">
        {records.map((r, i) => {
          const isActive = i === selected;
          const isHover = i === hover;
          const lift = isActive || isHover;
          // Later payments sit further back. Active card comes forward.
          const z = lift ? 40 : -i * 12;
          const rot = lift ? 0 : -14;
          const y = lift ? -8 : 0;
          const height = 60 + (r.amount / maxAmount) * 120;

          const tone = r.flagged
            ? r.action === "BLOCK"
              ? "border-signal"
              : "border-warn"
            : "border-fail";

          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onSelect?.(i)}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              aria-label={`Payment ${r.step}, risk ${r.riskScore.toFixed(2)}, ${r.action}`}
              aria-pressed={isActive}
              className={`spatial-card slab w-[104px] shrink-0 cursor-pointer p-2.5 text-left ${tone} ${
                isActive ? "bg-ink-high" : "bg-ink-raised"
              }`}
              style={{
                transform: `perspective(1400px) translateZ(${z}px) translateY(${y}px) rotateY(${rot}deg)`,
                boxShadow: lift ? "6px 6px 0 0 rgba(0,0,0,0.55)" : "3px 3px 0 0 rgba(0,0,0,0.4)",
              }}
            >
              <span className="tag block">#{r.step}</span>
              <span className="mt-2 block font-mono text-[13px] leading-none font-bold">
                ${Math.round(r.amount).toLocaleString()}
              </span>
              <span className="mt-1 block font-mono text-[10px] text-bone-faint">
                {r.amountRatio}x · {r.velocity}/hr
              </span>

              {/* Amount as physical height, so the sequence shape is readable. */}
              <span
                className={`mt-2.5 block w-full ${
                  r.flagged ? (r.action === "BLOCK" ? "bg-signal" : "bg-warn") : "bg-fail"
                }`}
                style={{ height: `${height / 12}px` }}
              />

              <span className="mt-2.5 block font-mono text-[15px] leading-none font-bold">
                {r.riskScore.toFixed(2)}
              </span>
              <span className="mt-2 block">
                <Verdict action={r.action} />
              </span>
            </button>
          );
        })}
      </div>

      <p className="tag mt-3 px-1">
        Depth is sequence order. Height is amount. Colour is the verdict. Click a payment to inspect it.
      </p>
    </div>
  );
}
