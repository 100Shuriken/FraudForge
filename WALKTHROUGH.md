# FraudForge — walkthrough

What each stage does, what it computes, and where that computation lives.

**Everything in this document is implemented and running.** Anything not yet
built is listed under "Not yet implemented" in
[HANDOFF.md](HANDOFF.md#not-yet-implemented) rather than described here.

---

## The shape of the system

FraudForge is a closed loop between two teams. A red-team planner reads an
account, picks the vector that account is least ready for, and synthesises a
payment sequence. Two detectors score every step. The payments that get through
become the training data for the next round.

Every figure is **computed per request** from a seeded PRNG. Nothing is stored,
and nothing is a constant — that is a deliberate property the product argues for
on `/method`, and it is why the same seed reproduces a run exactly while a fresh
seed moves the numbers.

**There is no database, no external service and no Python.** The whole system is
JavaScript running in Next.js route handlers on Vercel.

```
Identify → Generate → Score → Mine → Defend → feed back
```

---

## Routes, and the 11 stages

The application has **7 routes**. Several stages are sections within a route
rather than routes of their own.

| # | Stage | Route | Section |
|---|---|---|---|
| 1 | Mission Briefing | `/` | hero + controls |
| 2 | Identify | `/identify` | whole page |
| 3 | Generate | `/generate` | whole page |
| 4 | AI Defense Lab | `/sandbox` | stage 1 |
| 5 | Adapt | `/` | "Planner chose…" |
| 6 | Defend | `/defender` | whole page |
| 7 | Reality Check | `/sandbox` | stage 3 |
| 8 | Evidence | `/report` | whole page |
| 9 | Live Benchmark | `/` | "Measured detector comparison" |
| 10 | Methodology | `/method` | whole page |
| 11 | Attack Replay | shared | `components/sequence.jsx` |

---

## 1 · Mission Briefing — `/`

Pick a target account, an attack vector (or let the planner choose), and a
difficulty. "Run attack" synthesises and scores a sequence immediately; the page
also runs one on load so it is never empty.

Beneath the controls, the account's own profile — baseline payment, usual
cadence, device stability, spending regularity. Those four numbers are what make
the attack account-specific: the planner reads them to decide what to try.

**Computes:** `POST /api/simulate` → `lib/lab-engine.js`

---

## 2 · Identify — `/identify`

The attack surface as a working index: **28 GenAI-enabled payment fraud vectors**
across 6 categories, 17 payment rails and 24 attack surfaces. Filter by category
or by rail.

Every card opens a dialog carrying the vector's detection signals and its
**generator parameters** — amount range, velocity range, new-payee probability,
cross-border probability, new-device probability, sequence length. Those
parameters are the point: they are what the Generate pillar reads. Nothing is
listed here that the system cannot actually produce, and "Generate this vector"
deep-links straight into a live run.

**Reads:** `lib/taxonomy.js` (static, bundled — no request)

---

## 3 · Generate — `/generate`

Sweeps **every vector in the taxonomy** against one account and scores the
result, ranked worst-first so the account's weakest surfaces surface immediately.
Rows are grouped into three performance zones — mostly evading, partially caught,
well covered — with a drawn 50% reference line.

Selecting any row generates that vector's full sequence and shows a fidelity
panel: the amount range, velocity range, new-payee rate and cross-border rate the
generator actually hit, so you can judge whether the output resembles payment
behaviour rather than noise.

Accepts `?v=<vector_id>` to run a specific vector directly.

**Computes:** `POST /api/simulate` (`mode: "all"`, then per-vector) → `lib/lab-engine.js`

---

## 4 · AI Defense Lab — `/sandbox`, stage 1

Build a payment by hand — amount, account baseline, payments this hour, usual
daily cadence, hour of day, plus new-payee / cross-border / new-device flags — and
watch **both detectors score it live** on every change.

The hardened scorer returns a risk score, an action, and a decomposition into
named signal contributions. That decomposition is the argument for the whole
approach: a step-up challenge a bank cannot justify to a regulator or a customer
is not deployable, whatever its AUC.

The legacy detector runs the same payment through flat static thresholds
(amount over $5,000, or six payments per hour) with no per-account context, so
the disagreement between the two is visible directly.

**Computes:** `POST /api/score` → `lib/risk.js` (debounced ~110ms)

---

## 5 · Adapt — `/`, "Planner chose…"

Why the planner picked what it picked. Every vector in the taxonomy is scored
against **this specific account's** weak points, and the top candidates are shown
on a dot plot with the chosen one highlighted.

The scoring balances two things: how well a vector's mechanism fits the account's
weaknesses (device gap, velocity signal, regularity gap, predictability), and how
*quiet* it is — stealth dominates, because an attacker would rather succeed
quietly than fit the profile perfectly and get caught. A different account
produces a different plan.

The axis is zoomed to the actual score range and prints its own domain, because
these scores cluster tightly and a 0–1 axis made the ranking invisible.

**Computes:** `scoreCandidates()` / `planAttack()` in `lib/lab-engine.js`,
returned with the simulate response.

---

## 6 · Defend — `/defender`

The misses become the training data. Three rounds of adversarial retraining
against a **fixed held-out split** that never changes, so the rounds stay
directly comparable.

Each round mines the payments the previous model let through and retrains on
them. The page reports recall, precision, F1, AUC and how many payments were
mined per round, plus what the final model leans on (normalised absolute
weights) and where the attacker goes next (derived from what still evades).

### The model

A **hand-written JavaScript logistic regression** in `lib/benchmark-engine.js`.
No ML library, no Python, no service call.

| Property | Implementation |
|---|---|
| Model | `class LogisticModel`, written by hand |
| Optimiser | batch gradient descent, `epochs = 220`, `lr = 0.35` |
| Feature scaling | standardisation, so no feature's scale dominates the gradient |
| Class imbalance | class weighting for the minority (fraud) class |
| Regularisation | L2, `l2 = 1e-4` |
| Evaluation | confusion matrix plus rank-based AUC (Mann-Whitney U) |
| Features | `amountRatio`, `velocityExcess`, `isNewPayee`, `isInternational`, `isNewDevice`, `hourOddness` |

It is a graded, explainable model rather than a deep one — which is the point,
and `/method` says so outright rather than implying otherwise. Every run draws a
fresh seed, so the numbers move; pinning a seed reproduces a run exactly.

**Computes:** `POST /api/train` → `lib/benchmark-engine.js`

---

## 7 · Reality Check — `/sandbox`, stage 3

The most important argument on the site. Take the rates from the policy tuner
above and apply them at a **realistic fraud base rate**.

Fraud is rare. A detector scoring 99%+ precision on a balanced corpus can score
under 20% in production, because almost every payment it sees is legitimate. The
panel shows fraud in the stream, alerts raised, real-world precision, and
analyst-days per month at 250 reviews per day.

This is the base-rate problem, and it is the single most common way a fraud model
looks strong in evaluation and fails in operation. The page demonstrates it
rather than asserting it.

**Computes:** client-side arithmetic over the already-scored corpus from
`GET /api/curve`, so it recomputes instantly as you move the sliders.

### Also on `/sandbox` — stage 2, the policy tuner

The decision threshold is a business decision, not a property of the model. Move
it and watch recall, precision, false positives, review load and fraud value
missed all move together on the same curve. There is no setting that improves
both sides.

---

## 8 · Evidence — `/report`

One incident, start to finish, computed in a single pass so every section
describes the same run: who was targeted, why that attack was chosen, what was
sent, what each detector said, what got through, and what the model learned.

Six narrative phases, a full payment ledger with both verdicts and the scorer's
own reasons, and the training rounds for that same incident.

Exports to **Word** (an HTML document served as `.doc`, so it needs no zip
library) and to **PDF** via the browser's print path — the print stylesheet is
real, with `break-inside: avoid` and repeating table headers.

**Computes:** `POST /api/report` → `lib/incident-engine.js`

---

## 9 · Live Benchmark — `/`, "Measured detector comparison"

Both detectors over one labelled corpus of synthetic fraud and legitimate
traffic, reporting recall, precision, F1 and false-positive rate for each.

The honest reading is printed underneath: the flat rules almost never fire on
ordinary traffic here, so the hardened scorer buys a large recall gain for a
small amount of added friction — not for free. Recovered value is stated as
being inside that corpus only, not as a projection.

Computed per request, not stored. The seed is printed.

**Computes:** `GET /api/benchmark` → `lib/benchmark-engine.js`

---

## 10 · Methodology — `/method`

The honest version, in three columns: what is measured, what is **not** claimed,
and known weaknesses — including that targeted feature suppression scores
near-zero detection, that precision falls as recall climbs, and that the attack
generator and the scorer share an author, so the generator is not an independent
adversary.

Plus real-world feasibility (where it would sit, what it needs, what breaks
first) and the stack.

**Reads:** static content plus `lib/taxonomy.js`

---

## 11 · Attack Replay — `components/sequence.jsx`

Shared by the Cockpit, Generate and the incident report.

An attack is a sequence advancing through time, and a flat table cannot show that
a later payment is deliberately quieter than an earlier one. The chart shows risk
per payment with the **0.50 review threshold drawn across it**, so "it slipped
under the line" is something you see rather than something you compute, and a
second lane showing the amount ramp.

The risk axis **fits each run** and prints its own top value, because a stealth
sequence peaking around 0.45 on a fixed 0–1 axis never approaches the threshold
that the chart exists to show.

Every payment is selectable and drives the detail panels beneath.

---

## Data and provenance

- **All data is synthetic.** No real customer, payment, account or institution is
  represented anywhere.
- **10 accounts.** Results would move on a real portfolio.
- **Seeded `mulberry32` PRNG.** Seeds are printed wherever they matter; pinning
  one reproduces a run exactly.
- **Nothing is stored.** Every rate comes from a confusion matrix computed at
  request time.

## Running it

```bash
npm install
npm run dev          # http://localhost:3000
```

Regression checkers, which assert the design rules at runtime by measuring the
rendered page:

```bash
npm run build && npx next start -p 3100
npm run check:all
```

See [tools/checks/README.md](tools/checks/README.md).
