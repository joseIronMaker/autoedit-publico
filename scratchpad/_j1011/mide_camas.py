"""Mide cada cama: duración, LUFS integrados, BPM (autocorrelación de la envolvente),
centroide espectral y % de energía en 1-4 kHz (donde vive la voz: lo que la tapa)."""
import re, subprocess, sys
import numpy as np
from pathlib import Path

def mide(p):
    r = subprocess.run(["ffmpeg", "-nostats", "-i", str(p), "-af", "ebur128", "-f", "null", "-"],
                       capture_output=True, text=True).stderr
    lufs = float(re.findall(r"I:\s+(-?[\d.]+) LUFS", r)[-1])
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(p), "-ac", "1", "-ar", "22050",
                          "-f", "f32le", "-"], capture_output=True).stdout
    x = np.frombuffer(raw, np.float32)
    sr = 22050
    hop = 512
    n = len(x) // hop
    env = np.sqrt((x[: n * hop].reshape(n, hop) ** 2).mean(1))
    on = np.maximum(np.diff(env), 0); on -= on.mean()
    ac = np.correlate(on, on, "full")[len(on) - 1:]
    fr = sr / hop
    lags = np.arange(len(ac)) / fr
    bpms = 60 / lags[1:]
    k = np.where((bpms > 70) & (bpms < 190))[0] + 1
    bpm = 60 / lags[k[np.argmax(ac[k])]]
    spec = np.abs(np.fft.rfft(x[: sr * 60] * np.hanning(min(len(x), sr * 60))))
    f = np.fft.rfftfreq(min(len(x), sr * 60), 1 / sr)
    cent = (spec * f).sum() / spec.sum()
    p2 = spec ** 2
    voz = p2[(f > 1000) & (f < 4000)].sum() / p2.sum()
    graves = p2[f < 150].sum() / p2.sum()
    return len(x) / sr, lufs, bpm, cent, voz, graves

for p in sys.argv[1:]:
    d, l, b, c, v, g = mide(Path(p))
    print(f"{Path(p).name:28s} {d:6.1f}s {l:6.1f} LUFS  {b:5.0f} BPM  centroide {c:5.0f} Hz  "
          f"1-4kHz {v:5.1%}  graves {g:5.1%}")
