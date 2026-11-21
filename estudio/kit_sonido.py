"""Sonido de una pieza: voz con pausas, foley sintetizado y música, masterizado a -14 LUFS.

Cada capítulo tiene su `partitura.py`:

    from kit_sonido import *
    m = Mezcla("c01_error", pausas={"a esa distancia": 1.0}, cola=1.6)
    T = m.T                                   # tiempos de la voz YA con las pausas
    m.pon(T("dos pesos").s, golpe(), .9)
    m.musica([("c01_error", 0, 0, m.dur, .05, 2.6)])
    m.cierra()

El foley se sintetiza aquí: ningún sample de terceros, y cada golpe nace del mismo tiempo que el
dibujo. `m.exporta_tiempos()` deja `palabras.json` en la carpeta de la pieza en Remotion.
"""
import json
import re
import subprocess
import sys
import unicodedata
import wave
from pathlib import Path

import numpy as np

RAIZ = Path(__file__).parent
SR = 48000
FACTOR = 1.08            # velocidad aplicada a la voz en el lote
rng = np.random.default_rng(2013)


def lee(p):
    return np.frombuffer(subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]), np.float32).reshape(-1, 2).copy()


def escribe(p, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def lufs(p):
    s = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(p), "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", s)[-1])


def db(x):
    return 10 ** (x / 20)


def _n(s):
    s = unicodedata.normalize("NFD", s.lower())
    return re.sub(r"[^a-z0-9ñ]", "", "".join(c for c in s if unicodedata.category(c) != "Mn"))


# ---------- síntesis ----------
def ruido(n):
    return rng.standard_normal(n)


def banda(x, lo, hi):
    F = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    F *= np.clip((f - lo * .7) / (lo * .3 + 1), 0, 1) * np.clip((hi * 1.3 - f) / (hi * .3), 0, 1)
    return np.fft.irfft(F, len(x))


def golpe(f0=78, f1=40, dur=.42, clic=.3):
    """Impacto con peso: caída de tono + clic. Más grave = más grande."""
    t = np.arange(int(dur * SR)) / SR
    f = f1 + (f0 - f1) * np.exp(-t * 24)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 10) + clic * banda(ruido(len(t)), 300, 2400) * np.exp(-t * 130)


def tic(dur=.03, lo=2400, hi=7500):
    t = np.arange(int(dur * SR)) / SR
    return banda(ruido(len(t)), lo, hi) * np.exp(-t * 340)


def toc(f=540):
    t = np.arange(int(.09 * SR)) / SR
    return np.sin(2 * np.pi * f * t) * np.exp(-t * 62) + .22 * banda(ruido(len(t)), 900, 4000) * np.exp(-t * 300)


def soplo(dur=.9, lo=250, hi=2600, pico=.42):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    e = np.where(t < pico, np.sin(t / pico * np.pi / 2) ** 2, np.cos((t - pico) / (1 - pico) * np.pi / 2) ** 2)
    return (banda(ruido(n), lo, hi) * .75 + banda(ruido(n), hi, hi * 2.4) * .3 * e) * e


def cola(x, seg=1.9, mezcla=.34):
    n = int(seg * SR)
    ir = banda(ruido(n) * np.exp(-np.arange(n) / SR * 4.2), 180, 5200)
    ir /= np.sqrt((ir ** 2).sum()) + 1e-9
    h = np.fft.irfft(np.fft.rfft(x, len(x) + n) * np.fft.rfft(ir, len(x) + n), len(x) + n)
    y = np.zeros(len(x) + n)
    y[: len(x)] += x
    return y * (1 - mezcla) + h * mezcla * 4


def campana(notas=(659.3, 987.8, 1318.5), dur=1.6, vol=(1, .5, .22)):
    t = np.arange(int(dur * SR)) / SR
    s = sum(v * np.sin(2 * np.pi * f * t) * np.exp(-t * (2.3 + f / 700)) for f, v in zip(notas, vol))
    return cola(s * np.minimum(t / .004, 1))


def polvo(dur):
    """Brillo que sube y se cierra: arena fina, no papel."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 6500, 15000) * (t ** 2.4) * (1 - t ** 14) * .3 + banda(ruido(n), 1800, 4200) * t ** 3 * .05


def trazo(dur, f0=320, f1=640):
    """Una línea que se dibuja: tono casi inaudible que asciende."""
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e * .5 + banda(ruido(n), 2000, 6000) * e * .08


def lluvia(dur, dens=44):
    n = int(dur * SR)
    y = np.zeros(n)
    for _ in range(int(dur * dens)):
        i = int(rng.random() * (n - 2000))
        s = toc(rng.uniform(900, 2300)) * rng.uniform(.05, .22)
        y[i:i + len(s)] += s[: n - i]
    return y


def rebotes(t0, h, rest, g=30):
    """Instantes de impacto de `kit.caida`: animación y sonido comparten física."""
    t = t0 + np.sqrt(2 * h / g)
    v = np.sqrt(2 * g * h) * rest
    out = [t]
    for _ in range(6):
        t += 2 * v / g
        v *= rest
        out.append(t)
    return out


def _silencio_cercano(mono, t, radio=.22):
    """Muestra más callada alrededor de t. Una pausa jamás debe caer sobre una palabra."""
    v = int(.02 * SR)
    c = int(t * SR)
    ini = max(0, c - int(radio * SR))
    fin = min(len(mono) - v, c + int(radio * SR))
    if fin <= ini:
        return c
    e = np.convolve(mono[ini:fin + v] ** 2, np.ones(v) / v, "valid")
    k = int(np.argmin(e + 1e-9 * np.abs(np.arange(len(e)) + ini - c)))
    if 10 * np.log10(e[k] + 1e-12) > -38:
        print(f"  AVISO: la pausa cerca de {t:.2f} s no encontró silencio ({10 * np.log10(e[k] + 1e-12):.0f} dB)")
    return ini + k + v // 2


class Tiempos:
    """T("frase").s / .e / .i, con el orden del guion. Mismo uso que `cue()` en la animación."""

    def __init__(self, W):
        self.W, self.N = W, [_n(w["w"]) for w in W]

    def __call__(self, frase, desde=0):
        q = [_n(x) for x in frase.split()]
        q = [x for x in q if x]
        for i in range(desde, len(self.N) - len(q) + 1):
            if self.N[i:i + len(q)] == q:
                return type("Tramo", (), {"s": self.W[i]["s"], "e": self.W[i + len(q) - 1]["e"], "i": i})
        raise SystemExit(f"Frase que no está en el guion: {frase}")


class Mezcla:
    def __init__(self, pieza, pausas=None, cola=1.6, ruta=None):
        self.dir = Path(ruta) if ruta else RAIZ / "serie" / pieza
        self.pieza = pieza
        W = json.loads((self.dir / "palabras.json").read_text(encoding="utf-8"))
        W = [{**w, "s": w["s"] / FACTOR, "e": w["e"] / FACTOR} for w in W]
        W0 = [dict(w) for w in W]              # tiempos de la toma SIN pausas: de aquí salen los cortes
        pre = Tiempos(W0)
        voz = lee(self.dir / "voz_108.wav")
        mono = voz.mean(axis=1)
        trozos, ant = [], 0
        for frase, d in sorted((pausas or {}).items(), key=lambda kv: pre(kv[0]).s):
            i = pre(frase).i
            cuando = (W0[i - 1]["e"] + W0[i]["s"]) / 2 if i else 0
            m = _silencio_cercano(mono, cuando)
            trozos += [voz[ant:m], np.zeros((int(d * SR), 2), np.float32)]
            ant = m
            for w in W[i:]:
                w["s"] += d; w["e"] += d
        trozos.append(voz[ant:])
        voz = np.concatenate(trozos)
        self.W, self.T = W, Tiempos(W)
        self.dur = W[-1]["e"] + cola
        self.N = int(self.dur * SR)
        escribe(self.dir / "_voz_larga.wav", voz)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(self.dir / "_voz_larga.wav"), "-af",
                        "highpass=f=78,equalizer=f=120:t=q:w=.9:g=1.4,equalizer=f=420:t=q:w=1.2:g=-2.6,equalizer=f=4200:t=q:w=1.2:g=2.2,treble=g=2:f=10000,"
                        "acompressor=threshold=-24dB:ratio=3.2:attack=6:release=110:makeup=3", str(self.dir / "_voz_proc.wav")], check=True)
        self.voz = lee(self.dir / "_voz_proc.wav") * db(-16.8 - lufs(self.dir / "_voz_proc.wav"))
        self.fx = np.zeros((self.N, 2))
        self.mus = np.zeros((self.N, 2))

    def pon(self, t, s, g=1.0, pan=0.0):
        i = int(t * SR)
        if i < 0 or i >= self.N:
            return
        s = s[: self.N - i]
        self.fx[i:i + len(s), 0] += s * g * np.sqrt((1 - pan) / 2) * 1.414
        self.fx[i:i + len(s), 1] += s * g * np.sqrt((1 + pan) / 2) * 1.414

    def musica(self, tramos, nivel=-25.5):
        """tramos = [(pista, inicio_en_pista, t0, t1, fundido_in, fundido_out)]. Silencio donde no haya."""
        for pista, ini, t0, t1, f_in, f_out in tramos:
            p = RAIZ / "serie" / "musica" / f"{pista}.mp3"
            x = lee(p)
            escribe(self.dir / "_m.wav", x)
            x *= db(nivel - lufs(self.dir / "_m.wav"))
            n = int((t1 - t0) * SR)
            s = x[int(ini * SR):int(ini * SR) + n]
            e = np.ones(len(s))
            a, b = int(f_in * SR), int(f_out * SR)
            if a: e[:a] = np.linspace(0, 1, a) ** 2
            if b: e[-b:] *= np.linspace(1, 0, b)
            i = int(t0 * SR)
            self.mus[i:i + len(s)] += (s * e[:, None])[: self.N - i]

    def exporta_tiempos(self):
        d = RAIZ / "remotion/src/serie" / self.pieza.split("_")[0]
        d.mkdir(parents=True, exist_ok=True)
        (d / "palabras.json").write_text(json.dumps([{"w": w["w"], "s": round(w["s"], 3), "e": round(w["e"], 3)} for w in self.W], ensure_ascii=False), encoding="utf-8")
        (d / "duracion.json").write_text(json.dumps({"dur": round(self.dur, 3)}), encoding="utf-8")
        return self

    def cierra(self, salida="mezcla.wav"):
        escribe(self.dir / "_mus.wav", self.mus)
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(self.dir / "_mus.wav"), "-af", "equalizer=f=2200:t=q:w=1.1:g=-4", str(self.dir / "_mus2.wav")], check=True)
        mus = lee(self.dir / "_mus2.wav")[: self.N]
        v = np.zeros((self.N, 2))
        L = min(self.N, len(self.voz))
        v[:L] = self.voz[:L]
        mez = v + self.fx * 1.2
        mez[: len(mus)] += mus
        # Los últimos 0.9 s siempre se apagan: un final abrupto se oye como corte (José, 2-nov-2026).
        fin = int(.9 * SR)
        mez[-fin:] *= (np.linspace(1, 0, fin) ** 2)[:, None]
        escribe(self.dir / "_mez.wav", mez / max(1.0, np.abs(mez).max() * 1.02))
        s = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(self.dir / "_mez.wav"), "-af", "loudnorm=I=-14:TP=-1.2:LRA=13:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
        m = json.loads(s[s.rindex("{"):])
        subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(self.dir / "_mez.wav"), "-af",
                        f"loudnorm=I=-14:TP=-1.2:LRA=13:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}",
                        "-ar", "48000", str(self.dir / salida)], check=True)
        for f in self.dir.glob("_*.wav"):
            f.unlink()
        print(f"{self.pieza}: {lufs(self.dir / salida)} LUFS, {self.dur:.2f} s")
