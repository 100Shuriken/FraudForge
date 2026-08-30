# FraudForge design system

**Instrumentation, not terminal.**

The product's thesis is *measured, not asserted*. The interface has to read like a
calibrated instrument a bank would put in front of a regulator: dense where the data
is dense, quiet everywhere else, and free of the neon-on-black costume that makes a
rigorous system look like a toy.

---

## 1. Principles

1. **One visual language.** The previous system declared three (brutalist, liquid
   glass, spatial) and admitted in its own comments that they contradict each other.
   That contradiction is why nothing had hierarchy. There is now one language.
2. **Chrome is not data.** See the scope rule in §2. This is the single most
   important rule in the file.
3. **Elevation by background, not by border.** Surfaces separate by fill. Borders
   are 1px hairlines that describe an edge, not a frame.
4. **Mono is for numbers.** Not for labels, not for buttons, not for navigation.
5. **Restraint is the brief.** Three named motion moments. Everything else is a
   150-250ms state transition or nothing at all.

---

## 2. Color

A single cool navy-slate hue family. oklch is authoritative; hex is the fallback
and what ships in `@theme`.

### Surfaces

| Token | oklch | Hex | Use |
|---|---|---|---|
| `--surface-base` | `oklch(0.166 0.017 264)` | `#0B0E16` | page ground |
| `--surface-raised` | `oklch(0.208 0.019 264)` | `#131826` | cards, panels |
| `--surface-inset` | `oklch(0.248 0.021 264)` | `#1A2033` | inset wells, table stripe |
| `--surface-overlay` | `oklch(0.286 0.023 264)` | `#222941` | hover, active row |
| `--border-subtle` | `oklch(0.318 0.022 264)` | `#2A3149` | default hairline |
| `--border-strong` | `oklch(0.420 0.028 264)` | `#3E4767` | focus, active, emphasis |

### Text

| Token | Hex | On base | Use |
|---|---|---|---|
| `--text-primary` | `#F5F7FA` | 15.9:1 | headings, values |
| `--text-secondary` | `#A8B2C8` | 7.4:1 | body copy |
| `--text-tertiary` | `#7C88A3` | 4.6:1 | labels, captions, footnotes |

`--text-tertiary` replaces the old `.tag` color, which measured **3.44:1 at 10px**
and failed WCAG AA in 57 places.

### Teams — chrome only

| Token | Hex | Contrast | Meaning |
|---|---|---|---|
| `--azure` | `#4B9EF8` | 6.8:1 | blue team · brand · every interactive affordance |
| `--ember` | `#F76B44` | 5.2:1 | red team · attack actions only |

### Data — never in chrome

| Token | Hex | Contrast | Meaning |
|---|---|---|---|
| `--caught` | `#35D6A4` | 9.1:1 | detected, stopped, recovered |
| `--review` | `#F2B43C` | 11.4:1 | step-up, caution, friction cost |
| `--evaded` | `#FB6E68` | 6.3:1 | missed, allowed through, loss |

### Magnitude — neither chrome nor verdict

| Token | Hex | Contrast | Meaning |
|---|---|---|---|
| `--magnitude` | `#7F9CC4` | 6.9:1 | "how much", with no valence |

Signal contributions, feature weights and planner candidate scores are
magnitudes, not verdicts. A 0.26 contribution is not good or bad, it is *large*.
These previously rendered amber, which made amber mean "step-up" in one place
and "a bar" in another. Magnitude sits deliberately outside the semantic trio so
it can never be misread as an outcome.

### The colour-semantics rule

> **Colour encodes what a number means for the defence, computed from the number
> itself — never from which model produced it, which page it is on, or what kind
> of element it is.**

The test every coloured value must pass: *if the hardened and legacy figures were
swapped, would the colours swap with them?* If not, the colour is lying.

Every data colour resolves through `lib/tone.js`. Nothing hard-codes a tone from
context.

| Tier | What | How it is coloured |
|---|---|---|
| 1 | Outcome of one payment | `actionTone()` — BLOCK/FLAG green, STEP_UP amber, ALLOW/MISS red |
| 2 | Performance rate, higher better | `rateTone()` — ≥67% green, 34–66% amber, <34% red |
| 3 | Cost, lower better | `costTone()` — neutral below tolerance, then amber, then red. **Never green.** |
| 4 | Neutral fact | no colour. Counts are not judgements. |
| 5 | Magnitude | `--magnitude`. No valence. |
| 6 | Chrome | azure / ember. Never on data, and always quieter than the data it marks. |

Two consequences worth stating outright, because both were violated before the
rule existed:

- **A 0/16 catch rate renders red whichever detector produced it.** Green for
  "our team" contradicts the honesty this product argues for on `/method` and
  `/sandbox`, which is the reason the rule exists at all.
- **A score and the action it produced are one event, so they carry one colour.**
  0.70 leading to STEP_UP is amber, not green sitting beside an amber badge.

Two supporting rules: a legend lists only the states actually present in the data,
and emphasis nested inside emphasis is downgraded automatically (`AccentScope`).

#### Two sanctioned exceptions

Both use a data colour outside a data context. They are deliberate, and listed
here so a future reader does not "fix" them or mistake them for the fault the
rule exists to prevent.

- **`ErrorNote`** renders in `--evaded`. An error is definitionally a negative
  outcome, and the palette has no chrome danger colour — ember means *red team*,
  so an ember error banner would read as an attack rather than a failure.
- **`/method`'s three claim cards** are keyed by section: measured / not claimed /
  known weaknesses in caught / review / evaded. These are editorial, not
  measurements, and each section genuinely carries that valence. Colouring
  "Known weaknesses" red is the page arguing against itself in public, which is
  the point of the page.

Everything else derives its colour from a value.

The rule is enforced at runtime by `scratchpad/pw/colorcheck.mjs`, which walks
every page, parses every semantically-coloured number, and fails if any value
below the band renders green.

### The scope rule

> **Azure and ember are chrome. Caught, review and evaded are data.
> A color never crosses.**

Consequences, which are the point:

- "Run attack" is **ember**, because it *is* the red team.
- Navigation, links, focus rings and primary buttons are **azure**.
- Green appears only inside a number, a bar, or a verdict badge. Never on a button.
  Never in the logo.

In the previous system brand green and "detection succeeded" green were the same
value, so the logo, the nav rail, the primary button and the headline statistic all
shouted at one volume in one hue. Separating them is what restores hierarchy.

---

## 3. Typography

Geist Sans and Geist Mono, already self-hosted through `next/font`. The family was
never the problem; the usage rules were. Mono was applied to 62 elements.

| Role | Size / line / tracking / weight |
|---|---|
| `display` | 44px / 1.05 / -0.03em / 600 |
| `h1` | 32px / 1.12 / -0.02em / 600 |
| `h2` | 20px / 1.25 / -0.01em / 600 |
| `h3` | 15px / 1.35 / — / 600 |
| `body` | 14px / 1.6 / — / 400 |
| `body-sm` | 13px / 1.55 / — / 400 |
| `label` | 12px / 1.4 / — / 500 · sentence case |
| `caption` | 12px / 1.45 / — / 400 · tertiary |
| `overline` | 11px / — / 0.08em / 600 · uppercase · used sparingly |

**Mono policy.** Geist Mono is permitted on numerals, monetary values, percentages,
IDs, seeds and code. It is not permitted on labels, buttons, navigation or prose.
All numeric display carries `font-variant-numeric: tabular-nums` so digits do not
jitter between renders.

Weights in use: 400, 500, 600. Prose measure caps at 68ch. Headings use
`text-wrap: balance`.

---

## 4. Space, radius, elevation

**Space** — 4px base: `4 8 12 16 20 24 32 40 56 72`.
Section rhythm 32px · card padding 20px · inset padding 12px.

**Radius** — was uniformly 0, which combined with 2px borders to produce the
brutalist read.

| Token | Value | Use |
|---|---|---|
| `--r-sm` | 6px | inputs, chips, badges |
| `--r-md` | 10px | cards, panels |
| `--r-lg` | 14px | page containers, dialogs |
| `--r-full` | 9999px | status dots only |

**Elevation** — background steps, not offset shadows:

```
base → raised → inset → overlay
```

Borders are 1px at 3.0:1 against their surface: thinner than before and more
visible. Shadows are navy-tinted, never pure black.

---

## 5. Motion

| Token | Value | Use |
|---|---|---|
| `--dur-fast` | 150ms | hover, focus |
| `--dur-base` | 200ms | state change |
| `--dur-slow` | 250ms | entry, expand |
| `--ease` | `cubic-bezier(0.16, 1, 0.3, 1)` | everything |

Animate `transform` and `opacity` only. Every motion respects
`prefers-reduced-motion` and degrades to a static end state.

---

## 6. Components

`Button` (primary azure · attack ember · secondary · ghost) · `Card` · `Stat` ·
`Panel` · `Table` · `Badge` · `Verdict` · `Field` · `Slider` · `Bar` ·
`EmptyState` · `Skeleton` · `Legend`.

Accessible primitives come from shadcn with `tsx: false`: `select`, `slider`,
`dialog`, `tooltip`, `tabs`, `toggle-group`. Trivial components are hand-rolled
against these tokens rather than pulling further dependencies.

---

## 7. Data visualisation

- Every threshold is **drawn**, not implied. The 0.50 review line appears as a rule
  on the sequence chart so "it slipped under the bar" is visible, not arithmetic.
- Bar color carries the verdict; bar length carries the magnitude. Both are labelled.
- Verdict is never encoded by color alone — badges pair color with text, and the
  sequence chart pairs color with height and position.
- A legend lists **only the outcomes present in the data**. A run where every
  payment evaded must not advertise two colours that never appear.
- `ALLOW` reads as a loss and `BLOCK` as a win, because this is a defense product.
  That inversion is deliberate and is stated in the legend rather than left implicit.

### The scaling rule

> **A chart's marks must occupy a meaningful share of the space the chart
> reserves, and any domain that is not the obvious one must be printed.**

Fixed domains on variable data were the second systemic fault found in review.
Planner scores spanning 0.48–0.60 drawn on 0–1 differed by a few pixels; a
stealth sequence peaking at 0.46 on a fixed 0–1 axis left the review threshold —
the point of the chart — never approached.

Three rules follow, and the third is what keeps the first two honest:

1. **Fit the domain to the data**, with enough headroom that any drawn threshold
   stays visible. The sequence uses
   `min(1, max(REVIEW × 1.2, maxRisk × 1.25))`, so it zooms only when it needs to
   and reverts to a full 0–1 axis when the data fills it.
2. **Never zoom a bar.** A bar implies a zero baseline, so a zoomed bar chart
   lies. Where a domain must be zoomed, the mark changes to a dot, which carries
   no such implication. This is why the planner panel is a dot plot.
3. **Print the domain.** Every zoomed axis states its own range in the chart
   (`axis zoomed to 0.46–0.62`, `Risk axis 0–0.63, fitted to this run`). A zoom
   the reader cannot see is indistinguishable from a misleading chart.

Two supporting rules: rank tables group rows into performance zones rather than
running as one undifferentiated ladder, and a displayed figure must agree with
the zone it sits in — showing a rounded `67%` inside a "under two thirds" band is
a contradiction, so precision increases until it resolves.

Enforced at runtime by `scratchpad/pw/chartcheck.mjs`, which measures rendered
geometry — mark spread against track width, tallest bar against plot height,
gap between lanes — rather than reading the source.

---

## 8. Accessibility contract

Baseline requirements, not polish.

- Text meets **4.5:1**; large text and UI boundaries meet **3:1**.
- Visible focus ring on every interactive element: 2px azure at 2px offset.
- Touch targets 44px minimum on mobile.
- Skip-to-content link, first in tab order.
- Semantic landmarks: `nav`, `main`, `aside`, `section`, `footer`.
- State changes announced: `aria-live` on results, `aria-busy` during runs.
- No meaning by color alone, anywhere.

---

## 9. Motion budget

Exactly three moments carry motion beyond a state transition.

| # | Where | What | Ceiling |
|---|---|---|---|
| 1 | Cockpit hero | dot-grid + azure→ember radial sweep; number-ticker on headline stats | static SVG + one CSS gradient, no JS loop |
| 2 | Generate reveal | 28 ranked rows blur-fade in worst-first at 18ms stagger | transform + opacity, ends by 500ms |
| 3 | Defend results | border-beam on the final-round card, ticker on recall delta | one CSS conic gradient |

No spotlights, meteors, auroras, vortexes or beams anywhere else. No WebGL, no
canvas loop, no animation library. `three` and `motion` were installed and imported
nowhere; both are removed.
