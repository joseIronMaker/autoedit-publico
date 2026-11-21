"""a17: los primeros. Una cinta métrica de papel recorre la mesa y el tiempo es distancia: un mes, 1.25 unidades.
En marzo de 2023 cae un disco de vinil rayado; la bola con manos se sube, ella misma pone la aguja y corre en
el mismo surco: en cada vuelta la raya la hace tropezar, la aguja salta para atrás y suelta una moneda. El humo
de la fricción escribe «humo» y la tapa. La cámara retrocede por la cinta hasta octubre de 2022 (ReAct: dos
engranes que se turnan), avanza a junio de 2023 (el botón rojo del a02) y sube: todas las piezas en la mesa,
y la bola se pierde. Marzo de 2024: un cartel enorme cae y sacude toda la mesa; un sello. Octubre de 2024: la
bola usa una computadora de papel, lenta y torpe, y acierta. El disco brinca por la cinta hasta ella y por
fin suena completo. Dos marcas idénticas en la cinta, y la cinta se enrolla en su estuche.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"y casi siempre": .35, "mucha gente": .5, "pero la idea": .75, "en octubre de dos mil veintidós": .55,
          "y en junio": .45, "ya estaban": .25, "faltaba que": .2, "en marzo de dos mil veinticuatro": .55,
          "sus números": .45, "en octubre de ese año": .5, "autogpt no falló": .8, "falló por llegar": .2,
          "en tecnología": .75, "se ve igual": .3}
m = Mezcla("a17_primeros", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

# ---------- arranques reales de la voz: Whisper estira palabras sobre los silencios ----------
crudo = lee(m.dir / "_voz_larga.wav").mean(axis=1)
_v = int(.02 * SR)
_niv = 20 * np.log10(np.sqrt(np.convolve(crudo ** 2, np.ones(_v) / _v, "same")) + 1e-9)
_sil = _niv < -40
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
if _ini is not None:
    TR.append((_ini / SR, len(_sil) / SR))


def arr(f, desde=0):
    """Arranque real de la voz en esa palabra (Whisper la estira hacia atrás sobre el silencio)."""
    w = m.W[T(f, desde).i]
    c = [a for a, b in TR if w["s"] - .15 <= a <= w["e"]]
    if c:
        return r3(min(c))
    return r3(min(TR, key=lambda r: 0 if r[0] <= w["s"] <= r[1] else abs(r[0] - w["s"]))[0])


def fin_tramo(f, desde=0):
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return r3(min(TR, key=lambda r: abs(r[1] - c) if r[1] >= c - .05 else 99)[1])


i24 = T("en marzo de dos mil veinticuatro").i
io24 = T("en octubre de ese año").i
E = {}
# 1. El arranque: la cámara viene volando por la cinta y frena en marzo de 2023
E["llega"] = r3(s("marzo") + .02)                     # la cámara frena y la bandera se clava
E["clava"] = E["llega"]
E["disco"] = r3(s("apareció") + .16)                  # el disco toca la cinta (primer impacto)
E["disco_h"] = 2.6                                     # altura de caída, en unidades
E["bola"] = r3(s("programa") + .12)                   # la bola cae sobre el disco
E["enorme"] = r3(s("prometía") - .02)                 # los brazos se estiran hasta salirse del cuadro
E["enormeF"] = r3(e("enorme") + .25)
E["meta"] = r3(s("dale") + .22)                       # la tarjeta se ensarta en el eje
E["toma"] = r3(s("inteligencia") - .05)               # la bola se agacha: toma vuelo
E["aguja"] = r3(s("hace todo") + .05)                 # arranca a correr y el disco gira bajo sus pies
E["sola"] = r3(s("sola") + .05)
E["nombre"] = r3(s("autogpt"))
E["viral"] = r3(s("viral") - .02)
E["dando"] = r3(s("dando"))
E["gastando"] = r3(s("gastando"))
E["nada"] = r3(s("nada"))
E["humo0"] = r3(s("mucha gente") - .1)
E["humo"] = r3(s("humo") - .05)

# 2. Hacia atrás por la cinta
E["atras"] = r3(arr("pero la idea") + .35)
E["oct22"] = r3(s("octubre"))
E["articulo"] = r3(s("artículo") - .05)
E["react"] = r3(s("react") - .03)
E["propuso"] = r3(s("propuso"))
E["pensar"] = r3(s("pensar") - .04)
E["actuar"] = r3(s("actuar") - .04)
turnos = [E["pensar"], E["actuar"], r3(s("por turnos") - .02), r3(s("turnos") + .02)]
while turnos[-1] < s("y en junio") + .6:
    turnos.append(r3(turnos[-1] + .5))
E["turnos"] = turnos
# 3. Hacia adelante: junio de 2023
E["adelante"] = r3(arr("y en junio") - .05)
E["jun23"] = r3(s("junio"))
E["boton"] = r3(s("openai") - .2)                    # el botón del a02 brota de la cinta
E["papelito"] = r3(s("llamadas") - .1)              # un papelito llega volando y aprieta el botón
E["clac"] = r3(s("funciones") + .12)
E["piezas"] = r3(arr("ya estaban") - .15)
E["ping"] = [r3(s("todas") - .02), r3(s("las piezas") + .02), r3(s("piezas") + .28)]
E["pierde"] = r3(arr("faltaba que") + .05)
E["perdida"] = r3(s("perdiera") + .1)
# 4. Marzo de 2024: Devin
E["mar24"] = r3(s("marzo", i24))
E["cartel"] = r3(s("devin") + .02)                   # el cartel cae y se planta
E["cita"] = r3(s("presentó") - .05)
E["sacude"] = r3(s("sacudió") + .02)
E["sello"] = r3(s("discutieron") + .05)
E["mesa"] = r3(s("mesa", T("promesa").i))
E["tumba"] = [r3(E["mesa"] - .42), r3(E["mesa"] + .02)]   # el cartel cae de cara sobre la mesa
# 5. Octubre de 2024: la computadora
E["oct24"] = r3(s("octubre", io24))
E["compu"] = r3(s("anthropic") - .05)
E["llega_bola"] = r3(s("enseñó") + .3)              # la bola cae frente a la pantalla
E["computadora"] = r3(s("computadora"))
E["viendo"] = r3(s("viendo"))
E["raton"] = r3(s("moviendo"))
E["lento"] = r3(arr("lento"))
E["torpe"] = r3(arr("torpe"))
E["errores"] = r3(arr("lleno"))
E["equis"] = [r3(s("errores") - .08), r3(s("errores") + .3)]
E["aun"] = r3(arr("y aun así"))
E["acierta"] = r3(s("impresionante") + .25)
# 6. El giro
E["giro"] = r3(arr("autogpt no falló") - .3)
E["vuela"] = r3(s("llegar") - .1)                    # el disco brinca por la cinta hacia la bola
E["aterriza"] = r3(s("cumplir") - .05)
E["brincos"] = [r3(E["vuela"] + (E["aterriza"] - E["vuela"]) * k / 4) for k in range(1, 5)]   # cuatro brincos: de marzo de 2023 a principios de 2025
E["sube"] = r3(E["aterriza"] + .45)                  # la bola salta al disco, que cayó más adelante que ella
E["toca"] = r3(E["aterriza"] + .7)                   # y arranca a correr otra vez
E["termina"] = r3(arr("en tecnología") + .05)          # llega al centro: palomita
# 7. El final
E["marcas"] = r3(s("adelantarse") - .45)
E["adelantarse"] = r3(arr("adelantarse"))
E["igual"] = r3(s("igual"))
E["equivocarse"] = r3(s("equivocarse"))
E["enrolla"] = r3(e("equivocarse") + .55)
E["clack"] = r3(E["enrolla"] + .78)
E["fin"] = r3(m.dur)

# ---------- el disco: una sola física para dibujo y sonido ----------
# La bola es la aguja: corre parada en el frente y el disco gira bajo sus pies. La raya es un tramo radial;
# mientras la bola va por fuera de ella no tropieza. Cuando llega a la raya, cada vuelta la avienta un surco atrás.
WD = .6                                               # el disco cae girando como frisbee y se va frenando
SEG = [[E["disco"], 0.0, 1.2], [E["aguja"], 1.0, .35], [E["pierde"], .25, 1.6], [E["toca"], 1.45, .3], [r3(E["termina"] + .25), .3, 1.4]]
TH_S, FRENTE = .1, .75              # ángulo de la raya en el disco y del frente (donde corre la bola), en vueltas
R0, RS, SURCO, RFIN = .98, .86, .04, .52


def rho(t):
    """Vueltas acumuladas del disco: cada tramo se acerca a su velocidad con su propia constante."""
    if t < SEG[0][0]:
        return WD * (t - SEG[0][0])
    r, w = 0.0, WD
    for i, (ti, wT, tau) in enumerate(SEG):
        if t < ti:
            break
        tf = min(t, SEG[i + 1][0]) if i + 1 < len(SEG) else t
        a = tf - ti
        ex = np.exp(-a / tau)
        r += wT * a + (w - wT) * tau * (1 - ex)
        w = wT + (w - wT) * ex
    return r


def pasos_raya(a, b):
    """Instantes en que la raya pasa por el frente, entre a y b."""
    tt = np.arange(a, b, .001)
    f = np.array([rho(x) for x in tt]) + TH_S - FRENTE
    k = np.floor(f)
    return [r3(tt[i + 1]) for i in range(len(tt) - 1) if k[i + 1] > k[i]]


SALTOS = pasos_raya(E["dando"] - .3, E["pierde"] - .05)
E["saltos"] = SALTOS
E["baches"] = pasos_raya(E["toca"] + .1, E["termina"] - .05)
E["fis"] = {"wd": WD, "seg": SEG, "th_s": TH_S, "frente": FRENTE, "r0": R0, "rs": RS, "surco": SURCO, "rfin": RFIN}

# Monedas: una por tropiezo desde "gastando dinero". Salen de la coronilla de la bola hacia la cámara.
G = 9.8
rr = np.random.default_rng(23)
MON = []
for k, t in enumerate(x for x in SALTOS if x >= E["gastando"] - .35):
    ang = -np.pi / 2 + rr.uniform(-.9, .9)
    v = rr.uniform(1.1, 1.7)
    vz = rr.uniform(2.8, 3.6)
    z0 = .95
    tl = (vz + np.sqrt(vz * vz + 2 * G * z0)) / G
    MON.append({"t": r3(t + .06), "vx": r3(np.cos(ang) * v), "vy": r3(np.sin(ang) * v), "vz": r3(vz), "tl": r3(t + .06 + tl)})
E["monedas"] = MON
E["g"] = G

(RAIZ / "remotion/src/serie/a17/eventos.json").write_text(json.dumps(E, ensure_ascii=False), encoding="utf-8")
if "--eventos" in sys.argv:
    for k, v in E.items():
        print(k, v if not isinstance(v, list) or len(v) < 12 else v[:12])
    print("dur", m.dur)
    raise SystemExit


# =====================================================================================================
# Sonido. Cada golpe nace del mismo instante que el dibujo (E).
# =====================================================================================================
def fade(x, a=.008, b=.04):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

def papel(dur=.16):
    n = int(dur * SR); k = np.exp(-np.linspace(0, 6, n))
    return (banda(ruido(n), 4800, 11000) + banda(ruido(n), 260, 1200) * .8) * k

def rayar(dur):
    """Lápiz sobre papel."""
    n = int(dur * SR); tt = np.arange(n) / SR
    tr = np.abs(np.sin(2 * np.pi * tt * 6.3)) ** .6 * (.65 + .35 * np.sin(2 * np.pi * tt * 17))
    return fade(banda(ruido(n), 2400, 7800) * tr * .7 + banda(ruido(n), 500, 1400) * tr * .2, .01, min(.2, dur * .3))

def boing(dur=1.1, f0=210):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f0 * (1 + .55 * np.exp(-tt * 3) * np.sin(2 * np.pi * tt * 13))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.2) + .22 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)

def metal(f=412, dur=.7):
    tt = np.arange(int(dur * SR)) / SR
    return sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in ((1, .6, 9), (1.47, .4, 14), (2.31, .3, 20), (3.17, .18, 34)))

def klunk(g=1.0, grave=1.0):
    """El botón del a02."""
    x = golpe(92 * grave, 40, .55, .5)
    y = np.zeros(len(x)); z = metal(310, .3)
    y[:len(z)] += z * .34
    c = tic(.02, 1500, 5200); y[:len(c)] += c * 1.3
    return (x + y) * g

def rechina(dur, f0=230, f1=380):
    n = int(dur * SR); f = np.geomspace(f0, f1, n) * (1 + .03 * np.sin(np.linspace(0, 60, n)))
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** .8 * (.7 + .3 * rng.random(n)), .02, .05)

def rasgon():
    """La aguja que salta: un rayón corto que baja de tono."""
    n = int(.13 * SR); tt = np.arange(n) / SR
    f = np.geomspace(2600, 500, n)
    tono = np.sin(2 * np.pi * np.cumsum(f) / SR) * .25
    return fade((banda(ruido(n), 900, 6000) * .9 + tono) * np.exp(-tt * 18), .002, .03)

def moneda(f=2350):
    tt = np.arange(int(.5 * SR)) / SR
    y = sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in ((1, .5, 9), (1.53, .35, 12), (2.71, .2, 18)))
    k = tic(.01, 4000, 9000); y[:len(k)] += k * .6
    return y

def crujido(dur, dens=22):
    """Polvo del vinil: chasquidos sueltos y un siseo muy bajo."""
    n = int(dur * SR); y = banda(ruido(n), 3000, 9000) * .03
    for _ in range(int(dur * dens)):
        i = int(rng.random() * (n - 400)); k = tic(.006, 1500, 8000) * rng.uniform(.1, .6)
        y[i:i + len(k)] += k[: n - i]
    return fade(y, .2, .3)

def cae_silbido(dur, f0=1400, f1=320):
    n = int(dur * SR); f = np.geomspace(f0, f1, n); e = np.sin(np.linspace(0, np.pi * .9, n)) ** 1.2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e * .35 + banda(ruido(n), 600, 3000) * e * .25

def aire(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    return fade((banda(ruido(n), 90, 800) + banda(ruido(n), 1800, 4600) * .18) * (.8 + .2 * np.sin(2 * np.pi * .23 * tt)), .25, .35)

def rafaga_marcas(a, b, n, g=.12, f=2600, acelera=False):
    """Las rayas de la cinta pasando bajo la cámara: un tic por raya."""
    for k in range(n):
        u = (k / n) ** (2.2 if acelera else 1)
        q = a + (b - a) * (u if acelera else ease_io(k / n))
        m.pon(q, tic(.012, f, f * 2.6), g * (.6 + .4 * np.sin(np.pi * k / n)))

def ease_io(x):
    return 4 * x ** 3 if x < .5 else 1 - (-2 * x + 2) ** 3 / 2

def clava(t, g=1.0):
    """Una bandera que se clava en la cinta."""
    m.pon(t - .4, soplo(.42, 600, 4200, .85), .16 * g)
    m.pon(t, golpe(140, 70, .2, .7), .62 * g)
    m.pon(t, tic(.02, 2400, 7000), .5 * g)
    m.pon(t + .01, metal(1700, .18), .1 * g)
    m.pon(t + .05, papel(.22), .4 * g)
    m.pon(t + .14, papel(.12), .18 * g)

def viaje(a, b, n=12, g=.1):
    m.pon(a - .05, soplo(b - a + .3, 260, 2600, .45), .22)
    rafaga_marcas(a + .05, b - .1, n, g)


# ---------- 1. marzo de 2023 ----------
m.pon(0, soplo(.6, 500, 4800, .1), .34)
rafaga_marcas(0, .42, 14, .14, 2600, acelera=True)
clava(E["clava"], 1.1)
# el disco entra planeando desde el cuadro 0: un soplo largo que gira y crece hasta el golpe
n_ = int(E["disco"] * SR); tt_ = np.linspace(0, 1, n_)
m.pon(0, fade(banda(ruido(n_), 250, 2600) * tt_ ** 1.6 * (.7 + .3 * np.sin(2 * np.pi * np.cumsum(np.full(n_, .6 * 6)) / SR)), .05, .04), .3, -.3)
m.pon(E["disco"], golpe(64, 30, .7, .35), 1.0)
m.pon(E["disco"], golpe(180, 90, .12, .4), .4)
m.pon(E["disco"] + .01, metal(220, .4), .12)
m.pon(E["disco"] + .233, golpe(90, 46, .3, .3), .42)
m.pon(E["bola"] - .4, soplo(.4, 700, 3800, .85), .16)
m.pon(E["bola"], golpe(120, 60, .25, .3), .62)
m.pon(E["bola"] + .02, boing(.55, 250), .08)
m.pon(E["enorme"], trazo(1.1, 260, 980), .2)
m.pon(E["enorme"], soplo(.9, 300, 3000, .4), .16)
m.pon(E["enormeF"] + .25, boing(.6, 300), .08)
m.pon(E["meta"] - .3, soplo(.3, 900, 4500, .8), .14)
m.pon(E["meta"], tic(.02, 2600, 8000), .7)
m.pon(E["meta"], papel(.2), .5)
m.pon(E["meta"] + .01, golpe(220, 120, .1, .6), .35)
m.pon(E["toma"] + .05, rechina(.35, 180, 120), .06)
m.pon(E["aguja"] - .05, soplo(.6, 300, 2600, .3), .22)
m.pon(E["aguja"], golpe(80, 44, .3, .4), .5)
# el disco gira: polvo del vinil y los pasos de la bola mientras se ve
for a, b, g in ((E["aguja"], E["atras"] + .6, 1.0), (E["adelante"] + .2, E["adelante"] + 1.0, .6), (E["piezas"], E["pierde"] + .3, .7)):
    m.pon(a, crujido(b - a), .5 * g)
    q = a + .05
    while q < min(b, E["pierde"]):
        m.pon(q, toc(rng.uniform(260, 330)), .033 * g, rng.uniform(-.2, .2)); q += np.pi / 14
m.pon(E["nombre"], toc(520), .3)
m.pon(E["nombre"], trazo(.5, 500, 900), .08)
# viral: confeti, aplauso de papel y los palitos que se cuentan solos
m.pon(E["viral"] - .02, golpe(150, 70, .18, .9), .32)
m.pon(E["viral"], soplo(.5, 1500, 9000, .15), .3)
m.pon(E["viral"], lluvia(2.6, 80), .17)
m.pon(E["viral"] + .05, campana((1318.5, 1760, 2637), 1.0, (.5, .35, .2)), .1)
for i in range(1, 46):
    q = E["viral"] + (i / 9) ** (1 / 1.2)
    if q < E["humo0"]:
        m.pon(q, rayar(.06), .12 * (1 if i % 5 else 1.4), .4)
# cada vuelta tropieza: rayón, golpecito y la moneda
for k, q in enumerate(E["saltos"]):
    cerca = q < E["atras"] + .4 or E["piezas"] - .2 < q < E["pierde"]
    if not cerca:
        continue
    g = (1.3 if k == 0 else 1.0) * (.55 if q > E["piezas"] - .2 else 1)
    m.pon(q, rasgon(), .5 * g)
    m.pon(q, golpe(150, 80, .12, .5), .35 * g)
    m.pon(q + .04, tic(.015, 3000, 8000), .3 * g)
for mo in E["monedas"]:
    if mo["t"] > E["atras"] + .4 and not (E["piezas"] - .2 < mo["t"] < E["pierde"]):
        continue
    m.pon(mo["t"], moneda(2350), .2, rng.uniform(-.3, .3))
    m.pon(mo["tl"], moneda(rng.uniform(1900, 2600)), .26, rng.uniform(-.3, .3))
    m.pon(mo["tl"], golpe(400, 200, .05, .8), .14)
    m.pon(mo["tl"] + 2 * 1.1 / G, moneda(rng.uniform(2100, 2800)), .1)
m.pon(s("nada") + .05, toc(190), .32)
m.pon(s("nada") + .05, golpe(90, 50, .3, .2), .3)

# ---------- humo ----------
m.pon(E["humo0"] - .1, soplo(3.4, 200, 1800, .6), .2)
m.pon(E["humo0"] + .4, banda(ruido(int(3 * SR)), 2500, 7000) * np.sin(np.linspace(0, np.pi, int(3 * SR))) ** 2 * .1, .25)
m.pon(E["humo"] - .3, soplo(1.0, 400, 3200, .35), .35)
m.pon(E["humo"] - .05, polvo(.7), .5)
m.pon(E["humo"] + 1.1, soplo(1.6, 200, 1400, .3), .2)

# ---------- 2. atrás: octubre de 2022 ----------
viaje(E["atras"], E["atras"] + 2.0, 10, .1)
clava(E["oct22"])
m.pon(E["articulo"] - .1, papel(.3), .5)
m.pon(E["articulo"], boing(.6, 200), .07)
m.pon(E["articulo"] + .05, golpe(130, 70, .15, .5), .35)
m.pon(E["react"], toc(560), .26)
for k in range(2):
    m.pon(E["propuso"] + .18 * k, papel(.14), .35)
    m.pon(E["propuso"] + .18 * k + .05, toc(700 - 120 * k), .3)
for k, q in enumerate(E["turnos"]):
    cerca = q < E["adelante"] + .3
    lejos = E["piezas"] < q < E["pierde"] + 1.5
    if not (cerca or lejos):
        continue
    g = 1 if cerca else .35
    pan = -.35 if k % 2 == 0 else .35
    m.pon(q, tic(.018, 2200, 6000), .5 * g, pan)
    m.pon(q, toc(720 if k % 2 == 0 else 470), .32 * g, pan)
    m.pon(q + .02, metal(900 if k % 2 == 0 else 600, .2), .07 * g, pan)
    if cerca and k < 4:
        m.pon(q + .01, campana((880,) if k % 2 == 0 else (659.3,), .5, (.5,)), .05, pan)

# ---------- 3. adelante: junio de 2023 ----------
viaje(E["adelante"], E["adelante"] + 1.0, 12, .09)
clava(E["jun23"])
m.pon(E["boton"], boing(1.0, 210), .15)
m.pon(E["boton"], golpe(110, 56, .25, .4), .45)
m.pon(E["papelito"], soplo(E["clac"] - E["papelito"] + .05, 600, 5200, .6), .2)
m.pon(E["clac"] - .02, papel(.1), .3)
m.pon(E["clac"], klunk(1.1), .9)
m.pon(E["clac"] + .02, campana((220, 329.6, 659.3), 1.4, (.8, .5, .3)), .09)
m.pon(E["piezas"] - .25, soplo(1.1, 250, 2200, .5), .2)
for k, q in enumerate(E["ping"]):
    m.pon(q, campana(((523.3, 1046.5), (659.3, 1318.5), (784, 1568))[k], 1.3, (.6, .2)), .16)
# la bola se pierde: brinca, corretea a tontas y se pregunta
m.pon(E["pierde"] + .05, golpe(130, 70, .15, .4), .4)
m.pon(E["pierde"] + .1, boing(.5, 300), .06)
q = E["pierde"] + .3
while q < E["perdida"] + .9:
    m.pon(q, toc(rng.uniform(380, 560)), .12, rng.uniform(-.5, .5)); q += rng.uniform(.09, .15)
m.pon(E["pierde"] + .3, trazo(E["perdida"] + .7 - E["pierde"] - .3, 400, 700), .07)
m.pon(E["perdida"], toc(500), .3)
m.pon(E["perdida"] + .16, toc(760), .34)

# ---------- 4. marzo de 2024: Devin ----------
i24w = s("en marzo de dos mil veinticuatro")
viaje(i24w - .45, i24w + .3, 16, .09)
clava(E["mar24"])
m.pon(E["cartel"] - .55, cae_silbido(.55), .3)
m.pon(E["cartel"], golpe(46, 24, 1.3, .5), 1.2)
m.pon(E["cartel"], golpe(120, 60, .3, .6), .5)
m.pon(E["cartel"] + .01, papel(.5), .6)
m.pon(E["cartel"] + .02, metal(150, .9), .16)
m.pon(E["cartel"] + .05, papel(.2), .35)            # la bandera de marzo se va al suelo
m.pon(E["cartel"] + .45, golpe(150, 80, .12, .5), .3)
for i in range(3):
    m.pon(E["cita"] + i * .32, rayar(.28), .14)
m.pon(E["sacude"] - .05, soplo(.5, 200, 2000, .3), .3)
m.pon(E["sacude"], golpe(38, 20, 1.6, .4), 1.25)
m.pon(E["sacude"], banda(ruido(int(1.4 * SR)), 30, 220) * np.exp(-np.linspace(0, 5, int(1.4 * SR))), .8)
for k in range(14):
    q = E["sacude"] + .05 + k * .06 + rng.uniform(0, .05)
    m.pon(q, golpe(rng.uniform(110, 220), 60, .12, .6), .2, rng.uniform(-.7, .7))
    if k % 2 == 0:
        m.pon(q + .02, moneda(rng.uniform(1900, 2900)), .07, rng.uniform(-.7, .7))
m.pon(E["sello"] - .2, soplo(.22, 800, 4000, .8), .2)
m.pon(E["sello"], golpe(160, 70, .22, .95), .9)
m.pon(E["sello"], golpe(70, 36, .4, .2), .5)
m.pon(E["sello"] + .01, papel(.18), .45)
m.pon(E["tumba"][0], rechina(.4, 160, 110), .1)
m.pon(E["tumba"][0] + .05, soplo(E["tumba"][1] - E["tumba"][0], 200, 1800, .9), .3)
m.pon(E["tumba"][1], golpe(52, 26, 1.0, .6), 1.0)
m.pon(E["tumba"][1], papel(.45), .7)
m.pon(E["tumba"][1] + .03, banda(ruido(int(.6 * SR)), 300, 2500) * np.exp(-np.linspace(0, 7, int(.6 * SR))), .3)

# ---------- 5. octubre de 2024: la computadora ----------
io24w = s("en octubre de ese año")
viaje(io24w - .4, io24w + .5, 12, .09)
clava(E["oct24"])
m.pon(E["compu"], boing(.8, 180), .1)
m.pon(E["compu"], papel(.3), .4)
m.pon(E["compu"] + .05, golpe(120, 60, .2, .4), .4)
m.pon(E["llega_bola"] - .5, soplo(.5, 700, 3800, .85), .18)
m.pon(E["llega_bola"], golpe(110, 56, .25, .3), .6)
m.pon(E["llega_bola"] + .02, boing(.5, 260), .07)
m.pon(E["viendo"], trazo(.8, 600, 1200), .08)
def arrastre(a, b, g=.14):
    """El ratón de papel resbalando sobre la mesa."""
    n = int((b - a) * SR); tt = np.linspace(0, 1, n)
    m.pon(a, fade(banda(ruido(n), 700, 3200) * (.5 + .5 * np.sin(np.pi * tt)) * (.7 + .3 * np.sin(2 * np.pi * tt * 9)), .05, .08), g, .3)
arrastre(E["raton"], E["raton"] + .9)
arrastre(E["lento"], E["torpe"] - .1, .1)
arrastre(E["torpe"], E["torpe"] + .22, .3)
m.pon(E["torpe"] + .02, soplo(.3, 900, 5000, .2), .2)
m.pon(E["torpe"] + .24, golpe(200, 100, .08, .5), .25)
for q in E["equis"]:
    arrastre(q - .3, q - .02, .14)
    m.pon(q, tic(.015, 2000, 6000), .5)
    sq = np.sign(np.sin(2 * np.pi * 150 * np.arange(int(.22 * SR)) / SR)) * np.exp(-np.linspace(0, 4, int(.22 * SR)))
    m.pon(q + .02, banda(sq, 120, 1600), .16)
arrastre(E["aun"], E["acierta"] - .05, .12)
m.pon(E["acierta"], tic(.015, 2000, 6000), .55)
m.pon(E["acierta"] + .02, campana((1046.5, 1318.5, 1568), 1.6, (.6, .4, .3)), .2)

# ---------- 6. el giro: el disco brinca hasta el modelo ----------
m.pon(E["giro"] + .3, crujido(E["vuela"] - E["giro"]), .4)
L = [E["vuela"]] + E["brincos"]
for k in range(len(L) - 1):
    m.pon(L[k] - .02, soplo(L[k + 1] - L[k] + .05, 300, 2600, .4), .26)
    m.pon(L[k + 1], golpe(70 if k < 3 else 58, 32, .6, .35), .7 + .1 * k)
    m.pon(L[k + 1] + .01, papel(.14), .25)
m.pon(E["aterriza"] - .1, papel(.35), .45)                  # la computadora de papel se tumba
m.pon(E["aterriza"] + .22, golpe(130, 64, .2, .5), .4)
m.pon(E["sube"] - .5, soplo(.52, 700, 3800, .8), .18)
m.pon(E["sube"], golpe(120, 60, .2, .3), .5)
m.pon(E["toca"], soplo(.5, 300, 2600, .3), .2)
m.pon(E["toca"], crujido(E["termina"] + .8 - E["toca"], 30), .55)
q = E["toca"] + .05
while q < E["termina"]:
    m.pon(q, toc(rng.uniform(260, 330)), .07); q += np.pi / 15
for q in E["baches"]:
    m.pon(q, boing(.45, 330), .2)
    m.pon(q, tic(.012, 3000, 8000), .2)
m.pon(E["termina"], tic(.02, 2600, 8000), .6)
m.pon(E["termina"], golpe(160, 80, .14, .6), .4)
m.pon(E["termina"] + .05, rayar(.18), .3)
m.pon(E["termina"] + .05, campana((523.3, 659.3, 784, 1046.5), 2.2, (.6, .45, .35, .25)), .2)

# ---------- 7. las dos marcas y la cinta que se enrolla ----------
for q in (E["marcas"] + .1, E["igual"] - .25):
    m.pon(q - .3, soplo(.3, 900, 4500, .85), .1)
    m.pon(q, golpe(180, 90, .12, .7), .4)
    m.pon(q + .01, tic(.02, 2600, 8000), .4)
m.pon(E["igual"], trazo(.5, 400, 800), .1)
rafaga_marcas(E["enrolla"], E["clack"] - .02, 34, .12, 2400, acelera=True)
n = int((E["clack"] - E["enrolla"]) * SR); tt = np.linspace(0, 1, n)
m.pon(E["enrolla"], banda(ruido(n), 900, 7000) * tt ** 2 * .7 + np.sin(2 * np.pi * np.cumsum(np.geomspace(200, 1400, n)) / SR) * tt ** 2 * .12, .3)
m.pon(E["enrolla"] + .55, papel(.2), .25)                 # la bandera de octubre se va al suelo
m.pon(E["enrolla"] + .72, golpe(140, 70, .12, .5), .25)
m.pon(E["clack"], golpe(120, 50, .3, .9), .9)
m.pon(E["clack"], metal(520, .5), .25)
m.pon(E["clack"] + .01, tic(.02, 2000, 7000), .6)
m.pon(E["clack"] + .04, campana((130.8, 196, 261.6), 2.4, (.8, .4, .2)), .3)

# ---------- música ----------
def pista(nivel):
    x = lee(RAIZ / "serie" / "musica" / "a17_primeros.mp3")
    escribe(m.dir / "_m.wav", x)
    return x * db(nivel - lufs(m.dir / "_m.wav"))

corte = E["humo0"] + .2
vuelve = E["atras"]
m.musica([("a17_primeros", 15.98, 0, corte + .5, .02, .55)], -26)
m.musica([("a17_primeros", 0, vuelve, E["giro"], .45, .02)], -26.5)
# Al giro el disco de la música se frena como un tocadiscos que pierde la corriente.
x = pista(-26.5)
p0 = int((E["giro"] - vuelve) * SR)
nf = int(.85 * SR)
rate = (1 - np.linspace(0, 1, nf)) ** 1.4
fase = p0 + np.cumsum(rate)
i0 = np.floor(fase).astype(int); fr = (fase - i0)[:, None]
frena = x[i0] * (1 - fr) + x[i0 + 1] * fr
frena *= np.linspace(1, .2, nf)[:, None] ** .7
frena[-int(.05 * SR):] *= np.linspace(1, 0, int(.05 * SR))[:, None]
a = int(E["giro"] * SR)
m.mus[a:a + nf] += frena[: m.N - a]
# Vuelve con la segunda subida de la pista: el golpe cae justo cuando la bola llega al centro.
off = 96.0 - (E["termina"] - E["vuela"])
m.musica([("a17_primeros", off, E["vuela"], m.dur, .3, m.dur - E["clack"] - .1)], -27.5)

# Limitador suave del bus de foley y el hueco para la voz (como en el a02).
TECHO = .62
m.fx = TECHO * np.tanh(m.fx * .6 / TECHO)

def hueco_para_la_voz(fx, baja=-12, lo=280, hi=6500):
    n = min(len(fx), len(m.voz))
    w = int(.03 * SR)
    pot = np.convolve(m.voz[:n].mean(axis=1) ** 2, np.ones(w) / w, "same")
    activa = np.clip((10 * np.log10(pot + 1e-10) + 44) / 10, 0, 1)
    a_, r_ = 1 - np.exp(-1 / (.006 * SR)), 1 - np.exp(-1 / (.16 * SR))
    env = np.zeros(n); e_ = 0.0
    for i in range(0, n, 48):
        v = activa[i]; e_ += (v - e_) * (1 - (1 - (a_ if v > e_ else r_)) ** 48); env[i:i + 48] = e_
    g = np.ones(len(fx)); g[:n] = db(baja) ** env
    salida = fx.copy()
    for ch in range(2):
        X = np.fft.rfft(fx[:, ch]); f = np.fft.rfftfreq(len(fx), 1 / SR)
        mas = np.clip((f - lo * .7) / (lo * .3), 0, 1) * np.clip((hi * 1.3 - f) / (hi * .3), 0, 1)
        medio = np.fft.irfft(X * mas, len(fx))
        salida[:, ch] = fx[:, ch] - medio + medio * g
    return salida

m.fx = hueco_para_la_voz(m.fx)
m.cierra()
