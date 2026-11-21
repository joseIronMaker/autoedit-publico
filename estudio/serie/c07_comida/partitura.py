import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"y no funcionaba": .15, "las redes": .4, "la idea era": .25, "le faltaban": .1, "la primera": .35, "una red aprende": .2,
          "hasta que": .75, "la segunda": .4, "entrenar es": .1, "y resulta": .1, "en dos mil": .45, "en el concurso": .35,
          "alexnet el quince": .45, "nadie había": .75, "y no traía": .3, "por eso": .15, "a la idea": .5, "le faltó comida": .7}
m = Mezcla("c07_comida", pausas=PAUSAS, cola=3.3).exporta_tiempos()
T = m.T
if "--tiempos" in sys.argv:
    for w in m.W:
        print(f"{w['w']}@{w['s']:.2f}", end=" ")
    print("\nDUR", m.dur)
    raise SystemExit


# ---------- lo que esta pieza necesita y el kit no trae ----------
def fade(x, a=.01, b=.05):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

def loza(f=1480, dur=.8):
    """Plato: parciales inarmónicos de cerámica, no una campana."""
    tt = np.arange(int(dur * SR)) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in ((1, 1, 7), (2.32, .6, 11), (3.95, .42, 16), (5.62, .28, 24), (8.1, .16, 34)))
    return s * np.minimum(tt / .001, 1) + .25 * banda(ruido(len(tt)), 1500, 7000) * np.exp(-tt * 180)

def papel(dur=.16):
    n = int(dur * SR); e = np.exp(-np.linspace(0, 7, n))
    return (banda(ruido(n), 1600, 8200) + banda(ruido(n), 300, 1300) * .5) * e

def tripa(d):
    """El estómago vacío."""
    n = int(d * SR); tt = np.arange(n) / SR
    f = 74 + 34 * np.sin(2 * np.pi * .9 * tt) + 20 * np.sin(2 * np.pi * 3.7 * tt + 1)
    fase = 2 * np.pi * np.cumsum(f) / SR
    e = np.sin(np.linspace(0, np.pi, n)) ** .7 * (.55 + .45 * np.sin(2 * np.pi * 5.3 * tt) ** 2)
    return (np.sin(fase) + .5 * np.sin(2 * fase)) * e + banda(ruido(n), 90, 420) * e * .5

def traga():
    n = int(.15 * SR); tt = np.arange(n) / SR
    return np.sin(2 * np.pi * np.cumsum(np.geomspace(460, 105, n)) / SR) * np.exp(-tt * 9) * np.minimum(tt / .004, 1)

def sello():
    return np.concatenate([golpe(135, 72, .15, .7)]) + np.pad(tic(.03, 1200, 5200), (0, int(.15 * SR) - int(.03 * SR)))

def cuadrada(f, d, g=.5):
    tt = np.arange(int(d * SR)) / SR
    return np.sign(np.sin(2 * np.pi * f * tt)) * np.exp(-tt * 7) * g * np.minimum(tt / .002, 1)

def sube8(f0, f1, d):
    n = int(d * SR); ph = 2 * np.pi * np.cumsum(np.geomspace(f0, f1, n)) / SR
    return np.sign(np.sin(ph)) * np.linspace(1, .3, n) * .4

def ventilador_son(d):
    n = int(d * SR); tt = np.arange(n) / SR
    return fade((banda(ruido(n), 240, 1900) * .9 + banda(ruido(n), 2200, 5000) * .2) * (.8 + .2 * np.sin(2 * np.pi * 31 * tt)), .25, .3)

def rodar(d):
    n = int(d * SR); tt = np.arange(n) / SR
    return banda(ruido(n), 70, 430) * (.6 + .4 * np.sin(2 * np.pi * tt * np.linspace(8, 21, n))) * np.sin(np.linspace(0, np.pi, n)) ** .6

def aguacero(d, dens=62):
    n = int(d * SR)
    return banda(ruido(n), 1300, 5200) * .05 + lluvia(d, dens)[:n] * .5

inout = lambda x: 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2
clamp = lambda x, a=0., b=1.: max(a, min(b, x))
prog = lambda t, a, b: clamp((t - a) / max(b - a, 1e-6))

# ---------- los mismos tiempos que Pieza.tsx ----------
QUE = T("que internet").s
HASTA = QUE - .22
DIG86 = [.46, .74, 1.14, 1.52]
d12 = T("en dos mil").s
DIG12 = [d12 + .17, d12 + .4, d12 + .62, d12 + .84]
Y, LAS = T("y no funcionaba").s, T("las redes").s
HAB = T("había").e
LLUVIA, D_LLUVIA = QUE + .72, 3.1
MAS = T("de un millón").s - .33
COME = MAS + .04
ENT = T("entrenar").s
RES = T("y resulta").s
MUS = T("músculo").s
AL2 = T("alexnet el quince").s
Q15 = T("quince").s - .2
SALTO = T("salto").s - .1
GOL = T("de golpe").e - .22
AUN = T("aunque").s
AID = T("a la idea").s
LEF = T("le faltó comida").s + .09
COM2 = T("le faltó comida").e
CONC = T("en el concurso").s
LUGAR = T("el segundo lugar").s
V26 = T("veintiséis").s
CIEN = T("por ciento").e
FOTO2 = T("millón de fotos").e

# ---------- el plato cae y 1986 se le viene encima ----------
m.pon(.05, golpe(74, 36, .6, .42), 1.0)
m.pon(.05, cola(loza(1240, .9), 1.2, .2), .34)
for k, q in enumerate(DIG86):
    m.pon(q, golpe(66 - k * 4, 33, .6, .38), .95 + k * .05, (k - 1.5) * .22)
    m.pon(q, loza(1500 + k * 90, .4), .13)
for q, g in ((2.14, .13), (2.42, .08), (2.58, .05)):
    m.pon(q, loza(2100, .3), g)
# cartas
ya = T("ya sabíamos").s
for i in range(6):
    m.pon(ya + .2 + i * .27, papel(), .3, (i % 3 - 1) * .4)
aqui = T("has visto aquí").s
m.pon(aqui + .3, soplo(.6, 500, 3200, .5), .22)
m.pon(aqui + .55, soplo(1.1, 240, 1500, .7), .16)

# ---------- la red se arma ----------
neu = T("neuronas").s
for i in range(11):
    m.pon(neu - .14 + i * .04, toc(rng.uniform(420, 760)), .26, rng.uniform(-.4, .4))
cap = T("capas").s
m.pon(cap, trazo(.62, 280, 560), .16)
err = T("error").s
m.pon(err, golpe(96, 50, .26, .3), .46)
m.pon(err + .02, trazo(.36, 700, 300), .13)
rep = T("repartir").s
m.pon(rep + .05, trazo(1.1, 760, 230), .2)
m.pon(rep + .05, soplo(1.2, 400, 2300, .5), .12)

# ---------- no funcionaba: la música se corta y la red se apaga ----------
m.pon(Y, golpe(50, 27, 1.1, .05), 1.15)
dur = (LAS - .55) - (Y + .1)
for f in (.156, .47, .78):
    m.pon(Y + .1 + dur * f, golpe(62, 30, .34, .03), .5)

# ---------- chiquitas, lentas, y los demás los rebasan ----------
m.pon(LAS - .02, soplo(1.25, 260, 3000, .22), .22)
m.pon(LAS + .45, loza(2600, .32), .1)
len_, otr = T("lentas").s, T("otros métodos").s
tt = len_ + .02
while tt < otr - .1:
    m.pon(tt, tic(.03, 1400, 3200), .2); tt += .3
for dl, pan in ((0, -.5), (.38, .1), (.72, .55)):
    a = otr - .15 + dl
    m.pon(a, rodar(1.05), .42, pan)
    m.pon(a + .2, soplo(.75, 300, 2600, .5), .11, pan)

# ---------- la idea, y lo que le faltaba ----------
idea = T("la idea era").s
m.pon(idea, polvo(1.1), .3)
m.pon(idea, trazo(1.25, 210, 420), .15)
m.pon(T("correcta").s + .1, campana((440, 660), 1.3, (.7, .3)), .17)
dos, cosas = T("dos cosas").s, T("cosas").s
m.pon(dos, golpe(64, 34, .5, .3), .85, -.3)
m.pon(cosas, golpe(58, 32, .55, .3), .95, .3)
com = T("comida").s
m.pon(com, loza(1680, .8), .26)
m.pon(com, golpe(112, 56, .22, .2), .38)

# ---------- come lo poco que hay, y se queda con hambre ----------
for q in (T("ejemplos").s + .12, T("casi no había").s + .27, HAB + .12):
    m.pon(q - .34, papel(.12), .08)
    m.pon(q, traga(), .24)
m.pon(HAB + .28, tripa(HASTA - HAB - .05), .15)

# ---------- llueven fotos ----------
for q, g in ((HASTA + .4, .3), (QUE + .36, .34), (QUE + .62, .38)):
    m.pon(q, loza(1950, .3), g * .5)
    m.pon(q, papel(.14), g)
d = D_LLUVIA + 1.5
n = int(d * SR)
env = np.minimum(np.linspace(0, 1, n) * 2.4, 1) ** 2 * np.minimum(np.linspace(1, 0, n) * 2.6, 1)
m.pon(LLUVIA - .35, aguacero(d) * env, .4)
m.pon(LLUVIA - .3, rodar(d) * env, .22)
# etiquetas: sellos en ráfaga
etiq = T("etiquetó").s
for _ in range(46):
    q = etiq + .06 + rng.random() * 2.6
    m.pon(q, tic(.025, 1600, 4600), .15, rng.uniform(-.5, .5))
    if rng.random() < .3:
        m.pon(q, toc(rng.uniform(300, 520)), .13, rng.uniform(-.5, .5))
m.pon(T("miles de personas").s - .2, soplo(1.5, 500, 1700, .5), .14)
fo = [T("foto por foto").s, T("por foto").s, T("por foto").e - .22]
m.pon(fo[0] - .46, soplo(.46, 500, 3600, .85), .3)
for q in fo:
    m.pon(q, sello(), .46)

# ---------- músculo ----------
seg = T("la segunda").s
m.pon(seg - .6, soplo(.9, 260, 2400, .4), .32)
m.pon(MUS, golpe(70, 36, .5, .3), .8)
m.pon(MUS + .46, soplo(ENT - MUS - .48, 500, 6400, .92), .56)
m.pon(ENT - .02, golpe(88, 40, .3, .1), .6)
# los números corren: cada tic es una ronda de multiplicaciones
k = 0
while True:
    u = (-5 + (25 + 12 * k) ** .5) / 6
    if u > 2.9: break
    q = ENT + u
    m.pon(q, tic(.022, 2600, 7800), .13 + .06 * u / 2.9, rng.uniform(-.3, .3)); k += 1
q = ENT + 2.9
while q < RES + 1.4:
    m.pon(q, tic(.02, 3000, 8000), .17 * (1 - prog(q, ENT + 2.9, RES + 1.4) * .8), rng.uniform(-.3, .3)); q += .045
m.pon(RES, trazo(1.6, 360, 900), .12)

# ---------- la tarjeta y el videojuego ----------
tar = T("las tarjetas").s
m.pon(tar - .1, soplo(.5, 280, 2200, .5), .24)
m.pon(tar + .32, golpe(84, 42, .3, .2), .52)
m.pon(tar + .1, ventilador_son(DIG12[0] - tar - .1), .06)
ts = RES + 1.5
for j in range(2):
    m.pon(ts + 1.3 + 1.8 * j, sube8(300, 900, .2), .05)
    if ts + 1.9 + 1.8 * j < DIG12[0]:
        m.pon(ts + 1.9 + 1.8 * j, cuadrada(988, .08), .13)
        m.pon(ts + 1.98 + 1.8 * j, cuadrada(1319, .22), .13)

# ---------- 2012: la entrada grande de la música cae en el primer dígito ----------
for k, q in enumerate(DIG12):
    m.pon(q, golpe(62 - k * 3, 30, .7, .16), .9 + k * .05, (k - 1.5) * .25)
m.pon(DIG12[0], lluvia(1.1, 110), .24)
m.pon(T("se juntó").s + .85, soplo(.8, 300, 2200, .4), .18)
alex = T("alexnet").s
m.pon(alex - .55, trazo(.9, 240, 620), .18)
m.pon(alex + .02, campana((523.3, 784), 1.5, (.8, .4)), .22)
m.pon(alex + .02, golpe(92, 46, .34, .12), .32)

# ---------- cualquier tienda ----------
dt = T("dos tarjetas").s
m.pon(dt - .05, soplo(.5, 280, 2400, .45), .16)
m.pon(dt + .42, campana((1318.5, 1760), .9, (.8, .55)), .15)
m.pon(dt + .54, campana((1760, 2093), .8, (.7, .4)), .11)
for q in (T("vendían").s, T("cualquier").s + .1):
    m.pon(q, toc(880), .26)
    m.pon(q + .05, campana((2093, 2637), .7, (.8, .5)), .12)

# ---------- se la come ----------
m.pon(MAS - .34, soplo(.5, 280, 2400, .5), .15)
m.pon(MAS + .1, golpe(80, 40, .3, .1), .3)
d = COME + 2.3 - MAS
m.pon(MAS, trazo(d, 110, 520), .11)
m.pon(MAS, polvo(d), .13)
m.pon(MAS, ventilador_son(d), .07)
for q in np.arange(COME + .2, COME + 2.0, .3125):
    m.pon(q, golpe(54, 40, .16, 0), .16)

# ---------- la foto del concurso ----------
a = FOTO2 + .32
m.pon(a - .05, soplo(CONC + .15 - a, 400, 3800, .8), .36)
m.pon(CONC + .12, papel(.2), .52)
m.pon(CONC + .12, golpe(100, 54, .2, .3), .34)
for i in range(5):
    q = CONC + .4 + i * .26
    m.pon(q, toc(620 + i * 40), .22, (i % 2 - .5) * .5)
m.pon(LUGAR - 1.0, campana((880, 1318.5), 1.0, (.7, .3)), .13)

# ---------- las barras: la música se va en el 15 ----------
m.pon(LUGAR + .35, trazo(V26 + .4 - LUGAR - .35, 180, 520), .22)
m.pon(V26 + .4, golpe(92, 48, .34, .1), .32)
tA = CIEN - .1
for k, (q, g) in enumerate(((tA, .24), (tA + .22, .11), (tA + .38, .05))):
    m.pon(q, golpe(150, 86, .16, .3), g)
m.pon(AL2 + .12, trazo(Q15 + .22 - AL2 - .12, 180, 420), .2)
m.pon(Q15 + .12, golpe(52, 27, 1.2, .5), 1.2)
m.pon(Q15 + .12, cola(toc(330), 1.6, .3), .2)
m.pon(SALTO - .05, soplo(.8, 380, 3200, .6), .24)
tB = SALTO + .78
for k, (q, g) in enumerate(((tB, .72), (tB + .45, .22), (tB + .72, .08))):
    m.pon(q, golpe(120, 60, .24, .3), g)
m.pon(tB, campana((659.3, 987.8), 1.4, (.7, .3)), .15)

# ---------- no traía una idea nueva ----------
nt, nueva = T("y no traía").s, T("nueva").s
m.pon(nt - .05, trazo(.65, 300, 110), .24)
m.pon(nueva - .3, rodar(.6), .8)
m.pon(nueva - .3, trazo(.6, 400, 900), .1)
gde = T("en grande").s
m.pon(gde - .05, soplo(.7, 260, 3000, .4), .13)
m.pon(gde + .28, golpe(68, 36, .5, .08), .42)

# ---------- de golpe, y décadas de regla ----------
por = T("por eso").s
m.pon(por + .05, soplo(.7, 420, 3400, .5), .1)
m.pon(GOL - .5, soplo(.5, 300, 2400, .9), .3)
m.pon(GOL, golpe(48, 25, 1.3, .55), 1.3)
m.pon(GOL, cola(toc(220), 1.8, .3), .22)
A = lambda a: (a - 1986) * 118
for a in range(2012, 1985, -1):
    tt = np.linspace(AUN + .25, AUN + 2.5, 500)
    xw = [A(2012) - 200 + (A(1986) - 780 - A(2012) + 200) * inout(prog(x, AUN + .25, AUN + 2.5)) for x in tt]
    i = int(np.argmin(np.abs(np.array(xw) - A(a))))
    m.pon(tt[i], tic(.022, 1800, 5200), .09 if a % 5 else .17)
m.pon(AUN + .3, soplo(2.1, 260, 1900, .5), .07)

# ---------- final: la última foto cae en el plato y se la traga ----------
fp = COM2 + .3
cae, come, llega = fp + .5, fp + 1.0, fp + 1.4
m.pon(AID + 2.0, trazo(.6, 300, 480), .06)
m.pon(COM2 - .42, golpe(70, 38, .5, .16), .6)
m.pon(COM2 - .42, campana((329.6, 493.9, 659.3), 2.4, (.8, .4, .2)), .24)
m.pon(fp + .1, soplo(.42, 700, 4200, .85), .14)
m.pon(cae, loza(1800, .7), .3)
m.pon(cae, papel(.14), .34)
m.pon(come - .05, papel(.12), .14)
m.pon(llega - .08, traga(), .55)
m.pon(llega + .62, loza(2100, .45), .16)
m.pon(llega + .62, golpe(110, 56, .22, .1), .34)

# ---------- la voz manda ----------
# El foley cede solo en la banda donde vive el habla: el grave de los golpes sigue pesando y se apaga
# solo cuando la voz se calla. La música no pasa por aquí: una cama con ducking se oye como cortes.
def voz_manda(d=7.):
    from numpy.lib.stride_tricks import sliding_window_view as ventana
    b = int(.01 * SR)
    v = np.zeros(m.N); L = min(m.N, len(m.voz)); v[:L] = m.voz[:L].mean(axis=1)
    n = m.N // b
    r = np.sqrt((v[:n * b].reshape(n, b) ** 2).mean(axis=1) + 1e-10)
    act = np.clip((20 * np.log10(r) + 42) / 14, 0, 1)
    act = ventana(np.pad(act, (22, 8)), 31).max(axis=1)            # se abre 80 ms antes, cierra 220 ms después
    act = np.convolve(act, np.ones(5) / 5, "same")
    g = np.interp(np.arange(m.N), (np.arange(n) + .5) * b, 10 ** (-d * act / 20))
    f = np.fft.rfftfreq(m.N, 1 / SR)
    for ch in (0, 1):
        low = np.fft.irfft(np.fft.rfft(m.fx[:, ch]) * np.clip((230 - f) / 110, 0, 1), m.N)
        m.fx[:, ch] = low + (m.fx[:, ch] - low) * g

voz_manda()

# música: la entrada del segundo 60.1 cae en el primer dígito de 2012
DESP = 60.1 - DIG12[0]
m.musica([("c07_comida", 28, 0, Y, .04, .03), ("c07_comida", 97, LAS + .05, HAB + .35, .3, .7), ("c07_comida", HASTA + DESP, HASTA, DIG12[0], .5, .01)], nivel=-22)
m.musica([("c07_comida", 60.1, DIG12[0], Q15 + .12, .01, .05), ("c07_comida", 78, nt, AID - .05, .35, .6)], nivel=-28)
m.musica([("c07_comida", 107.6, AID, m.dur, .5, 1.3)], nivel=-23)
m.cierra()
