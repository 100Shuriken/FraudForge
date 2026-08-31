"use client";

import { useEffect, useRef, useState } from "react";
import { UploadSimple, ImageSquare } from "@phosphor-icons/react";
import { Panel, Spinner } from "@/components/shell";
import { BlurFade, BorderBeam } from "@/components/magic";
import { score } from "@/lib/lgbm";
import { extractImageFeatures, loadImage } from "@/lib/image-features";

/* Shown alongside the verdict, because the interesting part of this model is
   that its inputs are legible: a reader can look at the focus and noise
   numbers and form their own view. */
const HIGHLIGHT = [
  ["Laplacian Var", "focus", (v) => v.toFixed(1)],
  ["Tenengrad", "gradient energy", (v) => v.toFixed(0)],
  ["Edge Density", "edges", (v) => `${(v * 100).toFixed(1)}%`],
  ["Noise Diff H", "noise (h)", (v) => v.toFixed(2)],
  ["Texture Var Mean", "texture", (v) => v.toFixed(1)],
  ["Brightness Mean", "brightness", (v) => v.toFixed(1)],
];

/**
 * KYC document fraud, driven by a real image.
 *
 * The model's config names all 23 of its features and every one is an ordinary
 * image statistic, so the extractor can be rebuilt exactly — see
 * lib/image-features.js. Drop in a document photo and the browser computes the
 * same measurements the training pipeline did, then scores them.
 *
 * The file never leaves the machine: it is decoded to a canvas, measured, and
 * discarded.
 */
export default function KycPanel({ model }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [preview, setPreview] = useState(null);
  const [features, setFeatures] = useState(null);
  const [result, setResult] = useState(null);
  const input = useRef(null);

  // Mirrors the live preview URL so the unmount cleanup can reach it without
  // the effect depending on `preview` and re-running on every upload.
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
      // Release the previous preview before replacing it, so repeated uploads
      // do not leak object URLs for the life of the page.
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

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Panel title="Document image" className="lg:col-span-7">
        <div className="space-y-3">
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handle(e.dataTransfer.files?.[0]);
            }}
            className="flex flex-col items-center justify-center rounded-lg border border-dashed border-white/15 bg-inset/60 px-6 py-8 text-center"
          >
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={preview.src}
                alt={`Uploaded document, ${preview.w} by ${preview.h} pixels`}
                className="max-h-44 rounded-md border border-white/10"
              />
            ) : (
              <span className="grid h-11 w-11 place-items-center rounded-lg bg-white/[0.04] text-fg-subtle">
                <ImageSquare size={20} />
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
              {busy ? <><Spinner /> Measuring</> : <><UploadSimple size={14} weight="bold" /> Choose image</>}
            </button>

            <input
              ref={input}
              type="file"
              accept="image/*"
              className="sr-only"
              onChange={(e) => handle(e.target.files?.[0])}
            />
          </div>

          {error ? <p className="text-body-sm text-evaded">{error}</p> : null}

          <p className="caption border-t border-white/10 pt-3">
            The image is decoded to a canvas, measured, and discarded. Nothing is
            uploaded anywhere — the model runs here.
          </p>
        </div>
      </Panel>

      <Panel title="Model verdict" className="lg:col-span-5">
        {result && features ? (
          <BlurFade key={result.probability}>
            <div
              className="relative overflow-hidden rounded-lg border p-5"
              style={{
                borderColor: result.prediction === "fraud"
                  ? "rgb(251 110 104 / 0.45)" : "rgb(53 214 164 / 0.45)",
                background: result.prediction === "fraud"
                  ? "rgb(251 110 104 / 0.07)" : "rgb(53 214 164 / 0.07)",
              }}
            >
              <BorderBeam
                colorFrom={result.prediction === "fraud" ? "#fb6e68" : "#35d6a4"}
                colorTo="var(--color-signal)"
              />
              <p className="overline">Document fraud likelihood</p>
              <p className={`mt-1.5 font-mono text-[34px] leading-none font-semibold tracking-tight ${
                result.prediction === "fraud" ? "text-evaded" : "text-caught"}`}>
                {(result.probability * 100).toFixed(1)}%
              </p>
              <p className="mt-2 text-body-sm text-fg-muted">
                {result.supplied} of {result.features} features measured ·
                threshold {result.threshold}
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
              </div>
            </div>
          </BlurFade>
        ) : (
          <p className="text-body-sm text-fg-subtle">
            Add an image and the browser will compute all 23 statistics the model
            was trained on, then score them.
          </p>
        )}
      </Panel>
    </div>
  );
}
