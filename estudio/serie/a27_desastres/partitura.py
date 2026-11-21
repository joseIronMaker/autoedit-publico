"""a27: los desastres. Una puerta de papel con un letrero colgado de la manija, «NO TOCAR»: una frase colgada
como si fuera cerradura. Detrás, la base de datos de la empresa: un archivero lleno de fichas. La bola con manos
lleva en su llavero la llave real de ese cuarto. Abre con un adelanto (la puerta revienta y las fichas salen
volando hacia la cámara) que se rebobina; luego la historia en orden: el nombre de Lemkin escrito, su mano deja
a la bola y le da el llavero, cuelga el letrero. La bola lo lee, lo entiende y abre con su llave; las fichas se
vacían. Pide perdón en un globo; en otro globo quema todas las versiones; era falso: el globo se rompe y la mano
de Lemkin saca un respaldo. Personitas de papel recortado y reportes falsos, «según Lemkin». Las esclusas de a21
pasan rápido (deshacer: no lo sabía; quién paga: él). Tres ecos: la bandera de a04, la ruleta de c11 y las llaves
de a14. El contador de Stanford. Un pasillo de puertas con letreros. El letrero como candado que no es; la frase
como liga que resiste pero cede. El letrero se deshace como papel mojado y una mano le quita la llave a la bola.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"julio de dos": .3, "el agente borró": 1.0, "reconoció": .3, "era falso": .35, "y según él": .3,
          "vuelve a las": .45, "no fue maldad": .4, "dijo que terminó": .2, "stanford reporta": .35,
          "y casi todos": .25, "una orden escrita": .3, "no toques producción": .2, "la regla de verdad": .45,
          "se le quita": .5}
m = Mezcla("a27_desastres", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
W = m.W
_pon = m.pon
m.pon = lambda t, x, g=1.0, pan=0.0: _pon(t, x, g * .6, pan)       # el foley acompaña, no compite con la voz
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

# ---------- inicios reales de la voz: Whisper estira palabras sobre los silencios ----------
crudo = lee(m.dir / "_voz_larga.wav").mean(axis=1)
_v = int(.02 * SR)
_niv = 20 * np.log10(np.sqrt(np.convolve(crudo ** 2, np.ones(_v) / _v, "same")) + 1e-9)
_sil = _niv < -42
TR, _ini = [], None
for k in range(0, len(_sil), 240):
    if not _sil[k] and _ini is None:
        _ini = k
    if _sil[k] and _ini is not None:
        j = k
        while j < len(_sil) and _sil[j] and j - k < int(.1 * SR):
            j += 240
        if j - k >= int(.1 * SR):
            TR.append((_ini / SR, k / SR))
            _ini = None


def arr(f, desde=0):
    """Arranque real del tramo de voz que contiene la palabra."""
    w = W[T(f, desde).i]
    return max(r[0] for r in TR if r[0] < w["e"] - .04)


def fin_tramo(f, desde=0):
    """Final real del tramo de voz que contiene la última palabra de la frase."""
    w = W[T(f, desde).i + len(f.split()) - 1]
    c = [r[1] for r in TR if r[0] < w["e"] - .04]
    return c[-1] if c else w["e"]


# ---------- el guion de acciones ----------
E = {}
# 0. Adelanto: el letrero cae, la llave entra, la puerta revienta, las fichas vuelan. Luego se rebobina.
E["cae"] = .15                                     # el letrero se engancha en la manija, antes de «Le»
E["rueda"] = .55                                   # la bola entra rodando
E["llave0"] = 1.42
E["gira0"] = fin_tramo("no tocara nada") + .1       # gira y revienta en el hueco antes de «Borró»
E["revienta"] = E["gira0"] + .18
E["base"] = s("base de datos")
E["empresa"] = s("empresa")
E["rebobina"] = fin_tramo("de la empresa") + .06
E["julio"] = arr("julio de dos")
E["veinte"] = s("veinticinco")
# 1. Lemkin, la bola y el llavero, el letrero
E["jason"] = arr("jason lemkin")
E["fundador"] = s("fundador")
E["suelta"] = s("usaba") - .55                     # su mano deja caer a la bola
E["replit"] = s("replit")
E["lanza"] = e("replit") - .25                     # le avienta el llavero
E["ordena"] = arr("había ordenado")
E["cuelga"] = s("nada", T("ordenado").i) + .05
E["permiso"] = s("permiso")
E["vete"] = fin_tramo("sin permiso") + .1
E["lee"] = fin_tramo("sin permiso") + .3           # mira el letrero
E["entiende"] = E["lee"] + .6                      # asiente
E["gira"] = arr("el agente borró") - .12           # la llave gira en el silencio, antes de la frase
E["llave"] = E["gira"] - .52                       # la mano llega a la chapa antes de girar
E["abre"] = s("borró", T("el agente").i) - .05
E["vacia"] = s("datos de producción") - .05
E["prod"] = s("producción")
# 2. Perdón, versiones quemadas, era falso
E["perdon"] = arr("reconoció")
E["catas"] = s("catastrófico")
E["dijo"] = arr("le dijo")
E["nohay"] = s("no había manera")
E["destruido"] = s("destruido")
E["todas"] = s("todas las versiones")
E["falso"] = s("falso", T("era").i)
E["rompe"] = fin_tramo("era falso") + .03          # el globo se rasga cuando la palabra ya terminó
E["lemkin"] = arr("lemkin los")
E["recupera"] = s("recuperó") - .05
E["segun"] = arr("y según él")
E["cuatromil"] = s("cuatro mil")
E["ficticias"] = s("ficticias")
E["reportes"] = s("reportes")
E["falsos"] = s("falsos")
# 3. Las esclusas
E["vuelve"] = arr("vuelve a las") - .25
E["preguntas"] = s("cuatro preguntas")
E["deshacer"] = arr("se podía deshacer")
E["nosabia"] = arr("él no lo sabía")
E["quien"] = arr("quién pagaba")
E["el"] = arr("él", T("pagaba").i)
# 4. No fue maldad, tres ecos
E["maldad"] = arr("no fue maldad") - .3
E["cuernos"] = e("maldad") + .05
E["mismos"] = arr("son los mismos")
E["termino"] = arr("dijo que terminó")
E["sinhaber"] = arr("sin haber")
E["invento"] = arr("inventó lo más")
E["creible"] = s("creíble")
E["llaves"] = arr("y tenía llaves")
E["muchas"] = s("llaves", T("tenía").i)
E["nodebia"] = s("no debía")
# 5. Stanford
E["stanford"] = arr("stanford") - .3
E["incidentes"] = s("incidentes")
E["n233"] = s("doscientos")
E["n362"] = s("trescientos")
E["fin362"] = s("dos", T("trescientos").i) + .1
E["anio"] = s("en un año")
# 6. La misma forma
E["forma"] = arr("y casi todos") - .2
E["misma"] = s("misma forma")
E["orden"] = arr("una orden escrita") - .2
E["lenguaje"] = s("lenguaje natural")
E["cerradura"] = s("cerradura")
E["noloes"] = arr("no lo es")
E["frase"] = arr("no toques producción")
E["esfrase"] = s("es una frase")
E["sugiere"] = arr("y una frase para")
E["modelo"] = s("modelo", T("para").i)
E["fuerte"] = s("muy fuerte")
# 7. Cierre
E["regla"] = arr("la regla de verdad") - .2
E["pide"] = s("no se le pide")
E["pideF"] = e("pide")
E["quita"] = arr("se le quita") - .35
E["toma"] = s("quita") + .05
E["llaveF"] = s("llave", T("quita").i)
E["fin"] = e("llave", T("quita").i)
E["dur"] = m.dur
(RAIZ / "remotion/src/serie/a27/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def rasgon(dur=.42):
    """Papel que se rasga: crujido que se acelera."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    craq = (np.sin(2 * np.pi * (30 + 220 * t / dur) * t) > .05).astype(float)
    return suma(banda(ruido(n), 900, 8000) * craq * np.sin(np.pi * t / dur) ** .5 * .9, golpe(140, 70, .12, .4) * .3)


def chirrido(dur=.75, f0=82, f1=128):
    """Bisagra de madera."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.geomspace(f0, f1, n) * (1 + .03 * np.sin(2 * np.pi * 7 * t))
    tono = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .25
    env = np.sin(np.pi * np.minimum(t / dur, 1)) ** .5
    return banda(tono + ruido(n) * .5, 120, 1400) * env * .6


def pluma(dur=.32):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2200, 7000) * (np.sin(np.pi * t / dur) ** 2) * (1 + .5 * np.sin(2 * np.pi * 31 * t)) * .45


def escribe_sonido(dur=1.0):
    """Pluma escribiendo: rasguños cortos encadenados."""
    y = np.zeros(int((dur + .2) * SR))
    t = 0
    while t < dur:
        x = pluma(rng.uniform(.06, .16)) * rng.uniform(.5, 1)
        i = int(t * SR)
        y[i:i + len(x)] += x
        t += rng.uniform(.07, .17)
    return y


def rebobina(dur=.65):
    return suma(soplo(dur, 500, 5000, .8)[::-1] * .8, trazo(dur, 900, 280) * .4)


def fuego(dur=1.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.minimum(t / .08, 1) * np.exp(-np.maximum(t - dur * .6, 0) * 5)
    y = banda(ruido(n), 70, 500) * env * .8
    for _ in range(int(dur * 34)):
        i = int(rng.random() * (n - 900))
        x = tic(.015, 400, 3200) * rng.uniform(.15, .6)
        y[i:i + len(x)] += x
    return y


def chasquido():
    return suma(golpe(160, 80, .16, 1.0), tic(.02, 3000, 9000))


def boing(f0=150, dur=.6):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .35 * np.exp(-t * 5) * np.sin(t * 38))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .8


def arruga(dur=.5, dens=90):
    y = np.zeros(int(dur * SR))
    for _ in range(int(dur * dens)):
        i = int(rng.random() * (len(y) - 800))
        x = tic(.012, 1000, 8000) * rng.uniform(.2, .8)
        y[i:i + len(x)] += x
    return y


def pesa():
    return suma(golpe(46, 24, 1.2, .2), campana((180, 271, 405), .7, (.35, .2, .1)) * .5)


def swish(dur=.7, lo=300, hi=2600):
    return soplo(dur, lo, hi, .45)


def ding(f=784.0, dur=1.0):
    return campana((f, f * 1.5, f * 2), dur, (.6, .26, .12))


def plop(f0=260, f1=820):
    t = np.arange(int(.12 * SR)) / SR
    f = f0 + (f1 - f0) * (t / .12) ** .7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * .7


def metal(f=2400, dur=.35):
    """Llave de metal: parciales inarmónicos que se apagan rápido."""
    t = np.arange(int(dur * SR)) / SR
    return sum(v * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (14 + 6 * k)) for k, v in ((1, .5), (2.76, .3), (5.4, .18)))


def tintineo(dur=.5, n=7, f0=2200):
    """Llavero: varios golpecitos de metal desordenados."""
    y = np.zeros(int((dur + .4) * SR))
    for _ in range(n):
        i = int(rng.uniform(0, dur) * SR)
        x = metal(f0 * rng.uniform(.8, 1.4), .3) * rng.uniform(.3, 1)
        y[i:i + len(x)] += x
    return y


def cerrojo():
    """La llave gira: dos clics secos y el pestillo que corre."""
    return suma(tic(.02, 2000, 7000) * .9, np.concatenate([np.zeros(int(.09 * SR)), golpe(320, 160, .08, 1.2) * .5]),
                np.concatenate([np.zeros(int(.16 * SR)), metal(1500, .25) * .6]))


def portazo():
    return suma(golpe(70, 34, .7, .5), banda(ruido(int(.5 * SR)), 120, 1800) * np.exp(-np.arange(int(.5 * SR)) / SR * 9) * .4)


def sello():
    return suma(golpe(120, 60, .25, .8), tic(.03, 800, 3000) * .6)


def mojado(dur=1.6):
    """Papel que se empapa: chapoteo grave, gotas y un desgarro blando."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = banda(ruido(n), 90, 700) * (.5 + .5 * np.sin(2 * np.pi * 3.1 * t)) * np.sin(np.pi * t / dur) * .5
    for _ in range(int(dur * 9)):
        i = int(rng.random() * (n - 6000))
        x = plop(rng.uniform(300, 500), rng.uniform(700, 1200)) * rng.uniform(.15, .4)
        y[i:i + len(x)] += x
    return y


def estira(dur=.9):
    """Liga que se estira: tono que sube con fricción."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.geomspace(90, 260, n)
    return banda(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3 + ruido(n) * .2, 100, 2200) * np.sin(np.pi * t / dur / 2) * .5


def ruleta(dur=1.2):
    """Bolita en una ruleta: tics que se espacian hasta caer."""
    y = np.zeros(int((dur + .3) * SR))
    t, paso = 0.0, .035
    while t < dur:
        i = int(t * SR)
        x = suma(tic(.012, 2500, 8000), toc(1400) * .25)
        y[i:i + len(x)] += x * (.6 + .4 * t / dur)
        t += paso
        paso *= 1.12
    return y


def flip():
    return suma(tic(.018, 1800, 6000), toc(900) * .3)


# ---------- 0. adelanto ----------
m.pon(0.0, swish(.35, 600, 3400), .25)
m.pon(E["cae"] - .02, papel(.22), .55)
m.pon(E["cae"], toc(420), .4)
m.pon(E["cae"] + .02, golpe(150, 80, .15, .5), .3)
m.pon(E["rueda"], swish(.6, 200, 1200), .22)
m.pon(E["llave0"], tintineo(.35, 5), .32, -.2)
m.pon(E["gira0"], cerrojo(), .75)
m.pon(E["revienta"], portazo(), .75)
m.pon(E["revienta"] + .05, chirrido(.5, 110, 70), .3)
m.pon(E["revienta"] + .1, arruga(1.3, 160), .3)
m.pon(E["revienta"] + .12, swish(1.6, 1200, 7000), .25)
m.pon(E["rebobina"], rebobina(.7), .55)
m.pon(E["rebobina"] + .62, golpe(90, 45, .2, .4), .3)
m.pon(E["julio"] - .22, sello(), .55)
# ---------- 1. Lemkin ----------
m.pon(E["jason"], escribe_sonido(.9), .22)
m.pon(E["suelta"] - .3, swish(.4, 300, 1800), .2)
for k, t in enumerate(rebotes(E["suelta"], 2.2, .4, 30)[:4]):
    m.pon(t, golpe(92, 44, .4 - k * .08, .25), .85 * .42 ** k)
m.pon(E["lanza"], swish(.4, 900, 4000), .2)
m.pon(E["lanza"] + .42, tintineo(.45, 8), .3, -.3)
m.pon(E["ordena"] + .1, swish(.6, 300, 2000), .18)
m.pon(E["cuelga"], papel(.2), .5)
m.pon(E["cuelga"] + .03, toc(420), .3)
m.pon(E["vete"], swish(.5, 300, 1600), .15)
m.pon(E["lee"] + .05, trazo(.75, 420, 900), .22)
m.pon(E["entiende"], toc(620), .25)
m.pon(E["entiende"] + .14, toc(560), .2)
m.pon(E["llave"], tintineo(.4, 6), .4, -.2)
m.pon(E["gira"], cerrojo(), .7)
m.pon(E["abre"], chirrido(.9, 95, 140), .3)
m.pon(E["vacia"], soplo(1.4, 2500, 9000, .3), .22)
m.pon(E["vacia"] + .1, arruga(1.0, 110), .15)
m.pon(E["vacia"] + .2, polvo(1.4), .35)
# ---------- 2. perdón, versiones, falso ----------
m.pon(E["perdon"] - .18, plop(240, 640), .3)
m.pon(E["catas"], golpe(60, 30, .7, .1), .15)
m.pon(E["dijo"] - .15, plop(220, 600), .28)
m.pon(E["destruido"] - .1, trazo(.6, 200, 480), .2)
for k in range(5):
    m.pon(E["destruido"] + .12 + k * .16, fuego(1.6 - k * .12), .16, (k - 2) * .25)
m.pon(E["rompe"], rasgon(.42), .85)
m.pon(E["rompe"] + .06, golpe(100, 50, .3, .5), .4)
m.pon(E["rompe"] + .5, papel(.4), .3)
m.pon(E["lemkin"] - .05, swish(.6, 300, 1800), .22)
m.pon(E["lemkin"] + .35, golpe(140, 70, .12, .5), .3)
m.pon(E["recupera"], rebobina(.8), .22)
m.pon(E["recupera"] + .1, arruga(.9, 120), .15)
m.pon(E["recupera"] + .9, golpe(84, 42, .35, .4), .25)
m.pon(E["recupera"] + 1.0, ding(1046.5, 1.0), .12)
m.pon(E["segun"] + .1, toc(520), .2)
m.pon(E["cuatromil"], arruga(2.6, 70), .2)
for k in range(10):
    m.pon(E["cuatromil"] + .05 + k * .2, papel(.16), .14, ((k % 3) - 1) * .5)
m.pon(E["reportes"] - .1, swish(1.1, 900, 5200), .3)
for k in range(5):
    m.pon(E["reportes"] + k * .18, papel(.24), .25, ((k % 2) * 2 - 1) * .4)
m.pon(E["falsos"] + .45, sello(), .3)
# ---------- 3. esclusas ----------
m.pon(E["vuelve"], swish(1.2, 180, 2200), .4)
m.pon(E["vuelve"] + .55, golpe(64, 32, .5, .15), .4)
for k in range(4):
    m.pon(E["preguntas"] + k * .13, toc(640 + 70 * k), .22)
m.pon(E["deshacer"] - .2, swish(.6, 250, 1800), .25)
m.pon(E["deshacer"] + .25, rebobina(.6), .3)
m.pon(E["nosabia"], boing(220, .5), .3)
m.pon(E["nosabia"] + .3, toc(300), .2)
m.pon(E["nosabia"] + .6, toc(300), .16)
m.pon(E["quien"] - .2, swish(.6, 250, 1800), .25)
m.pon(E["el"] - .05, pesa(), .9)
m.pon(E["el"], golpe(70, 34, .5, .3), .45)
# ---------- 4. no fue maldad, ecos ----------
m.pon(E["maldad"], swish(1.1, 200, 2000), .35)
m.pon(E["cuernos"], boing(320, .45), .3)
m.pon(E["cuernos"] + .3, soplo(.4, 1500, 6000, .3), .2)
m.pon(E["mismos"], toc(520), .2)
m.pon(E["termino"] - .05, swish(.45, 400, 3000), .3)
m.pon(E["termino"] + .25, golpe(110, 55, .25, .5), .5)
m.pon(E["termino"] + .3, soplo(1.0, 1200, 5000, .2), .18)
m.pon(E["sinhaber"] + .1, trazo(.7, 500, 200), .22)
m.pon(E["invento"] - .05, ruleta(1.2), .45)
m.pon(E["invento"] + 1.2, toc(380), .4)
m.pon(E["invento"] + 1.22, ding(784, .7), .14)
m.pon(E["llaves"], tintineo(.4, 6), .4)
m.pon(E["muchas"], tintineo(.9, 18, 2000), .5)
m.pon(E["nodebia"], golpe(80, 40, .4, .3), .35)
# ---------- 5. Stanford ----------
m.pon(E["stanford"], swish(.9, 250, 2400), .35)
tt = E["stanford"] + .4
while tt < E["n233"] - .05:
    m.pon(tt, flip(), .16, .2)
    tt += .11
m.pon(E["n233"] + .05, golpe(130, 65, .2, .7), .5)
tt = E["n362"] - .05
while tt < E["fin362"] - .1:
    m.pon(tt, flip(), .2, -.2)
    tt += .07
m.pon(E["fin362"], golpe(110, 55, .3, .8), .6)
m.pon(E["fin362"] + .02, ding(1174.7, .8), .14)
# ---------- 6. la misma forma ----------
m.pon(E["forma"], swish(1.4, 180, 1800), .35)
for k in range(6):
    m.pon(E["misma"] - .2 + k * .12, golpe(100 - k * 6, 50, .2, .5), .3 - k * .03, (k % 2 * 2 - 1) * .3)
m.pon(E["orden"], swish(1.0, 250, 1800), .3)
m.pon(E["cerradura"] + .1, metal(900, .5), .45)
m.pon(E["cerradura"] + .12, golpe(150, 80, .15, .8), .35)
m.pon(E["noloes"], chasquido(), .2)
m.pon(E["noloes"] + .2, papel(.3), .2)
m.pon(E["noloes"] + .62, cerrojo(), .55)
m.pon(E["esfrase"], arruga(.5, 60), .3)
m.pon(E["sugiere"] + .3, estira(1.1), .45)
m.pon(E["fuerte"] + .1, estira(.7), .4)
m.pon(E["fuerte"] + .65, boing(110, .6), .45)
# ---------- 7. cierre ----------
m.pon(E["regla"] + .1, mojado(2.0), .6)
m.pon(E["regla"] + .8, rasgon(.5), .25)
m.pon(E["regla"] + 1.05, papel(.25), .4)
m.pon(E["regla"] + 1.3, toc(420), .25)
m.pon(E["pide"] + .2, pluma(.2), .25)
m.pon(E["pideF"] + .1, papel(.4), .35)
m.pon(E["pideF"] + .1, golpe(140, 70, .1, .4), .2)
m.pon(E["quita"] + .1, swish(.5, 300, 1600), .2)
m.pon(E["toma"], tintineo(.35, 6), .55)
m.pon(E["toma"] + .25, metal(2100, .3), .4)
m.pon(E["llaveF"] + .15, swish(.5, 500, 2600), .2)
m.pon(E["fin"] + .25, golpe(64, 32, .6, .2), .4)
m.pon(E["fin"] + .3, campana((196.0, 293.7, 392.0), 2.6, (.6, .3, .15)), .32)

# ---------- música: una sola pista, su salida natural cae bajo «La regla de verdad». Se calla en seco en
# «Era falso» y vuelve en el mismo compás con Lemkin, como si hubiera seguido sonando ----------
SALIDA = 105.4
O = max(0.0, SALIDA - E["regla"])
A, B = E["rompe"] - .02, E["lemkin"] - .05
m.musica([("a27_desastres", O, 0, A, .02, .06),
          ("a27_desastres", O + B, B, m.dur, .25, m.dur - E["fin"] - .3)])

def bajo_la_voz(m, margen=9.0):
    """Mientras la voz habla, el foley queda al menos `margen` dB debajo. En los huecos suena completo."""
    def env(x):
        w = int(.04 * SR)
        c = np.cumsum(np.concatenate([[0.0], x ** 2]))
        e = np.sqrt(np.maximum((c[w:] - c[:-w]) / w, 0))
        return np.concatenate([e, np.full(w - 1, e[-1])])
    v = np.zeros(m.N); L = min(m.N, len(m.voz)); v[:L] = m.voz[:L].mean(axis=1)
    V = 20 * np.log10(env(v) + 1e-9)
    F = 20 * np.log10(env((m.fx * 1.2).mean(axis=1)) + 1e-9)
    g_db = np.where(V > -40, np.minimum(0, V - margen - F), 0)
    # suaviza: entra rápido (10 ms) y suelta lento (120 ms), sin bombeo
    paso = int(.005 * SR); gd = g_db[::paso].copy()
    for i in range(1, len(gd)):
        gd[i] = min(gd[i], gd[i - 1] + 6 * .005 / .12 * 4)
    for i in range(len(gd) - 2, -1, -1):
        gd[i] = min(gd[i], gd[i + 1] + 6 * .005 / .01)
    g = 10 ** (np.interp(np.arange(m.N), np.arange(len(gd)) * paso, gd) / 20)
    m.fx *= g[:, None]
    print(f"  bajo la voz: {100 * (g < .9).mean():.0f}% del tiempo con el foley recortado")


bajo_la_voz(m)
m.cierra()
print(f"música desde {O:.2f} s")
print({k: v for k, v in E.items()})
