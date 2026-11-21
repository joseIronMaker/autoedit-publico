"""a26: la oficina. Un escritorio de papel donde tu puesto es un rompecabezas de seis piezas (bocetos, subtítulos,
tablas, correo, juntas, decidir). La bola con manos cae sobre él y lo alcanza: ¿puede hacer tu trabajo?

Remote Labor Index: un mostrador de papel. Los proyectos llegan como sobres (diseño, video, análisis), la bola los
entrega y un cliente de papel los sella: pagado o rechazado. En la pared se desenrolla un gráfico de barras con
las cifras del leaderboard oficial (2.5% en oct-2025, 21.25% hoy) y en el MISMO gráfico se leen dos cosas: el
78.75% que sigue rechazado (escala 0-100) y el ×8.5 (la escala se acerca a 0-24 y ocho bloques y medio de 2.5 se
apilan junto al 21.25).
OSWorld: una computadora de papel con ventanas; la barra de los agentes empieza en 12, la de una persona en 72, y
la de los agentes cruza esa marca (OSWorld-Verified). Luego la bola maneja las ventanas sin un error, pero el sobre
que entrega sale con el sello RECHAZADO: usar la computadora ya no es el problema, terminar un trabajo pagado sí.
El giro: la bola no puede cargar el rompecabezas entero, pero se sueltan piezas de muchos escritorios.
Cierra con las cuatro esclusas del a21: cada pieza las intenta; las que pasan se van flotando, el correo se atora
en la 2, las juntas en la 3, decidir en la 4. La persona mira los huecos y pone las manos sobre lo que le queda.

Todos los instantes salen de aquí a `eventos.json`: dibujo y sonido leen el mismo reloj.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"y hace una sola": .3, "cuando salió": .5, "dos lecturas": .35, "dos se multiplicó": .3,
          "otra prueba": .5, "hoy varios": .25, "usar la computadora": .4, "terminar un trabajo": .25,
          "hoy un agente": .55, "si quieres saber": .4, "pregunta qué pedazos": .45, "esos ya no": 2.3}
m = Mezcla("a26_oficina", pausas=PAUSAS, cola=3.4).exporta_tiempos()
T = m.T
W = m.W
_pon = m.pon
m.pon = lambda t, x, g=1.0, pan=0.0: _pon(t, x, g * .72, pan)      # el foley acompaña, no compite con la voz
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

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
    w = W[T(f, desde).i]
    return max(r[0] for r in TR if r[0] < w["e"] - .04)


def fin_real(f, desde=0):
    """Final real del tramo de voz que contiene la última palabra de la frase."""
    w = W[T(f, desde).i + len(f.split()) - 1]
    return min(r[1] for r in TR if r[1] > w["s"] + .04)


# ---------- el guion de acciones ----------
E = {}
# 0. Tu puesto: el rompecabezas cae y encaja; la bola aterriza y lo alcanza
E["piezas"] = [r3(.16 + k * .13) for k in range(6)]
E["bola"] = s("agente") - .2
E["tu"] = s("tu trabajo")
E["agarra"] = s("trabajo")
# 1. Remote Labor Index
E["examen"] = arr("hay un examen")
E["dinero"] = s("dinero")
E["rli"] = s("remote labor")
E["toma"] = s("toma proyectos")
E["sobres"] = [s("diseño"), s("video"), s("análisis")]
E["pregunta"] = arr("y hace una sola")
E["cliente"] = s("cliente")
E["pagaria"] = s("pagaría")
E["sin"] = s("sin objeciones")
E["sello"] = fin_real("objeciones") + .18
# 2. Las cifras
E["salio"] = arr("cuando salió")
E["d25"] = s("dos y medio")
E["proyectos"] = s("proyectos", T("dos y medio").i)
E["este"] = arr("hoy el mejor")
E["d21"] = s("veintiuno")
E["lecturas"] = arr("dos lecturas")
E["ciertas"] = s("ciertas")
E["una"] = arr("una casi")
E["ochenta"] = s("ochenta de cada cien")
E["nosirve"] = s("no sirven")
E["dos"] = arr("dos se multiplicó")
E["mult"] = s("multiplicó")
E["ocho"] = s("ocho")
E["enunaño"] = s("en un año", T("multiplicó").i)
# ocho bloques de 2.5 y medio más: 8.5 × 2.5 = 21.25. El octavo cae con «ocho», el medio justo después.
E["bloques"] = [r3(s("multiplicó") + k * (s("ocho") + .05 - s("multiplicó")) / 7) for k in range(8)] + [r3(e("ocho") + .12)]
# 3. OSWorld
E["os"] = arr("otra prueba")
E["osw"] = s("osworld")
E["usar"] = s("usar una computadora")
E["ventanas"] = [s("programas") - .05, s("y ventanas"), s("ventanas") + .12]
E["agentes"] = arr("al principio")
E["doce"] = s("doce")
E["persona"] = arr("una persona")
E["setenta"] = s("setenta y dos")
E["varios"] = arr("hoy varios")
E["pasan_m"] = s("pasan esa marca")
E["marca"] = s("marca")
E["usar2"] = arr("usar la computadora")
E["problema"] = s("problema")
# la bola maneja las ventanas sin errores: cinco clics, cinco palomitas
E["clics"] = [r3(E["usar2"] + .15 + k * (s("problema") + .1 - E["usar2"] - .15) / 4) for k in range(5)]
E["terminar"] = arr("terminar un trabajo")
E["pague"] = s("pague")
E["sello2"] = fin_real("pague") + .05
E["si"] = s("sí", T("pague").i)
# 4. El giro
E["hoy"] = arr("hoy un agente")
E["noreemp"] = s("no reemplaza")
E["completo"] = s("completo")
E["completo_e"] = fin_real("completo")
E["reemplaza"] = arr("reemplaza pedazos")
E["pedazos"] = s("pedazos")
E["muchos"] = s("muchos puestos")
E["quieres"] = arr("si quieres saber")
E["tuyo"] = s("tuyo")
E["nopreg"] = s("no preguntes")
E["quitar"] = s("quitar")
E["tacha"] = fin_real("el trabajo", T("quitar").i) + .05
# 5. Las cuatro esclusas
E["preg"] = arr("pregunta qué pedazos")
E["pedazos2"] = s("pedazos", T("pregunta qué").i)
E["pasan"] = s("pasan", T("pregunta qué").i)
E["cuatro"] = s("cuatro preguntas")
E["corre"] = fin_real("preguntas") + .12
E["esos"] = arr("esos ya no")
E["tuyos"] = s("tuyos")
E["fin"] = fin_real("son tuyos")
E["dur"] = m.dur

# Cada pieza intenta las esclusas: hasta cuál llega (4 = pasa todas). Orden en que se sueltan.
#   0 bocetos, 1 subtítulos, 2 tablas, 3 correo, 4 juntas, 5 decidir
ORDEN = [0, 3, 1, 4, 2, 5]
LLEGA = {0: 4, 1: 4, 2: 4, 3: 1, 4: 2, 5: 3}            # índice de la esclusa donde se atora (4 = ninguna)
PASO = .3                                                 # segundos entre esclusa y esclusa
corre = []
for n, k in enumerate(ORDEN):
    t0 = E["corre"] + n * .42
    corre.append({"pieza": k, "t0": r3(t0), "llega": LLEGA[k], "puertas": [r3(t0 + .35 + i * PASO) for i in range(4)]})
E["carrera"] = corre
E["gesto"] = r3(E["fin"] + .35)
# El ciclo de sellos del mostrador: uno cada .66 s; uno sale pagado justo cuando se dice «quince punto ocho».
E["ciclo"] = [r3(E["salio"] + .55 + k * .66) for k in range(40) if E["salio"] + .55 + k * .66 < E["lecturas"] - .9]
E["pagado"] = int(np.argmin([abs(q + .45 - E["d21"]) for q in E["ciclo"]]))
(RAIZ / "remotion/src/serie/a26/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print({k: v for k, v in E.items() if k not in ("carrera", "ciclo")})


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def carton(f=180):
    """Una pieza de cartón que cae y encaja."""
    return suma(golpe(f, f * .5, .16, .55) * .8, tic(.02, 1800, 6000) * .6, toc(f * 3.2) * .25)


def plop(f0=260, f1=820):
    t = np.arange(int(.12 * SR)) / SR
    f = f0 + (f1 - f0) * (t / .12) ** .7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * .7


def ding(f=784.0, dur=1.0):
    return campana((f, f * 1.5, f * 2), dur, (.6, .26, .12))


def sellazo():
    """Un sello de goma que cae con todo: golpe grave, chasquido y la madera del mostrador."""
    return suma(golpe(74, 36, .5, .9), tic(.025, 1500, 6000) * .8, golpe(140, 70, .12, .3) * .5)


def arruga(dur=.5):
    y = np.zeros(int(dur * SR))
    for _ in range(int(dur * 90)):
        i = int(rng.random() * (len(y) - 800))
        x = tic(.012, 1000, 8000) * rng.uniform(.2, .8)
        y[i:i + len(x)] += x
    return y


def moneda():
    return suma(campana((2637, 3951, 5274), .5, (.5, .3, .15)) * .6, tic(.01, 4000, 9000) * .5)


def zumbido(dur=.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 98 * t)) * .5 + np.sin(2 * np.pi * 196 * t) * .3
    return banda(x, 70, 1400) * np.minimum(t / .01, 1) * np.exp(-t * 2.5) * .55


def boing(f0=150, dur=.6):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .35 * np.exp(-t * 5) * np.sin(t * 38))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .8


def chirrido(dur=.6, f0=82, f1=128):
    """Compuerta de madera que sube: fricción con trinquete."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.geomspace(f0, f1, n) * (1 + .03 * np.sin(2 * np.pi * 7 * t))
    tono = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .25
    env = np.sin(np.pi * np.minimum(t / dur, 1)) ** .5
    y = banda(tono + ruido(n) * .5, 120, 1400) * env * .6
    for k in range(int(dur * 11)):
        i = int(k / 11 * SR)
        x = toc(700 + 60 * (k % 3)) * .18
        y[i:i + len(x)] += x[: n - i]
    return y


def pluma(dur=.32):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2200, 7000) * (np.sin(np.pi * t / dur) ** 2) * (1 + .5 * np.sin(2 * np.pi * 31 * t)) * .45


def teclas(dur):
    y = np.zeros(int((dur + .1) * SR))
    t = 0.0
    while t < dur:
        i = int(t * SR)
        x = suma(tic(.014, 2500, 7000) * rng.uniform(.4, 1), toc(rng.uniform(900, 1300)) * .15)
        y[i:i + len(x)] += x
        t += rng.uniform(.05, .13)
    return y


def enciende(dur=.5):
    t = np.arange(int(dur * SR)) / SR
    f = 120 + 900 * (t / dur) ** 2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) * .3 + banda(ruido(len(t)), 3000, 9000) * np.exp(-t * 9) * .1


def desenrolla(dur=.7):
    """Un cartel de papel que se desenrolla: soplo y papel corriendo."""
    return suma(soplo(dur, 700, 5200, .6) * .7, arruga(dur * .8) * .3)


def puja(dur):
    """La bola hace fuerza: un gruñido grave que tiembla y papeles que castañean."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 70 + 25 * t / dur + 6 * np.sin(2 * np.pi * 9 * t)
    x = banda(np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .3 + ruido(n) * .2, 60, 900) * np.minimum(t / .15, 1) * (.6 + .4 * t / dur)
    y = np.zeros(n)
    for k in range(int(dur * 22)):
        i = int(rng.uniform(0, max(dur - .05, .01)) * SR)
        s2 = tic(.01, 1800, 6000) * rng.uniform(.1, .35)
        y[i:i + len(s2)] += s2[: n - i]
    return x * .7 + y


def agua_papel(dur):
    """Cama de cuarto: un aire casi inaudible para que la imagen no flote en el vacío."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 200, 1600) * (.7 + .3 * np.sin(2 * np.pi * t / 4.3))


swish = lambda d=.7, lo=300, hi=2600: soplo(d, lo, hi, .45)

# ---------- 0. tu puesto ----------
m.pon(0.0, agua_papel(m.dur - 2.0), .02)
for k, t in enumerate(E["piezas"]):
    m.pon(t - .28, swish(.3, 900, 4000), .12, (k % 3 - 1) * .4)
    m.pon(t, carton(170 + 12 * k), .55, (k % 3 - 1) * .35)
for k, t in enumerate(rebotes(E["bola"], 1.5, .4)):
    m.pon(t, golpe(92, 44, .4, .25), .8 * .4 ** k, .35)
m.pon(E["bola"] - .15, swish(.4, 600, 3500), .2, .4)
m.pon(E["agarra"] - .1, papel(.25), .35, .3)
m.pon(E["agarra"] + .05, toc(420), .18, .3)
# ---------- 1. Remote Labor Index ----------
m.pon(E["examen"] - .3, swish(.9, 250, 3200), .35)
for k, t in enumerate(rebotes(E["examen"] + .3, 1.7, .4)):
    m.pon(t, golpe(92, 44, .4, .25), .75 * .4 ** k)
m.pon(E["dinero"] - .45, swish(.45, 500, 3000), .15, .4)
m.pon(E["dinero"], golpe(110, 55, .3, .6), .6, .4)
m.pon(E["dinero"] + .02, papel(.3), .4, .4)
m.pon(E["dinero"] + .1, soplo(1.4, 1200, 6000, .3), .16, .3)
m.pon(E["rli"] - .05, campana((392.0, 587.3), 1.4, (.5, .25)), .12)
llegan = [E["toma"] + .1 + i * (E["sobres"][0] - E["toma"] - .5) / 6 for i in range(6)] + [x - .2 for x in E["sobres"]]
for i, t in enumerate(llegan):
    m.pon(t - .45, swish(.45, 700, 4500), .1 if i < 6 else .2, -.4)
    m.pon(t, suma(papel(.18), tic(.02, 1500, 5000) * .5), .24 if i < 6 else .45, -.35)
m.pon(E["pregunta"] + .15, papel(.25), .4, -.2)
m.pon(E["pregunta"] + .3, swish(.7, 400, 2600), .22)
m.pon(E["pregunta"] + 1.0, suma(papel(.15), toc(520) * .5), .4, .1)
m.pon(E["cliente"] + .1, papel(.3), .2, .2)
m.pon(E["sin"] - .2, trazo(.55, 300, 700), .16, .2)
m.pon(E["sello"] - .12, swish(.15, 500, 3000), .3, .1)
m.pon(E["sello"], sellazo(), 1.0, .1)
m.pon(E["sello"] + .05, zumbido(.4), .3, .1)
m.pon(E["salio"] + .3, arruga(.45), .45, -.2)
m.pon(E["salio"] + .75, suma(papel(.12), golpe(150, 80, .1, .3) * .3), .3, -.3)
# ---------- 2. las cifras ----------
m.pon(E["salio"] + .35, desenrolla(.7), .45)
for j, t0 in enumerate(E["ciclo"]):
    pag = j == E["pagado"]
    pan = -.25
    m.pon(t0, swish(.32, 600, 4000), .08, pan)
    m.pon(t0 + .3, toc(560), .09, .05)
    m.pon(t0 + .45, banda(sellazo(), 60, 2500), .24 if not pag else .32, .1)
    if pag:
        m.pon(t0 + .5, ding(1046.5, 1.2), .35, .1)
        m.pon(t0 + .75, moneda(), .45, .2)
        m.pon(t0 + 1.0, swish(.5, 700, 3600), .18, -.3)
    else:
        m.pon(t0 + .7, arruga(.35), .16, -.2)
        m.pon(t0 + 1.05, papel(.1), .1, -.3)
m.pon(E["d25"] - .05, trazo(.55, 300, 360), .2)
m.pon(E["d21"] - .1, trazo(.9, 300, 700), .3)
m.pon(E["d21"] + .7, toc(660), .2)
m.pon(E["lecturas"] - .2, swish(1.2, 200, 1800), .25)
m.pon(E["una"], toc(440), .25)
m.pon(E["ochenta"] - .1, trazo(.85, 240, 720), .3)
m.pon(E["ochenta"] - .05, pluma(.8), .3)
m.pon(E["ochenta"] + .4, zumbido(.4), .22)
m.pon(E["dos"], toc(587), .25)
m.pon(E["dos"] + .1, swish(.8, 300, 2400), .3)
NOTAS = (523.3, 587.3, 659.3, 698.5, 784.0, 880.0, 987.8, 1046.5, 1174.7)
for j, t in enumerate(E["bloques"]):
    m.pon(t, suma(toc(NOTAS[j]), golpe(120, 60, .1, .2) * .4), (.4 if j else .25) * (.7 if j == 8 else 1))
m.pon(E["bloques"][8] + .1, campana((784.0, 1174.7, 1568.0), 1.6, (.5, .3, .15)), .3)
# ---------- 3. OSWorld ----------
m.pon(E["os"] - .35, swish(1.0, 250, 3200), .35)
for k, t in enumerate(rebotes(E["os"] - .2, 1.3, .4)):
    m.pon(t, golpe(92, 44, .4, .25), .7 * .4 ** k, -.3)
m.pon(E["osw"] - .1, enciende(.5), .4)
m.pon(E["usar"] - .1, teclas(E["ventanas"][2] + .5 - E["usar"]), .3, -.15)
for k, t in enumerate(E["ventanas"]):
    m.pon(t, suma(plop(300 + 80 * k, 900 + 100 * k), toc(700 + 60 * k) * .4), .4, .1 * k)
m.pon(E["agentes"] - .05, desenrolla(.65), .4)
m.pon(E["doce"] - .05, trazo(.5, 300, 380), .22)
m.pon(E["setenta"] - .15, trazo(.85, 280, 800), .28, .2)
m.pon(E["setenta"] + .55, toc(780), .2, .2)
m.pon(E["varios"] + .1, trazo(1.1, 300, 900), .32)
m.pon(E["marca"] - .05, campana((659.3, 987.8, 1318.5), 1.2, (.45, .25, .12)), .22)
m.pon(E["usar2"] - .45, desenrolla(.65)[::-1], .35)
for j, t in enumerate(E["clics"]):
    m.pon(t, soplo(.25, 1500, 5000, .5), .05, .2)
    m.pon(t + .26, tic(.015, 3000, 8000), .5, .2)
    m.pon(t + .28, ding(1046.5 * 2 ** (j / 12 * 2), .5), .15, .2)
m.pon(E["terminar"] + .05, swish(.5, 600, 3600), .2, .1)
m.pon(E["terminar"] + .3, papel(.25), .4)
m.pon(E["pague"] - .55, swish(.6, 250, 2000), .3, .5)
m.pon(E["sello2"] - .1, swish(.12, 500, 3000), .3, .3)
m.pon(E["sello2"], sellazo(), .95, .2)
m.pon(E["sello2"] + .05, zumbido(.4), .28, .2)
m.pon(E["si"] + .1, trazo(.5, 420, 260), .14)
# ---------- 4. el giro ----------
m.pon(E["hoy"] - .35, swish(1.0, 250, 3200), .35)
for k, t in enumerate(rebotes(E["hoy"] + .25, 1.4, .4)):
    m.pon(t, golpe(92, 44, .4, .25), .75 * .4 ** k, .3)
m.pon(E["noreemp"] + .2, puja(E["completo_e"] - E["noreemp"] - .25), .55, .25)
m.pon(E["completo_e"], suma(golpe(64, 32, .6, .6), carton(150) * .8), .9)
for k in range(5):
    m.pon(E["completo_e"] + .04 + k * .035, carton(200 + 20 * k), .18, (k - 2) * .2)
m.pon(E["pedazos"] - .05, plop(240, 900), .5, .2)
m.pon(E["pedazos"] + .05, campana((659.3, 987.8), 1.0, (.4, .2)), .2, .2)
m.pon(E["muchos"] - .55, swish(1.5, 180, 2200), .3)
ofi = [(x, y) for y in (0, 4.3, 8.6, 12.9) for x in (-4.7, 0, 4.7) if (x, y) != (0, 0)]
for x, y in ofi:
    d = float(np.hypot(x, y))
    m.pon(E["reemplaza"] + .1 + d * .045 + .3, suma(papel(.12), golpe(130, 70, .08, .3) * .3), .14, x / 6)
    m.pon(E["muchos"] - .1 + d * .05 + .2, plop(rng.uniform(250, 340), rng.uniform(800, 1100)), .22, x / 6)
m.pon(E["quieres"] + .1, swish(1.1, 220, 2000), .28)
m.pon(E["tuyo"] - .1, toc(360), .2, -.2)
m.pon(E["tacha"], pluma(.35), .7)
# ---------- 5. las cuatro esclusas ----------
for i in range(4):
    t = E["preg"] + .1 + i * .16
    m.pon(t, swish(.4, 200, 1400), .2, .3)
    m.pon(t + .3, golpe(80 - 5 * i, 40, .4, .15), .45, .3)
m.pon(E["pedazos2"], arruga(.5), .3)
for i in range(4):
    m.pon(E["corre"] - .45 + i * .06, chirrido(.3, 120, 70), .2, .3)
for k in range(6):
    m.pon(E["pedazos2"] + k * .06 + .2, carton(220 + 10 * k), .12, (k % 3 - 1) * .3)
NOTAS4 = (784.0, 987.8, 1174.7, 1568.0)


def pr(t, x, g=1.0, pan=0.0):
    """La carrera va más baja que el resto, y casi desaparece bajo «esos ya no son tuyos»."""
    k = .55 * (1 - .65 * float(np.clip((t - (E["esos"] - .5)) / .3, 0, 1)))
    m.pon(t, x, g * k, pan)


for R in E["carrera"]:
    pan = .3
    pr(R["t0"], toc(520), .22, .2)
    pr(R["t0"] + .02, swish(.35, 600, 3500), .16, .1)
    for i, tp in enumerate(R["puertas"]):
        if i < R["llega"]:
            pr(tp, ding(NOTAS4[i], .6), .15, pan)
        elif i == R["llega"]:
            pr(tp - .27, chirrido(.2, 140, 90), .22, pan)
            pr(tp - .1, golpe(90, 45, .3, .3), .45, pan)
            pr(tp - .04, golpe(110, 55, .2, .3), .35, pan)
            pr(tp + .8, carton(160), .35, -.1)
            break
    if R["llega"] >= 4:
        pr(R["puertas"][3] + .1, soplo(1.2, 900, 6000, .3), .12, .35)
for i in range(4):
    m.pon(E["fin"] + .1 + i * .08, swish(.6, 180, 1200), .07, .3)
m.pon(E["gesto"] + .3, suma(papel(.25), golpe(120, 60, .12, .1) * .4), .35)
m.pon(E["gesto"] + .45, papel(.25), .25, .1)
m.pon(E["fin"] + .55, campana((261.6, 392.0, 523.3), 3.0, (.6, .3, .15)), .3)

# ---------- música: entra en golpe (el pulso arranca en 16.0 de la pista). Al volver a tu escritorio salta a la
# pausa de la pista (46.0), así el drop de 48.0 cae justo cuando a la bola se le cae el rompecabezas. En la
# carrera de las esclusas pasa al final real de la pista: su último golpe (112.0) cae con el gesto de las manos
# y se apaga sola. ----------
J1 = E["completo_e"] + .05 - 2.0
J2 = E["corre"]
FIN_P = 112.0 - (E["gesto"] + .2)
m.musica([("a26_oficina", 16.0, 0, J1 + .25, .02, .25),
          ("a26_oficina", 46.0, J1, J2 + .3, .2, .3),
          ("a26_oficina", J2 + FIN_P, J2, m.dur, .3, .4)], nivel=-26.5)
m.cierra()
