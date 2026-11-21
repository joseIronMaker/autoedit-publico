import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

GEO = json.loads((RAIZ / "remotion/src/serie/c04/geometria.json").read_text(encoding="utf-8"))
PAUSAS = {"dóblala otra vez": .55, "cada capa agarra": .2, "y cuando desdoblas": .45, "esa recta ya": .75, "se convirtió en": .7,
          "doblez tras doblez": .3, "así distingue": .25, "por eso se llama": .45, "y nadie le dice": .3, "una recta sola": .55,
          "pero una recta": .25, "puede casi todo": .75}
m = Mezcla("c04_capas", pausas=PAUSAS, cola=3.0).exporta_tiempos()
T = m.T


# ---------- el papel ----------
def crujido(dur, dens=85, lo=1500, hi=9000):
    """Papel: miles de microfracturas, nunca un ruido liso."""
    n = int(dur * SR)
    y = np.zeros(n)
    e = np.sin(np.linspace(0, np.pi, n)) ** .6
    for _ in range(int(dur * dens)):
        L = int(rng.uniform(70, 900))
        i = int(rng.random() * max(n - L, 1))
        s = banda(ruido(L), rng.uniform(lo, lo * 2.2), rng.uniform(hi * .5, hi)) * np.exp(-np.arange(L) / L * 6) * rng.uniform(.08, 1)
        y[i:i + L] += s[: n - i] * e[i]
    return y


def rodar(dur, f=120):
    """Una bola rodando sobre papel: grave con grano."""
    n = int(dur * SR)
    e = np.minimum(np.linspace(0, 1, n) * 9, 1) * np.minimum(np.linspace(1, 0, n) * 7, 1)
    return (banda(ruido(n), f * .6, f * 3) + banda(ruido(n), 1400, 3600) * .05) * e


def asienta(pan=0.0, g=1.0, f=96):
    """El ala llega: palmada de aire contra la hoja."""
    y = golpe(f, f * .5, .3, .5) * .7
    s = soplo(.16, 500, 3400, .08) * .9
    y[: len(s)] += s
    return y


def dobla(t, dur, g=1.0, pan=0.0, f=96, pico=.72):
    m.pon(t, soplo(dur * pico + .05, 220, 2200, .7), .3 * g, pan)
    m.pon(t, crujido(dur * pico), .34 * g, pan)
    m.pon(t + dur * pico, asienta(f=f), .62 * g, pan)
    m.pon(t + dur * pico, crujido(.22, 170), .3 * g, pan)


def abre(t0, t1, nota, g=1.0, pan=0.0):
    m.pon(t0, crujido(t1 - t0, 70), .3 * g, pan)
    m.pon(t0, soplo(t1 - t0, 200, 1900, .55), .22 * g, pan)
    m.pon(t1 - .1, campana((nota, nota * 1.5, nota * 2), 1.7, (.8, .35, .15)), .15 * g, pan)


# ---------- la hoja cae, la bola también ----------
T_CAE, G_B, H_B, RE_B = .92, 26, 3, .46
CAE_B = T_CAE - np.sqrt(2 * H_B / G_B)
m.pon(0, soplo(T_CAE + .02, 260, 2600, .86), .5)
m.pon(0, crujido(T_CAE, 60), .2)
m.pon(T_CAE, asienta(f=84), 1.0)
m.pon(T_CAE, soplo(.5, 300, 2800, .08), .28)
for k, t in enumerate(rebotes(CAE_B, H_B, RE_B, G_B)):
    m.pon(t, golpe(92, 42, .46 - min(k, 3) * .08, .26), .95 * RE_B ** k)
for k, t in enumerate(rebotes(T("cosa").s - .06, .42, .4, G_B)):
    m.pon(t, golpe(100, 50, .26, .24), .4 * .4 ** k)
# la primera recta
a, b = T("trazar").s - .02, T("línea recta").e + .02
m.pon(a, rodar(b - a), .5)
m.pon(a, trazo(b - a, 280, 640), .16)
# sí / no
for w, f in (("sí", 96), ("no", 72)):
    m.pon(T(w).s - .95, soplo(.95, 400, 2400, .75), .1)
    m.pon(T(w).s, golpe(f, f * .5, .36, .24), .62)
    m.pon(T(w).s, toc(f * 6), .2)
# lluvia de puntos
ini, fin = T("casi nada").s - .4, T("mira").s - .4
for q in GEO["lluvia"]:
    m.pon(q * (fin - ini) + ini + .38, tic(.03, 2600, 7600), rng.uniform(.14, .3), rng.uniform(-.5, .5))
    m.pon(q * (fin - ini) + ini + .38, toc(rng.uniform(700, 1500)), .05, rng.uniform(-.5, .5))
m.pon(T("no").s + .18, rodar(T("casi nada").s + .32 - T("no").s, 100), .2)
m.pon(T("mira").s, trazo(.7, 620, 300), .1)
m.pon(T("puntos").s, tic(.04, 1800, 5000), .22)
# cada quien a su sitio
for f, lo in (("negros", 200), ("rojos", 300)):
    m.pon(T(f).s - .08, polvo(1.15), .5)
    m.pon(T(f).s - .08, soplo(1.15, lo, 2200, .5), .1)
# intentos con una sola recta
I = [T("ninguna").s - .02, T("ahora").s - .4]
n = 7
for j in range(n + 1):
    t = I[0] + j * (I[1] - I[0]) / n
    m.pon(t, golpe(120, 62, .2, .34), .34, -.4 if j % 2 else .4)
    m.pon(t, tic(.03, 2400, 6500), .24, -.4 if j % 2 else .4)
    if j < n:
        m.pon(t, trazo((I[1] - I[0]) / n, 300, 520), .07)
        m.pon(t, rodar((I[1] - I[0]) / n, 170), .18)
# los dobleces
DOB = .95
F1, F2, F3 = T("dóblala").s - .06, T("dóblala otra").s - .1, T("lo vuelve a doblar").s - .12
m.pon(T("agarra la hoja").s, crujido(F1 - T("agarra la hoja").s, 50), .3)
m.pon(T("agarra la hoja").s, trazo(F1 - T("agarra la hoja").s, 180, 260), .05)
dobla(F1, DOB, 1.1, -.2)
dobla(F2, DOB, 1.1, .2, 88)
# una sola recta
a, b = T("una sola recta").s - .12, T("separa todo").s - .1
m.pon(a, rodar(b - a + .4, 130), .42)
m.pon(a, trazo(b - a, 300, 700), .16)
m.pon(b, campana((523.3, 784, 1046.5), 1.8, (.8, .4, .2)), .26)
# la capa aprieta el pliegue
a = T("una capa de neuronas").s
m.pon(a + .1, crujido(T("dobla el espacio").s - a - .3, 55), .26)
m.pon(a - .1, rodar(T("dobla el espacio").s + 1.1 - a, 110), .3)
dobla(T("dobla el espacio").s - .15, .85, 1, 0, 84)
# la tercera
m.pon(T("agarra lo que").s, crujido(F3 - T("agarra lo que").s, 50), .26)
dobla(F3, DOB, 1, .15, 104)
m.pon(F3 + DOB * .8, trazo(1, 420, 560), .1)
# negro: se apaga todo
neg = T("y cuando").s
m.pon(neg, golpe(52, 28, 1.1, .05), .9)
U3 = (T("desdoblas").s + .02, T("esa recta").s - .1)
U2 = (T("esa recta").s + .04, T("se convirtió").s - .08)
U1 = (T("se convirtió").s + .02, T("se convirtió").s + 1.5)
abre(*U3, 329.6, 1.1, .2)
abre(*U2, 392, 1.1, -.2)
abre(*U1, 493.9, 1.2)
m.pon(U1[1] - .05, trazo(.9, 330, 990), .16)
m.pon(T("justo lo que").s, campana((659.3, 987.8, 1318.5), 2.4, (.8, .45, .22)), .3)
# cinco dobleces cualquiera
B0, BD, BN = T("doblez tras").s - .02, .37, 5
for i in range(BN):
    dobla(B0 + i * BD, BD, .8, .3 * (-1) ** i, 100 + i * 8)
tb = B0 + BN * BD
BU, BUD = T("cara de").s - .95, .2
m.pon(tb, soplo(BU - tb + .1, 500, 3800, .6), .3)
m.pon(tb, trazo(BU - tb, 400, 1100), .16)
for i in range(BN):
    m.pon(BU + i * BUD, crujido(BUD + .04, 120), .3, .3 * (-1) ** i)
    m.pon(BU + i * BUD, toc(440 * 2 ** (i * 2 / 12)), .16)
m.pon(BU + BN * BUD, golpe(84, 44, .34, .3), .6)
m.pon(BU + BN * BUD, campana((440, 659.3, 880), 1.8, (.8, .4, .2)), .24)
# la bajada: cada capa suena más grave que la anterior
PASO = (T("muchas capas").s - T("profundo").s) / BN
for i in range(1, BN + 1):
    t = T("profundo").s + (i - 1) * PASO - .12
    dobla(t, .5, .85, .25 * (-1) ** i, 118 - i * 12)
    m.pon(t + .12, soplo(PASO, 140, 900 - i * 90, .5), .2)
    m.pon(t + .12 + PASO * .9, golpe(84 - i * 6, 34, .5, .08), .52)
a, b = T("muchas capas").s - .25, T("y nadie").s - .7
m.pon(a, rodar(b - a, 140), .36)
m.pon(a, trazo(b - a, 300, 520), .1)
a = T("y nadie").s - .62
m.pon(a, soplo(.62, 300, 3600, .82), .46)
m.pon(a, crujido(.56, 140), .3)
m.pon(a + .56, asienta(f=90), .7)
# el aprendizaje: un tic por cada error que se corrige, medido en la misma ruta que dibuja la imagen
R = GEO["aprende"]
ceros, ant = next(i for i, r in enumerate(R) if r["e"] == 0), R[0]["e"]
a, b = T("y nadie").s + .05, T("del error").e + .05
for f in range(int((b - a) * 120) + 1):
    t = a + f / 120
    x = ceros * min(((t - a) / (b - a)) ** 1.25 * 1.02, 1)
    e = R[int(round(x))]["e"]
    while ant > e:
        m.pon(t, tic(.024, 3000, 8000), .24, rng.uniform(-.3, .3))
        m.pon(t, toc(420 + (R[0]["e"] - ant) * 26), .12)
        ant -= 1
        t += .012
    if e == 0 and ant == 0:
        m.pon(t, golpe(110, 56, .4, .24), .55)
        m.pon(t, campana(), .36)
        ant = -1
# una recta sola
a = T("una recta sola").s
m.pon(a - .6, soplo(.58, 240, 1700, .5), .2)
m.pon(a - .6, polvo(.58), .3)
m.pon(a - .06, golpe(70, 36, .36, .1), .4)
m.pon(a - .06, rodar(T("no puede casi").s + .8 - a, 110), .26)
# el cabeceo de la recta: un quejido por cada ida y vuelta
tt = a + np.pi / 2 / 2.75
while tt < T("pero una recta").s - .2:
    m.pon(tt, trazo(.5, 190, 150), .1)
    m.pon(tt, tic(.05, 700, 2000), .1)
    tt += np.pi / 2.75
m.pon(T("pero una recta").s + .05, soplo(.5, 400, 3200, .8), .26)
# la misma recta, doblada
F0, FD, FN, U0, UD = T("doblada").s - .14, .4, 4, T("puede casi todo").s - .2, .3
for i in range(FN):
    dobla(F0 + i * FD, FD, .9, .3 * (-1) ** i, 90 + i * 10)
CB0, CB1 = F0 + FN * FD + .02, U0 - .03
m.pon(CB0 - .22, rodar(CB1 + .1 - CB0 + .22, 150), .42)
m.pon(CB0, trazo(CB1 - CB0, 400, 900), .16)
NOTAS = (329.6, 392, 493.9, 659.3)
for i in range(FN):
    m.pon(U0 + i * UD, crujido(UD + .04, 120), .34, .3 * (-1) ** i)
    m.pon(U0 + i * UD, soplo(UD + .05, 260, 2200, .5), .2)
    m.pon(U0 + (i + 1) * UD, toc(NOTAS[i]), .22)
fin = T("casi todo").e
m.pon(U0 + FN * UD, golpe(80, 40, .5, .26), .8)
m.pon(U0 + FN * UD, campana((329.6, 493.9, 659.3, 987.8), 3.2, (.8, .5, .3, .16)), .34)
for k, t in enumerate(rebotes(fin - .14, 5, .44, 24)):
    m.pon(t, golpe(92, 44, .4, .22), .85 * .44 ** k)

# ---------- el foley le abre paso a la voz ----------
# La música no se toca: una cama con ducking se oye como corte. Lo que se aparta es el foley, y sobre todo su
# banda media, que es donde está el habla; el grave de cada golpe se queda para conservar el peso.
def aparta(m, medio=-15, grave=-6, corte=190, adelanto=.035, ataque=.012, suelta=.16):
    n = m.N
    v = np.zeros(n)
    L = min(n, len(m.voz))
    v[:L] = np.abs(m.voz[:L]).mean(axis=1)
    p = int(.03 * SR)
    env = np.convolve(v, np.ones(p) / p, "same")[::48]                   # 1 kHz
    activa = env > np.percentile(env[env > 1e-5], 55) * .22
    a, r = np.exp(-1 / (ataque * 1000)), np.exp(-1 / (suelta * 1000))
    g = np.zeros(len(activa))
    q = 0.0
    for i, x in enumerate(activa):
        q = (a if x else r) * q + (1 - (a if x else r)) * float(x)
        g[i] = q
    g = np.interp(np.arange(n) + adelanto * SR, np.arange(len(g)) * 48, g)  # se aparta un poco antes de la palabra
    f = np.fft.rfftfreq(n, 1 / SR)
    for ch in (0, 1):
        F = np.fft.rfft(m.fx[:, ch])
        bajo = np.fft.irfft(F * np.clip((corte * 1.3 - f) / (corte * .6), 0, 1), n)
        m.fx[:, ch] = bajo * (1 - g * (1 - db(grave))) + (m.fx[:, ch] - bajo) * (1 - g * (1 - db(medio)))


m.fx *= .7                                                               # -3 dB: en los huecos el foley no debe sonar como la voz
aparta(m)

# ---------- música: se corta en seco al negro y vuelve con el primer doblez ----------
vuelve = T("doblez tras").s - .02
m.musica([("c04_capas", 8, 0, neg, .05, .03), ("c04_capas", 52, vuelve, m.dur, .02, 3.0)])
m.cierra()
