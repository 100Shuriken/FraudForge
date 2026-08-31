"use client";

import { useEffect, useRef, useState } from "react";
import { Microphone, Stop, UploadSimple, Waveform } from "@phosphor-icons/react";
import { Panel, Spinner } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { score } from "@/lib/lgbm";
import { decodeAudio, extractAudioFeatures, SAMPLE_RATE } from "@/lib/audio-features";

/* Shown beside the verdict. Chosen because a reader can sanity-check them
   against what they just said: brightness, loudness and the first two cepstral
   coefficients move visibly between a shout and a mumble. */
const HIGHLIGHT = [
  ["spectral_centroid_mean", "brightness", (v) => `${v.toFixed(0)} Hz`],
  ["spectral_bandwidth_mean", "bandwidth", (v) => `${v.toFixed(0)} Hz`],
  ["spectral_rolloff_mean", "rolloff", (v) => `${v.toFixed(0)} Hz`],
  ["zero_crossing_rate_mean", "zero crossings", (v) => v.toFixed(4)],
  ["rms_mean", "loudness (rms)", (v) => v.toFixed(4)],
  ["mfcc_1_mean", "mfcc 1", (v) => v.toFixed(1)],
];

/**
 * Synthetic voice, driven by real audio.
 *
 * The artifact names all 74 features and states the sample rate, so the
 * extractor is fully specified as a definition: 20 MFCCs, 12 chroma bins, and
 * mean/std pairs for the usual spectral statistics. What it does not state is
 * the framing, so lib/audio-features.js uses librosa's defaults and the panel
 * says so — that is the one assumption in the chain and it should be visible
 * rather than buried.
 *
 * Recording and decoding both happen here. Nothing is uploaded.
 *
 * One thing this panel has to say out loud: the artifact is saturated. It
 * returns a synthetic probability above 99% for every input tested, including
 * ones that are not speech at all, and a sweep of 4,000 vectors across a wide
 * box around real extracted values never once falls below its own tuned
 * threshold. That is a property of the model, not of this port — scoring the
 * same vectors in Python gives the same numbers to three decimal places. The
 * panel shows the real output and says how to read it, because a page that
 * quietly reported 99% on everything would look like it was working.
 */
export default function VoicePanel({ model }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [clip, setClip] = useState(null);
  const [features, setFeatures] = useState(null);
  const [result, setResult] = useState(null);
  const [recording, setRecording] = useState(false);

  const input = useRef(null);
  const recorder = useRef(null);
  const chunks = useRef([]);

  // Stop the microphone if the panel goes away mid-recording.
  useEffect(
    () => () => {
      recorder.current?.stream?.getTracks().forEach((t) => t.stop());
    },
    []
  );

  const run = async (file, label) => {
    setBusy(true);
    setError(null);
    try {
      const { signal, duration, sourceRate, channels } = await decodeAudio(file);
      if (signal.length < 4096) {
        throw new Error("That clip is too short to measure — try at least half a second.");
      }
      const f = extractAudioFeatures(signal, SAMPLE_RATE);
      setClip({ label, duration, sourceRate, channels, samples: signal.length });
      setFeatures(f);
      setResult(score(model, f));
    } catch (e) {
      setError(e.message || "That audio could not be decoded.");
      setResult(null);
      setFeatures(null);
    } finally {
      setBusy(false);
    }
  };

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks.current, { type: rec.mimeType });
        run(blob, "Recorded clip");
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("The microphone is not available. You can upload a file instead.");
    }
  };

  const stopRecording = () => {
    recorder.current?.stop();
    setRecording(false);
  };

  const fraud = result?.prediction === "fraud";

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Audio" className="lg:col-span-7">
        <div className="space-y-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              const f = e.dataTransfer.files?.[0];
              if (f) run(f, f.name);
            }}
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-inset/60 px-6 py-8 text-center"
          >
            <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/[0.04] text-fg-subtle">
              <Waveform size={20} />
            </span>

            <p className="mt-3 text-body-sm text-fg-muted">
              {clip
                ? `${clip.label} · ${clip.duration.toFixed(2)}s · ${clip.sourceRate} Hz → ${SAMPLE_RATE} Hz`
                : "Record a few seconds, drop an audio file, or choose one"}
            </p>

            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {recording ? (
                <button type="button" onClick={stopRecording} className="btn btn-primary">
                  <Stop size={14} weight="fill" /> Stop recording
                </button>
              ) : (
                <button
                  type="button"
                  onClick={startRecording}
                  className="btn btn-primary"
                  disabled={busy}
                >
                  <Microphone size={14} weight="bold" /> Record
                </button>
              )}
              <button
                type="button"
                onClick={() => input.current?.click()}
                className="btn btn-sm"
                disabled={busy || recording}
              >
                {busy ? (
                  <>
                    <Spinner /> Measuring
                  </>
                ) : (
                  <>
                    <UploadSimple size={13} weight="bold" /> Choose file
                  </>
                )}
              </button>
            </div>

            <input
              ref={input}
              type="file"
              accept="audio/*"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) run(f, f.name);
              }}
            />
          </div>

          {error ? <p className="text-body-sm text-evaded">{error}</p> : null}

          <p className="caption border-t border-white/10 pt-3">
            The clip is decoded, resampled to {SAMPLE_RATE.toLocaleString()} Hz and
            measured in this tab. Nothing is uploaded. The artifact names all 74
            features and the sample rate but not the framing, so this uses
            librosa&apos;s defaults — n_fft 2048, hop 512, 128 mel bands — which
            is checked against librosa itself in CI.
          </p>

          <div className="rounded-lg border border-review/30 bg-review/[0.06] p-4">
            <p className="overline text-review">Finding: this model is saturated</p>
            <div className="mt-2 space-y-2 text-body-sm text-fg-muted">
              <p>
                The extraction is verified — all 74 features match librosa to
                6.7e-8, and the same vectors scored in Python return the same
                probabilities to three decimal places. The model is what is
                unusual.
              </p>
              <p>
                It returns above 99% synthetic for everything tested, including
                alarm tones that contain no voice at all. Sweeping 4,000 feature
                vectors across a wide box around real extracted values, it never
                once fell below its own tuned threshold of{" "}
                <span className="font-mono text-fg">0.3154</span> — asserted in
                CI, so this sentence fails the build if it stops being true.
              </p>
              <p className="text-fg">
                So it cannot currently separate a real voice from a synthetic
                one. That is worth showing rather than hiding: the panel is
                driving the real artifact, and this is what the real artifact
                does.
              </p>
            </div>
          </div>
        </div>
      </Panel>

      <Panel title="Model verdict" className="lg:col-span-5">
        {result && features ? (
          <BlurFade key={result.probability}>
            <div
              className="relative overflow-hidden rounded-lg border p-5"
              style={{
                borderColor: fraud ? "rgb(251 110 104 / 0.45)" : "rgb(53 214 164 / 0.45)",
                background: fraud ? "rgb(251 110 104 / 0.07)" : "rgb(53 214 164 / 0.07)",
              }}
            >
              <BorderBeam
                colorFrom={fraud ? "#fb6e68" : "#35d6a4"}
                colorTo="var(--color-signal)"
              />
              <p className="overline">Synthetic voice likelihood</p>
              <p
                className={`mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                  fraud ? "text-evaded" : "text-caught"
                }`}
              >
                {(result.probability * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-body-sm text-fg-muted">
                {result.supplied} of {result.features} features measured ·
                threshold {result.threshold.toFixed(4)}
              </p>

              <p className="mt-3 rounded-md border border-review/35 bg-review/10 px-3 py-2 text-body-sm text-fg-muted">
                <span className="font-medium text-review">Read this with care.</span>{" "}
                This artifact says <em>synthetic</em> to almost everything — see
                the note below. The number above is the model’s real output; it is
                not a reliable verdict about your clip.
              </p>

              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="overline mb-2">What was measured</p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                  {HIGHLIGHT.map(([key, label, fmt]) => (
                    <div key={key} className="flex items-baseline justify-between gap-2">
                      <dt className="caption">{label}</dt>
                      <dd className="font-mono text-[12px] text-fg tabular-nums">
                        {fmt(features[key])}
                      </dd>
                    </div>
                  ))}
                </dl>
                <p className="caption mt-2">
                  Plus 20 MFCC and 12 chroma mean/std pairs.
                </p>
              </div>
            </div>
          </BlurFade>
        ) : (
          <p className="text-body-sm text-fg-subtle">
            Record or upload a clip and the browser will compute all 74
            statistics the model was trained on, then score them.
          </p>
        )}
      </Panel>
    </div>
  );
}
