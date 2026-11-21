"""Mezcla final: voz con pausas + foley sintetizado + dos atmósferas. Todo amarrado a t.json.

El foley se sintetiza aquí a propósito: cada golpe nace del mismo evento que lo dibuja, así que
sonido e imagen no pueden desincronizarse. Ningún sample de terceros.
"""
import json
import re
import subprocess
import wave
from pathlib import Path

import numpy as np

AQUI = Path(__file__).parent
T = json.loads((AQUI.parent / "remotion/src/perro/t.json").read_text())
CORTES = json.loads((AQUI / "cortes.json").read_text())
SR = 48000
DUR = T["eco_fin"] + 1.6
N = int(DUR * SR)
rng = np.random.default_rng(2013)


def lee(p, seg=None):
    cmd = ["ffmpeg", "-v", "error", "-i", str(p), "-f", "f32le", "-ac", "2", "-ar", str(SR), "-"]
    return np.frombuffer(subprocess.check_output(cmd), np.float32).reshape(-1, 2).copy()


def escribe(p, x):
    y = (np.clip(x, -1, 1) * 32767).astype(np.int16)
    with wave.open(str(p), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes(y.tobytes())


def lufs(p):
    s = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(p), "-af", "ebur128=framelog=quiet", "-f", "null", "-"], capture_output=True, text=True).stderr
    return float(re.findall(r"I:\s+(-?[\d.]+) LUFS", s)[-1])


def db(x):
    return 10 ** (x / 20)


# ---------- voz ----------
voz = lee(AQUI / "voz_108.wav")
trozos, ant = [], 0
for c in CORTES:
    i = int(c["voz_s"] * SR)
    trozos += [voz[ant:i], np.zeros((int(c["dur"] * SR), 2), np.float32)]
    ant = i
trozos.append(voz[ant:])
voz = np.concatenate(trozos)
escribe(AQUI / "audio/voz_larga.wav", voz)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(AQUI / "audio/voz_larga.wav"), "-af",
                "highpass=f=78,equalizer=f=120:t=q:w=.9:g=1.4,equalizer=f=420:t=q:w=1.2:g=-2.6,equalizer=f=4200:t=q:w=1.2:g=2.2,treble=g=2:f=10000,"
                "acompressor=threshold=-24dB:ratio=3.2:attack=6:release=110:makeup=3",
                str(AQUI / "audio/voz_proc.wav")], check=True)
voz = lee(AQUI / "audio/voz_proc.wav")
voz *= db(-16 - lufs(AQUI / "audio/voz_proc.wav"))


# ---------- utilidades de síntesis ----------
def ruido(n):
    return rng.standard_normal(n)


def banda(x, lo, hi):
    F = np.fft.rfft(x)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    F *= np.clip((f - lo * .7) / (lo * .3 + 1), 0, 1) * np.clip((hi * 1.3 - f) / (hi * .3), 0, 1)
    return np.fft.irfft(F, len(x))


def golpe(f0=78, f1=40, dur=.42, clic=.3):
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
    ir = ruido(n) * np.exp(-np.arange(n) / SR * 4.2)
    ir = banda(ir, 180, 5200)
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


fx = np.zeros((N, 2))


def pon(t, s, g=1.0, pan=0.0):
    i = int(t * SR)
    if i < 0 or i >= N:
        return
    s = s[: N - i]
    fx[i:i + len(s), 0] += s * g * np.sqrt((1 - pan) / 2) * 1.414
    fx[i:i + len(s), 1] += s * g * np.sqrt((1 + pan) / 2) * 1.414


def rebotes(t0, h, rest, g=30):
    t = t0 + np.sqrt(2 * h / g)
    v = np.sqrt(2 * g * h) * rest
    out = [t]
    for _ in range(6):
        t += 2 * v / g
        v *= rest
        out.append(t)
    return out


# ---------- partitura de efectos ----------
IMP = .35
pon(IMP, golpe(92, 44), .95)                             # la bola golpea la palabra
pon(IMP + .377, golpe(90, 50, .24, .2), .36)
pon(IMP + .535, golpe(100, 56, .16, .16), .17)
for i in range(16):                                      # las letras se vuelven números
    pon(T["leido"] + .5 + i * .05, tic(.02, 4200, 9500), .07 + .05 * rng.random(), rng.uniform(-.4, .4))
pon(T["antes"] + .1, polvo(T["punto"] + .05 - T["antes"] - .1), .3)
tp = T["punto"] + .08
pon(tp, golpe(60, 120, .16, .05), .42)                   # el polvo cierra en un punto
for k, t in enumerate(rebotes(T["mapa1"] - .535, 4.3, .44)):
    pon(t, golpe(84, 38, .5 - min(k, 3) * .08, .26), .95 * .42 ** k)
pon(T["mapa1"] + .11, cola(soplo(1.4, 180, 900)), .1)
for k, t in enumerate(rebotes(T["gato"] - .12, 2.6, .42)):
    pon(t, golpe(112, 58, .3, .26), .6 * .42 ** k, .2)
pon(T["platano"] - .16, soplo(.72, 300, 3000, .3), .34, .5)
for k, t in enumerate(rebotes(T["alla"] - .36, 2.4, .4)):
    pon(t, golpe(96, 52, .3, .1), .46 * .42 ** k, .1)
pon(T["nadie"] - .45, soplo(2.1, 160, 1500, .55), .15)
pon(T["formo"], soplo(T["lecomer"] - T["formo"], 120, 700, .7), .09)
pon(T["formo"], lluvia(T["leyendo"] + .7 - T["formo"]), .26)
pon(T["cabeperro"] + .76, toc(420), .32, -.1)
pon(T["cabegato"] + .76, toc(470), .32, .1)
for i in range(3):                                       # gato se acerca a saltos
    a = T["acercando"] - .1 + (T["y2013"] - .35 - T["acercando"] + .1) * i / 3
    pon(a, toc(620 + i * 45), .34)
    pon(a, trazo(.28, 500 + i * 40, 900 + i * 60), .07)
pon(T["y2013"] - .3, soplo(1.9, 170, 1500, .5), .13)
pon(T["hombre"], trazo(T["mujer"] + .35 - T["hombre"], 300, 520), .13)
pon(T["casi"], soplo(1.1, 400, 2600, .5), .1)
pon(T["reina"] - .85, trazo(.87, 340, 660), .15)
pon(T["reina"], campana(), .42)
pon(T["saco"] - .1, soplo(1.5, 140, 1200, .55), .14)
pon(T["llamamos"] + .1, soplo(1.5, 140, 1200, .35), .14)
pon(T["embedding"], campana((440, 880), 1.5, (.6, .24)), .26)
pon(T["negro"], golpe(58, 30, 1.1, .05), 1.15)           # corte a negro: el golpe y nada más
pon(T["n_ama"], campana((110, 174.6, 233), 2.2, (1, .6, .3)), .5)
pon(T["dim2"], soplo(1.1, 400, 3400, .25), .12)
pon(T["miles"] + .15, soplo(1.7, 240, 1900, .8), .2)
pon(T["frase"] + .85, golpe(130, 76, .2, .12), .3)
pon(T["truco"] + .1, soplo(.8, 300, 2600, .8), .2)
for i in range(16):
    pon(T["escribes"] + .05 + (T["nolee"] - T["escribes"] - .1) * (i + rng.random() * .4) / 16, tic(.03, 1600, 5000), .2)
pon(T["nolee"] + .15, soplo(.75, 700, 4000, .6), .12)
for i in range(3):
    pon(T["ubica"] + i * .22, campana((987.8, 1975.5), 1.1, (.7, .22)), .22 * (.7 ** i))

pon(T["eco"] + .15, golpe(92, 44), .9)                   # el último golpe, sobre la misma palabra
pon(T["eco"] + .527, golpe(90, 50, .24, .2), .34)
pon(T["eco"] + .685, golpe(100, 56, .16, .16), .16)
pon(T["eco_fin"] + .1, campana((329.6, 493.9, 659.3), 2.2, (.8, .4, .2)), .3)

# ---------- atmósferas: se cortan en seco con el negro ----------
luz, som = lee(AQUI / "audio/pulso2.mp3"), lee(AQUI / "audio/sombra.mp3")
escribe(AQUI / "audio/_l.wav", luz); escribe(AQUI / "audio/_s.wav", som)
# ~9 dB bajo la voz: se oye sin competir (a 11.8 dB José ya no la oía).
luz *= db(-25.5 - lufs(AQUI / "audio/_l.wav")); som *= db(-25.5 - lufs(AQUI / "audio/_s.wav"))


def tramo(src, inicio, t0, t1, f_in=.3, f_out=.03):
    n = int((t1 - t0) * SR)
    s = src[int(inicio * SR):int(inicio * SR) + n]
    e = np.ones(len(s))
    a, b = int(f_in * SR), int(f_out * SR)
    e[:a] = np.linspace(0, 1, a) ** 2
    e[-b:] *= np.linspace(1, 0, b)
    y = np.zeros((N, 2))
    y[int(t0 * SR):int(t0 * SR) + len(s)] = s * e[:, None]
    return y


mus = tramo(luz, 4.0, 0, T["negro"], .05)
mus += tramo(som, 3.0, T["negro"] + .5, T["dim2"], 1.4)
mus += tramo(luz, 66.0, T["dim2"] + .1, DUR, .5, 2.6)

v = np.zeros((N, 2))
L = min(N, len(voz))
v[:L] = voz[:L]
# El eco final es el mismo audio de la apertura: timbre idéntico, sin grabar otra toma.
ia, ib = int(T["eco_voz_ini"] * SR), int(T["eco_voz_fin"] * SR)
eco = voz[ia:ib].copy()
f = int(.012 * SR)
eco[:f] *= np.linspace(0, 1, f)[:, None]; eco[-f:] *= np.linspace(1, 0, f)[:, None]
ie = int(T["eco"] * SR)
v[ie:ie + len(eco)] += eco
escribe(AQUI / "audio/_mus.wav", mus)
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(AQUI / "audio/_mus.wav"), "-af", "equalizer=f=2200:t=q:w=1.1:g=-4", str(AQUI / "audio/_mus2.wav")], check=True)
mus = lee(AQUI / "audio/_mus2.wav")[:N]
mez = v + mus + fx * 1.2
escribe(AQUI / "audio/_mez.wav", mez / max(1.0, np.abs(mez).max() * 1.02))

# ---------- master: -14 LUFS en dos pasadas, lineal ----------
s = subprocess.run(["ffmpeg", "-hide_banner", "-i", str(AQUI / "audio/_mez.wav"), "-af", "loudnorm=I=-14:TP=-1.2:LRA=13:print_format=json", "-f", "null", "-"], capture_output=True, text=True).stderr
m = json.loads(s[s.rindex("{"):])
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(AQUI / "audio/_mez.wav"), "-af",
                f"loudnorm=I=-14:TP=-1.2:LRA=13:linear=true:measured_I={m['input_i']}:measured_TP={m['input_tp']}:measured_LRA={m['input_lra']}:measured_thresh={m['input_thresh']}",
                "-ar", "48000", str(AQUI / "mezcla.wav")], check=True)
print("mezcla:", lufs(AQUI / "mezcla.wav"), "LUFS | duración", round(DUR, 2), "| voz", round(lufs(AQUI / "audio/voz_proc.wav"), 1), "| música -25.5")
