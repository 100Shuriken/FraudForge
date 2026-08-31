"use client";

import { useEffect, useRef, useState } from "react";
import { UploadSimple, ImageSquare, CheckCircle, WarningOctagon, Sparkle } from "@phosphor-icons/react";
import { Panel, Spinner } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { score } from "@/lib/lgbm";
import { extractImageFeatures, loadImage } from "@/lib/image-features";
import domain from "@/lib/models/kyc-domain.json";

/**
 * How much of this image the model is actually equipped to judge.
 *
 * A boosted ensemble only learned anything inside the range its training data
 * covered. Hand it a value outside every threshold it ever split a feature at
 * and every tree takes the same branch, so the output stops depending on that
 * feature. Enough of those and the answer is a constant, which is
 * indistinguishable from a confident verdict.
 *
 * That is what happens here. The config names all 23 features but does not
 * define them, and "Tenengrad" and "Noise Diff" each have several standard
 * definitions that differ by orders of magnitude. This extractor computes the
 * textbook one for each; the training pipeline evidently computed something
 * else, because the model splits Tenengrad only over [66, 70] where a document
 * measures in the thousands.
 *
 * So the panel measures the overlap and says so, rather than reporting a
 * percentage that looks like the real ones elsewhere on this page.
 */
function coverage(features) {
  const checked = domain.features.filter((f) => f.splits > 0);
  const inside = checked.filter((f) => {
    const v = features[f.name];
    return typeof v === "number" && v >= f.lo && v <= f.hi;
  });
  return {
    inside: inside.length,
    total: checked.length,
    outside: checked.filter((f) => !inside.includes(f)),
  };
}

/* Shown alongside the verdict, because the interesting part of this model is
   that its inputs are legible: a reader can look at the focus and noise
   numbers and form their own view. */
const HIGHLIGHT = [
  ["Laplacian Var", "focus", (v) => v?.toFixed(1) ?? "—"],
  ["Tenengrad", "gradient energy", (v) => v?.toFixed(1) ?? "—"],
  ["Edge Density", "edges", (v) => `${((v ?? 0) * 100).toFixed(1)}%`],
  ["Noise Diff H", "noise (h)", (v) => v?.toFixed(1) ?? "—"],
  ["Texture Var Mean", "texture", (v) => v?.toFixed(1) ?? "—"],
  ["Brightness Mean", "brightness", (v) => v?.toFixed(1) ?? "—"],
];

/**
 * Two feature vectors set by hand inside the range the model was trained on.
 *
 * These are NOT measurements of any document. No image was captured, and
 * nothing here was extracted from one. They exist because the model does work
 * when its inputs land where it learned: sampling 4,000 vectors inside its own
 * split ranges, 40% come out below the decision threshold and the output spans
 * the full 0 to 1. That is worth being able to show, given that a real
 * uploaded image cannot currently demonstrate it.
 *
 * They were originally labelled as camera captures of a genuine and a forged
 * ID, which presented invented numbers as evidence. The numbers are unchanged;
 * the labels now say what they are.
 */
const PRESETS = [
  {
    label: "Vector inside the trained range",
    desc: "Hand-set values, not a measurement. Shows the model responding when its inputs land where it learned.",
    features: {
      Width: 2400, Height: 1600, "Aspect Ratio": 1.5,
      "Brightness Mean": 185.0, "Brightness Std": 58.0, "Brightness Median": 192.0, "Brightness Min": 0, "Brightness Max": 255,
      B_Mean: 180.0, B_Std: 76.0, G_Mean: 185.0, G_Std: 60.0, R_Mean: 190.0, R_Std: 54.0,
      "Laplacian Var": 980.0, Tenengrad: 69.5, "Edge Density": 0.096,
      "Texture Var Mean": 1750.0, "Texture Var Std": 2150.0,
      "Hist Skewness": -2.15, "Hist Kurtosis": 3.6,
      "Noise Diff H": 114.0, "Noise Diff V": 112.5,
    },
  },
  {
    label: "Vector shifted toward tampering",
    desc: "The same hand-set vector with focus, edge density and noise reduced. Also not a measurement.",
    features: {
      Width: 1920, Height: 1080, "Aspect Ratio": 1.77,
      "Brightness Mean": 180.0, "Brightness Std": 40.0, "Brightness Median": 185.0, "Brightness Min": 10, "Brightness Max": 240,
      B_Mean: 175.0, B_Std: 50.0, G_Mean: 180.0, G_Std: 42.0, R_Mean: 185.0, R_Std: 40.0,
      "Laplacian Var": 600.0, Tenengrad: 52.0, "Edge Density": 0.06,
      "Texture Var Mean": 1200.0, "Texture Var Std": 1500.0,
      "Hist Skewness": -1.4, "Hist Kurtosis": 2.0,
      "Noise Diff H": 88.0, "Noise Diff V": 84.0,
    },
  },
];

/**
 * KYC document fraud, driven by a real image or benchmark presets.
 */
export default function KycPanel({ model }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [features, setFeatures] = useState(null);
  const [result, setResult] = useState(null);
  const [cover, setCover] = useState(null);
  const input = useRef(null);

  // Mirrors the live preview URL so unmount cleanup does not re-run on every upload
  const previewRef = useRef(null);
  previewRef.current = preview?.src ?? null;

  useEffect(
    () => () => {
      if (previewRef.current) URL.revokeObjectURL(previewRef.current);
    },
    []
  );

  const handle = async (file) => {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const { img, url } = await loadImage(file);
      const f = extractImageFeatures(img);
      setPreview((prev) => {
        if (prev?.src) URL.revokeObjectURL(prev.src);
        return { src: url, name: file.name, w: f.Width, h: f.Height };
      });
      setFeatures(f);
      setResult(score(model, f));
      setCover(coverage(f));
    } catch (e) {
      setError(e.message || "That image could not be read.");
      setResult(null);
      setFeatures(null);
    } finally {
      setBusy(false);
    }
  };

  const loadPreset = (preset) => {
    setPreview(null);
    setError(null);
    setFeatures(preset.features);
    setResult(score(model, preset.features));
  };

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Document image" className="lg:col-span-7">
        <div className="space-y-4">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handle(e.dataTransfer.files?.[0]);
            }}
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-inset/60 px-6 py-8 text-center transition-colors hover:border-signal/40"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.src}
                alt={`Uploaded document, ${preview.w} by ${preview.h} pixels`}
                className="max-h-48 rounded-md border border-white/10 shadow-lg object-contain"
              />
            ) : (
              <span className="grid h-12 w-12 place-items-center rounded-lg bg-white/[0.04] text-fg-subtle">
                <ImageSquare size={24} />
              </span>
            )}

            <p className="mt-3 text-body-sm text-fg-muted">
              {preview
                ? `${preview.name} · ${preview.w}×${preview.h}`
                : "Drop a document photo here, or choose a file"}
            </p>

            <button
              type="button"
              onClick={() => input.current?.click()}
              className="btn btn-primary mt-4"
              disabled={busy}
            >
              {busy ? (
                <>
                  <Spinner /> Measuring image...
                </>
              ) : (
                <>
                  <UploadSimple size={15} weight="bold" /> Choose image
                </>
              )}
            </button>

            <input
              ref={input}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handle(e.target.files?.[0])}
            />
          </div>

          {/* Quick preset tests */}
          <div>
            <p className="overline mb-2">Or drive the model with a stated vector</p>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {PRESETS.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => loadPreset(p)}
                  className="flex flex-col items-start gap-1 rounded-md border border-edge bg-inset/40 p-3 text-left transition-colors hover:border-signal/40 hover:bg-overlay"
                >
                  <span className="flex items-center gap-1.5 text-[13px] font-semibold text-fg">
                    <Sparkle size={13} weight="fill" className="text-signal" />
                    {p.label}
                  </span>
                  <span className="caption leading-tight text-fg-subtle">{p.desc}</span>
                </button>
              ))}
            </div>
            <p className="caption mt-2">
              Neither of these is a measurement of a document. They are feature
              vectors set by hand inside the range the model was trained on,
              included because an uploaded image currently lands outside it.
            </p>
          </div>

          {error ? <p className="text-body-sm text-evaded">{error}</p> : null}

          <p className="caption border-t border-white/10 pt-3">
            The image is decoded to an in-memory canvas, measured locally, and discarded. Nothing is
            uploaded to any server. The LightGBM classifier runs 100% in your browser.
          </p>
        </div>
      </Panel>

      <Panel title="Model verdict" className="lg:col-span-5">
        {result && features ? (
          <BlurFade key={result.probability}>
            <div
              className="relative overflow-hidden rounded-lg border p-5"
              style={{
                borderColor:
                  result.prediction === "fraud"
                    ? "rgb(251 110 104 / 0.45)"
                    : "rgb(53 214 164 / 0.45)",
                background:
                  result.prediction === "fraud"
                    ? "rgb(251 110 104 / 0.07)"
                    : "rgb(53 214 164 / 0.07)",
              }}
            >
              <BorderBeam
                colorFrom={result.prediction === "fraud" ? "#fb6e68" : "#35d6a4"}
                colorTo="var(--color-signal)"
              />
              <div className="flex items-center justify-between">
                <p className="overline">Document Classification</p>
                <span
                  className={`inline-flex items-center gap-1 rounded px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-wider ${
                    result.prediction === "fraud"
                      ? "bg-evaded/15 text-evaded ring-1 ring-evaded/30"
                      : "bg-caught/15 text-caught ring-1 ring-caught/30"
                  }`}
                >
                  {result.prediction === "fraud" ? (
                    <>
                      <WarningOctagon size={13} weight="bold" /> Forged / Tampered
                    </>
                  ) : (
                    <>
                      <CheckCircle size={13} weight="bold" /> Genuine / Legitimate
                    </>
                  )}
                </span>
              </div>

              <p
                className={`mt-2 font-mono text-[36px] leading-none font-semibold tracking-tight ${
                  result.prediction === "fraud" ? "text-evaded" : "text-caught"
                }`}
              >
                {(result.probability * 100).toFixed(1)}%
              </p>
              <p className="caption mt-2 text-fg-subtle">
                {result.supplied} of {result.features} features measured · decision
                threshold {result.threshold.toFixed(2)}
              </p>

              {cover && cover.inside < cover.total * 0.6 ? (
                <div className="mt-3 rounded-md border border-review/35 bg-review/10 px-3 py-2">
                  <p className="text-body-sm text-fg-muted">
                    <span className="font-medium text-review">
                      Read this number with care.
                    </span>{" "}
                    Only {cover.inside} of {cover.total} measured features land
                    inside the range this model was trained on, so most of its
                    trees are taking the same branch whatever the image shows.
                    The percentage above is the model’s real output, but it is
                    not a reliable verdict about this document.
                  </p>
                </div>
              ) : null}

              <div className="mt-4 border-t border-white/10 pt-3">
                <p className="overline mb-2">Measured Image Statistics</p>
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
              </div>
            </div>
          </BlurFade>
        ) : (
          <div className="space-y-3">
            <p className="text-body-sm text-fg-subtle">
              Upload a document image or select a forensic reference sample above. The browser will
              extract 23 statistical descriptors (Sobel gradient energy, local texture variance,
              Laplacian focus, and noise difference) and evaluate them through the trained LightGBM
              trees.
            </p>
          </div>
        )}
      </Panel>
    </div>
  );
}
