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
  labHealth, labModels, labPhishing, labStatistics, LAB_URL,
} from "@/lib/lab-api";

/* Each model gets an icon that names its modality, so the registry reads as a
   set of surfaces rather than a list of filenames. */
const MODEL_META = {
  transaction: { Icon: CreditCard, label: "Transaction fraud", modality: "Tabular · LightGBM" },
  phishing: { Icon: Envelope, label: "Phishing text", modality: "TF-IDF + Logistic Regression" },
  voice: { Icon: Waveform, label: "Synthetic voice", modality: "Audio MFCC · LightGBM" },
  deepfake: { Icon: VideoCamera, label: "Deepfake video", modality: "Video features · LightGBM" },
  kyc: { Icon: IdentificationCard, label: "KYC document fraud", modality: "Image stats · LightGBM" },
  ato: { Icon: Fingerprint, label: "Account takeover", modality: "Keystroke dynamics · LightGBM" },
};

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
  const [scoring, setScoring] = useState(false);

  const connect = useCallback(async () => {
    setBooting(true);
    const [h, m, s] = await Promise.all([labHealth(), labModels(), labStatistics()]);
    setHealth(h);
    setModels(m.ok ? m.data : null);
    setStats(s.ok ? s.data : null);
    setBooting(false);
  }, []);

  useEffect(() => { connect(); }, [connect]);

  const analyse = async () => {
    if (!text.trim()) return;
    setScoring(true);
    const r = await labPhishing(text.trim());
    setVerdict(r.ok ? r.data : { error: r.error });
    setScoring(false);
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
            The defensive half of the system runs as a separate Python service with
            six trained model artifacts. This page talks to it live. Where a model
            cannot be driven from a browser, it says so rather than inventing a score.
          </PageHead>
        </PageHero>

        {/* ── Service status ───────────────────────────────────────────── */}
        {booting ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="card p-4">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="mt-3 h-6 w-24" />
              </div>
            ))}
          </div>
        ) : online ? (
          <BlurFade>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Stat emphasis label="Models loaded" value={`${loaded}/${models?.total ?? 6}`}
                note="LightGBM + scikit-learn artifacts" tone="caught" />
              <Stat label="Planner mode" value={health.data.planner_mode === "OFFLINE FALLBACK" ? "Offline" : "LLM"}
                note="deterministic, no credentials required" />
              <Stat label="Corpus transactions"
                value={stats ? stats.total_transactions.toLocaleString() : "—"}
                note={stats ? `${stats.total_customers} customers, ${stats.total_merchants} merchants` : ""} />
              <Stat label="Browser-drivable" value={models?.browser_drivable?.length ?? 0}
                note="the rest need feature extractors" tone="review" />
            </div>
          </BlurFade>
        ) : (
          <EmptyState Icon={Warning} title="The lab service is not reachable"
            action={
              <button type="button" onClick={connect} className="btn btn-primary">
                <ArrowsClockwise size={14} weight="bold" /> Try again
              </button>
            }>
            {health?.error} The rest of FraudForge is self-contained and unaffected —
            every other page computes in-process. Expecting <span className="font-mono text-signal-text">{LAB_URL}</span>.
          </EmptyState>
        )}

        {/* ── The one model a browser can drive ─────────────────────────── */}
        <section className="space-y-4">
          <div className="flex items-start gap-3.5">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-signal/15 text-signal ring-1 ring-signal/40">
              <Brain size={17} weight="bold" />
            </span>
            <div className="min-w-0">
              <h2 className="text-h2">Phishing classifier, live</h2>
              <p className="prose-measure mt-1 text-body-sm text-fg-subtle">
                Real inference against the trained artifact: TF-IDF over a saved
                6,499-dimension vocabulary, then logistic regression. Type anything.
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
                  <button type="button" onClick={analyse} disabled={scoring || !online}
                    className="btn btn-primary">
                    {scoring ? <><Spinner /> Scoring</> : <><Play size={13} weight="fill" /> Analyse</>}
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
              {!online ? (
                <p className="text-body-sm text-fg-subtle">Service offline.</p>
              ) : scoring ? (
                <div className="space-y-3"><Skeleton className="h-16 w-full" /><Skeleton className="h-3 w-32" /></div>
              ) : verdict?.error ? (
                <p className="text-body-sm text-evaded">{verdict.error}</p>
              ) : verdict ? (
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
                      </span> · {verdict.characters} characters
                    </p>
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

          {models ? (
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {models.models.map((m, i) => {
                const meta = MODEL_META[m.name] || { Icon: Brain, label: m.name, modality: "" };
                const { Icon } = meta;
                return (
                  <BlurFade key={m.name} delay={i * 0.05}>
                    <CardSpotlight className="h-full rounded-lg">
                      <article className={`card corner-node relative z-1 flex h-full flex-col p-5 ${
                        m.browser_drivable ? "border-signal/40" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ring-1 ${
                            m.browser_drivable
                              ? "bg-signal/15 text-signal ring-signal/40"
                              : "bg-inset text-fg-subtle ring-white/10"}`}>
                            <Icon size={17} weight="bold" />
                          </span>
                          <span className={`caption rounded-full px-2 py-0.5 ${
                            m.loaded ? "bg-caught/12 text-caught" : "bg-evaded/12 text-evaded"}`}>
                            {m.loaded ? "loaded" : "missing"}
                          </span>
                        </div>
                        <h3 className="mt-3 text-h3">{meta.label}</h3>
                        <p className="caption mt-1">{meta.modality}</p>
                        <p className="mt-3 flex-1 text-body-sm text-fg-muted">
                          {m.preprocessing || m.feature_note}
                        </p>
                        <p className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                          <span className="caption font-mono">
                            {m.feature_count ? `${m.feature_count} features` : m.feature_note ? "TF-IDF vocab" : "—"}
                          </span>
                          <span className={`caption font-medium ${
                            m.browser_drivable ? "text-signal-text" : "text-fg-subtle"}`}>
                            {m.browser_drivable ? "drivable here" : "needs extractor"}
                          </span>
                        </p>
                      </article>
                    </CardSpotlight>
                  </BlurFade>
                );
              })}
            </div>
          ) : !booting ? (
            <EmptyState Icon={Brain} title="Registry unavailable">
              The service must be reachable to enumerate its models.
            </EmptyState>
          ) : null}
        </section>

        <Footnote>
          The lab runs as a separate Python service ({LAB_URL}) because Vercel has no
          Python runtime. Every other page in FraudForge computes in-process and is
          unaffected when this service is asleep. Models are LightGBM and
          scikit-learn artifacts loaded from disk; no training happens at request time.
        </Footnote>
      </div>
    </Shell>
  );
}
