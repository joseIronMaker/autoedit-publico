import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"pero nunca invitó": .3, "anthropic lo vio": .55, "decir ya terminé": .3, "entonces cómo sabe": .15,
          "sí todos invitados": .15, "faltan tres": .15, "no y cada punto": .2, "y cada punto": .25,
          "eso hizo anthropic": .6, "sin eso tienes": .4, "por eso un agente": .3, "porque si tú": .3, "él tampoco": .3}
m = Mezcla("a04_terminar", pausas=PAUSAS, cola=2.7).exporta_tiempos()
T = m.T


def pop():
    n = int(.16 * SR)
    t = np.arange(n) / SR
    return golpe(240, 90, .16, .9)[:n] + banda(ruido(n), 1200, 7000) * np.exp(-t * 46) * .8


def metal(f=(233, 349, 587), dur=.9):
    return campana(f, dur, (.7, .5, .3))


def moneda():
    return campana((3322, 4978), .22, (.55, .3))[:int(.3 * SR)]


def traba(dur=.2):
    """La casilla rechaza: un pestillo de metal que se cierra en seco. Nada de chicharras."""
    n = int(dur * SR)
    x = golpe(190, 96, dur, 1.1)[:n]
    y = tic(.022, 1600, 5200)
    x[: len(y)] += y * 1.1
    x[int(.05 * SR):int(.05 * SR) + len(y)] += y * .5
    return x


def v2(t, a, b):
    s = lambda x: (lambda k: k * k * (3 - 2 * k))(np.clip(x, 0, 1))
    return (.6 + .4 * s((t - a) / 1.3)) * (1 - .62 * s((t - (b - .55)) / .5))


# Los mismos instantes que Pieza.tsx.
cuando = T("sí cuando").s + .28
tGolpe = cuando + .4
tBam, tBam2 = T("se detiene").s + .02, T("detenga").s + .06
tCae = T("lista de lo").s + .02
tR1, tR2 = T("se marca").s + .1, T("comprobarlo").s + .2
tMuerde, tPaloma = T("probarlo").s + .12, T("probarlo").e + .24
UT, U1 = .176, 1.9
R1a, R1b = T("tres formas").e + .05, T("contesta").s - .05
R2a = T("la segunda").s + .1
R4a, por = T("o que siga").s + .08, T("por eso un").s
pero, nunca, nadie = T("pero nunca").s, T("nunca invitó").s, T("a nadie")
organ = T("organizada").s
decir, entonces = T("decir ya").s, T("entonces cómo").s

# ---------- fiesta ----------
m.pon(0, pop(), .55, -.2)
m.pon(1.42, pop(), .55, .25)
m.pon(T("listo la").s - .04, pop(), .42, -.15)
m.pon(organ + .1, pop(), .7, .1)
m.pon(organ + .1, campana((659, 880, 1318), 1.2, (.6, .4, .2)), .2)
for a, d in ((0, 1.6), (1.42, 1.5), (organ + .1, 2)):
    m.pon(a + .05, lluvia(d, 34), .13)
k = 0
while (t := .46 + k * .62) < T("te dice").s - .1:
    m.pon(t, golpe(100, 52, .2, .12), .3 - k * .03)
    k += 1
m.pon(T("sí cuando").s - .1, campana((880, 1318), .5, (.6, .3)), .2)
m.pon(T("sí cuando").s - .1, toc(620), .3)
m.pon(cuando, soplo(.34, 500, 2200, .7), .07)
m.pon(tGolpe, golpe(120, 58, .34, .5), .75)
m.pon(tGolpe, tic(.03, 900, 2800), .3)
m.pon(tGolpe + .62, golpe(130, 70, .16, .4), .24)
m.pon(T("restaurante").s, golpe(120, 62, .3, .4), .5)
m.pon(T("listo la").s - .08, toc(760), .3)

# ---------- la mesa vacía: sin música, solo aire ----------
m.pon(nunca - .28, soplo(nadie.e - nunca + .9, 120, 800, .55), .13)
m.pon(nadie.s, golpe(52, 30, .9, .02), .5)

# ---------- la mesa crece ----------
a = T("proyectos largos").s - .15
m.pon(a, soplo(1.9, 160, 1500, .55), .14)
tt, paso = a, .05
while tt < T("proyectos largos").e + .55:
    m.pon(tt, toc(rng.uniform(380, 640)), .13, rng.uniform(-.4, .4))
    tt += paso; paso *= 1.06
m.pon(T("victoria antes").s, golpe(76, 36, .6, .5), .85)
m.pon(T("victoria antes").s, tic(.03, 1500, 4200), .35)
m.pon(T("antes de tiempo").s - .1, toc(520), .16)
m.pon(T("y tiene lógica").s, soplo(decir - T("y tiene lógica").s + .05, 300, 2400, .92), .14)

# ---------- negro: el tambor de frases ----------
m.pon(decir, golpe(56, 30, 1, .04), .7)
a, b = T("es solo otra").s - .05, T("creíble").s + .28
for n in range(23, -1, -1):
    k = 1 - (n / 24) ** (1 / 3)
    m.pon(a + k * (b - a), tic(.03, 1500, 5200), .34 + (.2 if n < 3 else 0))
m.pon(b, toc(300), .4)
m.pon(b, campana((293.7, 440), 1, (.6, .3)), .2)

# ---------- las tres formas ----------
m.pon(T("hay tres").s, soplo(.7, 300, 1800, .5), .06)
m.pon(R1a, golpe(96, 48, .3, .08), .3)
tt = R1a + .1
while tt < R1b - .1:
    m.pon(tt, golpe(150, 90, .05, .3), .13, rng.uniform(-.2, .2))
    tt += .15 + .1 * max(0, tt - (R1b - .8))
m.pon(T("contesta").s - .05, toc(760), .3)
f = T("y la que falla").s
m.pon(f + .1, soplo(.5, 500, 2000, .8), .07)
m.pon(f + .62, golpe(160, 80, .16, .6), .35)

# El tope: cuelga, y la cuenta de vueltas sale de la misma velocidad que el dibujo.
m.pon(T("un límite").e + .05, metal((146.8, 220, 349), .5), .07)
m.pon(T("un límite").e + .05, golpe(84, 44, .3, .05), .2)
ts = np.arange(R2a, tBam, 1 / 480)
v = np.cumsum(v2(ts, R2a, tBam))
U = U1 + (22 + UT - U1) * v / v[-1]
for n in range(0, 21):
    i = int(np.searchsorted(U, 2 + UT + n))
    if i >= len(ts):
        i = len(ts) - 1
    m.pon(ts[i] - .1, soplo(.2, 420, 2400, .5), .06 + n * .002, -.5)
    m.pon(ts[i], tic(.025, 1800, 6000), .2)
tt, kc = T("cierto dinero").s, 0
while tt < tBam:
    m.pon(tt, moneda(), .07, .35)
    tt += .105; kc += 1
m.pon(tBam - .15, soplo(.16, 300, 1500, .9), .14)
m.pon(tBam, golpe(58, 28, .95, .08), 1)
m.pon(tBam + .2, metal(), .1)
m.pon(tBam + .02, toc(170), .16)
m.pon(T("la tercera").s + .3, soplo(.6, 300, 2600, .7), .22)
m.pon(T("es la buena").s - .3, soplo(.5, 400, 2800, .4), .14)
m.pon(T("es la buena").s + .5, golpe(100, 52, .26, .2), .42)

# ---------- la lista ----------
m.pon(tCae - .36, soplo(.38, 600, 5200, .95), .32)
m.pon(tCae, golpe(66, 32, .8, .6), 1)
m.pon(tCae, tic(.04, 900, 3600), .5)
m.pon(tCae, trazo(1.4, 700, 1500), .05)
for k in range(3):
    m.pon(tCae + .25 + k * .22, toc(480 + k * 60), .24)
h = T("hay mesa").s
for d in (.05, .42):
    m.pon(h + d, golpe(240, 160, .13, .5), .5)
s2 = T("sí todos").s
m.pon(s2, golpe(130, 72, .18, .6), .55)
m.pon(s2, campana((1046.5, 1568), .5, (.5, .25)), .2)
SIN = (7, 8, 10)
for i in range(12):
    if i not in SIN:
        m.pon(T("todos invitados").s + i * .095 + .26, tic(.03, 1400, 5200), .2, -.4 + (i % 2) * .8)
for k in range(3):
    m.pon(T("faltan tres").s + k * .15, toc(310), .3)
p = T("pastel no").s
m.pon(p - .28, campana((1760, 2637), .35, (.4, .2)), .2)
m.pon(p - .28, soplo(.35, 700, 3000, .4), .14)
m.pon(T("no y cada").s, toc(190), .34)
m.pon(T("no y cada").s + .82, golpe(280, 190, .1, .5), .3)
m.pon(T("no y cada").s + .82, campana((1320,), .3, (.3,)), .14)
m.pon(T("y cada punto").s, trazo(tR1 - T("y cada punto").s, 340, 560), .05)
m.pon(tR1, traba(.2), .26)
m.pon(tR2, traba(.26), .3)
m.pon(tR2, golpe(84, 42, .4, .05), .4)
m.pon(tR2, soplo(.64, 300, 3400, .45), .26)
for d, g in ((.62, .6), (.92, .3), (1.32, .26), (1.72, .24)):
    m.pon(tR2 + d, golpe(104, 54, .24, .25), g)

# Anthropic: la torre, el sello, y ahora sí la prueba.
a = T("una lista donde").s
m.pon(a, trazo(1.7, 200, 900), .15)
tt, paso = a + .05, .14
while tt < T("sin terminar").s + .3:
    m.pon(tt, tic(.03, 2000, 6000), .15)
    tt += paso; paso = max(.05, paso * .95)
m.pon(T("sin terminar").s, golpe(84, 42, .46, .7), .85)
m.pon(T("y el agente solo").s - .12, soplo(.6, 400, 3200, .3), .2)
d = T("después de probarlo").s
m.pon(d - .35, campana((1760, 2637), .35, (.4, .2)), .2)
m.pon(d - .05, soplo(.3, 700, 2800, .4), .1)
m.pon(tMuerde, banda(ruido(int(.08 * SR)), 1200, 3600) * np.exp(-np.arange(int(.08 * SR)) / SR * 40), .13)
for k in range(3):
    m.pon(tMuerde + .24 + k * .17, golpe(130, 90, .07, .2), .08)
m.pon(tPaloma, golpe(116, 64, .2, .6), .6)
m.pon(tPaloma, campana((659.3, 987.8, 1318.5), 1.6, (.8, .5, .3)), .3)

# ---------- los dos peligros ----------
m.pon(T("sin eso").s + .05, soplo(.95, 400, 3600, .75), .24)
dos = T("dos peligros").s
m.pon(dos, soplo(.34, 500, 2600, .4), .16)
m.pon(dos + .34, golpe(100, 50, .24, .2), .42)
tt = dos + .4
while tt < tBam2 - .1:
    m.pon(tt, golpe(150, 90, .05, .3), .16)
    tt += .14
m.pon(tBam2 - .22, soplo(.24, 300, 1500, .9), .14)
m.pon(tBam2, golpe(58, 28, .9, .08), .95)
m.pon(tBam2 + .2, metal(), .09)
o = T("o que siga").s
m.pon(o, soplo(.5, 300, 2600, .7), .22)
gasta = T("gastando dinero").s
ts = np.arange(R4a, por + .45, 1 / 480)
s = lambda x: (lambda k: k * k * (3 - 2 * k))(np.clip(x, 0, 1))
vv = 2.6 * s((ts - R4a) / (gasta - R4a)) * (1 - s((ts - (por - .15)) / .6))
U4 = np.cumsum(vv) / 480
for n in range(1, int(U4[-1]) + 1):
    i = int(np.searchsorted(U4, n))
    if i < len(ts):
        m.pon(ts[i], soplo(.3, 320, 1800, .5), .06, (-1) ** n * .5)
a = T("dando vueltas").s
N = 300
for i in range(0, N, 2):
    m.pon(a + i * (por + .1 - a) / N, moneda(), .025 + .045 * i / N, rng.uniform(-.7, .7))
m.pon(por + .05, soplo(.5, 400, 2000, .3), .1)
m.pon(por + .45, soplo(.6, 300, 2000, .4), .16)
m.pon(por + 1.05, golpe(100, 50, .26, .2), .42)

# ---------- cómo se ve terminado ----------
ha = T("qué hacer").s
m.pon(ha - .75, soplo(.8, 900, 4200, .7), .1)
m.pon(ha, tic(.03, 1800, 5000), .28)
ve = T("cómo se ve").s
m.pon(ve, polvo(1.1), .16)
m.pon(T("cómo se ve terminado").e + .05, campana((523.3, 784, 1046.5), 2.2, (.8, .45, .25)), .14)
tu = T("tú no lo").s
m.pon(tu - .1, soplo(.9, 2000, 9000, .35), .14)
el = T("él tampoco")
m.pon(el.s + .08, golpe(54, 30, 1, .03), .5)
m.pon(el.s + .1, campana((130.8, 196, 261.6), 2.4, (.8, .4, .2)), .3)
m.pon(el.e + .8, soplo(.7, 500, 1700, .6), .09)
m.pon(el.e + 1.5, toc(240), .2)

# La pista avanza como si nunca se hubiera ido: solo se abre y se cierra. Callada en la mesa vacía, en el negro y tras cada tope.
K = 16
pi = lambda t: K + t
A04 = "a04_terminar"
an = T("anthropic lo vio").s - .3
bu = T("es la buena").s
m.musica([(A04, pi(0), 0, pero, .03, .05), (A04, pi(an), an, decir, .7, .02), (A04, pi(entonces), entonces, tBam, .12, .03),
          (A04, pi(bu), bu, tBam2, .3, .03), (A04, pi(o), o, tu + .2, .06, 1.1)])
m.fx *= .72        # que el foley no pise consonantes
m.cierra()
