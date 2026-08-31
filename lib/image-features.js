/**
 * The 23 image statistics the KYC document-fraud model was trained on.
 *
 * Its config names every feature, and all of them are ordinary image
 * measurements: dimensions, per-channel colour moments, focus and edge
 * measures, local texture, histogram shape and a simple noise estimate. A
 * canvas and some arithmetic is enough to compute them.
 *
 * What the config does NOT record is how the training pipeline computed each
 * one, and several of these names carry more than one standard definition.
 * "Tenengrad" is the mean squared Sobel gradient in the original paper but is
 * often reported as the mean magnitude, which differs by three orders of
 * magnitude. "Noise Diff" is not a standard name at all. This file computes
 * the textbook definition of each, straight, with no scaling applied to make
 * the output land anywhere in particular.
 *
 * That choice matters, and lib/models/kyc-domain.json shows why: the trees
 * split Tenengrad only over [66, 70], while a real document measures in the
 * tens of thousands under the textbook definition. So the values here fall
 * outside the range the model learned in, and the panel reports that overlap
 * rather than presenting a number that only looks like a verdict.
 *
 * Feature names are returned exactly as the model expects them, spaces and
 * capitalisation included.
 */

/* Rec. 601 luma, which is what OpenCV's COLOR_BGR2GRAY uses. */
const luma = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;

function moments(values) {
  const n = values.length;
  if (!n) return { mean: 0, std: 0 };
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += values[i];
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i += 1) acc += (values[i] - mean) ** 2;
  return { mean, std: Math.sqrt(acc / n) };
}

/**
 * Extract every feature from an already-decoded image.
 * Accepts anything drawable: HTMLImageElement, ImageBitmap, canvas.
 */
export function extractImageFeatures(source) {
  const width = source.naturalWidth || source.width || 1200;
  const height = source.naturalHeight || source.height || 800;

  // Process at optimal resolution to balance precision with UI responsiveness
  const MAX = 1200;
  const scale = Math.min(1, MAX / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(source, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h).data;

  const n = w * h;
  const gray = new Float64Array(n);
  const R = new Float64Array(n);
  const G = new Float64Array(n);
  const B = new Float64Array(n);

  for (let i = 0, p = 0; i < n; i += 1, p += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    R[i] = r;
    G[i] = g;
    B[i] = b;
    gray[i] = luma(r, g, b);
  }

  const gm = moments(gray);
  const rm = moments(R);
  const gmm = moments(G);
  const bm = moments(B);

  // Brightness order statistics
  const sorted = Float64Array.from(gray).sort();
  const brightnessMedian =
    n % 2 ? sorted[(n - 1) / 2] : (sorted[n / 2 - 1] + sorted[n / 2]) / 2;

  // ── Focus and edges ─────────────────────────────────────────────────────
  // Normalized Sobel gradient energy & Laplacian blur estimation
  const at = (x, y) => gray[y * w + x];
  let lapSum = 0;
  let lapSqSum = 0;
  let tenSum = 0;
  let edges = 0;
  let interior = 0;

  for (let y = 1; y < h - 1; y += 1) {
    for (let x = 1; x < w - 1; x += 1) {
      const c = at(x, y);
      const lap =
        at(x - 1, y) + at(x + 1, y) + at(x, y - 1) + at(x, y + 1) - 4 * c;
      lapSum += lap;
      lapSqSum += lap * lap;

      const gx =
        -at(x - 1, y - 1) - 2 * at(x - 1, y) - at(x - 1, y + 1) +
        at(x + 1, y - 1) + 2 * at(x + 1, y) + at(x + 1, y + 1);
      const gy =
        -at(x - 1, y - 1) - 2 * at(x, y - 1) - at(x + 1, y - 1) +
        at(x - 1, y + 1) + 2 * at(x, y + 1) + at(x + 1, y + 1);

      // OpenCV's Sobel at ksize=3 applies no 1/4 normalisation, so neither
      // does this. Tenengrad is the mean squared gradient magnitude, which is
      // the textbook definition; edge density is the share of pixels whose
      // magnitude clears 100.
      const mag2 = gx * gx + gy * gy;
      tenSum += mag2;
      if (Math.sqrt(mag2) > 100) edges += 1;
      interior += 1;
    }
  }

  const lapMean = interior ? lapSum / interior : 0;
  const laplacianVar = interior ? lapSqSum / interior - lapMean * lapMean : 0;

  // ── Local texture ───────────────────────────────────────────────────────
  // Variance within 8x8 tiles to assess natural paper fiber / printing texture
  const TILE = 8;
  const tileVars = [];
  for (let ty = 0; ty + TILE <= h; ty += TILE) {
    for (let tx = 0; tx + TILE <= w; tx += TILE) {
      let s = 0;
      let ss = 0;
      for (let y = ty; y < ty + TILE; y += 1) {
        for (let x = tx; x < tx + TILE; x += 1) {
          const v = gray[y * w + x];
          s += v;
          ss += v * v;
        }
      }
      const m = s / (TILE * TILE);
      tileVars.push(ss / (TILE * TILE) - m * m);
    }
  }
  const tv = moments(tileVars);

  // ── Histogram shape ─────────────────────────────────────────────────────
  let m3 = 0;
  let m4 = 0;
  for (let i = 0; i < n; i += 1) {
    const d = gray[i] - gm.mean;
    m3 += d ** 3;
    m4 += d ** 4;
  }
  const sd = gm.std || 1e-9;
  const histSkew = m3 / n / sd ** 3;
  const histKurt = m4 / n / sd ** 4 - 3;

  // ── Noise ───────────────────────────────────────────────────────────────
  // Mean absolute difference between neighbouring pixels, horizontally and
  // vertically. Re-encoded or synthesised images often differ from camera
  // originals in how much high-frequency variation survives.
  let dh = 0;
  let dhN = 0;
  for (let y = 0; y < h; y += 1) {
    for (let x = 1; x < w; x += 1) {
      dh += Math.abs(gray[y * w + x] - gray[y * w + x - 1]);
      dhN += 1;
    }
  }
  let dv = 0;
  let dvN = 0;
  for (let y = 1; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      dv += Math.abs(gray[y * w + x] - gray[(y - 1) * w + x]);
      dvN += 1;
    }
  }

  const noiseDiffH = dhN ? dh / dhN : 0;
  const noiseDiffV = dvN ? dv / dvN : 0;

  return {
    Width: width,
    Height: height,
    "Aspect Ratio": height ? width / height : 0,
    "Brightness Mean": gm.mean,
    "Brightness Std": gm.std,
    "Brightness Median": brightnessMedian,
    "Brightness Min": sorted[0],
    "Brightness Max": sorted[n - 1],
    B_Mean: bm.mean,
    B_Std: bm.std,
    G_Mean: gmm.mean,
    G_Std: gmm.std,
    R_Mean: rm.mean,
    R_Std: rm.std,
    "Laplacian Var": laplacianVar,
    Tenengrad: interior ? tenSum / interior : 0,
    "Edge Density": interior ? edges / interior : 0,
    "Texture Var Mean": tv.mean,
    "Texture Var Std": tv.std,
    "Hist Skewness": histSkew,
    "Hist Kurtosis": histKurt,
    "Noise Diff H": noiseDiffH,
    "Noise Diff V": noiseDiffV,
  };
}

/**
 * Decode a File into something extractImageFeatures can measure.
 */
export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => resolve({ img, url });
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be decoded as an image."));
    };
    img.src = url;
  });
}
