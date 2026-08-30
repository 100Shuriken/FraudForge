import Image from "next/image";
import {
  ArrowRight,
  ArrowUpRight,
  Microphone,
  VideoCamera,
  IdentificationCard,
  EnvelopeSimple,
  Storefront,
  ChatCircleDots,
} from "@phosphor-icons/react/dist/ssr";
import { Reveal, RevealGroup, RevealItem, Lift } from "@/components/motion-primitives";

const APP_URL = "https://fraud-forge-nine.vercel.app";

/* Images: no image-generation tool was available in this environment, so these
   fall back to picsum.photos (Section 4.8 tier 2). The seed makes the choice
   reproducible but does NOT select subject matter, so every one of them is
   atmospheric rather than illustrative and is marked decorative (alt="").
   Swapping in art-directed photography is the single biggest upgrade left. */


/* Every figure below comes from one reproducible run of the scoring engine at
   seed 2026. The seed is printed on the page so a reader can regenerate it. */
const BENCH = {
  seed: 2026,
  corpusFraud: 351,
  corpusLegit: 300,
  legacyRecall: 0.222,
  hardenedRecall: 0.513,
  legacyFpr: 0.0167,
  hardenedFpr: 0.0033,
  recovered: 343398,
  fraudValue: 1262774,
};

const ROUNDS = [
  {
    name: "Baseline",
    recall: 0.622,
    precision: 0.977,
    auc: 0.905,
    mined: null,
    note: "Trained on ordinary traffic and non-evasive fraud only.",
  },
  {
    name: "Second pass",
    recall: 0.859,
    precision: 0.943,
    auc: 0.911,
    mined: 56,
    note: "Mined the payments the baseline missed, then retrained on them.",
  },
  {
    name: "Third pass",
    recall: 0.881,
    precision: 0.895,
    auc: 0.926,
    mined: 26,
    note: "Mined again against a harder evasion set.",
  },
];

const PIPELINE = [
  {
    verb: "Profile",
    body: "Read the account's own baseline: what it usually spends, how often, and from which device.",
  },
  {
    verb: "Plan",
    body: "Rank ten attack families against that specific account, then pick the one it is least ready for.",
  },
  {
    verb: "Synthesize",
    body: "Write a payment sequence shaped to that family, not a single suspicious transaction.",
  },
  {
    verb: "Score",
    body: "Run every step past flat legacy rules, and past a scorer that grades against the account itself.",
  },
  {
    verb: "Mine",
    body: "Collect the payments that got through. Those become the training data.",
  },
  {
    verb: "Retrain",
    body: "Fold the misses back in and measure again on a held-out split that never moves.",
  },
];

const VECTORS = [
  {
    Icon: Microphone,
    name: "Voice cloning",
    body: "A cloned executive voice authorising an urgent supplier payment.",
    span: "lg:col-span-3",
    img: "fraudforge-studio-microphone-dark",
    h: 200,
  },
  {
    Icon: VideoCamera,
    name: "Deepfake video KYC",
    body: "A face-swapped video call standing in for a real identity check.",
    span: "lg:col-span-3",
    img: "fraudforge-video-call-screen-night",
    h: 200,
  },
  {
    Icon: EnvelopeSimple,
    name: "Business email compromise",
    body: "A reply injected into a live invoice thread, changing only the account number.",
    span: "lg:col-span-2",
    img: null,
  },
  {
    Icon: IdentificationCard,
    name: "Synthetic identity",
    body: "A genuine identity number blended with fabricated biometrics.",
    span: "lg:col-span-2",
    img: null,
  },
  {
    Icon: Storefront,
    name: "Merchant fronts",
    body: "A generated storefront taking an order it will never fulfil.",
    span: "lg:col-span-2",
    img: null,
  },
  {
    Icon: ChatCircleDots,
    name: "Support agent impersonation",
    body: "A fake in-app agent walking a customer through handing over a one-time code.",
    span: "lg:col-span-6",
    img: "fraudforge-support-chat-terminal-glow",
    h: 170,
  },
];

const pct = (n, d = 1) => `${(n * 100).toFixed(d)}%`;
const money = (n) => `$${n.toLocaleString("en-US")}`;

export default function Page() {
  return (
    <>
      {/* ── Navigation. One line, 64px tall, never wraps. ───────────── */}
      <header className="sticky top-0 z-50 border-b border-line/70 bg-ink/85 backdrop-blur-md">
        <nav className="mx-auto flex h-16 max-w-[1400px] items-center justify-between gap-6 px-5 lg:px-8">
          <a href="#top" className="flex shrink-0 items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-signal">
              <span className="h-2.5 w-2.5 rounded-full bg-ink" />
            </span>
            <span className="text-[15px] font-semibold tracking-tight">FraudForge</span>
          </a>

          <div className="hidden items-center gap-7 text-sm text-bone-dim md:flex">
            <a href="#evidence" className="transition-colors hover:text-bone">Evidence</a>
            <a href="#loop" className="transition-colors hover:text-bone">The loop</a>
            <a href="#vectors" className="transition-colors hover:text-bone">Vectors</a>
            <a href="#limits" className="transition-colors hover:text-bone">Limits</a>
          </div>

          <a
            href={APP_URL}
            data-cta
            className="shrink-0 whitespace-nowrap rounded-lg bg-signal px-4 py-2 text-sm font-semibold text-ink hover:bg-signal-deep hover:text-bone"
          >
            Open the demo
          </a>
        </nav>
      </header>

      <main id="top">
        {/* ══ 1. Hero. Asymmetric split. ══════════════════════════════ */}
        <section className="mx-auto grid max-w-[1400px] items-center gap-12 px-5 pt-16 pb-20 lg:grid-cols-12 lg:gap-16 lg:px-8 lg:pt-24 lg:pb-28">
          <div className="lg:col-span-7">
            <h1 className="text-[2.6rem] font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-[4.2rem]">
              Fraud that has
              <br />
              <span className="text-signal">never been seen</span> before
            </h1>
            <p className="mt-6 max-w-[52ch] text-lg leading-relaxed text-bone-dim">
              A red team writes payment fraud your rules have never met. A blue team
              learns from what it missed.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <a
                href={APP_URL}
                data-cta
                className="inline-flex items-center gap-2 rounded-lg bg-signal px-5 py-3 text-sm font-semibold text-ink hover:bg-signal-deep hover:text-bone"
              >
                Open the demo
                <ArrowRight size={16} weight="bold" />
              </a>
              <a
                href="#evidence"
                data-cta
                className="inline-flex items-center gap-2 rounded-lg border border-line-bright px-5 py-3 text-sm font-semibold text-bone hover:border-bone-faint"
              >
                See the numbers
              </a>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="relative aspect-4/5 overflow-hidden rounded-2xl border border-line">
              <Image
                src="https://picsum.photos/seed/fraudforge-payment-terminal-dark-desk/900/1125"
                alt=""
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-linear-to-t from-ink via-ink/25 to-transparent" />
            </div>
          </div>
        </section>

        {/* ══ 2. Proof band. Full-width stat row. ═════════════════════ */}
        <section id="evidence" className="border-y border-line bg-ink-raised">
          <div className="mx-auto max-w-[1400px] px-5 py-16 lg:px-8 lg:py-20">
            <Reveal>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-bone-faint">
                Measured at seed {BENCH.seed}
              </p>
              <div className="mt-8 grid gap-10 lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-5">
                  <p className="font-mono text-6xl font-semibold tracking-tight text-signal lg:text-7xl">
                    {pct(BENCH.hardenedRecall)}
                  </p>
                  <p className="mt-3 max-w-[40ch] text-sm leading-relaxed text-bone-dim">
                    of synthetic fraud caught, against{" "}
                    <span className="font-mono text-bone">{pct(BENCH.legacyRecall)}</span> for flat
                    threshold rules on the same{" "}
                    {(BENCH.corpusFraud + BENCH.corpusLegit).toLocaleString()} payments.
                  </p>
                </div>
                <div className="lg:col-span-4">
                  <p className="font-mono text-6xl font-semibold tracking-tight lg:text-7xl">
                    {pct(BENCH.hardenedFpr, 2)}
                  </p>
                  <p className="mt-3 max-w-[38ch] text-sm leading-relaxed text-bone-dim">
                    of legitimate payments wrongly flagged, down from{" "}
                    <span className="font-mono text-bone">{pct(BENCH.legacyFpr, 2)}</span>. More
                    fraud caught and less friction, not a trade between them.
                  </p>
                </div>
                <div className="lg:col-span-3">
                  <p className="font-mono text-6xl font-semibold tracking-tight lg:text-7xl">
                    $343k
                  </p>
                  <p className="mt-3 max-w-[34ch] text-sm leading-relaxed text-bone-dim">
                    of {money(BENCH.fraudValue)} in fraud value stopped that flat rules let
                    through. Inside this corpus, not a projection.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ 3. Problem. Editorial text, no image. ═══════════════════ */}
        <section className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="max-w-[19ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
              Static rules only catch fraud they have already seen
            </h2>
            <div className="mt-10 grid gap-8 lg:grid-cols-2 lg:gap-16">
              <p className="text-lg leading-relaxed text-bone-dim">
                A flat limit does not know your customer. It fires at five thousand
                dollars whether the account normally spends eighty or eight thousand. An
                attacker who reads the account first simply stays underneath it, and
                every payment looks ordinary on its own.
              </p>
              <p className="text-lg leading-relaxed text-bone-dim">
                Generative tools made that reconnaissance cheap. The lure, the voice, the
                invoice thread and the pacing can all be tailored to one person now. The
                defence has to be tailored too, or it is grading every account against a
                stranger.
              </p>
            </div>
          </Reveal>
        </section>

        {/* ══ 4. Pipeline. Staggered vertical sequence. ═══════════════ */}
        <section id="loop" className="border-t border-line bg-ink-sunken">
          <div className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8 lg:py-28">
            <Reveal>
              <h2 className="max-w-[16ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                The attacker moves first, on purpose
              </h2>
            </Reveal>

            <RevealGroup className="mt-14">
              {PIPELINE.map((step, i) => (
                <RevealItem key={step.verb}>
                  <div
                    className="grid gap-3 border-t border-line py-7 lg:grid-cols-12 lg:gap-8"
                    style={{ paddingLeft: `${i * 1.4}rem` }}
                  >
                    <h3 className="font-mono text-xl font-semibold tracking-tight text-signal lg:col-span-3">
                      {step.verb}
                    </h3>
                    <p className="max-w-[62ch] text-base leading-relaxed text-bone-dim lg:col-span-9">
                      {step.body}
                    </p>
                  </div>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ══ 5. Rounds. Data table. ══════════════════════════════════ */}
        <section className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8 lg:py-28">
          <Reveal>
            <h2 className="max-w-[22ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
              Recall climbs because the misses become training data
            </h2>
            <p className="mt-5 max-w-[62ch] text-base leading-relaxed text-bone-dim">
              Three passes against one held-out split that never changes, so the rows are
              comparable. Precision falls as recall rises. That is the real cost of
              catching quieter fraud, and hiding it would make the rest of this page less
              believable.
            </p>

            <div className="mt-12 overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line-bright">
                    <th className="py-4 pr-6 text-sm font-medium text-bone-faint">Pass</th>
                    <th className="py-4 pr-6 text-right text-sm font-medium text-bone-faint">Recall</th>
                    <th className="py-4 pr-6 text-right text-sm font-medium text-bone-faint">Precision</th>
                    <th className="py-4 pr-6 text-right text-sm font-medium text-bone-faint">AUC</th>
                    <th className="py-4 text-sm font-medium text-bone-faint">What changed</th>
                  </tr>
                </thead>
                <tbody>
                  {ROUNDS.map((r) => (
                    <tr key={r.name} className="border-b border-line align-top">
                      <td className="py-5 pr-6 font-medium">{r.name}</td>
                      <td className="py-5 pr-6 text-right font-mono text-signal">{pct(r.recall)}</td>
                      <td className="py-5 pr-6 text-right font-mono text-bone-dim">{pct(r.precision)}</td>
                      <td className="py-5 pr-6 text-right font-mono text-bone-dim">{r.auc.toFixed(3)}</td>
                      <td className="max-w-[38ch] py-5 text-sm leading-relaxed text-bone-dim">
                        {r.note}
                        {r.mined ? (
                          <span className="text-bone-faint"> {r.mined} payments folded in.</span>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Reveal>
        </section>

        {/* ══ 6. Vectors. Bento, exactly six cells for six vectors. ═══ */}
        <section id="vectors" className="border-t border-line bg-ink-raised">
          <div className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8 lg:py-28">
            <Reveal>
              <h2 className="max-w-[20ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                Six ways in, all of them synthetic
              </h2>
            </Reveal>

            <RevealGroup className="mt-14 grid gap-4 lg:grid-cols-6">
              {VECTORS.map((v) => (
                <RevealItem key={v.name} className={v.span}>
                  <Lift className="h-full">
                    <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-line bg-ink">
                      {v.img ? (
                        <div className="relative w-full" style={{ height: v.h }}>
                          <Image
                            src={`https://picsum.photos/seed/${v.img}/1000/600`}
                            alt=""
                            fill
                            sizes="(max-width: 1024px) 100vw, 50vw"
                            className="object-cover opacity-70"
                          />
                          <div className="absolute inset-0 bg-linear-to-t from-ink to-transparent" />
                        </div>
                      ) : null}
                      <div className="flex flex-1 flex-col gap-2.5 p-6">
                        <v.Icon size={20} weight="duotone" className="text-signal" />
                        <h3 className="text-lg font-semibold tracking-tight">{v.name}</h3>
                        <p className="text-sm leading-relaxed text-bone-dim">{v.body}</p>
                      </div>
                    </article>
                  </Lift>
                </RevealItem>
              ))}
            </RevealGroup>
          </div>
        </section>

        {/* ══ 7. Ledger. Image and text split, first of two. ══════════ */}
        <section className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:col-span-6">
              <div className="relative aspect-16/11 overflow-hidden rounded-2xl border border-line">
                <Image
                  src="https://picsum.photos/seed/fraudforge-audit-ledger-paper-desk/1200/825"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover opacity-80"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:col-span-6">
              <h2 className="max-w-[18ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                Every verdict shows its working
              </h2>
              <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-bone-dim">
                Each payment carries the reasons behind its score: how far above the
                account baseline, how many payments that hour, whether the payee is new.
                Both detectors are shown side by side, so a disagreement points straight
                at the signal that caused it.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ══ 8. Export. Split reversed. Second and last in a row. ════ */}
        <section className="mx-auto max-w-[1400px] px-5 pb-20 lg:px-8 lg:pb-28">
          <div className="grid items-center gap-12 lg:grid-cols-12 lg:gap-16">
            <Reveal className="lg:order-2 lg:col-span-6">
              <div className="relative aspect-16/11 overflow-hidden rounded-2xl border border-line">
                <Image
                  src="https://picsum.photos/seed/fraudforge-printed-report-documents/1200/825"
                  alt=""
                  fill
                  sizes="(max-width: 1024px) 100vw, 50vw"
                  className="object-cover opacity-80"
                />
              </div>
            </Reveal>
            <Reveal delay={0.08} className="lg:order-1 lg:col-span-6">
              <h2 className="max-w-[18ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                One incident, start to finish
              </h2>
              <p className="mt-6 max-w-[58ch] text-lg leading-relaxed text-bone-dim">
                Who was targeted, why that attack was chosen, what was sent, what each
                detector said, what got through, and what the model learned from it.
                Written in a single pass so no section drifts out of step with the
                numbers, and exportable as a Word file or a PDF.
              </p>
            </Reveal>
          </div>
        </section>

        {/* ══ 9. Limits. Three-column editorial, breaks the rhythm. ═══ */}
        <section id="limits" className="border-y border-line bg-ink-sunken">
          <div className="mx-auto max-w-[1400px] px-5 py-20 lg:px-8 lg:py-28">
            <Reveal>
              <h2 className="max-w-[24ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
                What this does not claim
              </h2>
              <div className="mt-12 grid gap-10 lg:grid-cols-3 lg:gap-12">
                <div>
                  <h3 className="text-lg font-semibold">The data is synthetic</h3>
                  <p className="mt-3 text-base leading-relaxed text-bone-dim">
                    No real customer, payment or account appears anywhere in this system.
                    The population is generated, and so is every attack run against it.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">The gains are modest</h3>
                  <p className="mt-3 text-base leading-relaxed text-bone-dim">
                    Recall roughly doubles against flat rules. It does not reach the
                    numbers a pitch deck would prefer, and precision gives ground as it
                    climbs.
                  </p>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Value is not projected</h3>
                  <p className="mt-3 text-base leading-relaxed text-bone-dim">
                    Recovered value is measured inside one labelled corpus. Turning that
                    into an annual saving would need production volumes this project does
                    not have.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* ══ 10. Closing call to action. ════════════════════════════ */}
        <section className="mx-auto max-w-[1400px] px-5 py-24 lg:px-8 lg:py-32">
          <Reveal className="text-center">
            <h2 className="mx-auto max-w-[20ch] text-4xl font-semibold leading-[1.1] tracking-tight lg:text-5xl">
              Run an attack and watch it get scored
            </h2>
            <p className="mx-auto mt-5 max-w-[52ch] text-lg text-bone-dim">
              Every figure is computed when you load it. Nothing in the demo is a stored
              result.
            </p>
            <a
              href={APP_URL}
              data-cta
              className="mt-9 inline-flex items-center gap-2 rounded-lg bg-signal px-6 py-3.5 text-sm font-semibold text-ink hover:bg-signal-deep hover:text-bone"
            >
              Open the demo
              <ArrowUpRight size={16} weight="bold" />
            </a>
          </Reveal>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1400px] flex-col gap-4 px-5 py-10 text-sm text-bone-faint sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <p>
            FraudForge. Synthetic data only, built for the Mastercard Innovation
            Challenge 2026.
          </p>
          <a href={APP_URL} className="text-bone-dim transition-colors hover:text-bone">
            fraud-forge-nine.vercel.app
          </a>
        </div>
      </footer>
    </>
  );
}
