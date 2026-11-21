"""a22: programar. Una muralla de ladrillos de papel se levanta sola: cada ladrillo es una línea de código (renglones
de tinta, nada legible) y la bola con manos los lanza a su sitio. Una cinta métrica intenta medir la muralla y se
dobla: nadie sabe cuánto ayudan. Un tramo de cuatro ladrillos por hilera: tres los pone la IA (blancos) y uno una
mano humana (cartón); luego un sello de ingeniero aprueba cada uno de la IA, y cuelga la etiqueta "cifra de Google".
Dieciséis bolitas levantan un torreón de 100,000 ladrillos (el compilador de C) y en lo alto sube una bandera con un
pingüino de papel: arranca Linux. Un ladrillo en un barquito de papel baja por las cuatro esclusas (comprobar,
deshacer, delimitar, quién paga). Corte a negro: lo incómodo. Un cronómetro cae en el escritorio de un programador
experto: con IA, 19% más tiempo, y su globo dice "fui más rápido". Un año después la aguja tiembla del lado rápido
pero cruza la marca: sellos "no concluyente" y "rediseñando". De vuelta en la muralla, un reloj de arena chiquito
(~45 s, Claude Code) entre la bola y una persona que conversa y revisa; la tarjeta del robot nocturno se tacha.
La muralla se termina sola; la bola, arriba, sostiene un plano de casa que no coincide y su "?" pasa a la persona.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"google dice": .25, "dieciséis agentes": .3, "por qué aquí": .4, "ahora lo incómodo": .7, "en dos mil veinticinco": .5,
          "un año después": .4, "porque medir": .3, "y mira qué": .5, "sí pueden": .4, "si eso era": .4}
m = Mezcla("a22_programar", pausas=PAUSAS, cola=3.0).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

# ---------- inicios y finales reales de la voz: Whisper estira palabras sobre los silencios ----------
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


def tramo(f, desde=0):
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs((r[0] + r[1]) / 2 - c) if r[0] - .1 <= c <= r[1] + .1 else 99 + abs(r[0] - c))


arr = lambda f, d=0: tramo(f, d)[0]          # arranque real del tramo que contiene la palabra
fin = lambda f, d=0: tramo(f, d)[1]          # final real

E = {}
# ---------- 1. la muralla se levanta sola ----------
n0 = 28
E["s0"] = [r3(.1 + 6.07 * (k / (n0 - 1)) ** 1.22) for k in range(n0)]     # ráfaga al principio, luego ritmo     # impactos de los ladrillos del arranque
E["agentes"] = s("agentes") - .05
E["cinta"] = arr("y aun así") + .05
E["cuanto"] = s("cuánto") - .05
E["cuantoF"] = e("ayudan")
# ---------- 2. la cifra de Google ----------
E["aGoogle"] = r3(fin("ayudan") + .02)
E["google"] = s("google") - .05
E["tres"] = s("tres cuartas") - .05
fila0 = s("tres cuartas") - .3
E["s1ia"], E["s1hum"] = [], []
for rr in range(5):
    b = fila0 + rr * .78
    E["s1ia"] += [r3(b + k * .2) for k in range(3)]
    E["s1hum"].append(r3(b + .58))
E["ia"] = s("la ia", T("genera").i) - .05
E["aprobado"] = s("aprobado") - .08
fin_sellos = e("ingenieros") - .05
E["sellos"] = [r3(E["aprobado"] + .12 + (fin_sellos - E["aprobado"] - .12) * k / 14) for k in range(15)]
E["cifra"] = s("propia cifra") - .1
# ---------- 3. el torreón ----------
E["aTorre"] = r3(fin("cifra") + .12)
E["dieciseis"] = s("dieciséis") - .06
E["pops"] = [r3(E["dieciseis"] + k * .032) for k in range(16)]
E["anthropic"] = s("anthropic") - .05
E["sube"] = s("escribieron") - .05
E["compilador"] = s("compilador") - .05
E["cienmil"] = s("cien mil") - .05
E["tope"] = r3(e("mil", T("cien").i) + .05)
E["lineas"] = s("líneas") - .05
E["aTope"] = r3(E["tope"] + .05)
E["arranca"] = s("arranca") - .05
E["linux"] = s("linux") - .08
# ---------- 4. las cuatro esclusas ----------
E["aCanal"] = r3(arr("por qué aquí") - .5)
E["porque"] = arr("por qué aquí") - .02
a, b = s("por las cuatro"), e("preguntas") - .12
E["compuertas"] = [r3(a + (b - a) * k / 3) for k in range(4)]
E["codigo"] = s("el código", T("cuatro preguntas").i) - .05
E["chapuzon"] = r3(E["codigo"] + .42)
E["abre"] = [r3(s("prueba") - .02), r3(s("deshace") - .02), r3(s("delimita") - .02), r3(fin("delimita") + .2)]
# ---------- 5. lo incómodo: corte a negro ----------
E["negro"] = r3(arr("ahora lo incómodo") - .07)
E["incomodo"] = s("incómodo") - .05
E["cae"] = r3(fin("incómodo") + .06)
E["golpe"] = r3(E["cae"] + .3)                      # el cronómetro aterriza en el escritorio
# ---------- 6. METR 2025 ----------
E["metr"] = s("metr") - .06
E["gris"] = [r3(s("experimento") - .05), r3(e("expertos"))]
E["expertos"] = s("expertos") - .05
E["conIA"] = r3(arr("con ia") - .02)
E["rojo"] = [r3(arr("con ia") + .05), r3(e("más", T("diecinueve").i))]
E["diecinueve"] = s("diecinueve") - .05
E["creian"] = s("creían") - .05
E["globo"] = s("habían") - .12
# ---------- 7. un año después ----------
E["anio"] = r3(arr("un año después") - .1)
E["repitio"] = s("repitió") - .05
E["rojo2"] = [r3(s("parece") - .05), r3(e("rápido", T("parece").i))]
E["pero"] = arr("pero el resultado") - .02
E["sello1"] = s("concluyente") - .04
E["metr2"] = s("metr", T("concluyente").i) - .05
E["sello2"] = s("rediseñando") - .08
E["medir"] = arr("porque medir") - .02
E["dificil"] = s("dificilísimo") - .05
# ---------- 8. la autonomía real ----------
E["aTaller"] = r3(arr("y mira qué") - .55)
E["vida"] = s("vida real") - .05
E["claude"] = s("claude code") - .06
E["turno"] = s("turno típico") - .05
E["cuarenta"] = s("cuarenta") - .05
E["obra"] = [r3(E["turno"] + .1 + k * .55) for k in range(4)]
E["robot"] = r3(arr("no es un robot") - .12)
E["noche"] = s("toda la noche") - .05
E["tacha"] = r3(e("noche") - .1)
E["persona"] = r3(arr("es una persona") - .02)
E["conversa"] = [r3(s("conversando") - .06 + k * .42) for k in range(3)]
E["revisa"] = s("revisando") - .06
E["palomita"] = r3(e("revisando") - .05)
# ---------- 9. la muralla terminada ----------
E["aLejos"] = r3(arr("sí pueden") - .3)
E["rush"] = [r3(arr("sí pueden") - .05), r3(e("enormes") - .1)]
E["salta"] = r3(e("enormes") - .65)
E["enormes"] = s("enormes") - .05
E["aCerca"] = r3(arr("lo que todavía") - .05)
E["plano"] = s("saber") - .2
E["solos"] = s("solos") - .05
E["contorno"] = r3(arr("si eso era") + .05)
E["necesitabas"] = s("necesitabas") - .05
E["duda"] = r3(e("necesitabas") - .2)
E["pasa"] = r3(fin("necesitabas") + .35)
E["asiente"] = r3(E["pasa"] + 1.05)
E["fin"] = r3(m.dur)
(RAIZ / "remotion/src/serie/a22/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print({k: v for k, v in E.items() if not isinstance(v, list)})


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def ladrillo(f=1.0):
    """Ladrillo de papel prensado que aterriza: golpe seco y un poco de papel."""
    return suma(golpe(150 * f, 74 * f, .16, .55) * .7, papel(.1) * .5)


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def blip(f=880):
    t = np.arange(int(.14 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 26) * .6


def sello():
    return suma(golpe(150, 70, .2, .9), tic(.02, 1500, 5000) * .6)


def silbato(f0=620, f1=180, dur=.6):
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    ev = np.sin(np.linspace(0, np.pi, n)) ** .5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * ev * .5


def resorte_s(f0=320, dur=.5):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .5 * np.exp(-t * 6) * np.sin(t * 46))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * .7


def matraca(dur, n):
    """La cinta métrica que sale: clics de trinquete."""
    y = np.zeros(int(dur * SR) + 4000)
    for k in range(n):
        i = int(dur * SR * k / n)
        x = tic(.012, 2500, 8000)
        y[i:i + len(x)] += x * (.6 + .4 * rng.random())
    return y


def agua(dur=.6, lo=180, hi=2600):
    """Agua que corre: ruido filtrado con burbujas."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * np.minimum(t * 1.4, 1)) ** .6 * (1 - t) ** .5
    y = banda(ruido(n), lo, hi) * env * .8
    for _ in range(int(dur * 18)):
        i = int(rng.random() * (n - 3000))
        tt = np.arange(2400) / SR
        f = rng.uniform(500, 1400)
        y[i:i + 2400] += np.sin(2 * np.pi * np.cumsum(f * (1 + tt * 6)) / SR) * np.exp(-tt * 60) * .25
    return y


def chapuzon():
    return suma(banda(ruido(int(.5 * SR)), 300, 5000) * np.exp(-np.arange(int(.5 * SR)) / SR * 9), golpe(110, 50, .25, .3) * .6)


def compuerta():
    """La compuerta de madera sube: crujido + chorro."""
    return suma(silbato(240, 330, .32) * .5, golpe(120, 60, .18, .5) * .5)


def tictac(f):
    t = np.arange(int(.05 * SR)) / SR
    return suma(np.sin(2 * np.pi * f * t) * np.exp(-t * 120), tic(.012, 3000, 9000) * .7)


def pluma(dur=.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = (.55 + .45 * np.abs(np.sin(2 * np.pi * 5.5 * t + rng.random()))) * np.sin(np.pi * np.minimum(t / dur, 1)) ** .4
    return banda(ruido(n), 1800, 7500) * env * .6


def tachon(dur=.28):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 900, 6000) * np.sin(np.pi * t / dur) ** .3 * 1.1


def arena(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 3000, 9000) * np.minimum(t * 20, 1) * np.minimum((1 - t) * 20, 1) * .25


def grillos(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = np.sin(2 * np.pi * 4300 * t) * (np.sin(2 * np.pi * 26 * t) > .2) * (np.sin(2 * np.pi * 1.6 * t) > 0)
    return y * np.sin(np.pi * np.linspace(0, 1, n)) ** .5 * .25


def metal():
    t = np.arange(int(.9 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * a for f, d, a in ((640, 6, .5), (1510, 9, .35), (2380, 12, .2)))


# ---------- 1. la muralla ----------
for k, t in enumerate(E["s0"]):
    m.pon(t, ladrillo(1 + .08 * ((k * 7) % 5 - 2)), .42 if k < 3 else .26, ((k % 4) - 1.5) * .25)
    m.pon(t - .42, soplo(.3, 900, 4000, .7), .05)
m.pon(0.0, golpe(70, 36, .5, .4), .45)
m.pon(E["cinta"], matraca(.9, 22), .35)
m.pon(E["cuanto"], resorte_s(150, .7), .4)
m.pon(E["cuanto"] + .3, silbato(500, 160, .6), .3)
m.pon(E["cuanto"] + .62, suma(papel(.25), golpe(160, 80, .1, .5) * .5), .45)
# ---------- 2. Google ----------
m.pon(E["aGoogle"], soplo(.7, 300, 3000, .4), .3)
for k, t in enumerate(E["s1ia"]):
    m.pon(t, ladrillo(1.05), .3, -.25)
for t in E["s1hum"]:
    m.pon(t - .3, soplo(.35, 500, 2500, .6), .12)
    m.pon(t, suma(golpe(120, 60, .18, .3), papel(.2)), .35, -.1)
m.pon(E["ia"], campana((988, 1318.5), .6, (.4, .2)), .16)
for k, t in enumerate(E["sellos"]):
    m.pon(t, sello(), .34, -.4 + .8 * (k % 4) / 3)
m.pon(E["cifra"], papel(.4), .45)
m.pon(E["cifra"] + .35, toc(980), .18)
# ---------- 3. el torreón ----------
m.pon(E["aTorre"], soplo(.8, 300, 3200, .4), .32)
for k, t in enumerate(E["pops"]):
    m.pon(t, pop(), .18, ((k % 4) - 1.5) * .4)
m.pon(E["sube"], lluvia(E["tope"] - E["sube"], 70), .55)
m.pon(E["sube"], trazo(E["tope"] - E["sube"], 200, 900), .2)
nk = 30
for k in range(nk):
    u = 1 - (1 - (k + 1) / nk) ** (1 / 2)
    m.pon(E["sube"] + (E["tope"] - E["sube"]) * u, tic(.015, 2500, 7000), .14)
m.pon(E["tope"], campana((784, 1175, 1568), 1.2, (.5, .3, .15)), .3)
m.pon(E["aTope"], soplo(.7, 400, 3000, .5), .25)
m.pon(E["linux"], soplo(.5, 700, 5000, .3), .35)
m.pon(E["linux"] + .25, campana((1046.5, 1568, 2093), 1.4, (.6, .35, .2)), .28)
m.pon(E["linux"] + .28, pop(), .3)
# ---------- 4. las esclusas ----------
m.pon(E["aCanal"], soplo(.6, 300, 5000, .25), .5)
for t in E["compuertas"]:
    m.pon(t, golpe(100, 50, .3, .6), .5)
    m.pon(t + .02, agua(.3, 400, 3000), .18)
m.pon(E["codigo"], soplo(.4, 500, 3000, .7), .2)
m.pon(E["chapuzon"], chapuzon(), .55)
for k, t in enumerate(E["abre"]):
    m.pon(t, compuerta(), .55)
    m.pon(t + .08, agua(.9), .45)
    m.pon(t + .5, toc(1320 + 140 * k), .3)
# ---------- 5. corte a negro ----------
m.pon(E["negro"], golpe(48, 26, 1.3, .05), .95)
m.pon(E["negro"] + .02, tic(.04, 600, 3000), .4)
m.pon(E["cae"], soplo(.35, 600, 5000, .9), .4)
m.pon(E["golpe"], golpe(66, 32, .7, .7), 1.0)
m.pon(E["golpe"] + .01, metal(), .2)
t = E["golpe"] + .5
k = 0
while t < E["anio"] + .2:
    m.pon(t, tictac(1900 if k % 2 == 0 else 1500), .2)
    t += .5
    k += 1
# ---------- 6. METR 2025 ----------
m.pon(E["metr"], papel(.3), .3)
m.pon(E["gris"][0], trazo(E["gris"][1] - E["gris"][0], 200, 300), .12)
m.pon(E["gris"][1], toc(700), .25)
m.pon(E["rojo"][0], trazo(E["rojo"][1] - E["rojo"][0], 260, 520), .2)
m.pon(E["rojo"][1], golpe(58, 30, .8, .3), .55)
m.pon(E["rojo"][1] + .02, campana((233, 277), 1.2, (.5, .4)), .18)
m.pon(E["globo"], pop(), .45)
m.pon(E["globo"] + .1, blip(1180), .2)
# ---------- 7. un año después ----------
m.pon(E["anio"], suma(papel(.35), soplo(.5, 900, 5000, .3)), .45)
m.pon(E["anio"] + .25, matraca(.45, 14), .3)
m.pon(E["rojo2"][0], trazo(E["rojo2"][1] - E["rojo2"][0], 260, 480), .18)
for k in range(10):
    m.pon(E["rojo2"][1] + k * .09, tic(.02, 1800, 6000), .12 * (1 - k / 12))
m.pon(E["sello1"], sello(), .85)
m.pon(E["sello1"] + .02, golpe(90, 45, .4, .2), .5)
m.pon(E["sello2"], sello(), .7)
m.pon(E["sello2"] + .25, pluma(1.1), .3)
m.pon(E["dificil"], silbato(420, 300, .5) * .5, .2)
# ---------- 8. la autonomía real ----------
m.pon(E["aTaller"], soplo(.7, 300, 5000, .25), .5)
m.pon(E["claude"], papel(.25), .3)
m.pon(E["turno"], pop(), .4)
m.pon(E["turno"] + .1, arena(E["robot"] - E["turno"] - .2), .55)
m.pon(E["cuarenta"], toc(990), .28)
for t in E["obra"]:
    m.pon(t, ladrillo(1.1), .22)
m.pon(E["robot"], soplo(.5, 600, 4000, .4), .3)
m.pon(E["robot"] + .2, grillos(E["tacha"] - E["robot"]), .35)
for k in range(8):
    m.pon(E["robot"] + .35 + k * .17, tic(.012, 2500, 7000), .14)
m.pon(E["tacha"], tachon(.3), .6)
m.pon(E["tacha"] + .2, tachon(.26), .55)
m.pon(E["persona"], soplo(.6, 300, 2400, .5), .3)
for k, t in enumerate(E["conversa"]):
    m.pon(t, blip((660, 880, 740)[k]), .3, (.4, -.4, .4)[k])
    if k % 2 == 0:
        m.pon(t + .12, toc(2100), .2)
m.pon(E["revisa"], trazo(.4, 500, 900), .2)
m.pon(E["palomita"], suma(tic(.03, 1800, 6000), toc(1500) * .5), .4)
m.pon(E["palomita"] + .05, campana((1318.5, 1760), .8, (.4, .2)), .15)
# ---------- 9. la muralla terminada ----------
m.pon(E["aLejos"], soplo(1.0, 200, 3000, .5), .45)
a, b = E["rush"]
for k in range(110):
    u = (k / 109) ** .8
    m.pon(a + (b - a) * u + .05 * rng.random(), ladrillo(1 + .2 * rng.random()), .09, rng.uniform(-.7, .7))
m.pon(a, trazo(b - a, 180, 520), .14)
m.pon(E["salta"], resorte_s(260, .5), .25)
m.pon(E["salta"] + .55, golpe(110, 55, .3, .4), .45)
m.pon(E["enormes"] + .2, golpe(52, 28, .9, .1), .4)
m.pon(E["aCerca"], soplo(.9, 300, 2400, .5), .3)
m.pon(E["plano"], suma(papel(.5), soplo(.5, 1200, 6000, .3)), .45)
m.pon(E["contorno"], pluma(1.0), .3)
m.pon(E["necesitabas"] + .2, trazo(.6, 400, 300), .14)
m.pon(E["duda"], pop(), .38)
m.pon(E["pasa"], soplo(.9, 500, 3000, .5), .25)
m.pon(E["asiente"], toc(560), .4)
m.pon(E["asiente"] + .22, toc(500), .3)
m.pon(E["asiente"] + .05, campana((130.8, 196, 261.6, 392), 3.0, (.8, .45, .3, .15)), .38)

# ---------- música: se corta en seco con el negro y vuelve un año después ----------
ini_b = 113.0 - (m.dur - E["anio"])
m.musica([("a22_programar", 15.98, 0.0, E["negro"], .02, .03), ("a22_programar", ini_b, E["anio"], m.dur, .7, 2.6)], nivel=-26.0)

# ---------- el foley va debajo de la voz ----------
vz = np.abs(m.voz[:m.N].mean(axis=1))
L = min(len(vz), m.N)


def media(x, n):
    c = np.cumsum(np.concatenate([[0.0], x]))
    y = (c[n:] - c[:-n]) / n
    return np.concatenate([np.full(n // 2, y[0]), y, np.full(len(x) - len(y) - n // 2, y[-1])])


env = media(vz, int(.06 * SR))
env = np.clip(env / (np.percentile(env[env > 1e-4], 85) + 1e-9), 0, 1)
env = media(np.maximum(env, media(env, int(.3 * SR))), int(.12 * SR))
g = np.ones(m.N)
g[:L] = 1 - .37 * np.clip(env[:L] * 1.6, 0, 1)
m.fx *= (.5 * g)[:, None]
m.cierra()
