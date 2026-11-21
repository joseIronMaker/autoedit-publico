"""Sintetiza una cama musical ELECTRÓNICA libre de derechos (numpy) para los videos:
loop downtempo en La menor — sub-kick, sub-bass, arpegio plucky y hats. Loop seamless
(crossfade circular). Salida: autoedit/assets/bed_electronico.m4a
"""
import subprocess
from pathlib import Path

import numpy as np

SR = 44100
BPM = 100
BEAT = 60 / BPM
BAR = 4 * BEAT
BARS = 4
N = int(SR * BAR * BARS)
OUT_WAV = Path("/home/jose/tiktok/scratchpad/bed_electronico.wav")
OUT_M4A = Path("/home/jose/tiktok/autoedit/assets/bed_electronico.m4a")

t = np.arange(N) / SR
mix = np.zeros(N)


def note(freq):
    return freq


# frecuencias (La menor): A, C, E + progresión de bajo Am-F-C-G
A2, C3, E3, A3, C4, E4 = 110, 130.81, 164.81, 220, 261.63, 329.63
BASS_ROOTS = [55.0, 43.65, 65.41, 49.0]   # A1, F1, C2, G1 (un acorde por compás)
ARP = [A3, C4, E4, C4]                      # arpegio por corchea (patrón)


def env(length, a=0.005, d=0.15, s=0.0, r=0.02):
    """envolvente percusiva simple (segundos)."""
    n = int(length * SR)
    e = np.zeros(n)
    na, nd = int(a * SR), int(d * SR)
    na = max(1, na); nd = max(1, nd)
    e[:na] = np.linspace(0, 1, na)
    e[na:na + nd] = np.linspace(1, s, min(nd, n - na))
    return e


def add(sig, start_s, data):
    i = int(start_s * SR)
    j = min(N, i + len(data))
    mix[i:j] += data[: j - i]


def lowpass(x, cutoff):
    """one-pole lowpass."""
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    prev = 0.0
    for i in range(len(x)):
        prev = (1 - a) * x[i] + a * prev
        y[i] = prev
    return y


# ---- KICK: negras (sine con pitch-drop) ----
for b in range(int(BARS * 4)):
    ts = b * BEAT
    n = int(0.28 * SR)
    tt = np.arange(n) / SR
    pitch = 110 * np.exp(-tt * 30) + 45
    k = np.sin(2 * np.pi * np.cumsum(pitch) / SR) * np.exp(-tt * 9)
    add(k * 0.9, ts, k * 0 + k)

# ---- SUB-BASS: un root por compás, corcheas pulsantes ----
for bar in range(BARS):
    root = BASS_ROOTS[bar]
    for e8 in range(8):
        ts = bar * BAR + e8 * (BEAT / 2)
        n = int((BEAT / 2) * 0.9 * SR)
        tt = np.arange(n) / SR
        sig = (np.sin(2 * np.pi * root * tt) + 0.3 * np.sin(2 * np.pi * 2 * root * tt))
        sig *= np.exp(-tt * 3) * 0.5
        add(sig, ts, sig)

# ---- ARPEGIO plucky (corcheas), sine + 5ta detune, filtrado ----
for i in range(int(BARS * 8)):
    ts = i * (BEAT / 2)
    f = ARP[i % len(ARP)] * (1 + 0.5 * (i % 8 == 6))   # variación
    n = int(0.32 * SR)
    tt = np.arange(n) / SR
    e = np.exp(-tt * 6)
    sig = (np.sin(2 * np.pi * f * tt) + 0.4 * np.sin(2 * np.pi * f * 1.5 * tt)) * e * 0.22
    add(sig, ts, sig)

# ---- HATS: corcheas en contratiempo (ruido filtrado) ----
rng = np.random.default_rng(3)
for b in range(int(BARS * 4)):
    ts = b * BEAT + BEAT / 2
    n = int(0.05 * SR)
    h = rng.normal(0, 1, n) * np.exp(-np.arange(n) / SR * 60) * 0.12
    add(h, ts, h)

# ---- PAD suave (acorde sostenido tenue) por compás ----
for bar in range(BARS):
    ts = bar * BAR
    n = int(BAR * SR)
    tt = np.arange(n) / SR
    chord = BASS_ROOTS[bar] * 4
    pad = (np.sin(2 * np.pi * chord * tt) + np.sin(2 * np.pi * chord * 1.5 * tt)
           + np.sin(2 * np.pi * chord * 2 * tt))
    e = np.minimum(1, tt / 0.3) * np.minimum(1, (BAR - tt) / 0.3)
    add(pad * e * 0.06, ts, pad * e * 0.06)

# master: leve lowpass global + normalizar
mix = lowpass(mix, 8000)
mix /= np.max(np.abs(mix)) + 1e-9
mix *= 0.9

# loop seamless: crossfade circular (últimos 40ms sobre los primeros)
F = int(0.04 * SR)
fade = np.linspace(0, 1, F)
head = mix[:F].copy()
tail = mix[-F:].copy()
mix[:F] = head * fade + tail * (1 - fade)
mix = mix[:-F]

# estéreo con leve ancho
left = mix.copy()
right = np.roll(mix, int(0.008 * SR))
stereo = np.stack([left, right], axis=1)
pcm = (stereo * 32767 * 0.9).astype(np.int16)

import wave
with wave.open(str(OUT_WAV), "w") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
    w.writeframes(pcm.tobytes())
subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(OUT_WAV),
                "-c:a", "aac", "-b:a", "160k", str(OUT_M4A)], check=True)
print("cama electrónica:", OUT_M4A, f"({len(mix)/SR:.1f}s loop)")
