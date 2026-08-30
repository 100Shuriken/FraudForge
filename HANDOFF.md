# FraudForge — frontend redesign handoff

A visual and UX redesign of the existing application, followed by four rounds of
structured critique and repair. **No feature was added, removed or rewritten.**
Every route, API call, engine and data flow is unchanged; only presentation
changed.

- Feature-by-feature tour: **[WALKTHROUGH.md](WALKTHROUGH.md)**
- Design tokens and the rules that govern them: **[DESIGN.md](DESIGN.md)**
- Regression checkers: **[tools/checks/](tools/checks/README.md)**

---

## Status: complete

| | |
|---|---|
| Clean production build | ✅ from an empty `.next`, 7 pages + 7 API routes |
| All routes serve 200 | ✅ `/`, `/identify`, `/generate`, `/defender`, `/sandbox`, `/report`, `/method` |
| Functional regression | ✅ **38/38** |
| Colour rule | ✅ **PASS** — no bad number renders green |
| Chart scaling | ✅ **9/9** |
| Label consistency | ✅ **10/10** |
| Identify layout | ✅ **10/10** |
| Console errors | ✅ **none**, every route, desktop and mobile |
| Contrast (WCAG AA) | ✅ **0 failures** across every rendered text node |
| Keyboard | ✅ skip-link first, logical order, azure focus ring on every control |
| `design-baseline/` gitignored | ✅ confirmed — `git status` reports it clean |

---

## Two corrections to the original brief

1. **`HANDOFF.md` and `WALKTHROUGH.md` did not exist.** Both are new; the
   feature inventory was reconstructed by reading the source.
2. **The app has 7 routes, not 11 pages.** The 11 named stages map as below.

| Stage | Where it lives |
|---|---|
| Mission Briefing | `/` hero + target/vector/difficulty controls |
| Identify | `/identify` |
| Generate | `/generate` |
| AI Defense Lab | `/sandbox` → stage 1 |
| Adapt | `/` → "Planner chose…" |
| Defend | `/defender` |
| Reality Check | `/sandbox` → stage 3, base rate |
| Evidence | `/report` |
| Live Benchmark | `/` → "Measured detector comparison" |
| Methodology | `/method` |
| Attack Replay | `components/sequence.jsx`, shared by `/`, `/generate`, `/report` |

---

## What changed, in five passes

### Pass 1 — the redesign

One visual language replacing three (the previous `globals.css` declared
brutalist, liquid-glass and spatial, and admitted in its own comments that they
contradict each other — which is why nothing had hierarchy).

New navy-slate palette, Geist with corrected usage rules (mono for numerals
only, not for 62 elements), a radius and elevation scale, shadcn primitives for
the accessible controls, and three budgeted motion moments. The `.tag` class —
10px at 3.44:1, used 57 times — was split into four typography roles that each
do one job and all clear 4.5:1.

The attack-sequence visualisation kept its thesis and lost its execution: the
rotated 3D cards became a flat two-lane timeline with the review threshold drawn.

### Pass 2 — the colour-semantics rule

Colour was being applied **by category** — green for "our detector", red for
"theirs", amber for "a bar". A `0/16` catch rate rendered green for the hardened
model and red for the legacy one: identical values, opposite colours.

Now every data colour resolves through `lib/tone.js`, computed from the value:

> Colour encodes what a number means for the defence, computed from the number
> itself — never from which model produced it.

Six tiers (outcome, rate, cost, neutral, magnitude, chrome), a new `--magnitude`
token outside the semantic trio for bars that carry no verdict, and two
supporting rules: a legend lists only the states present in the data, and nested
emphasis downgrades automatically via `AccentScope`.

The visible consequence: Live Benchmark's "Hardened recall 59.6%" now renders
amber, not green. It no longer congratulates itself for a fair-band number.

### Pass 3 — chart scaling

Fixed domains on variable data. Planner scores spanning 0.48–0.60 drawn on 0–1
differed by a few pixels; a stealth sequence peaking at 0.46 on a fixed 0–1 axis
left the review threshold never approached.

- Planner panel became a **dot plot on a zoomed, printed axis** — a bar implies a
  zero baseline, so a zoomed bar chart lies; a dot carries no such implication.
- Sequence risk domain **fits the data**, `min(1, max(REVIEW × 1.2, maxRisk × 1.25))`,
  and prints its own top value. Zooms only when needed.
- Amount lane rescaled to its own min–max, separated from the axis, range printed.
- Generate's 28-row ladder grouped into three performance zones with one
  continuous reference line and the duplicate legend removed.

### Pass 4 — label consistency

`attackType.replace(/_/g," ")` plus CSS `capitalize` produced "Qr Swap" for what
the taxonomy calls "QR substitution", and the planner panel showed the canonical
name in its heading and the derived one in its own bar list — the same vector
under two names, eight pixels apart.

`labelFor(id)` in `lib/taxonomy.js` is now the single source. Three sites route
through it, and two `.toLowerCase()` calls that were re-breaking acronyms in prose
were removed.

### Pass 5 — Identify layout, and a CSS bug

- Category counts 8, 4, 4, 6, 3, 3 in a fixed 3-column grid left five of six
  sections ending on a half-empty row. `bestColumns()` picks 3 or 4 per section
  to clear the remainder, and `.even-grid` lets trailing cards grow if a future
  count has no clean divisor. Measured: **8 rows, max gap 0px.**
- A caret pinned to each card's bottom-right restores the clickability cue
  without returning 28 identical buttons.
- The count "28" appeared three times inside 400px; the intro paragraph dropped
  all four counts (the tiles carry them) and "Showing X of Y" now appears only
  when a filter is active.

**The CSS bug this surfaced is the most portable lesson here.** All component CSS
was unlayered, and unlayered CSS beats layered CSS regardless of specificity — so
`.card` silently overrode `hover:border-azure/45` and would have overridden any
utility touching a property a component class already set. Fixed by moving base
element styles into `@layer base` and component classes into `@layer components`.
Print and reduced-motion blocks stay unlayered deliberately, because those must
win over everything.

### Final safety-net pass

A sweep for any remaining colour-by-category found three more, all fixed:

- Defend's "gained over three rounds" line was always green with an up arrow,
  regardless of sign. Every run draws a fresh seed, so a round *can* lose recall.
- Sandbox's real-world precision in prose was hardcoded red, and would have
  rendered red at 100%.
- Identify's signal bullets used the "caught" green as decoration.

Two uses of a data colour outside a data context are **deliberate** and are
documented in DESIGN.md §2: `ErrorNote` (an error is definitionally negative, and
ember means *red team*), and `/method`'s three claim cards (editorial sections
that genuinely carry that valence).

---

## Files

| File | Change |
|---|---|
| `DESIGN.md` | **New.** Tokens, the colour rule, the scaling rule, a11y contract, motion budget. |
| `app/globals.css` | Rewritten, then layered. One visual language; new palette, type scale, radius, elevation. |
| `components/shell.jsx` | Rewritten. Grouped rail, mobile tab bar, skip-link, shared vocabulary, `AccentScope`. |
| `components/sequence.jsx` | Rewritten. Flat two-lane timeline, fitted domain, drawn threshold. |
| `components/magic/index.jsx` | **New.** `NumberTicker`, `BlurFade`, `BorderBeam` ported to JSX. |
| `components/ui/*.jsx` | **New.** 8 shadcn primitives as JSX (`tsx: false`). |
| `lib/tone.js` | **New.** Every data colour in the app resolves here. |
| `lib/taxonomy.js` | Added `labelFor()` — the one place an id becomes display text. |
| `lib/lab-engine.js`, `lib/incident-engine.js` | Label derivation only. No engine logic touched. |
| `lib/utils.js` | **New.** `cn()`. |
| `app/*/page.jsx` | All 7 pages restyled. Hooks, fetches, state and payload shapes untouched. |
| `tools/checks/*` | **New.** Five regression checkers plus the screenshot capture script. |
| `next.config.mjs` | Removed five dead rewrites to `127.0.0.1:8001` (no backend, no caller, returned 500s). |
| `WALKTHROUGH.md` | **New.** Feature-by-feature walkthrough of all 11 stages. |
| `.gitignore` | Added `design-baseline/`, `AGENTS.md`, `CLAUDE.md`. |

**Engine logic untouched:** `lib/risk.js`, `lib/benchmark-engine.js`, `lib/rng.js`,
and all of `app/api/`.

### Dependencies

Added: `radix-ui`, `lucide-react`, `class-variance-authority`, `clsx`,
`tailwind-merge`, `playwright-core` (dev).
Removed: `three` — verified imported nowhere.
Kept: `motion` — was unused, now drives the three motion moments.

`lucide-react` is used **only inside shadcn primitives** (chevron, check, close).
The visible icon language is Phosphor, unchanged.

---

## Regression checkers

Five scripts in `tools/checks/`, wired to npm. They assert the design rules **at
runtime by measuring the rendered page**, not by reading source.

```bash
npm run build && npx next start -p 3100
npm run check:all
```

| Script | Command | Guards |
|---|---|---|
| `regress.mjs` | `check:functional` | 38 interaction paths across all 7 routes |
| `colorcheck.mjs` | `check:colour` | no value below its band renders green |
| `chartcheck.mjs` | `check:charts` | mark spread, plot usage, zones, reference lines |
| `labelcheck.mjs` | `check:labels` | every vector name is the canonical one |
| `identifycheck.mjs` | `check:identify` | no ragged grid row; affordance; count repetition |
| `capture.mjs` | `npm run capture` | screenshots the 11 stages (not a check) |

Needs `npx playwright install chromium`. Base URL: first arg or `FF_BASE`.
Chromium path: `FF_CHROME`.

Each checker caught real defects while being written — including one false pass
in `chartcheck` itself, which now fails when its own selector misses.

---

## Screenshots

```
design-baseline/            (gitignored — regenerate with `npm run capture`)
├── original-d7fbac2/   12 files  ← the true pre-redesign original
└── current/            12 files  ← final state
```

Same filenames in both, so they diff one-to-one. The original was captured by
checking `d7fbac2` out into a throwaway git worktree on a separate port; the
working tree was never touched, and the worktree has been removed and pruned.

---

## What the defender model actually is

Stated explicitly because it is easy to assume otherwise, and because an earlier
description of this project referred to XGBoost, a Python/FastAPI backend on
Render, and PostgreSQL persistence. **None of those have ever existed in this
repository** — verified against every commit on every ref (see "Verified
against history" below).

The defender on `/defender` is a **hand-written JavaScript logistic regression**
in [`lib/benchmark-engine.js`](lib/benchmark-engine.js). No ML library, no
Python, no service call. It runs inside a Next.js route handler.

| Property | Implementation |
|---|---|
| Model | `class LogisticModel` — logistic regression, written by hand |
| Optimiser | batch gradient descent, `epochs = 220`, `lr = 0.35` |
| Feature scaling | standardisation, so no feature's scale dominates the gradient |
| Class imbalance | class weighting for the minority (fraud) class |
| Regularisation | L2, `l2 = 1e-4` |
| Evaluation | confusion matrix plus rank-based AUC (Mann-Whitney U) |
| Features | `amountRatio`, `velocityExcess`, `isNewPayee`, `isInternational`, `isNewDevice`, `hourOddness` |
| Determinism | seeded `mulberry32` PRNG; the same seed reproduces a run exactly |

**The adversarial retraining is genuine.** Three rounds share one fixed held-out
split so they stay comparable. Each round mines the payments the *previous*
model let through and retrains on them — that is the loop the product is about,
and it is real computation, not stored constants:

```
same seed twice   → 55.4% → 74.0% → 85.9%   (identical: deterministic)
                  → 55.4% → 74.0% → 85.9%

seed 11 → 65.5% → 78.0% → 88.7%    still evading 20
seed 22 → 57.1% → 74.0% → 85.3%    still evading 26
seed 33 → 64.4% → 78.5% → 90.4%    still evading 17
```

The UI already describes this accurately and does not overclaim. Defend's
provenance line reads *"Logistic regression, gradient descent, class-weighted,
L2 regularised"*, and `/method` says plainly: *"The hardened scorer is a graded
rule engine, not a deep model. Explainable by construction, which is the point,
but not state of the art."*

The other two engine-backed pages are the same shape — pure JS in a route
handler, no external dependency:

| Page | Endpoint | Engine |
|---|---|---|
| Defend | `POST /api/train` | `lib/benchmark-engine.js` |
| Adapt (Cockpit planner) | `POST /api/simulate` | `lib/lab-engine.js` |
| AI Defense Lab (Sandbox) | `POST /api/score` | `lib/risk.js` |

A runtime network audit of all three pages, including after triggering their
actions, recorded **zero off-origin requests**.

### Verified against history

| Check | Result |
|---|---|
| Refs | 1 (`master`). No other branches, remotes, tags, stashes, or dangling objects |
| Commits across `--all --reflog` | 4 |
| Distinct files ever committed | 32 — all `.js`, `.jsx`, `.css`, `.mjs`, `.json` |
| `.py`, `requirements.txt`, `render.yaml`, `Dockerfile`, `Procfile` | **zero, in any commit** |
| `xgboost`, `fastapi`, `uvicorn`, `sklearn`, `scikit` in any commit's content | **zero** |

---

## Not yet implemented

Listed here so they are not mistaken for current functionality. None of this
exists in the repository today.

- **A Python/FastAPI service.** Never present in any commit.
- **XGBoost, scikit-learn, or any ML library.** The defender is the hand-written
  logistic regression described above.
- **Render (or any) backend hosting.** No `render.yaml`, `Dockerfile` or
  `Procfile` has ever existed here.
- **PostgreSQL, or any persistence at all.** Nothing is stored. Every figure is
  computed per request from a seeded PRNG; `/method` states this as a design
  property ("Nothing on this site is a stored constant").
- **Multi-dataset training.** Training runs against one synthetic corpus
  generated per request from the 10-account population.

If any of these are genuinely wanted, they are new work, not repairs. Nothing
currently in the product is waiting on them — the closed loop, the three-round
retraining and all measured figures already function without them.

## Deployment

**Vercel — verified.** `.vercel/project.json` links project `fraudforge-site`. A
clean build from an empty `.next` compiles and prerenders 10 static pages plus 7
dynamic route handlers; all 7 routes return 200 from `next start`. The app has no
runtime dependency on any external service: every `fetch` targets a local Next
route handler, and the engines are pure JS with a seeded PRNG.

**Vercel is the only deployment target, and the app is complete on it.** There is
no second service to stand up.

`next.config.mjs` previously carried five rewrites proxying `/api/py/*`,
`/api/generate/*`, `/api/ai-defense-lab/*`, `/api/incident/*` and
`/api/cockpit/*` to `http://127.0.0.1:8001`. **These have been deleted.** They
were introduced in `d7fbac2` with no backend and no caller, nothing in the
frontend had ever fetched them, and they returned HTTP 500 rather than 404 —
on Vercel they would have proxied to `127.0.0.1` from inside a serverless
function, which is guaranteed to be nothing. `/api/generate/*` would also have
shadowed any future API route at that path.

---

## Known issues, unchanged from before the redesign

- `/sandbox` stage 3 can read "Real-world precision 100.0%" at higher thresholds,
  because the corpus yields zero false positives there. That is the engine's real
  output, not a display bug, but it does undercut the base-rate argument at those
  settings.

## Suggested next steps

- Chart the ROC curve on `/sandbox` stage 2 — the data is already client-side in
  `curve.points`.
- Let a run pin its seed from the UI; every engine already accepts one.
- A custom 404 page, still absent.
- Wire `npm run check:all` into CI so the design rules stay enforced.
