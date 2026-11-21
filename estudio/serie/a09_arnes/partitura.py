"""Capítulo 9 de la serie 2: el arnés. Un motor enorme ruge sobre una mesa sin ir a ningún lado; pieza por
pieza se le arma un coche de papel alrededor. Todos los instantes salen de aquí a `eventos.json`, y el
rugido del motor se sintetiza con la MISMA curva de revoluciones que mueve el dibujo.
"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"un modelo es": .2, "el arnés es todo": .2, "el ejemplo más": .45, "no era una": .35, "después llegaron": .45,
          "ayudantes con su": .3, "manuales que solo": .15, "y un botón": .2, "nada de eso": .8, "y por eso importa": .15,
          "openai ya le": .35, "yo digo esto": .3, "el motor te": .5, "el arnés decide": .1}
ARRANQUE = .2            # la toma trae .26 s de silencio: la voz arranca casi en 0
m = Mezcla("a09_arnes", pausas=PAUSAS, cola=3.6)
m.voz = m.voz[int(ARRANQUE * SR):]
for w in m.W:
    w["s"] = max(0, w["s"] - ARRANQUE); w["e"] -= ARRANQUE
m.dur -= ARRANQUE
m.N = int(m.dur * SR); m.fx = np.zeros((m.N, 2)); m.mus = np.zeros((m.N, 2))
m.exporta_tiempos()
T = m.T
s, e = (lambda f, d=0: T(f, d).s), (lambda f, d=0: T(f, d).e)
iA = T("el arnés es todo").i

# ---------- la línea de tiempo ----------
ATERRIZA = .34
GENIO, INUTIL, ARNES0 = s("genio") - .06, s("inútil") - .05, s("arnés")
SUBE = s("un modelo es") - .42
MOTOR, POTENTE, MESA, NINGUN = s("motor"), s("potente") - .04, s("sobre una mesa"), s("sin ir")
CHASIS, CARROC, VOLANTE, FRENOS, TABLERO = s("el arnés es todo") - .05, s("todo lo demás") + .05, s("volante") - .1, s("frenos") - .08, s("tablero") - .08
INGLES, HARNESS = s("en inglés"), s("harness") - .04
HERR = [s("herramientas") + k * .2 for k in range(3)]
BARRE = s("cuida su mesa")
PERM = s("permisos") - .1
FALLA, ARREGLA = s("falla") - .05, e("falla") + .3
FAMOSO, FEB, FEBF = s("el ejemplo"), s("febrero"), s("veinticinco") + .1
CLAUDE, CLAUDEF, ANTH = s("claude code") - .05, e("claude code"), s("de anthropic")
WEB, RASGA = s("no era una") - .15, s("web") + .02
COMPU, PROY, LEE, CAMBIA, VERDAD = s("vivía"), s("dentro de tu proyecto"), s("leyendo"), s("cambiando"), s("de verdad")
CAJAS = [s("llegaron") + .05 + k * .27 for k in range(4)]
IMITA = s("imita")
REGLAS = s("reglas")
PERNOS = [s("se cumplen") + .05, s("siempre") + .05]
EMBISTE, SLAM = s("le guste") + .1, s("al modelo") + .02
AYUD, MANU, ABRE, CIERRA = s("ayudantes") - .1, s("manuales") - .1, s("abre cuando"), e("necesita") + .3
BOTON, RIEGA, REBOB = s("un botón") - .05, s("si la riega") + .05, e("si la riega") + .14
NADA, INTEL1, ABURR, ALRED, IMPORTA = s("nada de eso"), s("inteligencia"), s("aburrida"), s("alrededor"), s("importa tanto")
OPENAI, HENG, CODEX = s("openai"), s("ingeniería de arneses"), s("codex") - .08
YO, ALCANZ, UNOS, MESES = s("yo digo"), s("se alcanzan"), s("unos a otros"), s("cada pocos meses")
SIENTES, DIAS = s("el arnés es lo que"), s("todos los días")
ARRANCA = e("todos los días") + .08
SPLIT = s("el motor te") - .8          # el segundo golpe cae en la pausa, no encima de «El motor»
CAE2 = SPLIT + .35
VEL, DECIDE, LLEGA, FIN = s("velocidad"), s("el arnés decide") - .05, s("llegas"), e("llegas")
FRENA = e("llegas") - .05               # llega justo al terminar la palabra: el frenón no la tapa

# Revoluciones del motor (0 = ralentí, 1 = a fondo): la misma curva mueve el dibujo y el sonido.
REV = [[0, .55], [ATERRIZA, 1], [ATERRIZA + .5, .5], [GENIO, 1], [GENIO + .6, .55], [INUTIL, .95], [INUTIL + .5, .45],
       [SUBE, .35], [POTENTE - .05, 1], [POTENTE + .7, .55], [NINGUN, .7], [NINGUN + 1, .4],
       [CHASIS, .3], [HARNESS, .35], [FALLA - .05, .9], [FALLA + .2, .05], [ARREGLA + .1, .05], [ARREGLA + .3, .6], [ARREGLA + .9, .3],
       [EMBISTE - .1, .35], [EMBISTE + .2, 1], [SLAM, 1], [SLAM + .4, .3],
       [NADA, .22], [IMPORTA - .1, .2], [IMPORTA, 1], [IMPORTA + .8, .4], [ALCANZ, .5], [MESES + 1.2, .35],
       [ARRANCA, .4], [ARRANCA + .2, .95], [SPLIT + .6, .5], [VEL - .05, 1], [VEL + .7, .6], [DECIDE, .9], [FRENA, .3], [FIN + 1.5, .15]]

EV = {k: v for k, v in dict(
    ATERRIZA=ATERRIZA, GENIO=GENIO, INUTIL=INUTIL, ARNES0=ARNES0, SUBE=SUBE, MOTOR=MOTOR, POTENTE=POTENTE, MESA=MESA, NINGUN=NINGUN,
    CHASIS=CHASIS, CARROC=CARROC, VOLANTE=VOLANTE, FRENOS=FRENOS, TABLERO=TABLERO, INGLES=INGLES, HARNESS=HARNESS,
    HERR=HERR, BARRE=BARRE, PERM=PERM, FALLA=FALLA, ARREGLA=ARREGLA, FAMOSO=FAMOSO, FEB=FEB, FEBF=FEBF, CLAUDE=CLAUDE, CLAUDEF=CLAUDEF, ANTH=ANTH,
    WEB=WEB, RASGA=RASGA, COMPU=COMPU, PROY=PROY, LEE=LEE, CAMBIA=CAMBIA, VERDAD=VERDAD, CAJAS=CAJAS, IMITA=IMITA,
    REGLAS=REGLAS, PERNOS=PERNOS, EMBISTE=EMBISTE, SLAM=SLAM, AYUD=AYUD, MANU=MANU, ABRE=ABRE, CIERRA=CIERRA, BOTON=BOTON, RIEGA=RIEGA, REBOB=REBOB,
    NADA=NADA, INTEL1=INTEL1, ABURR=ABURR, ALRED=ALRED, IMPORTA=IMPORTA, OPENAI=OPENAI, HENG=HENG, CODEX=CODEX,
    YO=YO, ALCANZ=ALCANZ, UNOS=UNOS, MESES=MESES, SIENTES=SIENTES, DIAS=DIAS, ARRANCA=ARRANCA,
    SPLIT=SPLIT, CAE2=CAE2, VEL=VEL, DECIDE=DECIDE, LLEGA=LLEGA, FRENA=FRENA, FIN=FIN, REV=REV, DUR=m.dur).items()}
r3 = lambda v: round(v, 3) if isinstance(v, float) else [r3(x) for x in v] if isinstance(v, list) else v
(RAIZ / "remotion/src/serie/a09/eventos.json").write_text(json.dumps({k: r3(v) for k, v in EV.items()}), encoding="utf-8")


# ---------- foley ----------
def rev_en(tt):
    a = np.array(REV, float)
    return np.interp(tt, a[:, 0], a[:, 1])


def motor_pista(n, t0=0.0, gan=None):
    """V8 sintetizado: explosiones a 4 por vuelta, lope de árbol de levas y aire en el escape."""
    tt = t0 + np.arange(n) / SR
    r = rev_en(tt)
    rpm = 900 + 4600 * r ** 1.4
    f = rpm / 60 * 4
    ph = np.cumsum(f) / SR
    pul = np.maximum(np.sin(2 * np.pi * ph), 0) ** 6
    lope = 1 + .35 * np.sin(2 * np.pi * ph / 4 + .7)
    cuerpo = banda(ruido(n), 60, 900) * pul * lope * 1.6
    tono = (np.sin(2 * np.pi * ph) * .5 + np.sin(4 * np.pi * ph + .3) * .3 + np.sin(np.pi * ph) * .35) * lope
    aire = banda(ruido(n), 900, 4800) * (.08 + .25 * r ** 2) * (.5 + pul)
    x = cuerpo * .7 + tono * .55 + aire
    return x * (.35 + .65 * r) * (gan if gan is not None else 1)


def bang():
    n = int(1.4 * SR)
    t = np.arange(n) / SR
    x = golpe(46, 24, 1.4, .9)[:n] * 1.0
    x += cola(campana((97, 143, 211, 377), .9, (.7, .5, .35, .2)))[:n] * .5
    x += banda(ruido(n), 200, 3000) * np.exp(-t * 18) * .5
    for k in range(6):                                          # tornillería que rebota
        i = int((.12 + k * .09 + rng.uniform(0, .04)) * SR)
        y = toc(rng.uniform(1300, 2600)) * (.25 - k * .03)
        x[i:i + len(y)] += y[: n - i]
    return x


def papel(tam=1.0):
    n = int(.17 * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 320 / tam, 2600) * np.exp(-t * 36) * .7 + golpe(130 / tam, 70 / tam, .17, .1)[:n] * .4


def doblez():
    n = int(.22 * SR)
    t = np.arange(n) / SR
    x = banda(ruido(n), 1200, 6000) * np.exp(-t * 26) * .5
    for d in (0, .06):
        i = int(d * SR)
        y = tic(.02, 1800, 7000)
        x[i:i + len(y)] += y
    return x


def tornillo(dur=.4, paso=.045):
    n = int(dur * SR)
    x = np.zeros(n)
    tt = 0.0
    while tt < dur - .03:
        i = int(tt * SR)
        y = tic(.018, 2200, 7000) * rng.uniform(.6, 1)
        x[i:i + len(y)] += y[: n - i]
        tt += paso
    return x + golpe(240, 160, dur, 0)[:n] * .05


def clack(f=1):
    n = int(.25 * SR)
    t = np.arange(n) / SR
    return golpe(170 * f, 90 * f, .25, .9)[:n] * .6 + campana((1180 * f, 1770 * f), .25, (.3, .15))[:n] * .4 + banda(ruido(n), 1500, 6000) * np.exp(-t * 90) * .5


def rasgar(dur=.45):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    imp = (rng.random(n) < .03 + .05 * t) * rng.uniform(-1, 1, n)
    return banda(imp, 900, 7000) * 2.5 * (1 - t ** 3) + banda(ruido(n), 1500, 5000) * .15 * np.sin(np.pi * t)


def garabato(dur=.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    am = .5 + .5 * np.sin(2 * np.pi * (11 + 4 * np.sin(t * 7)) * t) ** 2
    return banda(ruido(n), 2400, 7500) * am * np.minimum(t / .03, 1) * np.minimum((dur - t) / .05, 1) * .5


def chirrido(dur=.5, f0=2300):
    t = np.arange(int(dur * SR)) / SR
    f = f0 + 90 * np.sin(2 * np.pi * 31 * t)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 4) * np.minimum(t / .02, 1) * .35 + banda(ruido(len(t)), 1800, 5000) * np.exp(-t * 7) * .2


def pop():
    n = int(.12 * SR)
    t = np.arange(n) / SR
    f = 900 * np.exp(-t * 30) + 220
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 34)


def rebobinar(dur=.7):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    f = np.geomspace(1800, 300, n)
    chirp = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25 * np.sin(np.pi * t)
    rasp = banda(ruido(n), 700, 5000) * (.3 + .3 * np.sin(2 * np.pi * 26 * t * dur) ** 2) * np.sin(np.pi * t)
    return chirp + rasp * .6


def rueda(dur=.6):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 80, 700) * (.5 + .5 * np.sin(2 * np.pi * 9 * t) ** 2) * np.exp(-t * 2.4) * .6


def tos():
    """El motor se ahoga: tres petardazos y un silbido."""
    n = int(.8 * SR)
    x = np.zeros(n)
    for k, d in enumerate((0, .17, .31)):
        i = int(d * SR)
        y = golpe(70 - k * 8, 34, .3, .9)[: n - i] * (1 - k * .2)
        x[i:i + len(y)] += y
        z = banda(ruido(int(.12 * SR)), 300, 3000) * np.exp(-np.arange(int(.12 * SR)) / SR * 30) * .8
        x[i:i + len(z)] += z[: n - i]
    return x


def confeti(dur=2.4):
    return lluvia(dur, 70) * .8 + polvo(dur) * .4


# El motor: una sola pista continua, sincronizada con REV, más presente donde el dibujo lo pide.
ga = np.full(m.N, .07)
def sube(a, b, g, fin=.25):
    i0, i1 = int(a * SR), int(b * SR)
    k0, k1 = int((a - fin) * SR), int((b + fin) * SR)
    ga[max(i0, 0):min(i1, m.N)] = np.maximum(ga[max(i0, 0):min(i1, m.N)], g)
    for i, j, up in ((max(k0, 0), max(i0, 0), True), (min(i1, m.N), min(k1, m.N), False)):
        if j > i:
            ga[i:j] = np.maximum(ga[i:j], np.linspace(.1, g, j - i) if up else np.linspace(g, .1, j - i))
sube(0, .9, .2); sube(GENIO, GENIO + .7, .22); sube(INUTIL, INUTIL + .6, .22); sube(POTENTE, POTENTE + .8, .3); sube(NINGUN, NINGUN + 1.1, .18)
sube(EMBISTE, SLAM + .3, .26); sube(IMPORTA, IMPORTA + .9, .3); sube(ARRANCA, ARRANCA + .6, .4); sube(VEL - .1, VEL + .8, .25); sube(DECIDE, FRENA, .15)
ga[: int(ATERRIZA * SR)] *= np.linspace(.2, 1, int(ATERRIZA * SR))
ga[int((FALLA + .25) * SR):int((ARREGLA + .1) * SR)] = .02
ga[int((NADA - .1) * SR):int((IMPORTA - .1) * SR)] *= .55
ga[int((FIN + 1.2) * SR):] *= np.linspace(1, 0, m.N - int((FIN + 1.2) * SR))
CAMA = banda(motor_pista(m.N, 0, ga), 28, 650)     # solo el retumbo: lo de arriba de 650 Hz pelea con la voz

# Arranque: el motor cae a la mesa y ruge desde el primer cuadro.
m.pon(0, soplo(.36, 300, 3000, .95), .3)
m.pon(ATERRIZA, bang(), .8)
m.pon(ATERRIZA + .02, papel(1.3), .5, -.3)
m.pon(GENIO - .05, soplo(.8, 400, 5200, .25), .4, .4)
m.pon(GENIO, golpe(60, 34, .5, .4), .5, .3)
m.pon(INUTIL, golpe(82, 40, .4, .8), .6, -.2)
for k in range(4):
    m.pon(INUTIL + .08 + k * .11, papel(1 + .1 * k), .35, rng.uniform(-.6, .6))
m.pon(INUTIL + .3, toc(1900), .2, -.3)
for k in (1, 2):
    m.pon(INUTIL + k * .33, golpe(120, 62, .22, .4), .3 - .08 * k)
m.pon(INUTIL + .55, tos()[: int(.45 * SR)], .3)
m.pon(ARNES0 - .05, trazo(.9, 400, 820), .14)
m.pon(SUBE, soplo(.7, 250, 2600, .5), .3)

# El motor solo.
m.pon(MOTOR - .1, toc(700), .18)
m.pon(POTENTE - .05, soplo(.6, 200, 2400, .3), .35)
m.pon(MESA, golpe(120, 60, .25, .2), .25)
m.pon(NINGUN + .2, rueda(1), .25)

# El coche se arma: chasis, carrocería, volante, frenos, tablero.
m.pon(CHASIS, rueda(.7), .5, -.3)
m.pon(CHASIS + .5, clack(.7), .55)
m.pon(CARROC, doblez(), .6, -.2)
m.pon(CARROC + .18, doblez(), .5, .2)
m.pon(CARROC + .36, papel(1.2), .5)
m.pon(CARROC + .6, golpe(150, 90, .2, .3), .3)                     # la bola cae en su asiento
m.pon(VOLANTE, soplo(.3, 600, 4000, .9), .2)
m.pon(VOLANTE + .28, clack(1.1), .55)
m.pon(FRENOS + .12, clack(1.3), .6)
m.pon(FRENOS + .16, chirrido(.45), .35)
m.pon(TABLERO, doblez(), .5)
for k in range(5):
    m.pon(TABLERO + .3 + k * .05, tic(.02, 1500, 5000), .3)
m.pon(TABLERO + .32, campana((1318, 1975), .4, (.3, .15)), .14)
m.pon(HARNESS - .05, trazo(1.2, 360, 760), .06)
m.pon(e("harness") + .05, campana((523, 784, 1046), 1.4, (.5, .3, .2)), .1)

# Herramientas, mesa, permisos y la falla.
for k, tt in enumerate(HERR):
    m.pon(tt, toc(640 + 140 * k), .18, -.3 + .3 * k)
m.pon(BARRE + .1, soplo(.7, 600, 5000, .4), .3, -.4)
for k in range(8):
    m.pon(BARRE + .6 + k * .07, papel(.8), .28, -.5)
m.pon(PERM + .2, clack(.9), .4)
m.pon(PERM + .45, clack(1.2), .45)
m.pon(FALLA, tos(), .75)
m.pon(FALLA + .1, toc(2300), .3, .4)
m.pon(FALLA + .15, rueda(.8), .45, .5)
m.pon(FALLA + .1, campana((880, 1175), .5, (.3, .2)), .2)
m.pon(ARREGLA - .1, soplo(.3, 700, 4000, .8), .2)
m.pon(ARREGLA + .12, clack(1), .6)

# Claude Code: el reflector se enciende.
m.pon(FAMOSO - .12, clack(.55), .3)
m.pon(FAMOSO - .1, golpe(60, 34, .6, .1), .3)
for k in range(11):
    m.pon(FEB + k * (FEBF - FEB) / 11, papel(.7), .22, .3)
m.pon(FEBF, golpe(130, 80, .2, .4), .3)
m.pon(CLAUDE, garabato(CLAUDEF - CLAUDE + .1), .12)
m.pon(ANTH, garabato(.5), .07)
m.pon(WEB, soplo(.4, 500, 3000, .9), .25)
m.pon(WEB + .38, papel(1.5), .5)
m.pon(RASGA, rasgar(.5), .65)
m.pon(RASGA + .45, papel(), .25)
m.pon(COMPU - .1, soplo(1.1, 200, 2000, .5), .35)
m.pon(COMPU + .5, golpe(70, 40, .5, .2), .4)
m.pon(PROY, doblez(), .5)
m.pon(PROY + .25, papel(1.4), .45)
m.pon(LEE, soplo(.3, 900, 5000, .5), .2)
m.pon(LEE + .3, trazo(.6, 500, 900), .07)
m.pon(CAMBIA, garabato(.7), .4)
m.pon(VERDAD + .15, golpe(110, 60, .3, .4), .55)
m.pon(VERDAD + .15, papel(1.2), .4)

# Llegan las piezas.
for k, tt in enumerate(CAJAS):
    m.pon(tt + .32, golpe(96 - 6 * k, 50, .35, .4), .6, -.45 + .3 * k)
    m.pon(tt + .32, papel(1.4), .3, -.45 + .3 * k)
m.pon(IMITA, polvo(.7), .25)

# Reglas que se cumplen siempre: un tope que no se mueve.
m.pon(REGLAS, soplo(.45, 300, 2600, .7), .3, .4)
m.pon(REGLAS + .42, golpe(70, 36, .5, .8), .7, .4)
for tt in PERNOS:
    m.pon(tt, tornillo(.45), .45, .4)
m.pon(SLAM, golpe(44, 24, 1.1, .9), 1.1, .3)
m.pon(SLAM, campana((110, 171, 287), 1.2, (.6, .4, .25)), .35, .3)
m.pon(SLAM + .05, banda(ruido(int(.4 * SR)), 300, 4000) * np.exp(-np.arange(int(.4 * SR)) / SR * 12), .35)
# Ayudantes con su propia mesa.
m.pon(AYUD, soplo(.4, 400, 3000, .8), .25, -.5)
m.pon(AYUD + .35, clack(.8), .55, -.5)
m.pon(AYUD + .6, papel(.8), .3, -.5)
m.pon(AYUD + .8, toc(1200), .2, -.5)
# Manuales que solo abre cuando los necesita.
m.pon(MANU + .3, papel(), .4, -.3)
for k in range(7):
    m.pon(ABRE + k * .05, soplo(.1, 1500, 7000, .3), .14, -.2)
m.pon(CIERRA, papel(.8), .4, -.2)
# El botón para regresar.
m.pon(BOTON + .3, pop(), .5, .2)
m.pon(BOTON + .32, clack(1.4), .3, .2)
m.pon(RIEGA, golpe(160, 90, .2, .5), .35)
m.pon(RIEGA + .12, banda(ruido(int(.6 * SR)), 200, 1600) * np.exp(-np.arange(int(.6 * SR)) / SR * 5) * .6, .4)
m.pon(REBOB - .06, pop(), .55, .2)
m.pon(REBOB, rebobinar(.7), .45)

# Nada de eso es inteligencia: la música se va bajo el agua y el motor brilla.
m.pon(NADA + .1, campana((784, 1046.5, 1318.5), 1.8, (.3, .2, .15)), .05)
m.pon(ALRED, trazo(1.1, 300, 620), .07)
m.pon(IMPORTA - .25, soplo(.3, 300, 3000, .95), .35)
m.pon(IMPORTA, golpe(46, 24, 1.1, .7), 1.0)

# Codex y la carrera de los modelos.
m.pon(OPENAI - .3, rueda(.8), .4, .5)
m.pon(OPENAI + .4, clack(.9), .45, .4)
m.pon(CODEX, garabato(.45), .3, .2)
for k, tt in enumerate((ALCANZ, ALCANZ + .5, UNOS, UNOS + .4)):
    m.pon(tt, soplo(.35, 300, 3200, .5), .25, .4 * (-1) ** k)
    m.pon(tt + .2, golpe(90, 50, .25, .3), .3, .4 * (-1) ** k)
for k in range(12):
    m.pon(MESES + k * .09, papel(.6), .2, -.5)

# Todos los días; el coche arranca y se va.
m.pon(DIAS, soplo(1.2, 300, 1800, .5), .15)
m.pon(ARRANCA + .1, chirrido(.3, 1700), .2)
m.pon(ARRANCA + .2, soplo(.8, 200, 2400, .25), .4, .6)

# Final: el mismo motor cae a otra mesa; uno llega, el otro no.
m.pon(SPLIT, soplo(.5, 250, 2600, .6), .3)
m.pon(CAE2, bang(), .7, .1)
m.pon(VEL - .05, soplo(.6, 200, 2400, .3), .15)
m.pon(DECIDE + .3, rueda(1.4), .15, -.3)
m.pon(FRENA - .05, chirrido(.32, 2100), .25, .4)
m.pon(FRENA + .15, golpe(220, 140, .12, .6), .4, .4)
m.pon(FRENA + .2, confeti(2.6), .3, .4)
m.pon(FRENA + .22, campana((261.6, 329.6, 392, 523.3), 2.8, (.6, .45, .35, .2)), .16, .3)
m.pon(FIN + 1.4, tos()[: int(.5 * SR)], .25, -.3)
m.pon(FIN + 1.6, campana((130.8, 196, 261.6), 2.4, (.8, .4, .2)), .3)

# ---------- música ----------
# La pista entra fuerte en el 16.05 s de su archivo: así hay pulso desde el cuadro 0. Corre continua; bajo
# «nada de eso es inteligencia» se va bajo el agua y regresa entera con «por eso importa tanto».
K = 16.05
x = lee(RAIZ / "serie/musica/a09_arnes.mp3")
escribe(m.dir / "_m.wav", x)
x *= db(-25.5 - lufs(m.dir / "_m.wav"))
subprocess.run(["ffmpeg", "-y", "-v", "error", "-i", str(m.dir / "_m.wav"), "-af", "lowpass=f=520,lowpass=f=520", str(m.dir / "_mlp.wav")], check=True)
xl = lee(m.dir / "_mlp.wav") * db(-27 - lufs(m.dir / "_mlp.wav"))
ini, fin_m = NADA - .1, IMPORTA - .05
tf = FIN + 3.4
def tramo(src, a, b, fi, fo):
    i0, i1 = int(a * SR), min(int(b * SR), m.N)
    seg = src[int((K + a) * SR):int((K + a) * SR) + (i1 - i0)].copy()
    env = np.ones(len(seg))
    ni, no = int(fi * SR), int(fo * SR)
    if ni: env[:ni] = np.linspace(0, 1, ni) ** 2
    if no: env[-no:] *= np.linspace(1, 0, no) ** 1.5
    m.mus[i0:i0 + len(seg)] += seg * env[:, None]
tramo(x, 0, ini + .12, .03, .12)
tramo(xl, ini, fin_m + .02, .1, .06)
tramo(x, fin_m, tf, .02, 2.6)
# Los golpes de metal tienen picos que le ganan a la voz y no dejan normalizar: se redondean con un limitador suave.
# El foley se aparta un poco cuando habla la voz (−6 dB); la cama del motor no, para que no "respire".
vz = np.abs(m.voz).mean(axis=1)
nb = len(vz) // 480
act = np.clip(np.sqrt((vz[:nb * 480].reshape(nb, 480) ** 2).mean(axis=1)) / .05, 0, 1)
act = np.convolve(act, np.ones(18) / 18, "same")
duck = np.ones(m.N)
dd = 1 - .5 * np.repeat(act, 480)[: m.N]
duck[: len(dd)] = dd
m.fx *= duck[:, None]
m.pon(0, CAMA, .5)


def rodilla(x, th, L):
    a = np.abs(x)
    return np.where(a < th, x, np.sign(x) * (th + (L - th) * np.tanh((a - th) / (L - th))))
print(f"pico voz {np.abs(m.voz).max():.2f} · pico foley {np.abs(m.fx).max():.2f}")
m.voz = rodilla(m.voz, .45, .62)          # solo las crestas raras de la toma: deja normalizar a -14 sin pasar el pico
m.fx = rodilla(m.fx, .2, .4)
m.cierra()
