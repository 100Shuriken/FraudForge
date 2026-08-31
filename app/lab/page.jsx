"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Brain, ShieldWarning, Waveform, VideoCamera, IdentificationCard,
  Fingerprint, CreditCard, Envelope, Play, ArrowsClockwise, Warning,
} from "@phosphor-icons/react";
import {
  Shell, Panel, Stat, PageHead, PageHero, Spinner, Footnote,
  EmptyState, Skeleton, pct,
} from "@/components/shell";
import { BlurFade, NumberTicker, BorderBeam } from "@/components/magic";
import { CardSpotlight } from "@/components/aceternity";
import {
  labHealth, labModels, labStatistics, LAB_URL, LAB_CONFIGURED,
} from "@/lib/lab-api";
import { scorePhishing, topContributions, VOCAB_SIZE } from "@/lib/phishing";

/* Each model gets an icon that names its modality, so the registry reads as a
   set of surfaces rather than a list of filenames. */
/* The registry is a property of the artifacts, not of the service, so it is
   described here rather than fetched. A live connection confirms load state;
   it does not supply the list. That keeps the page complete when the service
   is asleep, which on a free tier it usually is. */
const REGISTRY = [
  { name: "phishing", Icon: Envelope, label: "Phishing text",
    modality: "TF-IDF + Logistic Regression", features: "6,499-term vocabulary",
    drivable: true,
    note: "Runs in your browser from the exported weights. Takes raw text, so nothing else is required." },
  { name: "transaction", Icon: CreditCard, label: "Transaction fraud",
    modality: "Tabular · LightGBM", features: "21 features",
    drivable: false,
    note: "Trained on the IEEE-CIS schema. The red-team generator emits a different shape, so its payloads are not scoreable by this model." },
  { name: "voice", Icon: Waveform, label: "Synthetic voice",
    modality: "Audio MFCC · LightGBM", features: "74 features",
    drivable: false,
    note: "Needs audio feature extraction at 24 kHz; no extractor ships with the system." },
  { name: "deepfake", Icon: VideoCamera, label: "Deepfake video",
    modality: "Video features · LightGBM", features: "86 features",
    drivable: false,
    note: "Needs the original 86-feature video extractor; no extractor ships with the system." },
  { name: "kyc", Icon: IdentificationCard, label: "KYC document fraud",
    modality: "Image stats · LightGBM", features: "23 features",
    drivable: false,
    note: "Needs image statistics from the original pipeline; no extractor ships with the system." },
  { name: "ato", Icon: Fingerprint, label: "Account takeover",
    modality: "Keystroke dynamics · LightGBM", features: "19 features",
    drivable: false,
    note: "Needs personalised behavioural deviation features captured from a live session." },
];

const SAMPLES = [
  "Dear customer, your account is suspended. Verify at http://sbi-secure-verify.tk/login within 24 hours to avoid closure.",
  "Hey, sending over the invoice for last month. Let me know if the totals look right before I file it.",
  "URGENT: Your KYC has expired. Enter your UPI PIN now to reactivate or your account will be frozen permanently.",
];

export default function Lab() {
  const [health, setHealth] = useState(null);
  const [models, setModels] = useState(null);
  const [stats, setStats] = useState(null);
  const [booting, setBooting] = useState(true);

  const [text, setText] = useState(SAMPLES[0]);
  const [verdict, setVerdict] = useState(null);

  const connect = useCallback(async () => {
    setBooting(true);
    const [h, m, s] = await Promise.all([labHealth(), labModels(), labStatistics()]);
    setHealth(h);
    setModels(m.ok ? m.data : null);
    setStats(s.ok ? s.data : null);
    setBooting(false);
  }, []);

  useEffect(() => { connect(); }, [connect]);

  // Runs in the browser against the exported scikit-learn weights, so it works
  // whether or not the Python service is up. Parity with sklearn is asserted
  // in tools/checks/phishingcheck.mjs (largest divergence 7.8e-8).
  const analyse = () => {
    if (!text.trim()) return;
    const t = text.trim();
    setVerdict({ ...scorePhishing(t), terms: topContributions(t, 6) });
  };

  const online = health?.ok;
  const loaded = models?.models?.filter((m) => m.loaded).length ?? 0;

  return (
    <Shell>
      <div className="space-y-8">
        <PageHero>
          <PageHead
            kicker="Blue team · Defense Lab"
            title="Six trained models, one you can drive"
            highlight="one you can drive"
            action={
              <button type="button" onClick={connect} disabled={booting} className="btn">
                {booting ? <><Spinner /> Connecting</> : <><ArrowsClockwise size={14} weight="bold" /> Reconnect</>}
              </button>
            }
          >
            Six trained model artifacts sit behind this product. The phishing
            classifier runs here in your browser from its exported weights, so it
            always works. The other five need feature extractors a browser cannot
            provide, and this page says so rather than inventing a score.
          </PageHead>
        </PageHero>

        {/* ── Status. The service is an enhancement, so its absence is a note,
              not an alarm. ─────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-3">
          <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12px] ${
            online
              ? "border-caught/40 bg-caught/10 text-caught"
              : "border-white/12 bg-white/[0.03] text-fg-subtle"}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${online ? "bg-caught" : "bg-fg-subtle"}`} />
            {booting ? "Checking the Python service…"
              : online ? `Python service connected · ${loaded}/6 artifacts loaded`
              : LAB_CONFIGURED
                ? "Python service asleep · the classifier below is unaffected"
                : "Running standalone · the classifier below runs in your browser"}
          </span>
          {!booting && !online && LAB_CONFIGURED ? (
            <button type="button" onClick={connect} className="btn btn-sm">
              <ArrowsClockwise size={12} weight="bold" /> Retry
            </button>
          ) : null}
          {online && stats ? (
            <span className="caption font-mono">
              {stats.total_transactions.toLocaleString()} transactions ·{" "}
              {stats.total_customers} customers · {stats.total_merchants} merchants
            </span>
          ) : null}
        </div>

        {/* ── The one model a browser can drive ─────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-signal/15 text-signal ring-1 ring-signal/40">
              <Brain size={17} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="text-h2">Phishing classifier, live</h2>
              <p className="prose-measure mt-1 text-body-sm text-fg-subtle">
                The trained scikit-learn model, running in your browser: TF-IDF over
                its saved {VOCAB_SIZE.toLocaleString()}-term vocabulary, then logistic
                regression. No network call, so it works whether or not the service
                above is awake.
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-12">
            <Panel title="Message" className="lg:col-span-7">
              <div className="space-y-3">
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  rows={5}
                  aria-label="Message to classify"
                  className="field w-full resize-y font-mono text-[12px] leading-relaxed"
                  placeholder="Paste a suspicious message…"
                />
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={analyse} className="btn btn-primary">
                    <Play size={13} weight="fill" /> Analyse
                  </button>
                  <span className="caption">or try</span>
                  {SAMPLES.map((sample, i) => (
                    <button key={i} type="button" onClick={() => { setText(sample); setVerdict(null); }}
                      className="btn btn-sm">
                      {i === 1 ? "Legitimate" : `Scam ${i === 0 ? "1" : "2"}`}
                    </button>
                  ))}
                </div>
              </div>
            </Panel>

            <Panel title="Model verdict" className="lg:col-span-5">
              {verdict ? (
                <BlurFade key={verdict.fraud_probability}>
                  <div className="relative overflow-hidden rounded-lg border p-5"
                    style={{
                      borderColor: verdict.prediction === "fraud"
                        ? "rgb(251 110 104 / 0.45)" : "rgb(53 214 164 / 0.45)",
                      background: verdict.prediction === "fraud"
                        ? "rgb(251 110 104 / 0.07)" : "rgb(53 214 164 / 0.07)",
                    }}>
                    <BorderBeam
                      colorFrom={verdict.prediction === "fraud" ? "#fb6e68" : "#35d6a4"}
                      colorTo="var(--color-signal)" />
                    <p className="overline">Prediction</p>
                    <p className={`mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                      verdict.prediction === "fraud" ? "text-evaded" : "text-caught"}`}>
                      <NumberTicker value={verdict.fraud_probability * 100} decimalPlaces={1} suffix="%" />
                    </p>
                    <p className="mt-2 text-body-sm text-fg-muted">
                      probability this is <span className="font-medium text-fg">
                        {verdict.prediction === "fraud" ? "phishing" : "legitimate"}
                      </span> · {verdict.matched_terms} of {verdict.vocabulary.toLocaleString()} vocabulary terms matched
                    </p>

                    {verdict.terms?.length ? (
                      <div className="mt-4 border-t border-white/10 pt-3">
                        <p className="overline mb-2">Strongest signals</p>
                        <div className="flex flex-wrap gap-1.5">
                          {verdict.terms.map((t) => (
                            <span key={t.term}
                              className={`rounded-full border px-2 py-0.5 font-mono text-[11px] ${
                                t.weight > 0
                                  ? "border-evaded/40 bg-evaded/10 text-evaded"
                                  : "border-caught/40 bg-caught/10 text-caught"}`}>
                              {t.term} {t.weight > 0 ? "+" : ""}{t.weight.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </BlurFade>
              ) : (
                <p className="text-body-sm text-fg-subtle">
                  Analyse a message to see the model&apos;s probability.
                </p>
              )}
            </Panel>
          </div>
        </section>

        {/* ── The registry, and what each model honestly needs ──────────── */}
        <section className="space-y-4">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-flame/15 text-flame ring-1 ring-flame/40">
              <ShieldWarning size={17} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="text-h2">Model registry</h2>
              <p className="prose-measure mt-1 text-body-sm text-fg-subtle">
                All six artifacts load. Only one takes an input a browser can produce —
                the rest need audio, video, image or keystroke feature extractors that
                are not part of this system. That gap is reported rather than papered over.
              </p>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {REGISTRY.map((m, i) => {
              const { Icon } = m;
              const live = models?.models?.find((x) => x.name === m.name);
              return (
                <BlurFade key={m.name} delay={i * 0.05}>
                  <CardSpotlight className="h-full rounded-lg">
                    <article className={`card corner-node relative z-1 flex h-full flex-col p-5 ${
                      m.drivable ? "border-signal/40" : ""}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${
                          m.drivable
                            ? "bg-signal/15 text-signal ring-signal/40"
                            : "bg-inset text-fg-subtle ring-white/10"}`}>
                          <Icon size={17} weight="bold" />
                        </span>
                        {live?.loaded ? (
                          <span className="caption rounded-full bg-caught/12 px-2 py-0.5 text-caught">
                            verified live
                          </span>
                        ) : m.drivable ? (
                          <span className="caption rounded-full bg-signal/12 px-2 py-0.5 text-signal-text">
                            in browser
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-3 text-h3">{m.label}</h3>
                      <p className="caption mt-1">{m.modality}</p>
                      <p className="mt-3 flex-1 text-body-sm text-fg-muted">{m.note}</p>
                      <p className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                        <span className="caption font-mono">{m.features}</span>
                        <span className={`caption font-medium ${
                          m.drivable ? "text-signal-text" : "text-fg-subtle"}`}>
                          {m.drivable ? "drivable here" : "needs extractor"}
                        </span>
                      </p>
                    </article>
                  </CardSpotlight>
                </BlurFade>
              );
            })}
          </div>
        </section>

        <Footnote>
          The phishing classifier runs entirely in the browser: its scikit-learn
          weights are exported to JSON and the TF-IDF and logistic-regression
          arithmetic is reimplemented in JavaScript. Parity with scikit-learn is
          asserted in CI — the largest divergence across the test corpus is 7.8e-8,
          which is float rounding rather than a difference in behaviour. The Python
          service ({LAB_URL}) adds the attack generator and live artifact
          verification, and nothing on this page requires it.
        </Footnote>
      </div>
    </Shell>
  );
}
