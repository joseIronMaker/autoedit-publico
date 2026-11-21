"""a21: las cuatro preguntas. Un canal de agua de papel con cuatro esclusas en fila; cada tarea es un barquito
de papel con la bola con manos encima, y cada esclusa es una pregunta con su compuerta y su seña:
1 una palomita que se puede marcar, 2 una flecha de regreso, 3 un marco con bordes, 4 una balanza.

Abre con dos letreros de vendedor ("hacen todo" / "no sirven para nada") que se rompen y caen al agua; del agua
suben las cuatro compuertas. Cada ejemplo del guion pasa por su esclusa: el programa corre y se palomea, el
consejo de vida se queda flotando sin palomita; el archivo pasa y regresa, el pago se va río abajo, el correo
sale volando y el respaldo se quema; la mesa para doce cabe en el marco y el negocio se desborda; las tías pesan
poco en la balanza y el diagnóstico la tumba. Luego se usan: el barco del error de código pasa las cuatro con luz
verde, el del dinero de la empresa se atora en la segunda con luz roja. Cuatro luces verdes contra una roja.
Cierra con el agente en la orilla: la regla que mide qué tan inteligente es se tacha, el barco lleva una etiqueta
de precio y se hunde sin ruido; la etiqueta queda flotando.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"uno se puede": .35, "un consejo": .4, "un pago": .5, "no tres": .3, "haz crecer": .35,
          "cuatro quién paga": .3, "si se equivoca en un": .35, "ahora úsalas": .4, "mover el dinero": .5,
          "cuatro veces": .3, "en los siguientes": .3, "la pregunta nunca": .4}
m = Mezcla("a21_preguntas", pausas=PAUSAS, cola=3.6).exporta_tiempos()
T = m.T
W = m.W
_pon = m.pon
m.pon = lambda t, x, g=1.0, pan=0.0: _pon(t, x, g * .72, pan)      # el foley acompaña, no compite con la voz
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)


def palabra(frase, k):
    """Inicio de la k-ésima palabra de una frase (para los «no» sueltos)."""
    return W[T(frase).i + k]["s"]


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


# ---------- el guion de acciones ----------
E = {}
# 0. Los vendedores
E["slam1"] = .26
E["grito1"] = s("hacen todo")
E["slam2"] = s("otros") - .12
E["grito2"] = s("no sirven")
E["grieta"] = s("falsas") + .02
E["rompe"] = e("falsas") - .15                    # Whisper estira «falsas»: la voz real acaba ~.28 s antes
E["chap"] = [r3(E["rompe"] + .62), r3(E["rompe"] + .76)]
E["surgen"] = [r3(s("cuatro preguntas") - .05 + k * .24) for k in range(4)]
E["zarpa"] = s("en cualquier caso")
# 1. ¿Se puede comprobar?
E["uno"] = arr("uno se puede")
E["prog"] = s("programa")
E["corre"] = s("corre")
E["tick"] = e("no corre") + .02
E["abre1"] = E["tick"] + .45
E["cierra1"] = s("un consejo") - .05
E["entraB"] = s("un consejo") - .95
E["galleta"] = s("de vida")
E["duda"] = arr("no se puede comprobar")
E["interroga"] = s("comprobar", T("consejo").i) + .1
# 2. ¿Se puede deshacer?
E["dos"] = arr("dos se puede")
E["cambio"] = s("cambio")
E["abre2"] = s("en un archivo") - .1
E["regresa"] = [s("se regresa"), e("se regresa") + .25]
E["entraD"] = E["regresa"][1] + .05
E["pago"] = s("pago")
E["correo"] = s("correo")
E["borrar"] = s("borrar")
E["no2"] = palabra("respaldo no", 1)
# 3. ¿Está bien delimitado?
E["tres"] = arr("tres está")
E["doce"] = s("para doce")
E["claro"] = s("es claro")
E["entraF"] = s("haz crecer") - .6
E["crece"] = [s("crecer"), s("negocio") + .35]
E["no3"] = palabra("negocio no", 1)
# 4. ¿Quién paga si falla?
E["cuatro"] = arr("cuatro quién")
E["fiesta"] = s("tu fiesta")
E["equivoca1"] = s("equivoca") + .05
E["tias"] = [r3(s("enojan")), r3(s("tus", T("enojan").i)), r3(s("tías"))]
E["diag"] = s("diagnóstico")
E["golpe"] = s("diagnóstico") + .38
E["otra"] = s("otra cosa")
# 5. Úsalas
E["ahora"] = arr("ahora úsalas")
E["lamparas"] = [r3(E["ahora"] + .55 + k * .13) for k in range(4)]
E["entraH"] = s("arreglar") - .35
E["v"] = [r3(s("se comprueba") + .15), r3(s("se deshace") + .15), r3(s("está delimitado") + .25), r3(s("adelante") + .05)]
E["mover"] = s("mover")
E["i1"] = s("dinero") + .2
E["dno"] = palabra("solo no", 1)
# 6. La regla
E["regla"] = s("cuatro veces")
E["trabajar"] = s("déjalo")
E["unno"] = s("un no")
E["revisa"] = s("revisa")
# 7. Lo que viene
E["sig"] = arr("en los siguientes")
E["impres"] = s("impresionante")
# 8. La pregunta de fondo
E["preg"] = arr("la pregunta nunca")
E["intel"] = s("inteligente")
E["tacha"] = palabra("inteligente es", 1)
E["caro"] = s("caro")
E["sale"] = e("sale")
E["cuando"] = arr("cuando se equivoca")
E["equivoca"] = s("equivoca", T("cuando").i)
E["fin"] = e("cuando se equivoca")
E["remate"] = E["fin"] + .45
E["dur"] = m.dur
(RAIZ / "remotion/src/serie/a21/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def rasgon(dur=.42):
    """Cartón que se rasga: crujido que se acelera."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    craq = (np.sin(2 * np.pi * (30 + 220 * t / dur) * t) > .05).astype(float)
    return suma(banda(ruido(n), 900, 8000) * craq * np.sin(np.pi * t / dur) ** .5 * .9, golpe(140, 70, .12, .4) * .3)


def chapuzon(tam=1.0):
    """Algo cae al agua: golpe hueco, salpicadura y gotas."""
    n = int((.5 + .3 * tam) * SR)
    t = np.arange(n) / SR
    sal = banda(ruido(n), 350, 5200) * np.exp(-t * (11 - 3 * tam)) * np.minimum(t / .006, 1)
    hueco = golpe(95 - 25 * tam, 42, .3, .05) * .6
    return suma(sal * .9, hueco, lluvia(.5, 26) * .5)


def plop(f0=260, f1=820):
    t = np.arange(int(.12 * SR)) / SR
    f = f0 + (f1 - f0) * (t / .12) ** .7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * .7


def chirrido(dur=.75, f0=82, f1=128):
    """Compuerta que sube: fricción de madera con trinquete."""
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


def gotas(dur=.9):
    return banda(lluvia(dur, 16), 700, 6000) * .8


def ding(f=784.0, dur=1.0):
    return campana((f, f * 1.5, f * 2), dur, (.6, .26, .12))


def zumbido(dur=.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 98 * t)) * .5 + np.sin(2 * np.pi * 196 * t) * .3
    return banda(x, 70, 1400) * np.minimum(t / .01, 1) * np.exp(-t * 2.5) * .55


def pluma(dur=.32):
    """Palomita a tinta: rasguño corto y seco."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2200, 7000) * (np.sin(np.pi * t / dur) ** 2) * (1 + .5 * np.sin(2 * np.pi * 31 * t)) * .45


def engrane(dur=.9, hz=18):
    y = np.zeros(int((dur + .1) * SR))
    for k in range(int(dur * hz)):
        i = int(k / hz * SR)
        x = suma(toc(1300 + 90 * (k % 2)) * .4, tic(.012, 3000, 8000) * .5)
        y[i:i + len(x)] += x
    return y


def crujido():
    """La galleta se quiebra."""
    y = np.zeros(int(.3 * SR))
    for k in range(9):
        i = int(rng.uniform(0, .16) * SR)
        x = tic(.018, 1200, 6500) * rng.uniform(.4, 1)
        y[i:i + len(x)] += x
    return y


def rebobina(dur=.65):
    return suma(soplo(dur, 500, 5000, .8)[::-1] * .8, trazo(dur, 900, 280) * .4)


def moneda():
    return suma(campana((2637, 3951, 5274), .5, (.5, .3, .15)) * .6, tic(.01, 4000, 9000) * .5)


def vuelo(dur=.8):
    return soplo(dur, 900, 5200, .25) * .9


def fuego(dur=1.2):
    """Se prende el papel: soplo grave y chasquidos."""
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


def infla(dur=1.0):
    return suma(trazo(dur, 180, 520) * .55, banda(ruido(int(dur * SR)), 300, 1600) * np.linspace(0, .25, int(dur * SR)))


def arruga(dur=.5):
    y = np.zeros(int(dur * SR))
    for _ in range(int(dur * 90)):
        i = int(rng.random() * (len(y) - 800))
        x = tic(.012, 1000, 8000) * rng.uniform(.2, .8)
        y[i:i + len(x)] += x
    return y


def pip(f=1700):
    t = np.arange(int(.09 * SR)) / SR
    fr = f * (1 - .35 * t / .09)
    return np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 30) * .6


def pesa():
    return suma(golpe(46, 24, 1.2, .2), campana((180, 271, 405), .7, (.35, .2, .1)) * .5)


def chillido():
    """Retroalimentación de megáfono antes del grito."""
    n = int(.2 * SR)
    t = np.arange(n) / SR
    f = 1900 + 500 * t / .2
    return banda(np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * ruido(n), 1200, 4200) * np.sin(np.pi * t / .2) * .25


def burbujas(dur=1.6, n=9):
    y = np.zeros(int((dur + .2) * SR))
    for k in range(n):
        i = int((k / n) ** .8 * dur * SR)
        x = plop(rng.uniform(220, 380), rng.uniform(600, 1100)) * rng.uniform(.25, .6) * (1 - k / n * .6)
        y[i:i + len(x)] += x
    return y


def agua(dur):
    """Cama de agua corriendo: casi no se oye, pero la imagen deja de flotar en el vacío."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    am = .65 + .2 * np.sin(2 * np.pi * t / 3.7) + .15 * np.sin(2 * np.pi * t / 1.9 + 1)
    return banda(ruido(n), 160, 1100) * am


def swish(dur=.7, lo=300, hi=2600):
    return soplo(dur, lo, hi, .45)


# ---------- 0. vendedores ----------
m.pon(0.0, banda(agua(m.dur - 2.0), 120, 700), .016)
m.pon(0.0, swish(.3, 500, 3200), .2)
m.pon(E["slam1"], golpe(118, 58, .32, .7), .75)
m.pon(E["slam1"] + .01, papel(.2), .4)
m.pon(E["slam1"] + .06, chapuzon(.4), .22)
m.pon(.02, chillido(), .12)
m.pon(E["grito1"] + .05, swish(.5, 600, 3000), .12)
m.pon(E["slam2"] - .18, swish(.25, 500, 3000), .2)
m.pon(E["slam2"], golpe(104, 52, .34, .75), .78)
m.pon(E["slam2"] + .03, toc(330), .4)
m.pon(E["slam2"] + .06, chapuzon(.4), .2)
m.pon(E["grieta"], suma(tic(.02, 1500, 5000), golpe(150, 80, .08, .6) * .4), .35)
for k, t in enumerate((E["rompe"], E["rompe"] + .12)):
    m.pon(t, rasgon(.36), .5, (-.4, .4)[k])
for k, t in enumerate(E["chap"]):
    m.pon(t, banda(chapuzon(1.0), 60, 2200), .45, (-.35, .35)[k])
for k, t in enumerate(E["surgen"]):
    m.pon(t - .05, swish(.45, 150, 1200), .3)
    m.pon(t + .12, golpe(72 - 4 * k, 36, .45, .15), .55)
    m.pon(t + .16, gotas(.9), .22)
m.pon(E["zarpa"], swish(1.2, 200, 1400), .25)
# ---------- 1. comprobar ----------
m.pon(E["uno"] - .2, swish(.9, 250, 1800), .22)
m.pon(E["prog"] - .1, papel(.22), .35)
m.pon(E["prog"] + .15, toc(520), .25)
m.pon(E["corre"], banda(engrane(.5), 200, 2600), .2)
m.pon(E["tick"], pluma(.3), .8)
m.pon(E["tick"] + .28, ding(1046.5, 1.0), .2)
m.pon(E["abre1"], chirrido(.75), .5)
m.pon(E["abre1"] + .3, gotas(1.1), .25)
m.pon(E["abre1"] + .55, swish(1.4, 200, 1500), .25)
m.pon(E["cierra1"] + .45, golpe(62, 30, .5, .2), .5)
m.pon(E["cierra1"] + .47, chapuzon(.6), .3)
m.pon(E["entraB"], swish(1.0, 200, 1300), .22)
m.pon(E["galleta"], crujido(), .6)
m.pon(E["galleta"] + .12, papel(.3), .35)
m.pon(E["duda"] + .1, toc(300), .22)
m.pon(E["duda"] + .45, toc(270), .18)
m.pon(E["interroga"], boing(240, .5), .22)
# ---------- 2. deshacer ----------
m.pon(E["dos"] - .2, swish(.9, 250, 1800), .22)
m.pon(E["dos"] + .3, swish(1.0, 200, 1300), .18)
m.pon(E["cambio"] + .02, pluma(.45), .65)
m.pon(E["abre2"], chirrido(.7), .45)
m.pon(E["abre2"] + .35, swish(.8, 250, 1500), .22)
m.pon(E["regresa"][0], banda(rebobina(.75), 150, 1600), .32)
m.pon(E["regresa"][0] + .7, ding(880, .8), .14)
m.pon(E["entraD"], swish(1.0, 200, 1300), .2)
m.pon(E["pago"], moneda(), .4)
m.pon(E["pago"] + .42, plop(), .5)
m.pon(E["pago"] + .5, swish(1.1, 300, 1600), .2)
m.pon(E["correo"], vuelo(.9), .45, .3)
m.pon(E["borrar"], fuego(1.4), .55, -.2)
m.pon(E["no2"] - .05, rebobina(.35), .35)
m.pon(E["no2"] + .22, chasquido(), .7)
m.pon(E["no2"] + .4, golpe(58, 28, .6, .2), .6)
m.pon(E["no2"] + .42, chapuzon(.7), .35)
# ---------- 3. delimitado ----------
m.pon(E["tres"] - .2, swish(.9, 250, 1800), .22)
m.pon(E["tres"] + .2, swish(1.0, 200, 1300), .18)
for k in range(4):
    m.pon(E["doce"] + k * .07, toc(620 + 40 * k), .2)
m.pon(E["claro"], ding(1046.5, 1.0), .2)
m.pon(E["claro"] + .05, chirrido(.7), .42)
m.pon(E["claro"] + .4, swish(1.0, 250, 1500), .2)
m.pon(E["entraF"], swish(.9, 200, 1300), .18)
m.pon(E["crece"][0], infla(E["crece"][1] - E["crece"][0]), .45)
m.pon(E["crece"][1] - .1, golpe(130, 65, .2, .4), .45)
m.pon(E["no3"], arruga(.6), .55)
m.pon(E["no3"] + .05, zumbido(.35), .3)
m.pon(E["no3"] + .2, chapuzon(.6), .3)
# ---------- 4. quién paga ----------
m.pon(E["cuatro"] - .2, swish(.9, 250, 1800), .22)
m.pon(E["cuatro"] + .2, swish(1.0, 200, 1300), .18)
m.pon(E["equivoca1"] + .5, suma(golpe(150, 80, .12, .3), banda(ruido(int(.2 * SR)), 200, 2400) * np.exp(-np.arange(int(.2 * SR)) / SR * 22)), .45)
for k, t in enumerate(E["tias"]):
    m.pon(t + .22, pip(1600 + 220 * k), .35, -.3)
    m.pon(t + .25, toc(880 + 60 * k), .14, -.3)
m.pon(E["diag"] + .05, swish(.35, 200, 1500), .35)
m.pon(E["golpe"], pesa(), .85)
m.pon(E["golpe"] + .08, golpe(70, 34, .5, .3), .4)
for k in range(3):
    m.pon(E["golpe"] + .12 + k * .05, pip(2100 + 150 * k), .16, -.4)
# ---------- 5. úsalas ----------
m.pon(E["ahora"] - .25, swish(1.4, 180, 2400), .32)
for k, t in enumerate(E["lamparas"]):
    m.pon(t, toc(660 + 70 * k), .25)
m.pon(E["entraH"], swish(1.0, 200, 1300), .2)
NOTAS = (784.0, 987.8, 1174.7, 1568.0)
for k, t in enumerate(E["v"]):
    m.pon(t, ding(NOTAS[k], .9), .22 if k < 3 else .13)
    m.pon(t + .05, chirrido(.55), .3 if k < 3 else .16)
m.pon(E["v"][3] + .6, swish(1.4, 220, 1600), .16)
m.pon(E["mover"] - .2, swish(1.0, 200, 1300), .2)
m.pon(E["i1"], ding(784.0, .8), .2)
m.pon(E["i1"] + .05, chirrido(.55), .28)
m.pon(E["dno"] - .02, golpe(96, 48, .35, .6), .7)
m.pon(E["dno"] + .02, zumbido(.42), .42)
# ---------- 6. regla ----------
for k in range(4):
    m.pon(E["regla"] + k * .1, ding(NOTAS[k], .7), .18)
m.pon(E["trabajar"], swish(1.2, 250, 1800), .2)
m.pon(E["unno"], zumbido(.4), .4)
m.pon(E["revisa"] - .1, swish(.8, 300, 2400), .22)
# ---------- 7. lo que viene ----------
m.pon(E["sig"] - .2, swish(1.6, 180, 2000), .3)
for k in range(4):
    m.pon(E["sig"] + .5 + k * .32, chapuzon(.3), .14, (k / 1.5 - 1) * .4)
m.pon(E["impres"], campana((523.3, 659.3, 784.0), 1.4, (.4, .25, .12)), .14)
# ---------- 8. la pregunta de fondo ----------
m.pon(E["preg"] - .15, swish(1.1, 200, 1600), .25)
m.pon(E["intel"] - .1, trazo(.75, 300, 900), .2)
m.pon(E["tacha"], pluma(.28), .7)
m.pon(E["caro"] - .05, papel(.3), .4)
m.pon(E["caro"] + .25, toc(760), .18)
m.pon(E["sale"] + .1, chirrido(.6, 60, 52), .12)
m.pon(E["cuando"] - .1, burbujas(2.0, 10), .32)             # se hunde sin hacer ruido: solo burbujas
m.pon(E["remate"], plop(200, 520), .25)
m.pon(E["remate"] + .05, campana((130.8, 196.0, 261.6), 2.8, (.7, .35, .18)), .32)

# ---------- música: entra en golpe, salta 16 s atrás (un compás múltiplo exacto) bajo la subida de cámara,
# así el respiro de la pista cae en «La pregunta nunca fue…» y se apaga con el barco ----------
S = E["ahora"] - .25
m.musica([("a21_preguntas", 20.13, 0, S + .3, .02, .3),
          ("a21_preguntas", S + 4.13, S, m.dur, .3, m.dur - E["cuando"] + .3)])
m.cierra()
print({k: v for k, v in E.items()})
