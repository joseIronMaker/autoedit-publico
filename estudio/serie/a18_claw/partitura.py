"""a18: el claw. Un teléfono de papel cae en la mesa y de su pantalla sale una garra de alambre que chasquea.
Peter Steinberger (solo su nombre escrito) lo sube a internet: el teléfono flota hasta un letrero donde los
nombres se escriben y se tachan al compás de la voz (Warelay → Clawdbot → Moltbot → OpenClaw); el de Clawdbot lo
tacha una mano con un sobre de Anthropic. Siguiendo el alambre de la garra se llega a la computadora: ahí corre
la bola, que mete la mano en tu teléfono, recibe tu mensaje y hace cosas en la máquina. Un odómetro de estrellas
llega a 100,000. "Llegó la factura": la música se calla, cae un recibo, un solo clic y la garra se voltea contra
la computadora. Moltbook es una multitud de bolitas que presume "1.5 millones"; la lámpara de Wiz entra por el
cajón abierto de la base de datos e ilumina detrás a unas 17,000 personas con los hilos; del cajón sale un
enjambre de llaves. En febrero, Steinberger cruza la puerta de OpenAI y el letrero entra a la caja de la
fundación. La gente normal lo prueba: manos con teléfonos. Cierra con la bola viviendo en un chat y su garra
tocando las cosas de alguien, con un candado abierto colgando que se mece hasta quedarse quieto.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"la idea": .35, "anthropic le pidió": .35, "pasó a moltbot": .3, "a fines de enero": .2, "y entonces llegó": .45,
          "se publicó": .3, "apareció moltbook": .4, "la empresa de": .35, "y un millón y medio de llaves": .3,
          "en febrero": .35, "no fue el primer": .45}
m = Mezcla("a18_claw", pausas=PAUSAS, cola=3.0).exporta_tiempos()
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
# 1. El teléfono cae, sale la garra
E["cae"] = .30
E["garra"] = .50
E["snap"] = [.84, 1.2]
E["cinta"] = s("noviembre") - .1
E["nov"] = s("veinticinco") + .05
E["autor"] = arr("un programador") + .05
E["nombre"] = arr("peter") - .02
E["nombreF"] = fin("steinberger")
E["sube"] = s("subió") + .02
# 2. El letrero
E["aburrido"] = s("aburrido") + .1
E["warelay"] = arr("warelay") - .04
E["warelayF"] = fin("warelay")
E["enero"] = arr("en enero")
E["tacha1"] = s("se llamaba") + .05
E["clawdbot"] = s("clawdbot") - .02
E["clawdbotF"] = e("clawdbot")
E["snap2"] = [r3(e("clawdbot") + .05), r3(e("clawdbot") + .3)]
a, b = s("era") + .02, fin("tecnología") + .05
E["burbujas"] = [r3(a + (b - a) * (k / 33) ** .8) for k in range(34)]
# 3. La idea: el alambre lleva a la computadora
E["idea"] = arr("la idea") - .1
E["aterriza"] = E["idea"] + .62
E["traza"] = arr("un agente") + .02
E["compu"] = s("corre") - .05
E["bola"] = s("computadora") - .05
E["mensajes"] = [r3(s("manejas") + k * .3) for k in range(3)]
E["telefono"] = s("desde tu teléfono") - .05
E["vibra"] = s("teléfono", T("desde").i) + .1
E["escribe"] = arr("le escribes") - .05
E["escribeF"] = e("amigo")
E["envia"] = r3(e("amigo") + .05)
E["llega"] = r3(E["envia"] + .55)
E["hace"] = s("él hace") - .02
E["ventana"] = r3(s("hace") + .05)
E["circulo"] = r3(s("cosas", T("él hace").i) + .02)
E["palomas"] = [r3(s("en tu máquina") + .02), r3(s("en tu máquina") + .2)]
E["sobre"] = r3(e("máquina", T("él hace").i) - .15)
# 4. Los nombres
E["arriba"] = r3(fin("máquina", T("él hace").i) + .15)
E["anthropic"] = arr("anthropic") - .25
E["toques"] = [r3(s("pidió") + .02), r3(s("cambiar") + .05)]
E["abre"] = s("por parecerse") - .05
E["claude"] = r3(fin("parecerse") - .3)                  # Whisper estira "Claude"; el tramo real termina antes
E["tacha2"] = r3(fin("parecerse") + .12)
E["moltbot"] = arr("pasó a moltbot") + .2
E["tres"] = [r3(s("tres días") + k * .22) for k in range(3)]
E["tacha3"] = s("a openclaw") - .08
E["openclaw"] = s("openclaw") - .05
E["subraya"] = e("openclaw") + .02
# 5. Estrellas
E["fines"] = arr("a fines de enero")
E["rueda"] = [r3(s("ya tenía") - .1), r3(e("mil", T("cien").i) + .02)]
a, b = s("cien") - .2, fin("github") + .6
rr = np.random.default_rng(100)
E["estrellas"] = sorted(r3(a + (b - a) * rr.random() ** .7) for _ in range(46))
E["github"] = s("github") - .05
# 6. La factura
E["corta"] = arr("y entonces")
E["factura"] = e("factura") - .06                       # el golpe va al final de la palabra: encima la tapaba
E["recibo"] = r3(E["factura"] - .62)
# 7. Un solo clic
E["falla"] = s("falla") + .02
E["quita"] = arr("con un solo") - .45
E["boton"] = arr("con un solo") - .05
E["clic"] = e("clic") - .02
E["atacante"] = arr("un atacante")
E["voltea"] = s("podía") + .05
E["agarra"] = s("código") - .05
E["ejecutar"] = s("ejecutar")
E["sacude"] = s("máquina", T("atacante").i) + .02
# 8. Moltbook
E["latigazo"] = arr("apareció") - .45
E["multitud"] = arr("apareció") + .05
E["moltbook"] = s("moltbook") - .05
a, b = s("red social") - .05, e("agentes", T("red social").i) + .1
E["posts"] = [r3(a + (b - a) * k / 13) for k in range(14)]
E["presume"] = s("presumía") - .05
E["millon"] = s("millón", T("presumía").i) - .05
# 9. Wiz y la base de datos
E["wiz"] = arr("empresa") - .05
E["wizN"] = s("wiz") - .05
E["entra"] = s("entró a su base") - .02
E["cajon"] = r3(s("base de datos") + .1)
E["expuesta"] = s("expuesta") - .05
E["oscuro"] = E["entra"]
E["revela"] = arr("y encontró") + .1
E["diecisiete"] = s("diecisiete") - .1
E["detras"] = s("detrás") - .05
# 10. Las llaves
E["llaves"] = arr("y un millón y medio de llaves") + .02
E["llavesT"] = s("llaves") - .1
E["aire"] = s("aire libre") - .05
# 11. Febrero
E["latigazo2"] = arr("en febrero") - .6
E["febrero"] = s("febrero") - .05
E["camina"] = arr("steinberger", T("febrero").i) - .05
E["puerta"] = s("entró a openai") + .05
E["openai"] = s("openai") - .05
E["cierra"] = r3(e("openai") + .02)
E["caja"] = r3(arr("y el proyecto") - .25)
E["baja"] = s("pasó a una") - .05
E["solapas"] = [r3(s("fundación") + .1), r3(s("fundación") + .32)]
# 12. No fue el primero
E["atras"] = arr("no fue el primer") - .05
E["viejos"] = [r3(s("primer") - .1 + k * .2) for k in range(3)]
E["adelante"] = arr("fue el momento") - .05
a, b = s("la gente") - .05, s("probó") + .1
E["telefonos"] = [r3(a + (b - a) * k / 8) for k in range(9)]
E["garras"] = r3(s("probó") + .15)
# 13. Lo que querían
E["chatbot"] = s("chatbot") - .25
E["listo"] = s("listo") - .02
E["desinfla"] = r3(e("listo") - .1)
E["acerca"] = arr("querían") - .1
E["vive"] = s("viviera") - .05
E["burbujas2"] = [r3(s("en sus mensajes") + k * .2) for k in range(3)]
E["toca"] = s("pudiera") - .05
E["toques2"] = [r3(s("tocar") + .1), r3(s("sus", T("tocar").i) + .05), r3(s("cosas", T("tocar").i) + .05)]
# 14. Aunque todavía no fuera seguro
E["candado"] = s("aunque") - .05
E["inseguro"] = s("no fuera") - .02
E["asienta"] = r3(e("seguro") + .3)
E["fin"] = r3(m.dur)
(RAIZ / "remotion/src/serie/a18/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print({k: v for k, v in E.items() if not isinstance(v, list)})


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def pluma(dur=.5):
    """Plumón sobre papel: rasgueo áspero que pulsa con cada trazo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = (.55 + .45 * np.abs(np.sin(2 * np.pi * 5.5 * t + rng.random()))) * np.sin(np.pi * np.minimum(t / dur, 1)) ** .4
    return banda(ruido(n), 1800, 7500) * env * .6


def tachon(dur=.28):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 900, 6000) * np.sin(np.pi * t / dur) ** .3 * 1.1


def chasquido():
    """La garra se cierra: metal contra metal."""
    t = np.arange(int(.25 * SR)) / SR
    metal = sum(np.sin(2 * np.pi * f * t) * np.exp(-t * d) * a for f, d, a in ((1830, 38, .5), (2710, 46, .35), (3920, 60, .25)))
    return suma(metal, tic(.02, 3000, 9000) * 1.2, golpe(260, 130, .08, .7) * .5)


def vidrio(dur=.7):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 2800, 12000) * np.exp(-t * 9) * .8 + cola(campana((2093, 3136, 4186), .4, (.4, .25, .15)))[:n] * .4


def resorte_s(f0=320, dur=.5):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .5 * np.exp(-t * 6) * np.sin(t * 46))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 6) * .7


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def blip(f=880):
    t = np.arange(int(.14 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 26) * .6


def zumbido(dur=.35, f=150):
    t = np.arange(int(dur * SR)) / SR
    x = np.sign(np.sin(2 * np.pi * f * t)) * .3 + np.sin(2 * np.pi * f * 2 * t) * .3
    return banda(x, 80, 1200) * (np.abs(np.sin(2 * np.pi * 9 * t)) > .3) * np.sin(np.pi * t / dur) ** .3 * .7


def clic():
    return suma(golpe(180, 90, .09, .9), tic(.02, 2000, 6000) * .9)


def sello():
    return golpe(150, 70, .22, .9)


def silbato(f0=620, f1=180, dur=.6):
    """Silbato de émbolo: para lo que se desinfla o se aburre."""
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    e = np.sin(np.linspace(0, np.pi, n)) ** .5
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e * .5


def odometro(a, b, n=36):
    """Clics de rueda que se aceleran y se frenan igual que el número."""
    out = []
    for k in range(n):
        u = 1 - (1 - (k + 1) / n) ** (1 / 3)          # inversa de outCubic: misma curva que la animación
        out.append(a + (b - a) * u)
    return out


def tintineo(dur=2.6, dens=60):
    """Muchas llaves sueltas: chispas metálicas al azar."""
    n = int(dur * SR)
    y = np.zeros(n)
    for _ in range(int(dur * dens)):
        i = int(rng.random() * (n - 9000))
        f = rng.uniform(2400, 5200)
        t = np.arange(int(.12 * SR)) / SR
        s = (np.sin(2 * np.pi * f * t) + .5 * np.sin(2 * np.pi * f * 1.48 * t)) * np.exp(-t * 40) * rng.uniform(.05, .2)
        y[i:i + len(s)] += s
    env = np.sin(np.pi * np.linspace(0, 1, n)) ** .4
    return y * env


def pasos(t0, n, per=.27):
    return [t0 + k * per for k in range(n)]


def cajon(dur=.35):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 150, 1400) * (1 + .5 * np.sin(2 * np.pi * 30 * t)) * np.sin(np.pi * t / dur) ** .5 * .9


def latido(t):
    m.pon(t, golpe(56, 32, .3, 0), .3)
    m.pon(t + .19, golpe(50, 30, .26, 0), .18)


# ---------- 1. el teléfono cae y sale la garra ----------
m.pon(0.0, soplo(.32, 500, 3600, .8), .35)
m.pon(E["cae"], golpe(120, 52, .4, .5), .7)
m.pon(E["cae"] + .01, tic(.03, 1500, 5000), .5)
m.pon(E["garra"] - .02, vidrio(.6), .38)
m.pon(E["garra"], resorte_s(300, .55), .3)
for t in E["snap"]:
    m.pon(t, chasquido(), .5)
m.pon(E["cinta"], papel(.4), .35)
m.pon(E["nov"], toc(760), .3)
m.pon(E["autor"], suma(papel(.25), golpe(160, 80, .12, .5) * .6), .45)
m.pon(E["nombre"], pluma(E["nombreF"] - E["nombre"]), .35)
m.pon(E["sube"], soplo(1.4, 300, 3000, .35), .45)
m.pon(E["sube"] + .1, trazo(1.3, 260, 900), .12)
m.pon(E["sube"] + 1.7, toc(520), .25)
# ---------- 2. el letrero ----------
m.pon(E["aburrido"], silbato(520, 240, .7), .3)
m.pon(E["warelay"], pluma(.5), .4)
m.pon(E["enero"], lluvia(.7, 34), .5)
m.pon(E["enero"], soplo(.6, 900, 4000, .4), .2)
m.pon(E["tacha1"], tachon(.28), .6)
m.pon(E["clawdbot"], pluma(.5), .4)
for t in E["snap2"]:
    m.pon(t, chasquido(), .6)
for k, t in enumerate(E["burbujas"]):
    m.pon(t, pop(), .16 + .004 * k, (-.55, .55)[k % 2])
# ---------- 3. la idea ----------
m.pon(E["idea"] - .05, soplo(1.1, 400, 5000, .3), .55)
m.pon(E["idea"] + .06, tic(.02, 2000, 7000), .5)
m.pon(E["idea"] + .1, soplo(.55, 300, 2400, .9), .35)
m.pon(E["aterriza"], golpe(110, 50, .4, .5), .75)
m.pon(E["traza"], trazo(E["bola"] - E["traza"], 240, 720), .25)
m.pon(E["compu"], suma(papel(.3), golpe(120, 60, .25, .4)), .55)
m.pon(E["bola"], suma(golpe(92, 44, .35, .25), toc(620) * .5), .75)
for k, t in enumerate(E["mensajes"]):
    m.pon(t, blip((740, 880, 990)[k]), .35)
m.pon(E["telefono"] - .05, soplo(.8, 300, 2400, .5), .2)
m.pon(E["vibra"], zumbido(.4), .5)
nl = 26
for k in range(nl):
    m.pon(E["escribe"] + .05 + (E["escribeF"] - .15 - E["escribe"]) * k / nl, tic(.018, 2500, 8000), .12 + .06 * rng.random())
m.pon(E["envia"], soplo(.55, 800, 6000, .25), .45)
m.pon(E["envia"], trazo(.55, 500, 1100), .15)
m.pon(E["llega"], blip(1180), .4)
m.pon(E["ventana"], pop(), .4)
m.pon(E["ventana"] + .22, pop(), .38)
m.pon(E["circulo"], trazo(.3, 700, 1100), .2)
for t in E["palomas"] + [E["palomas"][1] + .14]:
    m.pon(t, tic(.03, 1800, 6000), .4)
m.pon(E["sobre"], soplo(.6, 900, 5000, .2), .35)
# ---------- 4. los nombres ----------
m.pon(E["arriba"], soplo(.8, 300, 2600, .5), .3)
m.pon(E["anthropic"], papel(.5), .45)
for t in E["toques"]:
    m.pon(t, golpe(230, 110, .09, .7), .65)
m.pon(E["abre"], papel(.25), .45)
m.pon(E["claude"] - .3, soplo(.4, 1500, 6000, .4), .3)
m.pon(E["claude"], toc(880), .3)
m.pon(E["tacha2"], tachon(.3), .6)
m.pon(E["tacha2"] + .02, golpe(140, 70, .12, .5), .3)
m.pon(E["moltbot"], pluma(.55), .4)
for k, t in enumerate(E["tres"]):
    m.pon(t, toc(900 + 120 * k), .35)
m.pon(E["tacha3"], tachon(.26), .6)
m.pon(E["openclaw"], pluma(.55), .45)
m.pon(E["subraya"], trazo(.3, 600, 1200), .25)
m.pon(E["subraya"] + .05, campana((784, 1175, 1568), 1.2, (.5, .3, .15)), .2)
# ---------- 5. las estrellas ----------
m.pon(E["fines"] - .1, golpe(150, 75, .2, .6), .45)
for t in odometro(*E["rueda"]):
    m.pon(t, tic(.015, 2500, 7000), .16)
    m.pon(t, toc(1300), .05)
m.pon(E["rueda"][1], campana((1046.5, 1568, 2093), 1.6, (.6, .35, .2)), .35)
for k, t in enumerate(E["estrellas"]):
    m.pon(t, toc(rng.uniform(1600, 2600)), .12, rng.uniform(-.6, .6))
m.pon(E["github"], toc(700), .2)
# ---------- 6. la factura: se calla la música ----------
m.pon(E["corta"] - .02, soplo(.5, 300, 4000, .2)[::-1], .25)
m.pon(E["recibo"], suma(*(papel(.14) * (k % 2 * .5 + .5) for k in range(1))), .4)
for k in range(9):
    m.pon(E["recibo"] + k * .065, tic(.02, 1400, 5000), .25)
m.pon(E["factura"], golpe(58, 28, 1.0, .5), .9)
m.pon(E["factura"], papel(.35), .6)
t = E["factura"] + .7
while t < E["multitud"] - .5:
    latido(t)
    t += .8
# ---------- 7. un solo clic ----------
m.pon(E["falla"], sello(), .9)
m.pon(E["falla"] + .02, golpe(90, 45, .3, .2), .4)
m.pon(E["quita"], soplo(.6, 500, 5000, .3), .4)
m.pon(E["boton"], blip(520), .45)
m.pon(E["clic"], clic(), .8)
m.pon(E["clic"], tic(.03, 3000, 10000), .6)
m.pon(E["atacante"], soplo(1.2, 60, 400, .7), .35)
m.pon(E["atacante"], trazo(1.0, 90, 70), .2)
m.pon(E["voltea"], silbato(300, 160, .6) * .5, .5)
m.pon(E["voltea"] + .1, resorte_s(180, .5), .3)
m.pon(E["agarra"], suma(chasquido(), golpe(80, 40, .4, .5)), .9)
for k in range(10):
    m.pon(E["agarra"] + .05 + k * .065, banda(ruido(int(.04 * SR)), 2500, 7000) * .8, .1)
m.pon(E["sacude"], golpe(70, 35, .5, .6), .5)
for k in range(6):
    m.pon(E["sacude"] + k * .07, golpe(160, 80, .07, .7), .3)
# ---------- 8. Moltbook ----------
m.pon(E["latigazo"], soplo(.55, 400, 6000, .25), .6)
for k in range(44):
    tt = E["multitud"] + (k / 44) ** 1.1 * 1.1
    m.pon(tt, pop(), .14 + .1 * rng.random(), rng.uniform(-.7, .7))
m.pon(E["moltbook"], pluma(.5), .4)
for t in E["posts"]:
    m.pon(t, blip(rng.uniform(800, 1400)), .18, rng.uniform(-.6, .6))
m.pon(E["presume"], soplo(.5, 400, 3000, .6), .35)
m.pon(E["presume"] + .45, golpe(150, 75, .2, .5), .5)
m.pon(E["millon"], pluma(.45), .4)
m.pon(E["millon"] + .5, campana((1318.5, 1760, 2637), 1.3, (.5, .3, .2)), .25)
# ---------- 9. Wiz ----------
m.pon(E["wiz"], clic(), .55)
m.pon(E["wiz"] + .05, trazo(1.5, 120, 125), .15)
m.pon(E["oscuro"], soplo(1.0, 80, 900, .6), .45)
m.pon(E["entra"] + .4, cajon(.4), .6)
m.pon(E["cajon"], polvo(.6), .3)
m.pon(E["expuesta"], cajon(.3), .75)
m.pon(E["expuesta"] + .22, golpe(130, 60, .25, .6), .55)
for k in range(9):
    m.pon(E["expuesta"] + .05 + k * .05, papel(.16), .2)
m.pon(E["revela"], golpe(48, 26, 1.4, .05), 1.0)
m.pon(E["revela"] + .05, soplo(1.4, 1500, 9000, .7), .3)
m.pon(E["revela"] + .1, campana((196, 293.7, 392), 2.6, (.6, .4, .25)), .35)
m.pon(E["diecisiete"], toc(600), .2)
# ---------- 10. las llaves ----------
m.pon(E["llaves"], tintineo(2.8, 70), .6)
m.pon(E["llaves"], soplo(1.2, 600, 6000, .3), .4)
m.pon(E["aire"], soplo(1.2, 900, 7000, .4), .45)
# ---------- 11. febrero ----------
m.pon(E["latigazo2"], soplo(.6, 400, 6000, .25), .55)
m.pon(E["febrero"], lluvia(.6, 30), .4)
for k, t in enumerate(pasos(E["camina"] - .25, 6, .26)):
    m.pon(t, golpe(130 - 6 * (k % 2), 70, .1, .5), .35)
m.pon(E["puerta"], silbato(240, 200, .5) * .6, .3)
m.pon(E["puerta"] + .1, soplo(.8, 1500, 7000, .5), .2)
m.pon(E["cierra"], golpe(72, 34, .6, .5), .7)
m.pon(E["caja"], suma(golpe(140, 70, .2, .5), papel(.3)), .55)
m.pon(E["baja"], soplo(.75, 300, 2600, .7), .4)
m.pon(E["baja"] + .72, golpe(110, 55, .25, .4), .55)
for t in E["solapas"]:
    m.pon(t, suma(golpe(190, 95, .12, .7), papel(.2)), .6)
# ---------- 12. no fue el primero ----------
m.pon(E["atras"], soplo(1.0, 300, 4000, .6)[::-1], .35)
m.pon(E["atras"] + .1, lluvia(.7, 40), .35)
for t in E["viejos"]:
    m.pon(t, pop(), .3)
m.pon(E["adelante"] + .1, suma(golpe(92, 44, .3, .25), toc(660) * .5), .5)
for k, t in enumerate(E["telefonos"]):
    m.pon(t, suma(soplo(.25, 600, 3000, .5), golpe(150, 75, .1, .5) * .6), .28, ((k % 5) / 2 - 1) * .6)
for k in range(9):
    m.pon(E["garras"] + k * .04, chasquido(), .14, ((k % 5) / 2 - 1) * .6)
# ---------- 13. lo que querían ----------
m.pon(E["chatbot"], pop(), .45)
m.pon(E["listo"], campana((1046.5, 1318.5, 1568), 1.0, (.5, .3, .2)), .28)
m.pon(E["desinfla"], silbato(700, 170, .7), .45)
m.pon(E["acerca"], soplo(.9, 300, 3000, .5), .35)
m.pon(E["vive"], suma(golpe(92, 44, .35, .25), toc(620) * .5), .65)
for k, t in enumerate(E["burbujas2"]):
    m.pon(t, blip((740, 880, 990)[k]), .3)
m.pon(E["toca"], trazo(.5, 300, 800), .25)
m.pon(E["toques2"][0], tintineo(.45, 40), .9)
m.pon(E["toques2"][1], golpe(150, 80, .12, .4), .45)
m.pon(E["toques2"][2], tic(.03, 1500, 5000), .45)
# ---------- 14. aunque todavía no fuera seguro ----------
m.pon(E["candado"] - .5, soplo(.5, 600, 4000, .8), .2)
c0 = E["candado"]
cand = suma(*(np.pad(chasquido(), (int(k * .03 * SR), 0)) * (.6 ** k) for k in range(2)))
m.pon(c0, cand, .7)
m.pon(c0 + .05, golpe(200, 100, .1, .6), .4)
for k in range(4):
    m.pon(c0 + .37 + k * .75, silbato(260 - 10 * k, 230 - 10 * k, .35) * .4, .14 * .7 ** k)
m.pon(E["inseguro"], suma(tic(.02, 2500, 7000), toc(1800) * .5), .4)
m.pon(E["asienta"], suma(chasquido() * .5, tintineo(.35, 30)), .55)
m.pon(E["asienta"] + .1, campana((196, 293.7, 392, 587.3), 3.2, (.7, .45, .3, .15)), .32)

# ---------- música: se calla con la factura y vuelve con la multitud ----------
corta = E["corta"]
vuelve = E["multitud"] - .05
ini_b = 92.0 - (E["llaves"] - vuelve)          # el segundo golpe de la pista cae con el enjambre de llaves
m.musica([("a18_claw", 0.0, 0.0, corta, .02, .12), ("a18_claw", ini_b, vuelve, m.dur, .35, 2.4)], nivel=-27.0)

# ---------- el foley va debajo de la voz ----------
# Medido: el foley sumaba 2.8 dB MÁS que la voz y la escucha marcó diez tramos tapados. Se baja todo 6 dB y,
# mientras ella habla, 4 dB más (solo el foley: la cama de música se queda constante).
vz = np.abs(m.voz[:m.N].mean(axis=1))
L = min(len(vz), m.N)


def media(x, n):
    c = np.cumsum(np.concatenate([[0.0], x]))
    y = (c[n:] - c[:-n]) / n
    return np.concatenate([np.full(n // 2, y[0]), y, np.full(len(x) - len(y) - n // 2, y[-1])])


env = media(vz, int(.06 * SR))
env = np.clip(env / (np.percentile(env[env > 1e-4], 85) + 1e-9), 0, 1)
env = media(np.maximum(env, media(env, int(.3 * SR))), int(.12 * SR))      # se adelanta y se suelta despacio
g = np.ones(m.N)
g[:L] = 1 - .37 * np.clip(env[:L] * 1.6, 0, 1)
m.fx *= (.5 * g)[:, None]
m.cierra()
