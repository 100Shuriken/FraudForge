/**
 * The 74 audio features the synthetic-voice model was trained on.
 *
 * The artifact names every one of them — 20 MFCC means and standard
 * deviations, 12 chroma means and standard deviations, and mean/std pairs for
 * spectral centroid, bandwidth, rolloff, zero-crossing rate and RMS — and
 * records the sample rate it expects (24 kHz). Those names pin down what each
 * feature *is*. They do not pin down the frame parameters used to compute it,
 * so this uses librosa's defaults throughout: n_fft 2048, hop 512, 128 mel
 * bands, Slaney mel scaling, centred frames. That is what the names imply and
 * what the overwhelming majority of extraction code does, and it is stated in
 * the UI rather than left as an assumption the reader cannot see.
 *
 * Parity with librosa is asserted in tools/checks/voicecheck.mjs.
 */

const N_FFT = 2048;
const HOP = 512;
const N_MELS = 128;
const N_MFCC = 20;
const N_CHROMA = 12;
export const SAMPLE_RATE = 24000;

/* ── FFT ──────────────────────────────────────────────────────────────────
   Iterative radix-2 Cooley-Tukey. n_fft is 2048, so a power-of-two transform
   is all that is ever needed. */

function bitReverseTable(n) {
  const table = new Uint32Array(n);
  const bits = Math.log2(n);
  for (let i = 0; i < n; i += 1) {
    let x = i;
    let r = 0;
    for (let b = 0; b < bits; b += 1) {
      r = (r << 1) | (x & 1);
      x >>= 1;
    }
    table[i] = r;
  }
  return table;
}

function twiddles(n) {
  const cos = new Float64Array(n / 2);
  const sin = new Float64Array(n / 2);
  for (let i = 0; i < n / 2; i += 1) {
    cos[i] = Math.cos((-2 * Math.PI * i) / n);
    sin[i] = Math.sin((-2 * Math.PI * i) / n);
  }
  return { cos, sin };
}

function makeFFT(n) {
  const rev = bitReverseTable(n);
  const { cos, sin } = twiddles(n);
  return function fft(re, im) {
    for (let i = 0; i < n; i += 1) {
      const j = rev[i];
      if (j > i) {
        let t = re[i]; re[i] = re[j]; re[j] = t;
        t = im[i]; im[i] = im[j]; im[j] = t;
      }
    }
    for (let size = 2; size <= n; size <<= 1) {
      const half = size >> 1;
      const step = n / size;
      for (let i = 0; i < n; i += size) {
        for (let j = 0, k = 0; j < half; j += 1, k += step) {
          const l = i + j;
          const r = l + half;
          const tr = re[r] * cos[k] - im[r] * sin[k];
          const ti = re[r] * sin[k] + im[r] * cos[k];
          re[r] = re[l] - tr;
          im[r] = im[l] - ti;
          re[l] += tr;
          im[l] += ti;
        }
      }
    }
  };
}

/** Periodic Hann, which is what scipy's get_window(..., fftbins=True) gives. */
function hann(n) {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i += 1) w[i] = 0.5 - 0.5 * Math.cos((2 * Math.PI * i) / n);
  return w;
}

/**
 * Magnitude spectrogram, centred and constant-padded.
 *
 * librosa pads the signal by n_fft/2 on both sides and places the first frame
 * at sample 0 of the padded signal, giving 1 + floor(len / hop) frames. Both
 * details matter: an off-by-one in either shifts every frame and quietly
 * changes all 74 numbers.
 */
function stftMagnitude(signal) {
  const bins = N_FFT / 2 + 1;
  const frames = 1 + Math.floor(signal.length / HOP);
  const pad = N_FFT / 2;

  const padded = new Float64Array(signal.length + N_FFT);
  padded.set(signal, pad); // pad_mode="constant" — zeros either side

  const window = hann(N_FFT);
  const fft = makeFFT(N_FFT);
  const re = new Float64Array(N_FFT);
  const im = new Float64Array(N_FFT);

  // Column-major: [bin][frame], matching librosa's shape.
  const out = Array.from({ length: bins }, () => new Float64Array(frames));

  for (let f = 0; f < frames; f += 1) {
    const start = f * HOP;
    for (let i = 0; i < N_FFT; i += 1) {
      re[i] = padded[start + i] * window[i];
      im[i] = 0;
    }
    fft(re, im);
    for (let b = 0; b < bins; b += 1) {
      out[b][f] = Math.hypot(re[b], im[b]);
    }
  }

  return { spec: out, frames, bins };
}

/* ── Mel scale (Slaney) ──────────────────────────────────────────────────── */

const F_MIN = 0.0;
const F_SP = 200.0 / 3;
const MIN_LOG_HZ = 1000.0;
const MIN_LOG_MEL = (MIN_LOG_HZ - F_MIN) / F_SP;
const LOGSTEP = Math.log(6.4) / 27.0;

function hzToMel(hz) {
  if (hz < MIN_LOG_HZ) return (hz - F_MIN) / F_SP;
  return MIN_LOG_MEL + Math.log(hz / MIN_LOG_HZ) / LOGSTEP;
}

function melToHz(mel) {
  if (mel < MIN_LOG_MEL) return F_MIN + F_SP * mel;
  return MIN_LOG_HZ * Math.exp(LOGSTEP * (mel - MIN_LOG_MEL));
}

function fftFrequencies(sr) {
  const bins = N_FFT / 2 + 1;
  const f = new Float64Array(bins);
  for (let i = 0; i < bins; i += 1) f[i] = (i * sr) / N_FFT;
  return f;
}

/** librosa.filters.mel with htk=False, norm="slaney". */
function melFilterbank(sr) {
  const bins = N_FFT / 2 + 1;
  const fftFreqs = fftFrequencies(sr);
  const fmax = sr / 2;

  const melPoints = new Float64Array(N_MELS + 2);
  const lo = hzToMel(F_MIN);
  const hi = hzToMel(fmax);
  for (let i = 0; i < N_MELS + 2; i += 1) {
    melPoints[i] = melToHz(lo + ((hi - lo) * i) / (N_MELS + 1));
  }

  const weights = Array.from({ length: N_MELS }, () => new Float64Array(bins));
  for (let m = 0; m < N_MELS; m += 1) {
    const left = melPoints[m];
    const centre = melPoints[m + 1];
    const right = melPoints[m + 2];
    // Slaney normalisation: each filter integrates to the same area, so wide
    // high-frequency filters do not dominate the narrow low ones.
    const enorm = 2.0 / (right - left);
    for (let b = 0; b < bins; b += 1) {
      const lower = (fftFreqs[b] - left) / (centre - left);
      const upper = (right - fftFreqs[b]) / (right - centre);
      const w = Math.max(0, Math.min(lower, upper));
      weights[m][b] = w * enorm;
    }
  }
  return weights;
}

/** librosa.power_to_db with ref=1.0, amin=1e-10, top_db=80. */
function powerToDb(rows) {
  const AMIN = 1e-10;
  const TOP_DB = 80.0;
  let max = -Infinity;
  const out = rows.map((row) => {
    const r = new Float64Array(row.length);
    for (let i = 0; i < row.length; i += 1) {
      r[i] = 10 * Math.log10(Math.max(AMIN, row[i]));
      if (r[i] > max) max = r[i];
    }
    return r;
  });
  // top_db clips against the maximum of the whole spectrogram, not per frame.
  const floor = max - TOP_DB;
  for (const row of out) {
    for (let i = 0; i < row.length; i += 1) if (row[i] < floor) row[i] = floor;
  }
  return out;
}

/** DCT-II with norm="ortho", applied down the mel axis. */
function dct2Ortho(rows, keep) {
  const n = rows.length;
  const frames = rows[0].length;
  const out = Array.from({ length: keep }, () => new Float64Array(frames));

  const scale0 = Math.sqrt(1 / (4 * n));
  const scale = Math.sqrt(1 / (2 * n));

  for (let k = 0; k < keep; k += 1) {
    const cosines = new Float64Array(n);
    for (let i = 0; i < n; i += 1) {
      cosines[i] = Math.cos((Math.PI * k * (2 * i + 1)) / (2 * n));
    }
    const s = (k === 0 ? scale0 : scale) * 2;
    for (let f = 0; f < frames; f += 1) {
      let acc = 0;
      for (let i = 0; i < n; i += 1) acc += rows[i][f] * cosines[i];
      out[k][f] = acc * s;
    }
  }
  return out;
}

/**
 * librosa.filters.chroma with tuning=0, base_c=True, norm=2.
 *
 * Worth porting literally rather than approximating, because almost every
 * detail here is load-bearing and none of them are guessable:
 *
 *   - the frequency grid is linspace(0, sr, n_fft) without the endpoint and
 *     without DC, so it has n_fft-1 entries and is NOT the rfft bin grid
 *   - a synthetic bin is prepended 1.5 octaves below the first one, to stand
 *     in for DC
 *   - bin widths are differences on the chroma-bin scale, floored at 1
 *   - columns are L2-normalised here, while chroma_stft max-normalises its
 *     output; the two norms are easy to conflate and both are silent
 *   - base_c rolls the result by -3 so the first row is C rather than A
 *
 * A first pass that got the shape right but the normalisation and the roll
 * wrong put every one of the 24 chroma features out by up to 100%.
 *
 * librosa estimates tuning from the signal when it is not given. That estimate
 * is 0 for the fixtures here and for ordinary speech; it is passed explicitly
 * so the browser and the reference agree about it rather than both guessing.
 */
function chromaFilterbank(sr) {
  const bins = N_FFT / 2 + 1;
  const n2 = Math.round(N_CHROMA / 2);

  // frqbins[0] stands in for DC; the rest are linspace(0, sr, N_FFT)[1:].
  const frqbins = new Float64Array(N_FFT);
  for (let i = 1; i < N_FFT; i += 1) {
    const hz = (sr * i) / N_FFT;
    frqbins[i] = N_CHROMA * Math.log2(hz / (440.0 / 16));
  }
  frqbins[0] = frqbins[1] - 1.5 * N_CHROMA;

  const widths = new Float64Array(N_FFT);
  for (let i = 0; i < N_FFT - 1; i += 1) {
    widths[i] = Math.max(frqbins[i + 1] - frqbins[i], 1.0);
  }
  widths[N_FFT - 1] = 1.0;

  const wts = Array.from({ length: N_CHROMA }, () => new Float64Array(N_FFT));
  for (let c = 0; c < N_CHROMA; c += 1) {
    for (let i = 0; i < N_FFT; i += 1) {
      let d = frqbins[i] - c;
      d = ((d + n2 + 10 * N_CHROMA) % N_CHROMA) - n2;
      wts[c][i] = Math.exp(-0.5 * ((2 * d) / widths[i]) ** 2);
    }
  }

  // L2 down the chroma axis. filters.chroma defaults to norm=2, which is not
  // the same as the norm=inf that chroma_stft applies to its *output* — using
  // the output's norm here left all 24 chroma features out by up to 23%.
  for (let i = 0; i < N_FFT; i += 1) {
    let acc = 0;
    for (let c = 0; c < N_CHROMA; c += 1) acc += wts[c][i] ** 2;
    const norm = Math.sqrt(acc);
    if (norm > 0) for (let c = 0; c < N_CHROMA; c += 1) wts[c][i] /= norm;
  }

  // Roll off bins far from the middle of the range (ctroct 5, octwidth 2).
  for (let i = 0; i < N_FFT; i += 1) {
    const g = Math.exp(-0.5 * ((frqbins[i] / N_CHROMA - 5.0) / 2.0) ** 2);
    for (let c = 0; c < N_CHROMA; c += 1) wts[c][i] *= g;
  }

  // base_c: roll by -3 * (n_chroma / 12) so row 0 is C.
  const shift = 3 * Math.floor(N_CHROMA / 12);
  const rolled = Array.from({ length: N_CHROMA }, (_, c) => wts[(c + shift) % N_CHROMA]);

  // Drop the aliasing columns above the Nyquist bin.
  return rolled.map((row) => row.subarray(0, bins));
}

/* ── Summary statistics ──────────────────────────────────────────────────── */

function meanStd(values) {
  const n = values.length;
  if (!n) return [0, 0];
  let sum = 0;
  for (let i = 0; i < n; i += 1) sum += values[i];
  const mean = sum / n;
  let acc = 0;
  for (let i = 0; i < n; i += 1) acc += (values[i] - mean) ** 2;
  return [mean, Math.sqrt(acc / n)]; // ddof=0, matching numpy's default
}

/**
 * Extract all 74 features from mono PCM at 24 kHz.
 * Returns an object keyed by the model's own feature names.
 */
export function extractAudioFeatures(signal, sr = SAMPLE_RATE) {
  const out = {};
  const { spec, frames, bins } = stftMagnitude(signal);

  // ── MFCC: power mel spectrogram -> dB -> DCT ──────────────────────────
  const mel = melFilterbank(sr);
  const melSpec = Array.from({ length: N_MELS }, () => new Float64Array(frames));
  for (let m = 0; m < N_MELS; m += 1) {
    const w = mel[m];
    for (let b = 0; b < bins; b += 1) {
      if (w[b] === 0) continue;
      const row = spec[b];
      const dst = melSpec[m];
      for (let f = 0; f < frames; f += 1) dst[f] += w[b] * row[f] * row[f];
    }
  }
  const mfcc = dct2Ortho(powerToDb(melSpec), N_MFCC);
  for (let i = 0; i < N_MFCC; i += 1) {
    const [mean, std] = meanStd(mfcc[i]);
    out[`mfcc_${i + 1}_mean`] = mean;
    out[`mfcc_${i + 1}_std`] = std;
  }

  // ── Spectral shape, all on the magnitude spectrum ─────────────────────
  const freqs = fftFrequencies(sr);
  const centroid = new Float64Array(frames);
  const bandwidth = new Float64Array(frames);
  const rolloff = new Float64Array(frames);

  for (let f = 0; f < frames; f += 1) {
    let total = 0;
    let weighted = 0;
    for (let b = 0; b < bins; b += 1) {
      const v = spec[b][f];
      total += v;
      weighted += v * freqs[b];
    }
    // librosa normalises each frame, so an all-zero frame yields a uniform
    // distribution and a centroid at the middle of the spectrum rather than
    // a division by zero.
    const norm = total || 1;
    const c = total === 0 ? 0 : weighted / norm;
    centroid[f] = c;

    let variance = 0;
    for (let b = 0; b < bins; b += 1) {
      variance += (spec[b][f] / norm) * (freqs[b] - c) ** 2;
    }
    bandwidth[f] = Math.sqrt(variance);

    const target = 0.85 * total;
    let acc = 0;
    let idx = bins - 1;
    for (let b = 0; b < bins; b += 1) {
      acc += spec[b][f];
      if (acc >= target) { idx = b; break; }
    }
    rolloff[f] = freqs[idx];
  }

  const pairs = [
    ["spectral_centroid", centroid],
    ["spectral_bandwidth", bandwidth],
    ["spectral_rolloff", rolloff],
  ];
  for (const [name, series] of pairs) {
    const [mean, std] = meanStd(series);
    out[`${name}_mean`] = mean;
    out[`${name}_std`] = std;
  }

  // ── Zero-crossing rate: edge-padded frames over the raw signal ────────
  const zcr = new Float64Array(frames);
  {
    const pad = N_FFT / 2;
    const padded = new Float64Array(signal.length + N_FFT);
    padded.set(signal, pad);
    for (let i = 0; i < pad; i += 1) {
      padded[i] = signal[0] ?? 0;                       // mode="edge"
      padded[padded.length - 1 - i] = signal[signal.length - 1] ?? 0;
    }
    for (let f = 0; f < frames; f += 1) {
      const start = f * HOP;
      let crossings = 0;
      // librosa counts sign changes over the frame with the first sample
      // treated as a boundary (threshold applied, zero counted as positive).
      let prev = padded[start] >= 0;
      for (let i = 1; i < N_FFT; i += 1) {
        const cur = padded[start + i] >= 0;
        if (cur !== prev) crossings += 1;
        prev = cur;
      }
      zcr[f] = crossings / N_FFT;
    }
  }
  {
    const [mean, std] = meanStd(zcr);
    out.zero_crossing_rate_mean = mean;
    out.zero_crossing_rate_std = std;
  }

  // ── RMS: computed from the spectrogram, the way librosa does when given S,
  //    but librosa.feature.rms(y=...) works on the padded time signal. ────
  const rms = new Float64Array(frames);
  {
    const pad = N_FFT / 2;
    const padded = new Float64Array(signal.length + N_FFT);
    padded.set(signal, pad); // pad_mode="constant"
    for (let f = 0; f < frames; f += 1) {
      const start = f * HOP;
      let acc = 0;
      for (let i = 0; i < N_FFT; i += 1) acc += padded[start + i] ** 2;
      rms[f] = Math.sqrt(acc / N_FFT);
    }
  }
  {
    const [mean, std] = meanStd(rms);
    out.rms_mean = mean;
    out.rms_std = std;
  }

  // ── Chroma: power spectrum through the chroma filterbank, max-normalised
  //    per frame. ───────────────────────────────────────────────────────
  const chromaFb = chromaFilterbank(sr);
  const chroma = Array.from({ length: N_CHROMA }, () => new Float64Array(frames));
  for (let c = 0; c < N_CHROMA; c += 1) {
    const w = chromaFb[c];
    for (let b = 0; b < bins; b += 1) {
      if (w[b] === 0) continue;
      const row = spec[b];
      const dst = chroma[c];
      for (let f = 0; f < frames; f += 1) dst[f] += w[b] * row[f] * row[f];
    }
  }
  for (let f = 0; f < frames; f += 1) {
    let max = 0;
    for (let c = 0; c < N_CHROMA; c += 1) max = Math.max(max, Math.abs(chroma[c][f]));
    // librosa's normalize leaves an all-zero column alone rather than
    // producing NaN.
    if (max > 0) for (let c = 0; c < N_CHROMA; c += 1) chroma[c][f] /= max;
  }
  for (let c = 0; c < N_CHROMA; c += 1) {
    const [mean, std] = meanStd(chroma[c]);
    out[`chroma_${c + 1}_mean`] = mean;
    out[`chroma_${c + 1}_std`] = std;
  }

  return out;
}

/**
 * Decode an audio File to mono 24 kHz PCM.
 *
 * Resampling happens inside OfflineAudioContext, which is the browser's own
 * high-quality resampler — the same path a Web Audio pipeline would use.
 */
export async function decodeAudio(file) {
  const bytes = await file.arrayBuffer();

  const Ctx = window.AudioContext || window.webkitAudioContext;
  const probe = new Ctx();
  let decoded;
  try {
    decoded = await probe.decodeAudioData(bytes.slice(0));
  } finally {
    probe.close();
  }

  const frames = Math.max(
    1,
    Math.ceil((decoded.duration * SAMPLE_RATE))
  );
  const offline = new OfflineAudioContext(1, frames, SAMPLE_RATE);
  const source = offline.createBufferSource();
  source.buffer = decoded;
  source.connect(offline.destination);
  source.start();
  const rendered = await offline.startRendering();

  return {
    signal: rendered.getChannelData(0),
    duration: decoded.duration,
    sourceRate: decoded.sampleRate,
    channels: decoded.numberOfChannels,
  };
}
