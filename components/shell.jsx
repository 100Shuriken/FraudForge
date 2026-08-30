"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Crosshair, MagnifyingGlass, Lightning, ShieldCheck,
  SlidersHorizontal, FileText, Notebook,
} from "@phosphor-icons/react";

const NAV = [
  { href: "/", label: "Cockpit", pillar: "Loop", Icon: Crosshair },
  { href: "/identify", label: "Identify", pillar: "Pillar 1", Icon: MagnifyingGlass },
  { href: "/generate", label: "Generate", pillar: "Pillar 2", Icon: Lightning },
  { href: "/defender", label: "Defend", pillar: "Pillar 3", Icon: ShieldCheck },
  { href: "/sandbox", label: "Sandbox", pillar: "Analysis", Icon: SlidersHorizontal },
  { href: "/report", label: "Report", pillar: "Evidence", Icon: FileText },
  { href: "/method", label: "Method", pillar: "Evidence", Icon: Notebook },
];

export function Shell({ children }) {
  const path = usePathname();
  const current = NAV.find((n) => n.href === path);

  return (
    <div className="min-h-[100dvh] lg:flex">
      {/* ── Rail. Liquid glass, the one place translucency earns itself. ── */}
      <aside className="glass-rail sticky top-0 z-40 hidden h-[100dvh] w-52 shrink-0 flex-col lg:flex">
        <Link href="/" className="flex items-center gap-2.5 border-b-2 border-line px-4 py-4">
          <span className="grid h-7 w-7 shrink-0 place-items-center bg-signal">
            <span className="h-2.5 w-2.5 bg-void" />
          </span>
          <span className="font-mono text-[13px] leading-none font-bold tracking-tight">
            FRAUDFORGE
          </span>
        </Link>

        <nav className="flex-1 overflow-y-auto p-2">
          {NAV.map(({ href, label, pillar, Icon }) => {
            const active = path === href;
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={`mb-0.5 flex items-center gap-2.5 border-2 px-2.5 py-2 transition-colors ${
                  active
                    ? "border-signal bg-signal/10 text-signal"
                    : "border-transparent text-bone-dim hover:border-line hover:bg-ink-raised hover:text-bone"
                }`}
              >
                <Icon size={15} weight="bold" className="shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block font-mono text-[11px] leading-none font-bold tracking-wide uppercase">
                    {label}
                  </span>
                  <span className="mt-1 block text-[9px] leading-none text-bone-faint">{pillar}</span>
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t-2 border-line px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="pulse-dot" />
            <span className="tag">Synthetic only</span>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* ── Mobile bar ─────────────────────────────────────────────── */}
        <header className="glass sticky top-0 z-50 lg:hidden">
          <div className="flex h-14 items-center gap-3 px-3">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <span className="grid h-6 w-6 place-items-center bg-signal">
                <span className="h-2 w-2 bg-void" />
              </span>
            </Link>
            <nav className="flex items-center gap-1 overflow-x-auto">
              {NAV.map(({ href, label, Icon }) => {
                const active = path === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    aria-current={active ? "page" : undefined}
                    className={`flex shrink-0 items-center gap-1.5 border-2 px-2 py-1.5 font-mono text-[10px] font-bold tracking-wide uppercase whitespace-nowrap ${
                      active ? "border-signal bg-signal/10 text-signal" : "border-line text-bone-dim"
                    }`}
                  >
                    <Icon size={12} weight="bold" />
                    {label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </header>

        {/* ── Desktop context bar ────────────────────────────────────── */}
        <header className="glass sticky top-0 z-30 hidden lg:block">
          <div className="flex h-11 items-center justify-between px-6">
            <p className="font-mono text-[11px] text-bone-faint">
              Mastercard Innovation Challenge <span className="text-line">/</span> GFF 2026{" "}
              <span className="text-line">/</span>{" "}
              <span className="font-bold text-bone">{current?.label || "Cockpit"}</span>
            </p>
            <p className="tag">Closed-loop red team, blue team</p>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-4 py-8 lg:px-8 lg:py-10">{children}</main>

        <footer className="mt-auto border-t-2 border-line">
          <div className="mx-auto max-w-[1440px] px-4 py-6 font-mono text-[10px] leading-relaxed text-bone-faint lg:px-8">
            Every figure is computed on request. No real customer, payment or account is
            represented anywhere in this system.
          </div>
        </footer>
      </div>
    </div>
  );
}

/* ---- Shared pieces ------------------------------------------------------ */

export function Stat({ label, value, note, tone }) {
  const t = { signal: "text-signal", warn: "text-warn", fail: "text-fail", info: "text-info" }[tone] || "text-bone";
  return (
    <div className="slab p-4">
      <p className="tag">{label}</p>
      <p className={`mt-2 font-mono text-[28px] leading-none font-bold tracking-tight ${t}`}>{value}</p>
      {note ? <p className="mt-2 text-[11px] leading-snug text-bone-dim">{note}</p> : null}
    </div>
  );
}

export function Panel({ title, description, action, children, className = "" }) {
  return (
    <section className={`slab ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b-2 border-line px-4 py-3">
          <div className="min-w-0">
            {title ? (
              <h2 className="font-mono text-[11px] font-bold tracking-wider uppercase">{title}</h2>
            ) : null}
            {description ? (
              <p className="mt-1.5 max-w-[82ch] text-xs leading-relaxed text-bone-dim">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}

export function Verdict({ action }) {
  const map = {
    BLOCK: "border-signal text-signal",
    STEP_UP: "border-warn text-warn",
    ALLOW: "border-fail text-fail",
    FLAG: "border-signal text-signal",
    MISS: "border-fail text-fail",
  };
  return (
    <span className={`inline-block border-2 px-1.5 py-0.5 font-mono text-[10px] font-bold ${map[action] || map.ALLOW}`}>
      {action}
    </span>
  );
}

export function Spinner() {
  return <span className="inline-block h-3 w-3 animate-spin border-2 border-current border-t-transparent" />;
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="border-2 border-warn bg-warn/10 px-4 py-3 font-mono text-xs text-warn">
      {children}
    </div>
  );
}

export function PageHead({ title, kicker, children, action }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {kicker ? <p className="tag mb-2">{kicker}</p> : null}
        <h1 className="text-2xl font-bold tracking-tight lg:text-[32px] lg:leading-[1.1]">{title}</h1>
        {children ? (
          <p className="mt-2.5 max-w-[84ch] text-sm leading-relaxed text-bone-dim">{children}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** No filled background track, per the anti-dashboard-clutter rule. */
export function Bar({ value, max = 1, tone = "signal" }) {
  const cls = { signal: "bg-signal", warn: "bg-warn", fail: "bg-fail", info: "bg-info" }[tone] || "bg-signal";
  return (
    <span className="h-1.5 flex-1 bg-line">
      <span className={`block h-full ${cls}`} style={{ width: `${Math.min(100, (value / max) * 100)}%` }} />
    </span>
  );
}

export const pct = (n, d = 1) =>
  n == null || Number.isNaN(Number(n)) ? "-" : `${(Number(n) * 100).toFixed(d)}%`;

export const money = (n) =>
  n == null ? "-" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
