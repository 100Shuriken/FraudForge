"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Crosshair, ShieldCheck, FileText } from "@phosphor-icons/react";

const NAV = [
  { href: "/", label: "Live cockpit", Icon: Crosshair },
  { href: "/defender", label: "Defender", Icon: ShieldCheck },
  { href: "/report", label: "Incident report", Icon: FileText },
];

export function Shell({ children }) {
  const path = usePathname();

  return (
    <div className="min-h-[100dvh]">
      <header className="sticky top-0 z-50 border-b border-line bg-ink/90 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-5 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-signal">
              <span className="h-2.5 w-2.5 rounded-full bg-ink" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">FraudForge</span>
          </Link>

          <div className="flex items-center gap-1">
            {NAV.map(({ href, label, Icon }) => {
              const active = path === href;
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                    active
                      ? "bg-signal/12 text-signal"
                      : "text-bone-dim hover:bg-ink-raised hover:text-bone"
                  }`}
                >
                  <Icon size={16} weight="bold" />
                  <span className="hidden sm:inline">{label}</span>
                </Link>
              );
            })}
          </div>

          <span className="hidden shrink-0 items-center gap-2 text-xs text-bone-faint lg:flex">
            Synthetic data only
          </span>
        </nav>
      </header>

      <main className="mx-auto max-w-[1400px] px-5 py-8 lg:px-8 lg:py-12">{children}</main>

      <footer className="border-t border-line">
        <div className="mx-auto max-w-[1400px] px-5 py-8 text-sm text-bone-faint lg:px-8">
          FraudForge. Every figure is computed on request from synthetic data. No real
          customer, payment or account is represented anywhere in this system.
        </div>
      </footer>
    </div>
  );
}

/* ---- Small shared pieces ------------------------------------------------ */

export function Stat({ label, value, note, tone }) {
  const toneClass =
    { signal: "text-signal", warn: "text-warn", fail: "text-fail" }[tone] || "text-bone";
  return (
    <div className="rounded-2xl border border-line bg-ink-raised p-5">
      <p className="text-xs font-medium tracking-wide text-bone-faint uppercase">{label}</p>
      <p className={`mt-2 font-mono text-3xl font-semibold tracking-tight lg:text-4xl ${toneClass}`}>
        {value}
      </p>
      {note ? <p className="mt-1.5 text-xs leading-relaxed text-bone-dim">{note}</p> : null}
    </div>
  );
}

export function Panel({ title, description, action, children, className = "" }) {
  return (
    <section className={`rounded-2xl border border-line bg-ink-raised ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title ? <h2 className="text-sm font-semibold tracking-tight">{title}</h2> : null}
            {description ? (
              <p className="mt-1 max-w-[70ch] text-xs leading-relaxed text-bone-dim">{description}</p>
            ) : null}
          </div>
          {action}
        </header>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Verdict({ action }) {
  const map = {
    BLOCK: "bg-signal/15 text-signal border-signal/30",
    STEP_UP: "bg-warn/15 text-warn border-warn/30",
    ALLOW: "bg-fail/15 text-fail border-fail/30",
    FLAG: "bg-signal/15 text-signal border-signal/30",
    MISS: "bg-fail/15 text-fail border-fail/30",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${
        map[action] || map.ALLOW
      }`}
    >
      {action}
    </span>
  );
}

export function Spinner() {
  return (
    <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
  );
}

export function ErrorNote({ children }) {
  if (!children) return null;
  return (
    <div role="alert" className="rounded-2xl border border-warn/40 bg-warn/10 px-4 py-3 text-xs text-warn">
      {children}
    </div>
  );
}

export const pct = (n, d = 1) =>
  n == null || Number.isNaN(Number(n)) ? "-" : `${(Number(n) * 100).toFixed(d)}%`;

export const money = (n) =>
  n == null ? "-" : `$${Number(n).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
