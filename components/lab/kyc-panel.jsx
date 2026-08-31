"use client";

import { useEffect, useRef, useState } from "react";
import { UploadSimple, ImageSquare, CheckCircle, WarningOctagon, Sparkle } from "@phosphor-icons/react";
import { Panel, Spinner } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { score } from "@/lib/lgbm";
import { extractImageFeatures, loadImage } from "@/lib/image-features";

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

const PRESETS = [
  {
    label: "Legit National ID",
    desc: "Crisp camera capture with natural paper fiber & sensor grain",
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
    label: "Tampered / Forged ID",
    desc: "Digital text replacement with blurred boundaries & suppressed noise",
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
            <p className="overline mb-2">Or test reference forensic samples</p>
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
              <p className="mt-2 text-body-sm text-fg-muted">
                {result.prediction === "fraud"
                  ? "Elevated likelihood of digital tampering, splicing, or noise suppression."
                  : "Consistent with camera sensor PRNU noise, natural focus & paper substrate."}
              </p>
              <p className="caption mt-1 text-fg-subtle">
                {result.supplied} of {result.features} features evaluated · decision threshold{" "}
                {result.threshold.toFixed(2)}
              </p>

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
