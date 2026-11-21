"""a23: hackear. La planta de un edificio de papel vista desde arriba. En el cuarto del examen, con las
protecciones apagadas a propósito (una prueba interna), tres bolitas abren una grieta, salen al pasillo
(internet) y entran a otro edificio: Hugging Face. Toman llaves y se mueven de cuarto en cuarto mientras
pasan los días. La silla del operador está vacía. Dos hojas de calca, cada una firmada, ponen encima las
dos lecturas: la de Hugging Face y la de METR. Después la hoja se va: pruebas del gobierno británico, una
bola con máscaras presiona a una persona que dice que no. La moneda se voltea: un muro de agujeros que se
tapan (Firefox, Mozilla), luego un muro mucho mayor con pocos parches. Cierra con la silla vacía otra vez:
falta quien los tape.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"era una prueba": .35, "encontraron una": .3, "hugging face lo resume": .3, "para qué": .3,
          "la revisión independiente": .45, "el daño fue": .3, "en pruebas del": .7, "lo frenó": .35,
          "el otro lado": .55, "anthropic reportó": .35, "ya no falta": .45, "falta quien los tape": .3}
m = Mezcla("a23_hackear", pausas=PAUSAS, cola=2.9).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e

# ---------- inicios reales de la voz: Whisper estira la primera palabra sobre el silencio ----------
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
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - c))[0]


r3 = lambda x: round(x, 3)
E = {}
# 1. El gancho: la grieta, la salida, el pasillo y la otra empresa
E["grieta"] = .22
E["abre"] = [.85, 3.0]
E["sale"] = [r3(s("salieron") - .12 + k * .32) for k in range(3)]       # A1, A0, A2 pasan por la grieta
E["llega"] = [r3(x + 2.3) for x in E["sale"]]                           # llegan a la puerta del otro edificio
E["openai"] = s("openai")
E["empresa"] = s("empresa real")
E["rebob"] = [r3(e("real") + .3), r3(arr("era una prueba") - .12)]      # todo regresa: era una prueba
# 2. Prueba interna: el sello, el tablero, la cinta
E["sello"] = s("interna") + .02
E["ciber"] = s("ciberseguridad")
E["panel"] = arr("les habían") - .4
E["mano"] = [r3(s("les habían") - .05), r3(s("propósito") + .25)]
E["switch"] = [r3(s("apagado") + .02), r3(s("apagado") + .3), r3(s("protecciones") + .1)]
E["proposito"] = s("a propósito")
E["mide"] = s("medir") - .12
# 3. La falla, el pasillo, Hugging Face
E["toques"] = [r3(arr("encontraron") + .02 + k * .3) for k in range(3)]
E["falla"] = s("falla")
E["sistema"] = s("sistema")
E["abre2"] = [r3(s("contenía")), r3(s("llegaron") + .1)]
E["sale2"] = [r3(s("llegaron") - .02 + k * .24) for k in range(3)]
E["internet"] = s("internet")
E["llega2"] = [r3(arr("entraron a hugging") + .45 + k * .18) for k in range(3)]
E["hf"] = s("hugging face")
E["llaves"] = [r3(s("robaron") + .05 + k * .22) for k in range(3)]
E["cred"] = s("credenciales")
E["mueven"] = s("se movieron")
E["puertas"] = [r3(s("se movieron") + x) for x in (.08, .2, .32, .78, .9)]
E["dias"] = s("días")
E["noche"] = [r3(s("se movieron") - .1), r3(arr("hugging face lo resume") - .45)]
# 4. La silla vacía
E["silla"] = arr("hugging face lo resume") - .55
E["resume"] = arr("hugging face lo resume")
E["ningun"] = arr("ningún")
# 5. Las dos lecturas, cada una en su hoja
E["paraque"] = arr("para qué")
E["hoja_hf"] = s("según") - .3
E["trampa"] = s("hacer trampa")
E["buscaban"] = s("buscaban")
E["respuestas"] = s("respuestas")
E["fuera_hf"] = arr("la revisión") - .6
E["hoja_metr"] = arr("la revisión") - .1
E["metr"] = s("metr")
E["puntos"] = [r3(s("algo más raro")), r3(s("mil doscientos") + .25)]
E["mil"] = s("mil doscientos")
E["hablarse"] = s("cómo hablarse") - .15
E["setecientos"] = [r3(s("setecientos")), r3(e("participaron") - .2)]
E["aclara"] = arr("y aclara que no")
E["interroga"] = s("entiende")
E["fuera_metr"] = arr("el daño") - .55
E["dano"] = s("pequeño") - .05
# 6. Pruebas del gobierno británico
E["hoja"] = arr("en pruebas") - .95
E["uk"] = arr("en pruebas")
E["gobierno"] = s("gobierno")
E["agente"] = s("un agente de anthropic") - .1
E["anth"] = s("anthropic", T("un agente de").i)
E["mascaras"] = [r3(s("creó") - .08), r3(s("identidades") + .12), r3(s("falsas") + .05)]
E["presiona"] = s("presionó") - .05
E["programador"] = s("programador")
E["paquete"] = [r3(s("aceptara") - .15), r3(s("malicioso") + .05)]
E["malicioso"] = s("código malicioso")
E["no"] = arr("lo frenó") + .16
# 7. La moneda y los muros
E["moneda0"] = arr("el otro lado") - .55
E["aterriza"] = arr("el otro lado") + .2
E["flip"] = [r3(s("moneda") - .05), r3(s("moneda") + .45)]
E["mozilla"] = s("mozilla")
E["parches"] = [r3(s("corrigió") - .1), r3(e("setenta y una") + .05)]
E["firefox"] = s("firefox")
E["modelo"] = s("modelo de anthropic") - .1
E["aclara2"] = arr("y aclara que ninguna")
E["alcance"] = [r3(s("fuera del alcance") - .1), r3(e("élite") - .1)]
E["elite"] = s("élite")
E["muro2"] = arr("anthropic reportó") - .5
E["seismil"] = [r3(arr("anthropic reportó")), r3(e("seis mil fallas") - .1)]
E["abiertos"] = s("proyectos abiertos")
E["parchadas"] = [r3(arr("parchadas")), r3(e("quinientas dieciséis") - .05)]
E["encuentre"] = arr("ya no falta")
E["falta"] = arr("falta quien los tape")
E["tape"] = s("tape")
E["gesto"] = e("tape") + .06
E = {k: (r3(v) if isinstance(v, float) else v) for k, v in E.items()}
(RAIZ / "remotion/src/serie/a23/eventos.json").write_text(json.dumps(E), encoding="utf-8")
print(E)


# ---------- foley: todo nace del mismo instante que el dibujo ----------
def crujido(dur=.45, lo=900, hi=7000, dens=.99):
    """Papel o yeso que se rompe: chasquidos irregulares."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    cr = (rng.random(n) > dens).astype(float) * rng.uniform(-1, 1, n)
    return (banda(cr, lo, hi) * 3.2 + banda(ruido(n), 1200, 5000) * .3) * np.sin(np.pi * t ** .5) ** .8


def rebobina(dur=.7):
    """Cinta que regresa: chirrido que sube y se acelera."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.geomspace(260, 2400, n)
    w = np.sin(2 * np.pi * np.cumsum(f * (1 + .05 * np.sin(2 * np.pi * 31 * t))) / SR)
    env = np.sin(np.pi * t / dur) ** .7
    return (w * .25 + banda(ruido(n), 1500, 7000) * .35) * env


def clic(f=2600):
    """Interruptor: dos chasquidos de plástico casi juntos."""
    out = np.zeros(int(.12 * SR))
    a = tic(.025, 1800, 7000)
    out[: len(a)] += a
    b = golpe(220, 140, .06, .9) * .4
    i = int(.03 * SR)
    out[i:i + len(b)] += b
    return out


def cinta(dur):
    """Cinta métrica que se desenrolla: trinquete rápido."""
    n = int(dur * SR)
    y = np.zeros(n)
    tt, paso = 0.0, .045
    while tt < dur - .03:
        s_ = tic(.012, 3000, 9000) * .7
        i = int(tt * SR)
        y[i:i + len(s_)] += s_[: n - i]
        tt += paso
        paso = max(.018, paso * .97)
    return y + banda(ruido(n), 2000, 6000) * .05


def pasitos(dur, cada=.09, f0=900):
    """Pies chiquitos sobre papel."""
    n = int(dur * SR)
    y = np.zeros(n)
    tt = 0.0
    while tt < dur - .05:
        s_ = toc(f0 + rng.uniform(-80, 80)) * .35
        q = tic(.02, 2000, 6000) * .3
        s_[: len(q)] += q
        i = int(tt * SR)
        y[i:i + len(s_)] += s_[: n - i]
        tt += cada * rng.uniform(.85, 1.15)
    return y


def llavero():
    """Llaves que se descuelgan: tres timbres metálicos cortos."""
    out = np.zeros(int(.6 * SR))
    for k, f in enumerate((2640, 3520, 2960)):
        tt = np.arange(int(.35 * SR)) / SR
        s_ = (np.sin(2 * np.pi * f * tt) + .5 * np.sin(2 * np.pi * f * 2.76 * tt)) * np.exp(-tt * 18)
        i = int(k * .05 * SR)
        out[i:i + len(s_)] += s_ * .3
    return out


def puerta(dur=.35):
    """Puerta de papel que gira: roce y un golpecito al tope."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    y = banda(ruido(n), 400, 2600) * np.sin(np.pi * t) * .4
    g = golpe(170, 110, .08, .4) * .4
    y[-len(g):] += g
    return y


def chirrido(dur=1.6):
    """Silla que gira sola: rechinido lento."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 620 + 90 * np.sin(2 * np.pi * .7 * t)
    w = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(2 * np.pi * 9 * t) > .2)
    return banda(w, 500, 3500) * np.sin(np.pi * t / dur) ** 2 * .3


def tono(dur):
    """Tono de cuarto: el silencio digital se oye como corte."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.minimum(t / .4, 1) * np.minimum((dur - t) / .5, 1)
    return (banda(ruido(n), 40, 260) * .5 + np.sin(2 * np.pi * 55 * t) * .25) * env


def hoja(dur=.6):
    """Una hoja de calca que se desliza sobre el plano."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 1800, 9000) * np.sin(np.pi * t) ** 1.5 * .5


def sello():
    g = golpe(70, 40, .45, .6)
    c_ = crujido(.12, 1500, 6000, .995)
    out = np.zeros(len(g))
    out += g
    out[: len(c_)] += c_ * .4
    return out


def moneda(dur=1.2):
    """Moneda que gira: timbre metálico con trémolo que se acelera."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    trem = np.abs(np.sin(2 * np.pi * np.cumsum(np.geomspace(6, 26, n)) / SR))
    s_ = sum(v * np.sin(2 * np.pi * f * t) for f, v in ((2093, 1), (3322, .5), (5270, .25)))
    return s_ * trem * np.exp(-t * 1.2) * .25


def parche():
    """Cinta que se pega: un tirón corto y la palmada."""
    a = banda(ruido(int(.08 * SR)), 1500, 6000) * np.linspace(1, 0, int(.08 * SR)) * .4
    g = golpe(130, 80, .12, .5) * .5
    out = np.zeros(int(.2 * SR))
    out[: len(a)] += a
    out[int(.06 * SR):int(.06 * SR) + len(g)] += g
    return out


def rafaga(t0, t1, n, f, g, pan=0.0, curva=1.0):
    """n eventos repartidos entre t0 y t1."""
    for i in range(n):
        x = (i / max(n - 1, 1)) ** curva
        m.pon(t0 + (t1 - t0) * x + rng.uniform(-.01, .01), f(), g * rng.uniform(.7, 1), pan + rng.uniform(-.4, .4))


# 1. gancho
for k in range(5):                                     # empujan la pared
    m.pon(.05 + k * .19, golpe(120, 80, .1, .5), .25, -.2 + k * .1)
m.pon(E["grieta"], crujido(.35, 1200, 6000, .995), .26)
m.pon(E["grieta"], golpe(60, 34, .5, .3), .5)
m.pon(E["abre"][0], crujido(E["abre"][1] - E["abre"][0], 600, 3000, .998), .12)
for k, t in enumerate(E["sale"]):
    m.pon(t + .12, soplo(.25, 1200, 5000, .4), .18)
    m.pon(t + .28, toc(700 + 90 * k), .35)
    m.pon(t + .3, pasitos(E["llega"][k] - t - .3, .085, 800 + 60 * k), .12, -.3 + .3 * k)
m.pon(E["sale"][0] + .2, soplo(1.6, 200, 1600, .5), .1)
for k, t in enumerate(E["llega"]):
    m.pon(t + .05, golpe(150, 100, .1, .4), .22)
m.pon(E["rebob"][0] - .05, rebobina(E["rebob"][1] - E["rebob"][0] + .1), .24)
# 2. prueba interna
m.pon(E["sello"], sello(), .7)
m.pon(E["panel"], soplo(.9, 300, 2400, .5), .1)
m.pon(E["mano"][0], soplo(.5, 600, 3000, .3), .12, .3)
for k, t in enumerate(E["switch"]):
    m.pon(t, clic(), .7, .2 + .1 * k)
m.pon(E["proposito"] + .05, banda(ruido(int(.5 * SR)), 1500, 6000) * np.sin(np.linspace(0, 3 * np.pi, int(.5 * SR))) ** 2 * .3, .12, .3)
m.pon(E["mide"], cinta(1.0), .2, -.2)
m.pon(E["mide"] + 1.0, golpe(260, 180, .06, .8), .3, .3)
# 3. la falla
for k, t in enumerate(E["toques"]):
    m.pon(t, golpe(190 + 20 * k, 120, .09, .5), .5, [-.6, 0, .1][k])
    m.pon(t + .11, golpe(190 + 20 * k, 120, .08, .5), .35, [-.6, 0, .1][k])
m.pon(E["falla"], campana((1568, 2349), .9, (.5, .25)), .25)
m.pon(E["falla"], crujido(.3, 1500, 7000, .995), .16)
m.pon(E["abre2"][0], crujido(E["abre2"][1] - E["abre2"][0], 600, 3000, .998), .12)
for k, t in enumerate(E["sale2"]):
    m.pon(t + .2, toc(760 + 90 * k), .32)
    m.pon(t + .25, pasitos(E["llega2"][k] - t - .25, .08, 850 + 60 * k), .11, -.3 + .3 * k)
m.pon(E["internet"] - .1, soplo(1.2, 400, 4000, .3), .1)
for k, t in enumerate(E["llega2"]):
    m.pon(t, golpe(150, 100, .1, .4), .2)
for k, t in enumerate(E["llaves"]):
    m.pon(t, llavero(), .45, -.3 + .1 * k)
for k, t in enumerate(E["puertas"]):
    m.pon(t - .05, puerta(), .4, [.4, 0, -.4, .4, -.2][k])
m.pon(E["mueven"], pasitos(E["noche"][1] - E["mueven"], .07, 950), .08)
nd0, nd1 = E["noche"]
for k in range(3):                                      # cada noche: un soplo grave
    m.pon(nd0 + k * (nd1 - nd0) / 3, soplo((nd1 - nd0) / 3, 120, 700, .5), .12)
    m.pon(nd0 + (k + .55) * (nd1 - nd0) / 3, hoja(.25), .12, .5)      # hoja del calendario
# 4. la silla
m.pon(E["silla"], soplo(.9, 200, 2000, .6), .14)
m.pon(E["silla"] + .85, golpe(70, 40, .4, .1), .3)
m.pon(E["resume"], tono(E["paraque"] - E["resume"]), .5)
m.pon(E["ningun"] - .2, chirrido(2.0), .4, .3)
# 5. las dos hojas
m.pon(E["paraque"] + .05, toc(620), .25)
m.pon(E["hoja_hf"], hoja(.6), .2, .6)
m.pon(E["trampa"], golpe(90, 50, .3, .2), .3)
m.pon(E["buscaban"], trazo(1.2, 300, 700), .14)
m.pon(E["respuestas"] + .1, campana((1318.5, 1975.5), .8, (.4, .2)), .2)
m.pon(E["fuera_hf"], hoja(.55), .2, -.6)
m.pon(E["hoja_metr"], hoja(.6), .2, .6)
m.pon(E["puntos"][0], lluvia(E["puntos"][1] - E["puntos"][0], 120), .3)
m.pon(E["mil"], golpe(110, 60, .3, .3), .35)
for k in range(26):
    m.pon(E["hablarse"] + k * .1 + rng.uniform(0, .05), tic(.02, 2500, 8000), .22, rng.uniform(-.7, .7))
m.pon(E["setecientos"][0], lluvia(E["setecientos"][1] - E["setecientos"][0], 90), .3)
m.pon(E["setecientos"][0], trazo(E["setecientos"][1] - E["setecientos"][0], 300, 900), .12)
m.pon(E["interroga"], sello(), .55)
m.pon(E["fuera_metr"], hoja(.55), .18, -.6)
m.pon(E["dano"], toc(1200), .22)
m.pon(E["dano"] + .1, campana((2093,), .6, (.3,)), .12)
# 6. pruebas del gobierno británico
m.pon(E["hoja"], hoja(.9), .3)
m.pon(E["hoja"] + .1, soplo(.8, 150, 1200, .4), .16)
m.pon(E["uk"] + .25, soplo(.3, 400, 3000, .3), .2, -.4)               # la bola cae al escenario
m.pon(E["uk"] + .55, golpe(80, 46, .35, .2), .5, -.4)
m.pon(E["uk"] + .87, golpe(80, 46, .25, .2), .25, -.4)
for k, t in enumerate(E["mascaras"]):
    m.pon(t, crujido(.22, 1500, 7000, .995), .16, -.4 + .2 * k)
    m.pon(t + .18, toc(500 + 70 * k), .3, -.4 + .2 * k)
p0 = E["presiona"]
m.pon(p0, trazo(E["no"] - p0 - .1, 90, 180), .32)            # la presión: un tono grave que sube
for k in range(9):
    m.pon(p0 + .3 + k * .36, toc(880 + 40 * (k % 3)), .2, .2 + .2 * (k % 3 - 1))
m.pon(E["paquete"][0], banda(ruido(int(.8 * SR)), 200, 1000) * np.sin(np.linspace(0, np.pi, int(.8 * SR))) * .4, .14)
m.pon(E["paquete"][1], golpe(100, 60, .25, .3), .4, .4)
m.pon(E["no"], golpe(50, 30, .8, .6), 1.0, .3)
m.pon(E["no"], crujido(.2, 1000, 5000, .995), .2, .3)
for k in range(3):
    m.pon(E["no"] + .25 + k * .14, crujido(.12, 1800, 7000, .997), .12, -.4 + .1 * k)
# 7. la moneda
m.pon(E["moneda0"], moneda(E["aterriza"] - E["moneda0"] + .4), .32)
m.pon(E["aterriza"], campana((2093, 3322), .7, (.5, .25)), .3)
m.pon(E["aterriza"], golpe(300, 200, .1, .6), .3)
m.pon(E["flip"][0], soplo(.5, 800, 4000, .4), .14)
m.pon(E["flip"][0], moneda(.6), .4)
m.pon(E["flip"][1], golpe(120, 70, .3, .5), .45)
m.pon(E["flip"][1], campana((1046.5, 1568, 2093), 1.4, (.5, .3, .2)), .3)
pa0, pa1 = E["parches"]
rafaga(pa0, pa1, 34, parche, .22, .2, 1.2)
m.pon(E["modelo"], soplo(.8, 500, 3000, .4), .08, -.5)
m.pon(E["alcance"][0], trazo(E["alcance"][1] - E["alcance"][0], 300, 600), .2, .3)
m.pon(E["alcance"][1], toc(660), .3, .3)
m.pon(E["muro2"], soplo(1.0, 200, 1800, .4), .16)
s0, s1 = E["seismil"]
m.pon(s0, lluvia(s1 - s0, 260), .38)
m.pon(s1 - .1, golpe(60, 34, .5, .2), .4)
q0, q1 = E["parchadas"]
rafaga(q0, q1, 22, parche, .16, -.1, 1.0)
f0 = E["encuentre"]
tt, paso = f0, .16
while tt < E["gesto"] + 1.2:                               # la bola encuentra cada vez más rápido
    m.pon(tt, tic(.02, 3000, 8000), .28, rng.uniform(-.7, .1))
    m.pon(tt + .01, toc(1500 + rng.uniform(-200, 200)), .1, -.4)
    tt += paso
    paso = max(.07, paso * .96)
for k, t in enumerate(np.arange(E["parchadas"][1] + .8, E["gesto"] + 1.5, 1.15)):   # una sola mano, lenta
    m.pon(t, parche(), .45, .5)
m.pon(E["gesto"] - .12, soplo(.3, 300, 2000, .4), .2, .2)
m.pon(E["gesto"], golpe(64, 36, .7, .3), .7)
m.pon(E["gesto"] + .04, campana((196, 293.7, 392, 587.3), 2.6, (.7, .4, .25, .12)), .28)

m.musica([("a23_hackear", 30.0, 0, E["resume"] + .2, .02, .55),
          ("a23_hackear", 12.0, E["paraque"] - .15, E["fuera_metr"] + .5, .35, .7),
          ("a23_hackear", 20.0, E["hoja"], E["no"] - .02, .3, .12),
          ("a23_hackear", 44.0, E["moneda0"] + .3, m.dur, .05, 2.6)])
m.cierra()
