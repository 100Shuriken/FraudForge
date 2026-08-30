"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, MagnifyingGlass, CaretRight } from "@phosphor-icons/react";
import { Shell, Stat, PageHead, EmptyState, Footnote } from "@/components/shell";
import { CATEGORIES, VECTORS, TAXONOMY_STATS } from "@/lib/taxonomy";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

/**
 * Finding 12: pick the column count that leaves the cleanest final row.
 *
 * Category counts are 8, 4, 4, 6, 3, 3. On a fixed 3-column grid that is five
 * sections out of six ending on a half-empty row. Choosing between 3 and 4
 * columns per section clears every one of them: 8 and 4 divide by 4, 6 and 3
 * divide by 3. Ties prefer more columns, so density stays even.
 *
 * `.even-grid` also lets trailing cards grow, so a future count with no clean
 * divisor still fills its row rather than leaving a hole.
 */
function bestColumns(n) {
  if (n % 4 === 0) return 4; // 8, 4, 4 → two clean rows, one clean row
  if (n % 3 === 0) return 3; // 6, 3, 3 → clean
  // No clean divisor: take the layout with the fuller trailing row, and let
  // .even-grid stretch those cards across the remainder.
  return n % 4 >= n % 3 ? 4 : 3;
}

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

  const detail = VECTORS.find((v) => v.id === open) || null;
  const visibleCategories = CATEGORIES.filter((c) =>
    shown.some((v) => v.category === c.id)
  );

  return (
    <Shell>
      <div className="space-y-8">
        {/* Finding 18: the four counts belong to the tiles directly below, so
            the paragraph no longer repeats them. "28" was stated three times
            inside 400px — here, in the tile, and in "Showing 28 of 28". */}
        <PageHead kicker="Pillar 1 · Identify" title="The attack surface, mapped">
          Every GenAI-enabled payment fraud vector this system can actually
          generate, mapped by category, payment rail and attack surface. Each one
          carries the generator parameters that let the next pillar reproduce it,
          which is what makes this a working index rather than a list of ideas.
        </PageHead>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat emphasis label="Attack vectors" value={TAXONOMY_STATS.vectors}
            note="every one is generatable" tone="caught" />
          <Stat label="Categories" value={TAXONOMY_STATS.categories}
            note="channel and surface families" />
          <Stat label="Payment rails" value={TAXONOMY_STATS.rails.length}
            note="card, UPI, ACH, wire, wallet and more" />
          <Stat label="Attack surfaces" value={TAXONOMY_STATS.surfaces.length}
            note="voice, video, KYC, session, detector" />
        </div>

        {/* ── Filters ───────────────────────────────────────────────────── */}
        <div className="card p-5">
          <div className="grid gap-5 lg:grid-cols-12">
            <div className="lg:col-span-9">
              <p className="label mb-2.5">Filter by category</p>
              <ToggleGroup
                type="single"
                value={category}
                onValueChange={(v) => setCategory(v || "all")}
                className="flex flex-wrap justify-start gap-1.5"
              >
                <ToggleGroupItem value="all" className="rounded-sm border border-edge px-3">
                  All
                </ToggleGroupItem>
                {CATEGORIES.map((c) => (
                  <ToggleGroupItem
                    key={c.id}
                    value={c.id}
                    className="rounded-sm border border-edge px-3"
                  >
                    {c.label}
                  </ToggleGroupItem>
                ))}
              </ToggleGroup>
            </div>

            <div className="lg:col-span-3">
              <label htmlFor="rail" className="label mb-2.5 block">
                Filter by rail
              </label>
              <Select value={rail} onValueChange={setRail}>
                <SelectTrigger id="rail" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All rails</SelectItem>
                  {TAXONOMY_STATS.rails.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Only meaningful once something is actually filtered out. */}
          {shown.length < VECTORS.length ? (
            <p className="caption mt-4 border-t border-edge pt-3" aria-live="polite">
              Showing{" "}
              <span className="font-mono text-fg tabular-nums">{shown.length}</span> of{" "}
              <span className="font-mono tabular-nums">{VECTORS.length}</span> vectors
              <button
                type="button"
                onClick={() => { setCategory("all"); setRail("all"); }}
                className="ml-2 text-azure underline underline-offset-2"
              >
                Clear
              </button>
            </p>
          ) : null}
        </div>

        {/* ── Vectors ───────────────────────────────────────────────────── */}
        {shown.length === 0 ? (
          <EmptyState
            Icon={MagnifyingGlass}
            title="No vectors match those filters"
            action={
              <button
                type="button"
                className="btn"
                onClick={() => { setCategory("all"); setRail("all"); }}
              >
                Clear filters
              </button>
            }
          >
            Try a different rail, or widen the category back to all.
          </EmptyState>
        ) : (
          visibleCategories.map((c) => {
            const items = shown.filter((v) => v.category === c.id);
            return (
              <section key={c.id} className="space-y-4">
                {/* Category band. Carries the grouping so the 28 cards stop
                    reading as one undifferentiated wall. */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-l-2 border-azure/60 pl-4">
                  <h2 className="text-h2">{c.label}</h2>
                  <span className="caption font-mono tabular-nums">
                    {items.length} vector{items.length === 1 ? "" : "s"}
                  </span>
                  <p className="prose-measure w-full text-body-sm text-fg-subtle">
                    {c.blurb}
                  </p>
                </div>

                {/* The whole card is the affordance. The previous grid put an
                    identical full-width button on all 28 cards, which is the
                    repetition the critique flagged; the detail and the generate
                    action both live in the dialog instead. */}
                <div
                  className="even-grid"
                  style={{ "--cols": bestColumns(items.length) }}
                >
                  {items.map((v) => (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setOpen(v.id)}
                      aria-haspopup="dialog"
                      className="card group flex flex-col p-4 text-left transition-colors hover:border-azure/45 hover:bg-overlay/40"
                    >
                      <span className="flex items-start justify-between gap-3">
                        <span className="text-h3 transition-colors group-hover:text-azure">
                          {v.name}
                        </span>
                        <span className="caption shrink-0 rounded-sm bg-inset px-1.5 py-0.5">
                          {v.surface}
                        </span>
                      </span>

                      <span className="mt-2 flex flex-wrap gap-1">
                        {v.rails.map((r) => (
                          <span
                            key={r}
                            className="rounded-sm border border-edge px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle"
                          >
                            {r}
                          </span>
                        ))}
                      </span>

                      <span className="mt-3 text-body-sm text-fg-muted">{v.genai}</span>

                      {/* Finding 13: the standing cue that this card opens
                          something. Pinned to the bottom with mt-auto rather
                          than sat inline after the title, because at four
                          columns the longer names wrap and an inline caret
                          landed in the middle of them. Cards in a row stretch
                          to equal height, so the carets line up. */}
                      <span className="mt-auto flex items-center justify-end gap-1 pt-3 text-fg-subtle transition-colors group-hover:text-azure">
                        <span className="text-[11px] font-medium opacity-0 transition-opacity group-hover:opacity-100">
                          Detection signals
                        </span>
                        <CaretRight
                          size={12}
                          weight="bold"
                          aria-hidden
                          className="shrink-0 transition-transform group-hover:translate-x-0.5"
                        />
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            );
          })
        )}

        <Footnote>
          Every vector above is wired into the generator. Selecting one on the Generate
          pillar synthesises a payment sequence from these exact parameters and scores it,
          which is what keeps this index honest: nothing is listed here that the system
          cannot actually produce.
        </Footnote>
      </div>

      {/* Detail moved into a dialog. Expanding in place changed the card's
          height and reflowed the whole grid under the cursor. */}
      <Dialog open={!!detail} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-[540px]">
          {detail ? (
            <>
              <DialogHeader>
                <p className="overline">{detail.surface}</p>
                <DialogTitle className="text-h2">{detail.name}</DialogTitle>
                <DialogDescription className="text-body-sm text-fg-muted">
                  {detail.genai}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-5 pt-1">
                <div>
                  <p className="label mb-2">Payment rails</p>
                  <div className="flex flex-wrap gap-1">
                    {detail.rails.map((r) => (
                      <span
                        key={r}
                        className="rounded-sm border border-edge px-1.5 py-0.5 font-mono text-[10px] text-fg-subtle"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="label mb-2">What it leaves behind</p>
                  <ul className="space-y-1.5">
                    {detail.signals.map((s) => (
                      <li key={s} className="flex gap-2 text-body-sm text-fg-muted">
                        <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-magnitude" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <p className="label mb-2">Generator parameters</p>
                  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-sm border border-edge bg-edge">
                    {[
                      ["Amount", `${detail.gen.amount[0]}x – ${detail.gen.amount[1]}x`],
                      ["Velocity", `${detail.gen.velocity[0]} – ${detail.gen.velocity[1]}/hr`],
                      ["New payee", `p=${detail.gen.payee}`],
                      ["Cross-border", `p=${detail.gen.intl}`],
                      ["New device", `p=${detail.gen.device}`],
                      ["Sequence", `${detail.gen.steps} payments`],
                    ].map(([k, val]) => (
                      <div key={k} className="bg-inset px-3 py-2">
                        <dt className="caption">{k}</dt>
                        <dd className="mt-0.5 font-mono text-[12px] text-fg tabular-nums">
                          {val}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>

                <Link
                  href={`/generate?v=${detail.id}`}
                  className="btn btn-primary w-full"
                >
                  Generate this vector <ArrowRight size={13} weight="bold" />
                </Link>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
