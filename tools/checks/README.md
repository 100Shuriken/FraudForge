# Design regression checkers

Five Playwright scripts that assert the design rules in
[`DESIGN.md`](../../DESIGN.md) hold **at runtime**, by measuring the rendered
page rather than reading the source. Each one was written alongside the fix it
guards, and each one caught real defects while it was being written.

## Running them

```bash
npm run build && npx next start -p 3100     # or: npm run dev  (port 3000)
npm run check:all                            # all five, against :3100
npm run check:colour http://localhost:3000   # one, against another origin
```

Needs a Chromium that Playwright can drive:

```bash
npx playwright install chromium
```

The scripts look for the Windows Playwright Chromium by default. Override with
`FF_CHROME=/path/to/chrome`. Base URL: first CLI arg, or `FF_BASE`.

## What each one guards

| Script | Guards | Asserts |
|---|---|---|
| `regress.mjs` | every feature | 38 interaction paths across all 7 routes — dropdowns, filters, dialog, sliders, table rows, deep links, Word export |
| `colorcheck.mjs` | the colour rule (§2) | parses every semantically-coloured number and fails if a value below its band renders green, or above it renders red |
| `chartcheck.mjs` | the scaling rule (§7) | measures mark spread vs track width, tallest bar vs plot height, lane separation, zone grouping, reference-line visibility |
| `labelcheck.mjs` | canonical vector names | every rendered vector name is in the taxonomy's label set; no Title-Cased id survives |
| `identifycheck.mjs` | the Identify grid | groups cards into rows by offset and fails if any row leaves a gap at the right edge; affordance and count-repetition checks |

`capture.mjs` is not a check — it screenshots the 11 stages into
`design-baseline/current/` (override with `FF_OUT`).

## Why measure rather than read the source

Three defects in this redesign were invisible to code review and only appeared
under measurement:

- `hover:border-azure/45` never applied, because unlayered component CSS beats
  layered Tailwind utilities regardless of specificity.
- A displayed `67%` sat inside a zone labelled "under two thirds", because
  `pct()` rounded up while the band used the exact value.
- `chartcheck` itself reported a false pass on a lane it could not find. The
  check now fails when its own selector misses.
