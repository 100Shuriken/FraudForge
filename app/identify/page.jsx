"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { Shell, Panel, Stat, PageHead, ErrorNote } from "@/components/shell";
import { CATEGORIES, VECTORS, TAXONOMY_STATS } from "@/lib/taxonomy";

export default function Identify() {
  const [category, setCategory] = useState("all");
  const [rail, setRail] = useState("all");
  const [open, setOpen] = useState(null);

  const shown = useMemo(
    () =>
      VECTORS.filter(
        (v) =>
          (category === "all" || v.category === category) &&
          (rail === "all" || v.rails.includes(rail))
      ),
    [category, rail]
  );

  return (
    <Shell>
      <div className="space-y-6">
        <PageHead
          kicker="Pillar 1 · Identify"
          title="The attack surface, mapped"
        >
          {TAXONOMY_STATS.vectors} distinct GenAI-enabled payment fraud vectors across{" "}
          {TAXONOMY_STATS.categories} categories, {TAXONOMY_STATS.rails.length} payment rails and{" "}
          {TAXONOMY_STATS.surfaces.length} attack surfaces. Every vector carries the generator
          parameters that let the next pillar reproduce it, so this is a working index rather
          than a list of ideas.
        </PageHead>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat label="Attack vectors" value={TAXONOMY_STATS.vectors} note="all generatable" tone="signal" />
          <Stat label="Categories" value={TAXONOMY_STATS.categories} note="channel and surface families" />
          <Stat label="Payment rails" value={TAXONOMY_STATS.rails.length} note="card, UPI, ACH, wire, wallet and more" />
          <Stat label="Attack surfaces" value={TAXONOMY_STATS.surfaces.length} note="voice, video, KYC, session, detector" />
        </div>

        {/* ── Filters ─────────────────────────────────────────────── */}
        <div className="slab p-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div>
              <p className="tag mb-2">Filter by category</p>
              <div className="flex flex-wrap gap-1.5">
                <button type="button" onClick={() => setCategory("all")}
                  className={`btn !px-2.5 !py-1.5 ${category === "all" ? "btn-primary" : ""}`}>
                  All
                </button>
                {CATEGORIES.map((c) => (
                  <button key={c.id} type="button" onClick={() => setCategory(c.id)}
                    className={`btn !px-2.5 !py-1.5 ${category === c.id ? "btn-primary" : ""}`}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="tag mb-2">Filter by rail</p>
              <select value={rail} onChange={(e) => setRail(e.target.value)} className="field">
                <option value="all">All rails</option>
                {TAXONOMY_STATS.rails.map((r) => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <p className="tag mt-3">
            Showing {shown.length} of {VECTORS.length}
          </p>
        </div>

        {/* ── Vectors ─────────────────────────────────────────────── */}
        {CATEGORIES.filter((c) => shown.some((v) => v.category === c.id)).map((c) => (
          <section key={c.id} className="space-y-3">
            <div className="rule pt-4">
              <h2 className="font-mono text-sm font-bold tracking-wide uppercase text-signal">{c.label}</h2>
              <p className="mt-1 max-w-[80ch] text-xs leading-relaxed text-bone-dim">{c.blurb}</p>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shown.filter((v) => v.category === c.id).map((v) => {
                const isOpen = open === v.id;
                return (
                  <article key={v.id} className={`slab flex flex-col p-4 ${isOpen ? "slab-accent" : ""}`}>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-sm font-bold tracking-tight">{v.name}</h3>
                      <span className="tag shrink-0">{v.surface}</span>
                    </div>

                    <div className="mt-2 flex flex-wrap gap-1">
                      {v.rails.map((r) => (
                        <span key={r} className="border border-line px-1.5 py-0.5 font-mono text-[9px] text-bone-faint">
                          {r}
                        </span>
                      ))}
                    </div>

                    <p className="mt-3 flex-1 text-xs leading-relaxed text-bone-dim">{v.genai}</p>

                    <button type="button" onClick={() => setOpen(isOpen ? null : v.id)}
                      className="btn mt-3 w-full !py-1.5">
                      {isOpen ? "Hide signals" : "Detection signals"}
                    </button>

                    {isOpen ? (
                      <div className="mt-3 space-y-3 border-t-2 border-line pt-3">
                        <div>
                          <p className="tag mb-1.5">What it leaves behind</p>
                          <ul className="space-y-1">
                            {v.signals.map((s) => (
                              <li key={s} className="text-[11px] leading-relaxed text-bone-dim">· {s}</li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="tag mb-1.5">Generator parameters</p>
                          <dl className="grid grid-cols-2 gap-1 font-mono text-[10px] text-bone-dim">
                            <div>amount {v.gen.amount[0]}x to {v.gen.amount[1]}x</div>
                            <div>velocity {v.gen.velocity[0]} to {v.gen.velocity[1]}/hr</div>
                            <div>new payee p={v.gen.payee}</div>
                            <div>cross-border p={v.gen.intl}</div>
                            <div>new device p={v.gen.device}</div>
                            <div>{v.gen.steps} payments</div>
                          </dl>
                        </div>
                        <Link href={`/generate?v=${v.id}`}
                          className="btn btn-primary w-full !py-1.5">
                          Generate this <ArrowRight size={12} weight="bold" />
                        </Link>
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>
          </section>
        ))}

        <p className="rule pt-4 font-mono text-[10px] leading-relaxed text-bone-faint">
          Every vector above is wired into the generator. Selecting one on the Generate pillar
          synthesises a payment sequence from these exact parameters and scores it, which is
          what keeps this index honest: nothing is listed here that the system cannot actually
          produce.
        </p>
      </div>
    </Shell>
  );
}
