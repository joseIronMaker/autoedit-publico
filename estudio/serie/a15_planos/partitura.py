"""a15: los planos. Circuitos de canicas de papel y madera clavados en un tablero perforado.

Abre con la bola con manos poniendo su propio riel a toda prisa delante de sí misma (agente); un lápiz traza una
rampa recta, la bola guarda las manos y baja sola a un vaso: lo más simple que funciona. Luego dos franjas: en la
de arriba tú dibujas el riel y la bola lo recorre; en la de abajo la bola decide y pone sus rieles, cada pieza
cuesta una moneda y el enredo final esconde la pieza rota. Caen cinco módulos de juguete que forman una torre y la
cámara baja por ella: encadenar, enrutar, paralelizar, orquestador y evaluador, cada uno con su tramo de riel y el
encargo de la fiesta. Se aleja: la torre y otras dos hechas con las mismas piezas. Se apagan todos menos dos. Al
final la bola, con una pila de rieles, frente a dos caminos: elige el trazado, guarda las manos y rueda al vaso.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"lo dice anthropic": .35, "porque hay dos": .3, "en un agente": .25, "más libertad": .2, "y casi todo": .3,
          "encadenar": .5, "enrutar": .45, "paralelizar": .4, "orquestador": .4, "y evaluador": .4, "si entiendes esas": .55,
          "la mayoría": .45, "y antes de armar": .35, "de verdad necesita": .5, "o solo necesitas": .3}
m = Mezcla("a15_planos", pausas=PAUSAS, cola=4.1).exporta_tiempos()
T = m.T
_pon = m.pon
m.pon = lambda t, x, g=1.0, pan=0.0: _pon(t, x, g * .68, pan)      # el foley iba a la par de la voz: 3.3 dB abajo
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
    """Arranque real del tramo de voz más cercano al inicio que Whisper le da a la palabra."""
    w = m.W[T(f, desde).i]
    return min(TR, key=lambda r: abs(r[0] - w["s"]))[0]


r3 = lambda x: round(float(x), 3)
E = {}

# ---------- 1. la bola pone su riel delante de sí (0 - 5) ----------
E["A1"] = [-.3, 1.2]                  # tramo 1 del zigzag (ya va rodando en el cuadro 0)
E["A2"] = [1.42, 2.72]
E["A3"] = [2.92, 3.4]
E["N"] = [7, 7, 4]                    # piezas de riel por tramo
E["frena"] = E["A3"][1]
E["lapiz"] = [arr("casi") + .02, arr("casi") + .42]
E["guarda"] = [s("no usarlos") - .02, e("usarlos") - .2]
E["rueda"] = [e("usarlos") - .15, e("usarlos") + .4]
E["vaso"] = E["rueda"][1]
E["hoja"] = arr("lo dice anthropic") - .2
E["nota1"] = s("lo más simple")
E["nota2"] = s("que funcione")
E["palomita"] = e("funcione") - .3

# ---------- 2. flujo y agente (9.8 - 23.5) ----------
E["giroB"] = arr("porque hay dos") - .12
E["dos"] = s("dos") - .05
E["flujo"] = s("flujo")
E["dibuja"] = [s("tú dibujas") - .05, e("camino") + .02]
E["engrosa"] = [E["dibuja"][1], E["dibuja"][1] + .35]
E["recorre"] = [s("el modelo") - .05, e("recorre") - .12]
E["agente"] = s("agente") - .05
E["arranca"] = s("agente") + .32
E["duda"] = [s("el camino", T("agente").i) + .02, s("decide") + .02]
E["decide"] = s("decide") + .02
E["bajaB"] = arr("más libertad") - .38
E["libre"] = s("libertad")
E["costo"] = [s("pero más costo") - .05, e("costo") + .1]
E["errores"] = s("errores")
E["lupa"] = [s("errores") + .25, e("encontrar") + .45]
# Las piezas del agente: cada 0.14 s salvo mientras duda.
paso = .14
piezasB, t = [], E["arranca"]
while t < E["lupa"][0] + .05:
    if not (E["duda"][0] < t < E["decide"]):
        piezasB.append(r3(t))
    t += paso
E["piezasB"] = piezasB
E["monedas"] = [x for x in piezasB if E["costo"][0] <= x <= E["costo"][1] + .2]
E["rota"] = r3(s("errores") - .08)

# ---------- 3. la torre (23.7 - 63.9) ----------
E["torre"] = arr("y casi todo") - .12
E["caen"] = [r3(x) for x in (s("todo") + .15, s("cinco") + .02, s("piezas") + .05, s("como un juego") + .02, s("juego") + .1)]   # M5..M1
E["zoom1"] = e("canicas") - .05
E["nombre"] = [r3(arr("encadenar")), r3(arr("enrutar")), r3(arr("paralelizar")), r3(arr("orquestador")), r3(arr("y evaluador") + .15)]
# M1: encadenar
E["m1"] = {
    "c1": [[e("canicas") + .25, arr("encadenar") + .05], [arr("encadenar") + .05, s("salida") + .02], [s("salida") + .02, s("entra") + .02],
           [s("entra") + .02, e("siguiente") - .2]],
    "c2": [[e("siguiente") - .05, s("lista") - .1], [s("lista") - .1, s("lista") + .45], [s("lista") + .45, s("invitaciones") - .1],
           [s("invitaciones") - .1, s("invitaciones") + .35]],
    "sale1": e("siguiente") - .2,
    "sale2": s("invitaciones") + .4,
    "lista": s("lista"),
    "invit": s("invitaciones"),
    "sobres": s("invitaciones") + .3,
}
E["zoom2"] = e("invitaciones") + .28
# M2: enrutar
E["m2"] = {
    "llega": [r3(arr("enrutar") + .48), r3(s("cada mensaje") + .05), r3(s("manda") - .1)],
    "mira": [r3(s("alguien") - .02), r3(s("mensaje") + .05), r3(s("manda") + .05)],
    "suelta": [r3(s("mira") + .25), r3(e("mensaje") - .05), r3(s("especialista") + .02)],
    "lleno": [],
}
for k in range(3):
    E["m2"]["lleno"].append(r3(E["m2"]["suelta"][k] + .78))
E["m2"]["sale"] = r3(E["m2"]["lleno"][2] + .55)
E["zoom3"] = e("correcto") - .08
# M3: paralelizar
E["m3"] = {"entra": r3(arr("paralelizar") + .12), "suelta": r3(s("varios") + .05), "llega": r3(s("varios") + 1.05),
           "lugar": s("lugar"), "pastel": s("pastel"), "musica": s("música"), "junta": r3(e("música") + .1)}
E["zoom4"] = e("música") + .42
# M4: orquestador
E["m4"] = {"atrapa": r3(arr("orquestador") + .05), "parte": r3(s("reparte") - .12),
           "lanza": [r3(s("reparte") + .02 + k * .2) for k in range(4)], "junta": s("junta"),
           "estira": r3(e("resultados") - .35), "vierte": r3(e("resultados") + .2)}
E["m4"]["copa"] = [r3(x + .9) for x in E["m4"]["lanza"]]
E["zoom5"] = e("resultados") + .3
# M5: evaluador
E["m5"] = {"atrapa": r3(arr("y evaluador") + .25), "hace": [r3(s("uno hace") - .1), r3(e("hace") - .05)], "tira": r3(e("hace") - .05),
           "revisa": r3(s("revisa") - .12), "tache": r3(e("revisa") - .12), "cae": r3(e("revisa") + .02),
           "sube": [r3(s("regresa") - .2), r3(s("hasta") + .02)], "vuelve": r3(s("que quede") - .05),
           "pule": [r3(s("que quede") + .05), r3(s("quede") + .02)], "tira2": r3(s("quede") + .05),
           "palomita": r3(e("bien") + .03), "sale": r3(e("bien") + .15)}
E["vista"] = r3(arr("si entiendes esas") - .5)
E["nombres"] = r3(s("entiendes esas") + .05)
E["otras"] = s("cualquier") - .1
E["presume"] = s("presuman")
E["apaga"] = arr("la mayoría")
E["apagan"] = [r3(s("problemas") - .1), r3(s("se resuelven") - .05), r3(s("resuelven") + .2)]  # M5, M4, M3
E["una"] = s("una", T("resuelven").i)
E["dos2"] = s("dos", T("resuelven").i)

# ---------- 4. la pregunta (63.9 - fin) ----------
E["antes"] = arr("y antes de armar")
E["enorme"] = s("enorme")
E["hazte"] = s("hazte")
E["deja"] = s("hazte") + .3
E["cara"] = s("más cara")
E["lapiz2"] = [e("industria") - .05, e("industria") + .55]
E["decidir"] = s("decidir")
E["solo"] = s("solo", T("decidir").i)
E["pasos0"] = arr("o solo necesitas")
E["siga"] = s("siga")
E["suelta"] = e("pasos") + .2
E["guarda2"] = [e("pasos") + .42, e("pasos") + .72]
_a = e("pasos") + .8
E["rueda2"] = [_a, _a + 1.45]
E["tramosD"] = [_a + x for x in (0, .3, .4, .66, .78, 1.08, 1.2, 1.36, 1.45)]   # repisa, cae, paso 1, cae, paso 2, cae, paso 3, cae al vaso
E["fin"] = E["rueda2"][1]
E["dur"] = r3(m.dur)


def redondea(x):
    if isinstance(x, dict):
        return {k: redondea(v) for k, v in x.items()}
    if isinstance(x, list):
        return [redondea(v) for v in x]
    return r3(x) if isinstance(x, float) else x


E = redondea(E)
(RAIZ / "remotion/src/serie/a15/eventos.json").write_text(json.dumps(E), encoding="utf-8")

# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def ping(f, dur=.5, amp=1.0):
    t = np.arange(int(dur * SR)) / SR
    p = sum(a * np.sin(2 * np.pi * f * k * t) * np.exp(-t * (9 + 6 * k)) for k, a in ((1, 1), (2.76, .5), (5.4, .25)))
    return p * np.minimum(t / .002, 1) * amp


def clac(f=900):
    """Pieza de riel de madera que cae en su sitio."""
    return suma(toc(f) * .8, tic(.02, 1500, 6000) * .7, golpe(160, 90, .1, .2) * .35)


def canica_vidrio():
    """Canica que cae en un vaso: dos golpecitos de vidrio."""
    a = ping(2350 * rng.uniform(.95, 1.05), .55)
    b = ping(3100, .35, .5)
    y = np.zeros(int(.7 * SR))
    y[: len(a)] += a
    i = int(.07 * SR)
    y[i:i + len(b)] += b[: len(y) - i]
    return y


def rodar(dur, brillo=1.0):
    """Canica rodando sobre papel y madera: ruido grave con traqueteo de juntas."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    base = banda(ruido(n), 120, 900) * .5 + banda(ruido(n), 1500, 4200 * brillo) * .12
    traq = .7 + .3 * np.sin(2 * np.pi * 23 * t) ** 2
    env = np.minimum(t / .04, 1) * np.minimum((dur - t) / .06, 1)
    return base * traq * env


def engrane(dur):
    """Caja que trabaja: tictac de engranes."""
    y = np.zeros(int((dur + .1) * SR))
    k = 0
    while k / 22 < dur:
        x = tic(.012, 900, 4200) * (.6 + .4 * (k % 2))
        i = int(k / 22 * SR)
        y[i:i + len(x)] += x[: len(y) - i]
        k += 1
    return y


def lapiz(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    g = banda(ruido(n), 2200, 7500) * (.55 + .45 * np.abs(np.sin(2 * np.pi * 7 * t)))
    return g * np.sin(np.pi * t / dur) ** .5 * .7


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def moneda():
    return suma(ping(3300 * rng.uniform(.95, 1.08), .45, .7), ping(4700, .3, .3), tic(.015, 3000, 8000) * .4)


def sello():
    return golpe(150, 70, .22, .9)


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def motor(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 90 + 60 * t / dur
    s_ = np.sin(2 * np.pi * np.cumsum(f) / SR) * .4 + banda(ruido(n), 300, 1400) * .25
    return s_ * np.minimum(t / .05, 1) * np.minimum((dur - t) / .08, 1)


def zumbido():
    """El revisor dice que no."""
    n = int(.32 * SR)
    t = np.arange(n) / SR
    return np.sign(np.sin(2 * np.pi * 110 * t)) * .25 * np.exp(-t * 6) + np.sin(2 * np.pi * 220 * t) * .2 * np.exp(-t * 7)


def clic():
    return suma(tic(.015, 2000, 7000), toc(1400) * .3)


def zip_(dur=.35, sube=False):
    n = int(dur * SR)
    f = np.geomspace(900, 300, n) if not sube else np.geomspace(300, 900, n)
    e_ = np.sin(np.linspace(0, np.pi, n)) ** 1.2
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .3 + banda(ruido(n), 1500, 5000) * .2) * e_


def tramo_rueda(a, b, g=.3, brillo=1.0):
    if b > a + .05:
        m.pon(a, rodar(b - a, brillo), g)


# ---------- 1. apertura ----------
m.pon(0.0, rodar(1.2, 1.1), .32)
m.pon(1.42, rodar(1.3, 1.1), .32)
m.pon(2.92, rodar(.48, 1.1), .3)
for j, (a, b) in enumerate((E["A1"], E["A2"], E["A3"])):
    n = E["N"][j]
    for i in range(n):
        ts = a + i * (b - a) / n - .1
        if ts > -.02:
            m.pon(max(ts, 0), clac(820 + 90 * (i % 3)), .42)
for tt in (E["A1"][1] + .2, E["A2"][1] + .18):
    m.pon(tt, golpe(120, 60, .25, .4), .45)
m.pon(E["frena"], soplo(.35, 600, 3000, .2), .25)
m.pon(E["frena"] + .05, golpe(90, 50, .2, .3), .3)
m.pon(E["lapiz"][0], lapiz(E["lapiz"][1] - E["lapiz"][0]), .5)
m.pon(E["guarda"][0], zip_(.4), .3)
tramo_rueda(E["rueda"][0], E["rueda"][1], .38)
m.pon(E["vaso"], canica_vidrio(), .55)
m.pon(E["vaso"], golpe(110, 60, .2, .2), .3)
m.pon(E["hoja"], soplo(.4, 500, 3000, .5), .25)
m.pon(E["hoja"] + .35, golpe(140, 70, .14, .6), .5)      # la chincheta
m.pon(E["nota1"] - .05, lapiz(.55), .3)
m.pon(E["nota2"] - .05, lapiz(.5), .3)
m.pon(E["palomita"], lapiz(.3), .35)
m.pon(E["palomita"] + .3, campana((880, 1318.5), .9, (.5, .25)), .14)

# ---------- 2. flujo y agente ----------
m.pon(E["giroB"], soplo(.55, 300, 2600, .3), .28)
for k in range(2):
    m.pon(E["dos"] + .25 + k * .09, golpe(110, 55, .25, .35), .45)
m.pon(E["dibuja"][0], lapiz(E["dibuja"][1] - E["dibuja"][0]), .5)
for k in range(5):
    m.pon(E["engrosa"][0] + k * .07, pop(), .28)
tramo_rueda(E["recorre"][0], E["recorre"][1], .34)
m.pon(E["recorre"][1] + .05, canica_vidrio(), .45)
m.pon(E["agente"], zip_(.3, True), .3)
for k, tt in enumerate(E["piezasB"]):
    m.pon(tt, clac(760 + 110 * (k % 4)), .3)
tramo_rueda(E["arranca"], E["duda"][0], .22)
tramo_rueda(E["decide"], E["lupa"][0] + .1, .22)
for k in range(3):
    m.pon(E["duda"][0] + .05 + k * .14, trazo(.25, 500 + 120 * k, 700 + 120 * k), .08)
m.pon(E["decide"], toc(620), .35)
m.pon(E["bajaB"], soplo(.7, 250, 2000, .4), .18)
for tt in E["monedas"]:
    m.pon(tt + .05, moneda(), .3)
m.pon(E["rota"], golpe(180, 90, .15, .6), .4)
m.pon(E["rota"] + .1, clac(500), .3)
m.pon(E["lupa"][0], soplo(1.2, 500, 2600, .5), .14)

# ---------- 3. la torre ----------
m.pon(E["torre"], soplo(.8, 200, 2000, .35), .3)
for k, tt in enumerate(E["caen"]):
    m.pon(tt - .25, soplo(.28, 800, 4000, .8), .12)
    m.pon(tt, golpe(88 - k * 3, 44, .42, .35), .62)
    m.pon(tt, clac(560 + 40 * k), .35)
m.pon(E["zoom1"], soplo(1.0, 300, 3000, .55), .22)
M1 = E["m1"]
for c_ in ("c1", "c2"):
    tramos = M1[c_]
    m.pon(tramos[0][0] + .35, golpe(140, 80, .12, .4), .3)            # cae en el embudo
    m.pon(tramos[1][0] - .05, toc(400), .3)                            # entra a la caja 1
    m.pon(tramos[1][0], engrane(tramos[1][1] - tramos[1][0] - .05), .3)
    m.pon(tramos[2][0], pop(), .35)                                    # sale con su lista
    tramo_rueda(tramos[2][0] + .05, tramos[2][1] - .1, .28)
    m.pon(tramos[3][0] - .03, toc(400), .3)
    m.pon(tramos[3][0], engrane(tramos[3][1] - tramos[3][0] - .05), .3)
for tt in (M1["sale1"], M1["sale2"]):
    m.pon(tt, pop(), .35)
    tramo_rueda(tt + .05, tt + .95, .26)
m.pon(M1["lista"], lapiz(.5), .25)
m.pon(M1["invit"], lapiz(.6), .25)
for k in range(6):
    m.pon(M1["sobres"] + k * .06, papel(.22), .3)
m.pon(E["zoom2"], soplo(.6, 300, 2400, .4), .18)
M2 = E["m2"]
for k in range(3):
    m.pon(M2["llega"][k] - .3, golpe(140, 80, .1, .4), .25)
    m.pon(M2["llega"][k], toc(520), .3)
    m.pon(M2["mira"][k], trazo(.35, 600, 900), .08)
    m.pon(M2["suelta"][k], clac(980 - 160 * k), .45)
    m.pon(M2["suelta"][k] + .02, clic(), .4)
    tramo_rueda(M2["suelta"][k] + .08, M2["lleno"][k] - .02, .26)
    m.pon(M2["lleno"][k], toc(700 + 130 * k), .4)
    m.pon(M2["lleno"][k] + .02, campana((1046.5 + 130 * k,), .5, (.4,)), .1)
m.pon(E["zoom3"], soplo(.6, 300, 2400, .4), .18)
M3 = E["m3"]
m.pon(M3["entra"] + .2, golpe(130, 70, .15, .4), .35)
m.pon(M3["entra"] + .25, engrane(M3["suelta"] - M3["entra"] - .3), .2)
for k in range(3):
    m.pon(M3["suelta"] + k * .015, clac(700 + 100 * k), .38, (k - 1) * .5)
    m.pon(M3["suelta"] + .05, rodar(M3["llega"] - M3["suelta"] - .1), .14, (k - 1) * .6)
    m.pon(M3["llega"] + k * .015, toc(560 + 80 * k), .32, (k - 1) * .5)
m.pon(M3["llega"] + .05, engrane(M3["junta"] - M3["llega"] - .1), .16)
for k, tt in enumerate((M3["lugar"], M3["pastel"], M3["musica"])):
    m.pon(tt, pop(), .38, (k - 1) * .5)
    m.pon(tt + .05, lapiz(.35), .18, (k - 1) * .5)
m.pon(M3["musica"] + .1, campana((783.99, 987.77), .8, (.35, .2)), .1, .5)
m.pon(M3["junta"], clac(640), .35)
tramo_rueda(M3["junta"] + .05, M3["junta"] + .6, .28)
m.pon(E["zoom4"], soplo(.6, 300, 2400, .4), .18)
M4 = E["m4"]
m.pon(M4["atrapa"], golpe(120, 60, .2, .3), .45)
m.pon(M4["parte"], suma(golpe(260, 120, .1, .8), tic(.04, 1500, 6000)), .5)
for k, tt in enumerate(M4["lanza"]):
    m.pon(tt, soplo(.25, 900, 4000, .3), .2, (k - 1.5) * .4)
    m.pon(tt + .18, toc(600 + 70 * k), .3, (k - 1.5) * .4)
    m.pon(tt + .2, rodar(.65), .12, (k - 1.5) * .4)
for k, tt in enumerate(M4["copa"]):
    m.pon(tt, ping(2600 + 150 * k, .45, .8), .3)
m.pon(M4["estira"], zip_(.35, True), .3)
m.pon(M4["vierte"], canica_vidrio(), .4)
m.pon(M4["vierte"] + .02, golpe(120, 60, .2, .3), .3)
m.pon(E["zoom5"], soplo(.6, 300, 2400, .4), .18)
M5 = E["m5"]
m.pon(M5["atrapa"], golpe(120, 60, .2, .3), .4)
m.pon(M5["hace"][0], papel(M5["hace"][1] - M5["hace"][0]), .5)
m.pon(M5["hace"][0] + .25, papel(.3), .4)
m.pon(M5["tira"], soplo(.25, 900, 4000, .3), .2)
tramo_rueda(M5["tira"] + .1, M5["revisa"], .26)
m.pon(M5["revisa"], trazo(.3, 600, 900), .08)
m.pon(M5["tache"], sello(), .6)
m.pon(M5["tache"] + .05, zumbido(), .35)
m.pon(M5["cae"], clic(), .4)
m.pon(M5["cae"] + .1, toc(300), .35)
m.pon(M5["sube"][0], motor(M5["sube"][1] - M5["sube"][0]), .3)
m.pon(M5["sube"][1], clic(), .35)
tramo_rueda(M5["sube"][1] + .05, M5["vuelve"], .24)
m.pon(M5["pule"][0], soplo(.25, 2000, 7000, .5), .3)
m.pon(M5["tira2"], soplo(.2, 900, 4000, .3), .2)
tramo_rueda(M5["tira2"] + .05, M5["palomita"] - .05, .26)
m.pon(M5["palomita"], sello(), .5)
m.pon(M5["palomita"] + .05, campana((1046.5, 1568), .9, (.5, .25)), .2)
tramo_rueda(M5["sale"], M5["sale"] + .45, .26)
m.pon(E["vista"], soplo(1.2, 200, 1800, .55), .25)
for k in range(5):
    m.pon(E["nombres"] + k * .2, toc(500 + 60 * k), .22)
m.pon(E["otras"], soplo(.8, 300, 2000, .5), .2)
for k in range(6):
    m.pon(E["otras"] + .25 + k * .1, golpe(100, 50, .25, .3), .3, (-1) ** k * .5)
for k in range(8):
    m.pon(E["presume"] + k * .06, clac(900 + 60 * k), .18, (k % 3 - 1) * .5)
m.pon(E["apaga"], golpe(56, 30, .9, .05), .38)
for tt in E["apagan"]:
    m.pon(tt, clic(), .4)
    m.pon(tt + .02, golpe(70, 36, .4, .1), .2)
m.pon(E["una"], campana((659.3,), .9, (.6,)), .06)
m.pon(E["dos2"], campana((987.8,), .9, (.6,)), .06)

# ---------- 4. la pregunta ----------
m.pon(E["antes"] - .25, soplo(.9, 200, 2000, .5), .25)
m.pon(E["enorme"], trazo(.9, 220, 440), .2)
m.pon(E["enorme"] + .1, lapiz(.7), .2)
for k in range(6):
    m.pon(E["antes"] + .5 + k * .3, clac(700 + 50 * (k % 2)), .08)                # la pila se tambalea
m.pon(E["deja"], golpe(110, 55, .3, .4), .55)
m.pon(E["deja"] + .05, clac(640), .4)
for k in range(3):
    d_ = (E["lapiz2"][1] - E["lapiz2"][0]) / 3
    m.pon(E["lapiz2"][0] + k * d_, lapiz(d_ * .9), .45)
for k in range(4):
    m.pon(E["lapiz2"][1] + k * .07, pop(), .22)
m.pon(E["decidir"] - .1, soplo(.6, 500, 2600, .5), .16)
for k in range(3):
    m.pon(E["decidir"] + .1 + k * .2, trazo(.3, 500 + 150 * k, 760 + 150 * k), .07)
m.pon(E["siga"], trazo(.6, 300, 600), .14)
m.pon(E["suelta"] + .18, clac(620), .45)
m.pon(E["guarda2"][0], zip_(.35), .3)
TD = E["tramosD"]
for a_, b_ in ((TD[0], TD[1]), (TD[2], TD[3]), (TD[4], TD[5]), (TD[6], TD[7])):
    tramo_rueda(a_, b_, .26)
for x_ in (TD[2], TD[4], TD[6]):
    m.pon(x_, golpe(120, 60, .25, .4), .32)
    m.pon(x_, clac(700), .22)
m.pon(E["fin"], canica_vidrio(), .42)
m.pon(E["fin"], golpe(100, 55, .3, .2), .26)
m.pon(E["fin"] + .02, campana((261.6, 392, 523.3), 2.6, (.7, .35, .2)), .22)

# ---------- música: el circuito suena hasta que se apaga; la última parte cierra donde cae la bola ----------
# Los nombres de los cinco patrones se oyen limpios: el foley baja 9 dB debajo de cada uno (la música no se toca).
for f_ in ("encadenar", "enrutar", "paralelizar", "orquestador", "evaluador"):
    a_, b_ = arr(f_) - .08, e(f_) + .08
    i0, i1, r_ = int(a_ * SR), int(b_ * SR), int(.06 * SR)
    env = np.ones(i1 - i0 + 2 * r_)
    env[:r_] = np.linspace(1, .35, r_); env[r_:-r_] = .35; env[-r_:] = np.linspace(.35, 1, r_)
    m.fx[i0 - r_:i1 + r_] *= env[:, None]

FIN_PISTA = 112.0                                    # ahí la pista hace su propio final
inicio3 = FIN_PISTA - (E["fin"] - (E["antes"] - .2))
m.musica([("a15_planos", 44.0, 0, E["apaga"] - .02, .03, .25),
          ("a15_planos", 3.0, E["apaga"] + .25, E["antes"] - .2, .6, .4),
          ("a15_planos", inicio3, E["antes"] - .2, m.dur, .45, 1.6)], nivel=-26.5)
m.cierra()
print(json.dumps({k: v for k, v in E.items() if k not in ("piezasB",)}, ensure_ascii=False))
