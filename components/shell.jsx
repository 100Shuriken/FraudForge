"use client";

import { createContext, useContext } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair,
  MagnifyingGlass,
  Lightning,
  ShieldCheck,
  SlidersHorizontal,
  FileText,
  Notebook,
  Brain,
  Info,
} from "@phosphor-icons/react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Spotlight, SparklesCore } from "@/components/aceternity";

/* Navigation is grouped so the rail reads as a process, not a flat list. The
   old second line on every item ("Pillar 1", "Analysis", "Evidence") exposed an
   internal taxonomy as navigation; the grouping carries that meaning instead. */
const NAV = [
  {
    group: "Loop",
    items: [{ href: "/", label: "Cockpit", Icon: Crosshair }],
  },
  {
    group: "Pillars",
    items: [
      { href: "/identify", label: "Identify", Icon: MagnifyingGlass },
      { href: "/generate", label: "Generate", Icon: Lightning },
      { href: "/defender", label: "Defend", Icon: ShieldCheck },
    ],
  },
  {
    group: "Blue team",
    items: [{ href: "/lab", label: "Defense Lab", Icon: Brain }],
  },
  {
    group: "Evidence",
    items: [
      { href: "/sandbox", label: "Sandbox", Icon: SlidersHorizontal },
      { href: "/report", label: "Report", Icon: FileText },
      { href: "/method", label: "Method", Icon: Notebook },
    ],
  },
];

const FLAT = NAV.flatMap((g) => g.items);

export function Shell({ children }) {
  const path = usePathname();
  const current = FLAT.find((n) => n.href === path);

  return (
    <TooltipProvider delayDuration={200}>
      <a href="#main" className="skip-link">
        Skip to content
      </a>

      <div className="min-h-[100dvh] lg:flex">
        {/* ── Rail ───────────────────────────────────────────────────── */}
        <aside className="chrome sticky top-0 z-40 hidden h-[100dvh] w-60 shrink-0 flex-col border-r border-edge lg:flex">
          <Link
            href="/"
            className="flex items-center gap-2.5 border-b border-edge px-5 py-4"
          >
            <Mark />
            <span className="text-[15px] leading-none font-semibold tracking-tight">
              FraudForge
            </span>
          </Link>

          <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
            {NAV.map(({ group, items }) => (
              <div key={group} className="mb-5 last:mb-0">
                <p className="overline mb-2 px-2">{group}</p>
                {items.map(({ href, label, Icon }) => {
                  const active = path === href;
                  return (
                    <Link
                      key={href}
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`mb-0.5 flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-[13px] font-medium transition-colors ${
                        active
                          ? "bg-signal/12 text-signal"
                          : "text-fg-muted hover:bg-overlay hover:text-fg"
                      }`}
                    >
                      <Icon
                        size={16}
                        weight={active ? "fill" : "regular"}
                        className="shrink-0"
                      />
                      {label}
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          <div className="border-t border-edge px-5 py-4">
            <div className="flex items-center gap-2">
              <span className="pulse-dot" />
              <span className="caption">Synthetic data only</span>
            </div>
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* ── Mobile header ────────────────────────────────────────── */}
          <header className="chrome sticky top-0 z-50 border-b border-edge lg:hidden">
            <div className="flex h-14 items-center gap-2.5 px-4">
              <Mark />
              <span className="text-[14px] font-semibold tracking-tight">
                FraudForge
              </span>
              <span className="ml-auto text-[13px] text-fg-muted">
                {current?.label}
              </span>
            </div>
          </header>

          {/* ── Desktop context bar ──────────────────────────────────── */}
          <header className="chrome sticky top-0 z-30 hidden border-b border-edge lg:block">
            <div className="flex h-12 items-center justify-between px-8">
              <p className="text-[13px] text-fg-subtle">
                Mastercard Innovation Challenge
                <span className="mx-2 text-edge-strong">/</span>
                GFF 2026
                <span className="mx-2 text-edge-strong">/</span>
                <span className="font-medium text-fg">
                  {current?.label || "Cockpit"}
                </span>
              </p>
              <p className="caption">Closed-loop red team, blue team</p>
            </div>
          </header>

          <main
            id="main"
            className="relative z-1 mx-auto w-full max-w-[1320px] px-4 py-7 pb-24 lg:px-8 lg:py-9 lg:pb-14"
          >
            {children}
          </main>

          <footer className="mt-auto border-t border-edge">
            <div className="mx-auto max-w-[1320px] px-4 py-6 pb-24 lg:px-8 lg:pb-6">
              <p className="caption prose-measure">
                Every figure is computed on request. No real customer, payment or
                account is represented anywhere in this system.
              </p>
            </div>
          </footer>

          {/* ── Mobile tab bar ───────────────────────────────────────────
              Replaces the horizontal scroll strip, which clipped the fourth
              item mid-word at 390px with no scroll affordance. Seven
              destinations, all reachable, all 44px tall. */}
          <nav
            aria-label="Primary"
            className="chrome fixed inset-x-0 bottom-0 z-50 border-t border-edge lg:hidden"
          >
            <ul className="grid grid-cols-8">
              {FLAT.map(({ href, label, Icon }) => {
                const active = path === href;
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      aria-current={active ? "page" : undefined}
                      className={`flex min-h-[56px] flex-col items-center justify-center gap-1 px-1 py-2 text-[10px] font-medium ${
                        active ? "text-signal" : "text-fg-subtle"
                      }`}
                    >
                      <Icon size={18} weight={active ? "fill" : "regular"} />
                      <span className="leading-none">{label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </div>
    </TooltipProvider>
  );
}

/* The mark is azure, never a data colour. A closed loop with an offset gap:
   the red team's opening. */
function Mark() {
  return (
    <span
      aria-hidden
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md bg-signal/15 ring-1 ring-signal/40"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <circle
          cx="8"
          cy="8"
          r="5.5"
          stroke="var(--color-signal)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray="26 9"
          transform="rotate(-45 8 8)"
        />
        <circle cx="8" cy="8" r="1.75" fill="var(--color-flame)" />
      </svg>
    </span>
  );
}

/* ---- Page furniture ----------------------------------------------------- */

/**
 * PageHero.
 *
 * Every page opens on the same lit band: the network lattice, a drifting
 * energy field, and the spotlight sweep. Before this, only the Cockpit had a
 * hero treatment and every other page started cold on flat void — which is
 * most of why they read as unfinished next to it.
 *
 * Centralised deliberately. A per-page version of this would drift within a
 * week, and the whole point of the token layer is that pages compose rather
 * than invent.
 */
export function PageHero({ children, className = "" }) {
  return (
    <div className={`hero-field relative px-5 py-8 lg:px-9 lg:py-10 ${className}`}>
      <Spotlight />
      <SparklesCore particleDensity={14} minSize={0.6} maxSize={1.8} />
      <div className="relative z-1">{children}</div>
    </div>
  );
}


/**
 * PageHead.
 *
 * `highlight` takes the trailing words of the title and runs the fire gradient
 * through them. It is the one piece of decorative type in the system, so it is
 * reserved for the last few words of a page title and never used mid-sentence.
 * Passing nothing renders a plain heading, which is correct for the denser
 * evidence pages.
 */
export function PageHead({ title, kicker, children, action, highlight }) {
  const lead = highlight && title.endsWith(highlight)
    ? title.slice(0, title.length - highlight.length)
    : title;

  return (
    <div className="flex flex-wrap items-end justify-between gap-5">
      <div className="min-w-0">
        {kicker ? <p className="overline mb-2.5">{kicker}</p> : null}
        <h1 className="text-h1 lg:text-display">
          {lead}
          {highlight ? <span className="text-fire">{highlight}</span> : null}
        </h1>
        {children ? (
          <p className="prose-measure mt-3 text-body text-fg-muted">{children}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

export function Panel({ title, description, action, children, className = "", id }) {
  return (
    <section id={id} className={`card ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-edge px-5 py-4">
          <div className="min-w-0">
            {title ? <h2 className="text-h3">{title}</h2> : null}
            {description ? (
              <p className="prose-measure mt-1.5 text-body-sm text-fg-subtle">
                {description}
              </p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

/**
 * Accent scope.
 *
 * Emphasis stops meaning "look here" the moment it sits inside something else
 * already emphasised. Anything wrapped in <AccentScope> silently downgrades the
 * `emphasis` prop on the Stats inside it, so nested accents cannot regress.
 */
const AccentCtx = createContext(false);

export function AccentScope({ children, className = "" }) {
  return (
    <AccentCtx.Provider value={true}>
      <div className={`card-accent card ${className}`}>{children}</div>
    </AccentCtx.Provider>
  );
}

/**
 * Stat.
 *
 * `emphasis` promotes exactly one tile per group to the primary reading. The
 * previous design gave twelve tiles identical weight, so the eye had no entry
 * point; this is the fix.
 *
 * `tone` must come from lib/tone.js — computed from the value, never chosen
 * from context. An undefined tone renders neutral, which is correct for any
 * figure that is simply a count.
 */
export function Stat({ label, value, note, tone, emphasis = false, hint }) {
  const insideAccent = useContext(AccentCtx);
  const promoted = emphasis && !insideAccent;
  const t =
    { caught: "text-caught", review: "text-review", evaded: "text-evaded" }[tone] ||
    "text-fg";

  return (
    <div className={promoted ? "card-accent card p-5" : "card p-4"}>
      <div className="flex items-center gap-1.5">
        <p className="label">{label}</p>
        {hint ? <Hint>{hint}</Hint> : null}
      </div>
      <p
        className={`mt-2 font-mono font-semibold tracking-tight tabular-nums ${t} ${
          promoted ? "text-[34px] leading-none" : "text-[24px] leading-none"
        }`}
      >
        {value}
      </p>
      {note ? <p className="caption mt-2">{note}</p> : null}
    </div>
  );
}

/** Inline definitions at the point of confusion, rather than only on /method. */
export function Hint({ children }) {
  return (
    <Tooltip>
      <TooltipTrigger
        className="rounded-full text-fg-subtle transition-colors hover:text-fg-muted"
        aria-label="What this means"
      >
        <Info size={13} weight="bold" />
      </TooltipTrigger>
      <TooltipContent className="max-w-[280px] text-[12px] leading-relaxed">
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Verdict.
 *
 * This is a defence product, so a blocked payment is a win and an allowed one
 * is a loss. That reads backwards to anyone expecting green-means-go, so the
 * mapping is stated in <VerdictLegend/> rather than left implicit, and every
 * badge pairs its colour with a word — never colour alone.
 */
const VERDICT = {
  BLOCK: "border-caught/45 bg-caught/12 text-caught",
  FLAG: "border-caught/45 bg-caught/12 text-caught",
  STEP_UP: "border-review/45 bg-review/12 text-review",
  ALLOW: "border-evaded/45 bg-evaded/12 text-evaded",
  MISS: "border-evaded/45 bg-evaded/12 text-evaded",
};

export function Verdict({ action }) {
  return (
    <span
      className={`inline-block rounded-sm border px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wide ${
        VERDICT[action] || VERDICT.ALLOW
      }`}
    >
      {action}
    </span>
  );
}

/**
 * VerdictLegend.
 *
 * A legend is a key to what is on screen, not a catalogue of what the system
 * can produce. Pass `states` (a Set from presentStates()) and only the outcomes
 * actually present are listed — a run where every payment evaded should not
 * advertise two colours that never appear.
 */
export function VerdictLegend({ className = "", states = null }) {
  const rows = [
    ["caught", "bg-caught", "Caught", "the detector stopped it"],
    ["review", "bg-review", "Step-up", "sent to challenge"],
    ["evaded", "bg-evaded", "Evaded", "allowed through"],
  ].filter(([key]) => !states || states.has(key));

  if (!rows.length) return null;

  return (
    <div className={`flex flex-wrap items-center gap-x-4 gap-y-1.5 ${className}`}>
      {rows.map(([, dot, label, meaning]) => (
        <span key={label} className="flex items-center gap-1.5">
          <span className={`h-2 w-2 rounded-full ${dot}`} aria-hidden />
          <span className="caption">
            <span className="text-fg-muted">{label}</span> — {meaning}
          </span>
        </span>
      ))}
    </div>
  );
}

/**
 * Bar.
 *
 * Defaults to `magnitude`, NOT to a semantic colour. A bar that encodes "how
 * much" — a signal contribution, a feature weight — has no verdict attached to
 * it, and painting it amber made amber mean "a bar" in one place and "step-up"
 * in another. Pass a semantic tone only when the value genuinely carries one.
 */
export function Bar({ value, max = 1, tone = "magnitude" }) {
  const cls =
    {
      caught: "bg-caught",
      review: "bg-review",
      evaded: "bg-evaded",
      magnitude: "bg-magnitude",
    }[tone] || "bg-magnitude";
  return (
    <span className="bar-track">
      <span
        className={`bar-fill ${cls}`}
        style={{ width: `${Math.max(2, Math.min(100, (value / max) * 100))}%` }}
      />
    </span>
  );
}

export function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
    />
  );
}

export function Skeleton({ className = "" }) {
  return <span className={`skeleton block ${className}`} aria-hidden />;
}

/** Replaces bare "Scoring…" text with something the same shape as the result. */
export function StatSkeleton({ count = 4 }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card p-4">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="mt-3 h-6 w-24" />
          <Skeleton className="mt-3 h-3 w-16" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({ title, children, action, Icon }) {
  return (
    <div className="card flex flex-col items-center px-6 py-14 text-center">
      {Icon ? (
        <span className="mb-4 grid h-11 w-11 place-items-center rounded-lg bg-inset text-fg-subtle">
          <Icon size={20} weight="regular" />
        </span>
      ) : null}
      <p className="text-h3">{title}</p>
      {children ? (
        <p className="mt-2 max-w-[46ch] text-body-sm text-fg-subtle">{children}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="rounded-md border border-evaded/45 bg-evaded/10 px-4 py-3 text-body-sm text-evaded"
    >
      {children}
    </div>
  );
}

export function Footnote({ children, className = "" }) {
  return (
    <p className={`caption prose-measure border-t border-edge pt-4 ${className}`}>
      {children}
    </p>
  );
}

export const pct = (n, d = 1) =>
  n == null || Number.isNaN(Number(n)) ? "-" : `${(Number(n) * 100).toFixed(d)}%`;

export const money = (n) =>
  n == null
    ? "-"
    : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

/** Shared metric definitions, so the wording is identical everywhere. */
export const DEFS = {
  recall: "Of all the fraud in the corpus, the share this detector caught.",
  precision: "Of everything this detector flagged, the share that was actually fraud.",
  f1: "The balance of recall and precision as a single number. Higher is better.",
  auc: "How well the model ranks fraud above legitimate traffic, from 0.5 (coin flip) to 1.0 (perfect).",
  fpr: "The share of legitimate payments wrongly flagged. This is the friction customers feel.",
  stepUp: "The payment is challenged rather than blocked — a one-time code, a biometric, a call.",
  baseRate: "How rare fraud actually is in the live stream. Precision falls hard as it drops.",
};
