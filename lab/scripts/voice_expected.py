"""Ground truth for the JS audio-feature extractor.

Generates deterministic test signals, computes all 74 features with librosa,
and records both the final features and a few intermediate arrays so a
divergence can be localised instead of just observed.

Run from the lab directory:
    python scripts/voice_expected.py
"""
import json, os
import numpy as np
import librosa

SR = 24000
N_FFT, HOP, N_MELS, N_MFCC, N_CHROMA = 2048, 512, 128, 20, 12


def signals():
    """A few signals with different character, all deterministic."""
    rng = np.random.default_rng(7)
    t = np.arange(int(SR * 1.5)) / SR

    yield "tone", 0.6 * np.sin(2 * np.pi * 220 * t).astype(np.float32)

    chord = sum(0.25 * np.sin(2 * np.pi * f * t) for f in (196, 247, 294))
    yield "chord", chord.astype(np.float32)

    yield "noise", (0.3 * rng.standard_normal(len(t))).astype(np.float32)

    # Something speech-shaped: a swept formant over a buzzy source.
    f0 = 120 + 30 * np.sin(2 * np.pi * 3 * t)
    phase = 2 * np.pi * np.cumsum(f0) / SR
    voiced = 0.5 * np.sign(np.sin(phase)) * np.exp(-((t - 0.7) ** 2) / 0.3)
    yield "voiced", voiced.astype(np.float32)

    # Short and quiet, to exercise the padding and the all-zero frames.
    short = np.zeros(int(SR * 0.35), dtype=np.float32)
    short[1000:5000] = 0.2 * np.sin(2 * np.pi * 440 * t[:4000])
    yield "short", short


def features(y):
    # float64 throughout. librosa defaults its filterbanks to float32, which
    # leaves a ~1e-6 relative residual on features whose mean sits near zero.
    # Pinning both sides to float64 separates "the port is wrong" from "the
    # reference was computed in single precision", and the check asserts the
    # tighter number that leaves.
    y = y.astype(np.float64)
    S = np.abs(librosa.stft(y, n_fft=N_FFT, hop_length=HOP))
    mel = librosa.feature.melspectrogram(S=S ** 2, sr=SR, n_mels=N_MELS,
                                         dtype=np.float64)
    mfcc = librosa.feature.mfcc(S=librosa.power_to_db(mel), n_mfcc=N_MFCC)
    chroma = librosa.feature.chroma_stft(S=S ** 2, sr=SR, n_chroma=N_CHROMA,
                                         tuning=0.0, dtype=np.float64)

    cent = librosa.feature.spectral_centroid(S=S, sr=SR)[0]
    band = librosa.feature.spectral_bandwidth(S=S, sr=SR)[0]
    roll = librosa.feature.spectral_rolloff(S=S, sr=SR)[0]
    zcr = librosa.feature.zero_crossing_rate(y, frame_length=N_FFT, hop_length=HOP)[0]
    rms = librosa.feature.rms(y=y, frame_length=N_FFT, hop_length=HOP)[0]

    out = {}
    for i in range(N_MFCC):
        out[f"mfcc_{i+1}_mean"] = float(mfcc[i].mean())
        out[f"mfcc_{i+1}_std"] = float(mfcc[i].std())
    for name, arr in (("spectral_centroid", cent), ("spectral_bandwidth", band),
                      ("spectral_rolloff", roll), ("zero_crossing_rate", zcr),
                      ("rms", rms)):
        out[f"{name}_mean"] = float(arr.mean())
        out[f"{name}_std"] = float(arr.std())
    for i in range(N_CHROMA):
        out[f"chroma_{i+1}_mean"] = float(chroma[i].mean())
        out[f"chroma_{i+1}_std"] = float(chroma[i].std())

    stages = {
        "frames": int(S.shape[1]),
        "stft_col10": [float(v) for v in S[:12, min(10, S.shape[1] - 1)]],
        "mel_col10": [float(v) for v in mel[:8, min(10, mel.shape[1] - 1)]],
        "mfcc_col10": [float(v) for v in mfcc[:, min(10, mfcc.shape[1] - 1)]],
        "chroma_col10": [float(v) for v in chroma[:, min(10, chroma.shape[1] - 1)]],
        "cent_head": [float(v) for v in cent[:6]],
        "zcr_head": [float(v) for v in zcr[:6]],
        "rms_head": [float(v) for v in rms[:6]],
    }
    return out, stages


cases = []
for name, y in signals():
    f, stages = features(y)
    cases.append({"name": name, "signal": [float(v) for v in y], "features": f, "stages": stages})
    print(f"{name:8s} {len(y):7d} samples, {stages['frames']:4d} frames")

os.makedirs("../tools/checks", exist_ok=True)
with open("../tools/checks/voice-expected.json", "w") as h:
    json.dump({"sr": SR, "librosa": librosa.__version__, "cases": cases}, h)
print(f"wrote ../tools/checks/voice-expected.json (librosa {librosa.__version__})")
