import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

# Cuidado: "vale por" a secas cae en "NO vale por"; la frase larga es la del cierre.
PAUSAS = {"y falla": .45, "se aprendió": .2, "unos investigadores": .2, "todos los lobos": .3, "miraba la nieve": .4,
          "por eso se esconde": .8, "y cuando el error": .5, "ahí se detiene": .25, "un modelo no vale": .7,
          "vale por lo que acierta en lo que nunca": .4}
m = Mezcla("c06_memoria", pausas=PAUSAS, cola=3.4).exporta_tiempos()
T = m.T

# Whisper estira la palabra anterior sobre el silencio: estos tres arranques están medidos sobre la onda.
ahora = T("ahora llega").s + .36
falla = T("y falla").s + .48
miraba = T("miraba la nieve").s + .57

# ---------- calendario común: la animación lee estos mismos instantes ----------
BH, BR, BG = 3.2, .42, 30              # física de las bolas que caen sobre la hoja
NH, NR = 6.0, .3                       # el dato nuevo cae de más alto
cae = float(np.sqrt(2 * BH / BG))
cae_n = float(np.sqrt(2 * NH / BG))

en_todos = T("en todos").s
diez = T("diez").s
hojas = [.13, .72, 1.32, 1.95, diez] + [en_todos + d for d in (.02, .32, .58, .8, .98, 1.13, 1.25)]
i_diez = 4

orden = [3, 7, 0, 9, 5, 1, 10, 4, 8, 2, 6]
bolas = [0.0] * 11
bolas[orden[0]] = T("mira").s - cae + .05    # "Mira.": la primera bola toca la hoja justo en la palabra
tt = T("aquí están").s - .05
for k, i in enumerate(orden[1:]):
    bolas[i] = tt
    tt += max(.12, .28 - k * .018)

toques = [T("toca cada punto").s + .08 + i * .095 for i in range(11)]
caida_n = falla - cae_n

inv, prop = T("unos investigadores").s, T("a propósito").s
fotos, lobos_s, perros_s = T("con fotos").s, T("de lobos").s, T("de perros").s
# Seis cartas; la 2 y la 5 salen "mal" a propósito para que se vea que alguien las descarta.
cartas = [inv + .05, inv + .6, inv + 1.15, fotos + .05, lobos_s + .1, perros_s + .05]
todos = T("todos los lobos").s
rechazos = [todos + .1, todos + .55]
aciertos = [T("acertaba").s + .02 + i * .19 for i in range(6)]
diez2 = T("parecía brillante").s + .1

pe = T("por eso se esconde").s
parte, datos = T("una parte").s, T("de los datos").s
saltos = [datos - .25 + i * .105 for i in range(16)]
jamas = T("la máquina jamás").s
cierra_sobre = jamas - .42
sello_t = jamas + .02

ev = dict(BH=BH, BR=BR, BG=BG, NH=NH, NR=NR, ahora=ahora, falla=falla, miraba=miraba, caida_n=caida_n, hojas=hojas, iDiez=i_diez, bolas=bolas, toques=toques,
          cartas=cartas, rechazos=rechazos, aciertos=aciertos, diez2=diez2, saltos=saltos, cierra_sobre=cierra_sobre, sello=sello_t)
(RAIZ / "remotion/src/serie/c06/ev.json").write_text(json.dumps({k: (np.round(v, 3).tolist() if isinstance(v, list) else round(v, 3) if isinstance(v, float) else v) for k, v in ev.items()}), encoding="utf-8")


# ---------- materiales ----------
def fade(x, a=.02, b=.02):
    n = len(x)
    e = np.ones(n)
    ia, ib = min(int(a * SR), n), min(int(b * SR), n)
    if ia: e[:ia] = np.linspace(0, 1, ia)
    if ib: e[-ib:] *= np.linspace(1, 0, ib)
    return x * e


def papel(dur=.16):
    n = int(dur * SR)
    e = np.exp(-np.linspace(0, 7, n))
    return (banda(ruido(n), 1600, 8200) + banda(ruido(n), 300, 1300) * .5) * e


def hoja_cae(peso=1.0):
    """Una hoja que aterriza de plano: aire que escapa y palmada."""
    x = np.zeros(int(.3 * SR))
    p = papel(.2) * .9
    g = golpe(lerp_f(120, 78, peso), 44, .26, .32) * (.5 + .5 * peso)
    x[:len(p)] += p
    x[:len(g)] += g
    return x


def lerp_f(a, b, k):
    return a + (b - a) * k


def sello(peso=1.0):
    """Goma contra mesa: golpe seco con cuerpo."""
    x = np.zeros(int(.42 * SR))
    g = golpe(98, 42, .4, .55)
    p = papel(.1) * .5
    x[:len(g)] += g * peso
    x[:len(p)] += p
    return x


def cuerda(dur, f0, f1, vib=.012):
    """Un alambre que se tensa: tono con armónicos que sube y vibra cada vez más."""
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    tt = np.arange(n) / SR
    f = f * (1 + vib * np.linspace(.3, 1.6, n) * np.sin(2 * np.pi * tt * np.linspace(4, 9, n)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade((np.sin(ph) + .46 * np.sin(2 * ph + .4) + .24 * np.sin(3 * ph + 1.1)) * np.linspace(.45, 1, n), .05, .08)


def crujido(d, f=190, dens=.065):
    n = int(d * SR)
    y = np.zeros(n)
    t = 0.0
    while t < d - .1:
        s = toc(f * rng.uniform(.8, 1.3)) * rng.uniform(.25, .7)
        i = int(t * SR)
        y[i:i + len(s)] += s[: n - i]
        t += rng.uniform(.3, 1.5) * dens
    return y


def viento(d):
    n = int(d * SR)
    tt = np.arange(n) / SR
    a = banda(ruido(n), 200, 1100) * (.62 + .38 * np.sin(2 * np.pi * .31 * tt + 1)) * (.72 + .28 * np.sin(2 * np.pi * .73 * tt + 2))
    b = banda(ruido(n), 2400, 6500) * .1 * (.5 + .5 * np.sin(2 * np.pi * .47 * tt))
    return fade(a + b, .5, .02)


def dron(d, f=46):
    n = int(d * SR)
    tt = np.arange(n) / SR
    return fade((np.sin(2 * np.pi * f * tt) + .55 * np.sin(2 * np.pi * f * 1.5 * tt + 1) + .2 * np.sin(2 * np.pi * f * 2.02 * tt)) * (.8 + .2 * np.sin(2 * np.pi * .9 * tt)), .3, .05)


def rodar(d, f=120):
    n = int(d * SR)
    tt = np.arange(n) / SR
    return banda(ruido(n), 70, 520) * (.6 + .4 * np.sin(2 * np.pi * tt * np.geomspace(19, 6, n))) * np.sin(np.linspace(0, np.pi, n)) ** .7


def glide(tiempos, frecs):
    """Tono que sigue una línea de frecuencia por tramos, con su envolvente."""
    n = int((tiempos[-1] - tiempos[0]) * SR)
    tt = np.linspace(tiempos[0], tiempos[-1], n)
    f = np.exp(np.interp(tt, tiempos, np.log(frecs)))
    ph = 2 * np.pi * np.cumsum(f) / SR
    return fade(np.sin(ph) + .35 * np.sin(2 * ph + .7), .08, .04)


# ---------- la apertura ----------
PEN = [440, 523.3, 587.3, 659.3, 784, 880, 1046.5, 1174.7, 1318.5, 1568, 1760]
for i, h in enumerate(hojas):
    if i == i_diez:
        m.pon(h, hoja_cae(1), .82)
        m.pon(h, golpe(62, 34, .55, .2), .5)
        m.pon(h, cola(toc(330)), .24, .15)
    elif i < i_diez:
        m.pon(h, hoja_cae(.7), .7)
    else:
        m.pon(h, hoja_cae(.25), .34 + i * .02, (-1) ** i * .25)
no_s = hojas[-1] + .3
m.pon(no_s, soplo(.95, 500, 3400, .3), .2)
m.pon(no_s, trazo(.8, 1100, 220), .15)
for j in range(6):
    m.pon(no_s + j * .07 + .22, tic(.03, 1400, 4200), .16, (-1) ** j * .2)
m.pon(T("y no saber nada").e + .08, soplo(1.05, 180, 1600, .62), .24)

# ---------- los ejemplos ----------
for i, t0 in enumerate(bolas):
    x = [-0.984, -0.882, -0.751, -0.577, -0.409, -0.22, -0.003, 0.568, 0.747, 0.856, 0.988][i]
    for k, t in enumerate(rebotes(t0, BH, BR, BG)[:4]):
        m.pon(t, golpe(138 - i * 3, 66, .2, .36), (.62 if i == orden[0] else .46) * BR ** k, x * .55)
m.pon(T("una curva").s - .05, trazo(1.1, 300, 540), .14)
for i in range(11):
    m.pon(T("y se equivoca").s - .05 + i * .03, tic(.03, 1000, 3200), .13)

# ---------- entrenar: el alambre se tensa ----------
a, b = T("sigue entrenando").s, T("cada punto").e
m.pon(a + .1, cuerda(T("se dobla").s - a, 62, 96), .1)
d0 = T("se dobla").s
m.pon(d0, cuerda(b - d0, 96, 410), .15)
m.pon(d0, crujido(b - d0), .11)
m.pon(T("se retuerce").s, soplo(.8, 300, 2800, .55), .16)
for i, t in enumerate(toques):
    m.pon(t, toc(PEN[i]), .3, -.5 + i * .1)
m.pon(T("cero").s, campana((880, 1318.5), 1.3, (.7, .3)), .22)
m.pon(T("perfecto").s, sello(), .72)

# ---------- el dato nuevo ----------
m.pon(ahora, trazo(caida_n - ahora, 110, 190), .17)
m.pon(ahora, soplo(.7, 300, 2200, .5), .1)
m.pon(caida_n, soplo(cae_n, 250, 3200, .9), .34)
for k, t in enumerate(rebotes(caida_n, NH, NR, BG)[:4]):
    m.pon(t, golpe(64, 30, 1.0 - k * .2, .34), .82 * NR ** k)
m.pon(falla, cola(golpe(80, 40, .3, .2), 1.6, .4), .34)
m.pon(falla + .02, trazo(.55, 280, 1500), .24)
m.pon(falla + .55, soplo(.65, 500, 2600, .4), .09, .3)
for i in range(11):
    m.pon(T("las respuestas").s + i * .06, tic(.024, 2600, 7000), .17, -.5 + i * .1)
m.pon(T("no la materia").s, trazo(.95, 280, 440), .17)
m.pon(T("sobreajuste").s - .2, golpe(58, 34, .6, .12), .42)
m.pon(T("sobreajuste").s - .2, cuerda(1.4, 410, 400, .05), .05)

# ---------- el hilo se va ----------
r = T("y puede ser").s
m.pon(r - .08, soplo(.6, 700, 5600, .25), .26, .3)
m.pon(r - .08, trazo(.55, 900, 190), .13)
for i in range(11):
    m.pon(r + .35 + i * .03, tic(.02, 700, 2200), .1, -.5 + i * .1)

m.pon(r + .35, viento(inv + 1 - (r + .35)), .09)

# ---------- las fotos ----------
for i, t in enumerate(cartas):
    m.pon(t, soplo(.2, 900, 4200, .5), .2, (-1) ** (i + 1) * .5)
    m.pon(t + .27, papel(.14), .52, (-1) ** (i + 1) * .3)
m.pon(prop + .04, sello(), .72)
for q, t in enumerate(rechazos):
    m.pon(t - .02, tic(.05, 900, 3600), .4, -.3 + q * .6)
    m.pon(t + .08, tic(.05, 900, 3600), .4, -.3 + q * .6)
    m.pon(t + .26, soplo(.34, 800, 4800, .4), .3, -.6 + q * 1.2)
    m.pon(t + .68, papel(.14), .44, -.3 + q * .6)
vi = T("en la nieve").s
m.pon(vi, viento(miraba - vi), .15)
hasta = T("hasta que").s
m.pon(hasta, viento(miraba - hasta), .14)
for i, t in enumerate(aciertos):
    m.pon(t, toc(PEN[4 + i]), .24, -.25 + (i % 2) * .5)
m.pon(diez2, sello(), .7)
m.pon(hasta - .05, soplo(1.5, 170, 1500, .7), .3)
fij, nom = T("se fijaba").s, T("no miraba").s
pasos = 4
for k in range(pasos):
    m.pon(fij - .55 + k * (nom - .05 - (fij - .55)) / pasos, toc(240 + k * 32), .2)
m.pon(nom + .04, trazo(.5, 340, 120), .13)

# ---------- el negro ----------
m.pon(miraba, golpe(48, 26, 1.5, .1), .82)
n_f = int(.9 * SR)
fuego = np.zeros(n_f)
for _ in range(190):
    q = int(rng.random() ** 1.5 * (n_f - 600))
    s = tic(.018, 1500, 6200) * rng.uniform(.3, 1)
    fuego[q:q + len(s)] += s
m.pon(miraba + .06, fuego, .3)
m.pon(miraba, dron(pe - miraba), .26)

# ---------- el sobre ----------
for k in range(27):
    q = pe + .38 + k * .016 + rng.uniform(0, .08)
    m.pon(q, toc(rng.uniform(380, 900)), .1, rng.uniform(-.6, .6))
m.pon(pe + .35, papel(.18), .3)
m.pon(pe + .35, soplo(.5, 260, 1800, .4), .14)
for j in range(16):
    m.pon(parte + j * .025, tic(.02, 2200, 6400), .13)
for j, t in enumerate(saltos):
    m.pon(t, toc(420 + j * 26), .15, -.4 + j * .05)
    m.pon(t + .42, papel(.06), .16)
m.pon(cierra_sobre, soplo(.42, 600, 3200, .75), .2)
m.pon(sello_t - .03, papel(.2), .4)
m.pon(sello_t, sello(), .7)
m.pon(sello_t, golpe(70, 38, .4, .1), .4)
m.pon(T("jamás la ve").s - .05, trazo(.85, 300, 460), .11)
m.pon(T("ese es").s + .05, campana((293.7, 440), 1.3, (.8, .3)), .15)

# ---------- las dos curvas ----------
c0, pero, sub, ahi, todo = T("y cuando el error").s, T("pero en lo").s, T("empieza a subir").e, T("ahí se detiene").s, T("todo").s
m.pon(c0 - .35, soplo(.55, 400, 2400, .5), .16)
m.pon(c0 + .05, glide([0, sub - c0], [420, 150]), .085, -.3)
m.pon(c0 + .05, glide([0, pero - c0, sub - c0], [400, 158, 980]), .085, .3)
m.pon(ahi, rodar(todo - ahi + .25), .3)
m.pon(todo, golpe(52, 26, 1.3, .28), .85)
m.pon(todo, tic(.05, 900, 4200), .5)

# ---------- el cierre ----------
modelo = T("un modelo no vale").s
fin = m.W[-1]["e"]
ya_e = T("en lo que ya vio", T("un modelo no vale").i).e
m.pon(ya_e - .3, soplo(.3, 1800, 6400, .3), .14)
tcae = fin - cae_n
m.pon(tcae, soplo(cae_n, 280, 2600, .9), .2)
for k, t in enumerate(rebotes(tcae, NH, NR, BG)[:4]):
    m.pon(t, golpe(92, 44, .42, .22), .75 * NR ** k)
m.pon(fin, campana((329.6, 493.9, 659.3), 2.6, (.8, .4, .2)), .3)
m.pon(fin + .52, sello(), .62)
for i in range(11):
    m.pon(fin + 1 + i * .07, toc(PEN[i]), .1, -.5 + i * .1)

# Música: cortada en seco al negro y otra vez en el alto. El cierre llega hasta el final natural de la pista.
fin_pista = 106.5
m.musica([("c06_memoria", 48, 0, miraba, .05, .03),
          ("c06_memoria", 62, pe, todo, .35, .03),
          ("c06_memoria", fin_pista - (m.dur - modelo), modelo, m.dur, 1.1, 2.6)])
# Saturación suave: los golpes conservan cuerpo y dejan margen para que la voz llegue a -14.
m.fx = np.tanh(m.fx * 1.35) / 1.35
m.cierra()
