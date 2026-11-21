"""a20: el enchufe. Abre dentro de un nudo de mil cables de papel que tiembla; la cámara se mete en él y llega a una
bola que tuerce a mano un cable para el calendario, otro para los archivos, otro para el correo. Caen otras bolas con
sombrero y cada una avienta sus propios cables: se enredan. «Diez modelos y cien programas»: la cámara se aleja, caen
diez bolas en fila, cien programas en rejilla y los cables brotan hasta que el contador dice 10 × 100 = 1,000.
Silencio. «Anthropic publicó MCP»: el nudo se jala hacia su centro y en su lugar queda un enchufe de pared; el × gira
y se vuelve +. Junto a la pared, cada programa se cablea UNA vez a su contacto, los tres contactos salen del mismo
sello y cualquier bola compatible enchufa. Las bolas rivales (bombín, gorra, boina, copa) miran con su propio nudo en
la mano; tiran el nudo y enchufan. Una caja de cartón se arma alrededor del enchufe: «fundación», y se escriben
Anthropic, Block y OpenAI. «Faltaba otra pieza»: un hueco punteado en la caja. La bola de la fiesta (gorro rojo)
quiere enchufarse al agente del restaurante (gorro de chef) y no hay dónde: A2A es un interfón. Se presentan con
tarjetas, hablan con los mismos signos y rompen la lista de la fiesta en dos. El interfón entra al hueco de la caja.
Diferencia en dos viñetas: la bola con sus herramientas (enchufe) y la bola con un colega (interfón). Vuelve la
imagen del principio, ahora en orden: cien programas, diez bolas, una caja. Cierra metiéndose al enchufe, cuya tapa
se abre como una puerta hacia lo oscuro.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"en noviembre": .5, "es la misma idea": .35, "sus rivales": .45, "faltaba otra": .4,
          "google presentó": .25, "internet creció": .35, "también es una": .35}
m = Mezcla("a20_enchufe", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

# ---------- arranques reales de la voz: Whisper estira palabras sobre los silencios ----------
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
if _ini is not None:
    TR.append((_ini / SR, len(_sil) / SR))


def tramo(f, desde=0):
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs((r[0] + r[1]) / 2 - c) if r[0] - .1 <= c <= r[1] + .1 else 99 + abs(r[0] - c))


def arr(f, desde=0):
    """Arranque real de la voz en esa palabra: si Whisper la estiró hacia atrás, el primer sonido dentro de ella."""
    w = m.W[T(f, desde).i]
    c = [a for a, b in TR if w["s"] - .12 <= a <= w["e"]]
    return r3(min(c)) if c else r3(w["s"])


E = {}
# ---------- 0. El nudo y la zambullida ----------
E["sello"] = .14                                   # «antes de 2024» cae como sello
E["mete"] = r3(arr("conectar") - .55)            # la cámara se mete al nudo
E["llega"] = r3(arr("conectar") - .02)           # aterriza junto a la bola
# ---------- 1. Cables a mano ----------
E["tuerce"] = r3(s("conectar") + .25)
E["amano"] = r3(s("a mano"))
E["nudo1"] = r3(e("a mano") - .12)
E["lanza"] = [r3(arr("un cable para") - .05), r3(arr("otro para tus") - .05), r3(arr("otro para tu correo") - .05)]
E["pega"] = [r3(s("calendario") + .05), r3(s("archivos") + .02), r3(s("correo") + .02)]
E["caen2"] = [r3(s("asistente") - .1), r3(s("necesitaba") - .05)]
E["avientan"] = [r3(s("sus propios") - .25 + k * .2) for k in range(6)]
# ---------- 2. Diez por cien ----------
E["diez"] = r3(arr("diez modelos") - .05)
E["filas"] = [r3(E["diez"] + .05 + k * .07) for k in range(7)]   # las siete bolas que faltan
E["cien"] = r3(s("cien") - .05)
E["brotan"] = [r3(s("cien") + .1), r3(s("mil cables") - .02)]   # los cables brotan en este tramo
E["mil"] = r3(s("mil cables"))
# ---------- 3. MCP ----------
E["nov"] = r3(arr("noviembre"))
E["anth"] = r3(arr("anthropic publicó"))
E["jala"] = r3(s("publicó") - .05)
E["colapsa"] = r3(s("mcp") - .06)              # el nudo termina de jalarse justo antes de la palabra
E["enchufe"] = r3(s("mcp") + .2)               # el enchufe asoma con un golpe grave, sin agudos sobre «MCP»
E["mcpfin"] = r3(e("mcp"))
E["misma"] = r3(arr("es la misma idea"))
E["mete2"] = r3(s("enchufe") - .02)             # la clavija entra
E["programa"] = r3(arr("el programa"))
E["ofrece"] = r3(s("ofrece"))
E["unavez"] = r3(s("una sola vez") + .15)
E["formato"] = r3(s("formato"))
E["estandar"] = r3(s("estándar"))
E["cualquier"] = r3(arr("y cualquier"))
E["enchufan"] = [r3(s("agente", T("cualquier").i) + .05), r3(s("compatible") + .15), r3(s("puede usar") + .1)]
# ---------- 4. Rivales ----------
E["parecia"] = r3(arr("parecía"))
E["sola"] = r3(s("sola empresa"))
E["raro"] = r3(arr("pero pasó"))
E["miran"] = r3(s("raro") - .05)
E["tiran"] = r3(arr("sus rivales") - .05)
E["adoptan"] = [r3(s("adoptaron") - .25 + k * .2) for k in range(3)]
# ---------- 5. Fundación ----------
E["dic"] = r3(arr("en diciembre"))
E["dono"] = r3(s("donó") - .05)
E["arma"] = [r3(E["dono"] + .1 + k * .17) for k in range(4)]   # la caja se dobla: frente, tapa, lados
E["fundacion"] = r3(s("fundación") + .1)
E["firmas"] = [r3(arr("creada")), r3(s("block") - .05), r3(s("openai") - .02)]
# ---------- 6. La pieza que falta ----------
E["faltaba"] = r3(arr("faltaba"))
E["hueco"] = r3(s("pieza", T("faltaba").i) - .1)
E["conecta"] = r3(arr("mcp conecta"))
E["herr"] = r3(s("herramientas", T("mcp conecta").i))
# ---------- 7. Fiesta y restaurante ----------
E["pero"] = r3(arr("pero", T("mcp conecta").i))
E["fiestas"] = r3(s("fiestas") - .1)
E["hablar"] = r3(s("hablar", T("fiestas").i))
E["resta"] = r3(s("restaurante") - .05)
E["topa"] = r3(e("restaurante") + .1)
# ---------- 8. A2A ----------
E["google"] = r3(arr("google presentó"))
E["a2a"] = r3(s("a2a"))
E["abril"] = r3(s("abril"))
E["idioma"] = r3(s("idioma común"))
E["presenten"] = r3(s("presenten") - .05)
E["repartan"] = r3(s("repartan") - .05)
E["trabajo"] = r3(s("trabajo") + .1)
E["agosto"] = r3(arr("este agosto"))
E["entra"] = r3(s("fundación", T("agosto").i) - .05)
# ---------- 9. La diferencia ----------
E["uno"] = r3(arr("uno es"))
E["usar"] = r3(s("herramientas", T("uno es").i))
E["otro"] = r3(arr("el otro"))
E["colegas"] = r3(s("colegas"))
# ---------- 10. Internet ----------
E["internet"] = r3(arr("internet"))
E["idioma2"] = r3(s("mismo idioma"))
E["esto"] = r3(arr("esto es lo mismo"))
E["actuan"] = r3(s("actúan") - .05)
E["ycomo"] = r3(arr("y como todo"))
E["nuevo"] = r3(s("enchufe nuevo"))
E["tambien"] = r3(arr("también es una"))
E["puerta"] = r3(s("puerta") - .05)
E["ultima"] = r3(e("nueva", T("puerta").i))
E["fin"] = r3(m.dur)

(RAIZ / "remotion/src/serie/a20/eventos.json").write_text(json.dumps(E, ensure_ascii=False), encoding="utf-8")
if "--eventos" in sys.argv:
    for k, v in E.items():
        print(k, v)
    print("dur", m.dur)
    raise SystemExit


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.12, lo=1500, hi=7000):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), lo, hi) * np.exp(-t * 30) * np.minimum(t / .004, 1)


def crujido(dur, dens=30, g=1.0):
    """Muchos papelitos que crujen: el nudo vivo."""
    n = int(dur * SR)
    y = np.zeros(n)
    for _ in range(int(dur * dens)):
        i = int(rng.random() * max(n - 4000, 1))
        s0 = papel(rng.uniform(.03, .09), 1200, 7500) * rng.uniform(.2, 1)
        y[i:i + len(s0)] += s0[: n - i]
    return y * g


def latigo(dur=.22):
    return soplo(dur, 900, 5200, .7) * 1.1


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def clic():
    g = golpe(180, 90, .09, .9)
    x = tic(.02, 2000, 6000) * .9
    g[: len(x)] += x
    return g


def enchufe_clic():
    """La clavija que entra: dos patas metálicas y el golpe del cuerpo."""
    return suma(clic() * .9, toc(2100)[: int(.05 * SR)] * .4, golpe(120, 70, .12, .5) * .5)


def pisada(f=130):
    return golpe(f, f * .55, .1, .25) * .6


def estira(dur=.55, f0=140, f1=420):
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) * (1 + .05 * np.sin(2 * np.pi * 14 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** .8 * .45


def boing(f0=170, dur=.6):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .35 * np.exp(-t * 5) * np.sin(t * 38))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .8


def carton():
    """Una solapa de cartón que se dobla y pega."""
    n = int(.22 * SR)
    t = np.arange(n) / SR
    return suma(banda(ruido(n), 180, 1400) * np.exp(-t * 18) * .9, golpe(105, 55, .22, .5) * .7)


def lapiz(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    g = (1 + .5 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / dur) ** .5
    return banda(ruido(n), 2500, 9000) * g * .35


def rasga(dur=.4):
    """Papel que se rompe: rachas de fibra que ceden."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    rachas = (np.sin(2 * np.pi * 31 * t + 3 * np.sin(2 * np.pi * 7 * t)) > .1).astype(float)
    return banda(ruido(n), 1300, 8000) * rachas * np.sin(np.pi * t / dur) ** .6 * .9


def trinquete(dur=.3, n=7):
    y = np.zeros(int(dur * SR))
    for k in range(n):
        s0 = tic(.012, 2500, 7000)
        i = int(k / n * (len(y) - len(s0)))
        y[i:i + len(s0)] += s0
    return y


def interfon_bip():
    t = np.arange(int(.22 * SR)) / SR
    e = np.minimum(t / .005, 1) * np.exp(-t * 9)
    return (np.sin(2 * np.pi * 988 * t) * (t < .09) + np.sin(2 * np.pi * 1318 * t) * (t >= .1)) * e * .5


def rechina(dur=1.1, f0=210, f1=330):
    """Bisagra: tono áspero que sube y baja, con raspones."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 + (f1 - f0) * np.sin(np.pi * t / dur) + 14 * np.sin(2 * np.pi * 9 * t)
    fase = 2 * np.pi * np.cumsum(f) / SR
    x = np.sign(np.sin(fase)) * .3 + np.sin(2 * fase) * .4 + np.sin(3 * fase) * .2
    am = (.6 + .4 * (np.sin(2 * np.pi * 17 * t) > 0))
    return banda(x * am, 180, 3200) * np.sin(np.pi * t / dur) ** .7 * .5


def aire(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 70, 600) * np.minimum(t / .6, 1) * np.minimum((dur - t) / 1.4, 1) * .8


def saltos_t(a, b, n):
    return [a + (b - a) * k / n for k in range(1, n + 1)]


L = E["lanza"]; P = E["pega"]
# ---------- 0. el nudo y la zambullida ----------
m.pon(0.0, crujido(E["mete"] + .2, 34, .55), .5)
m.pon(0.0, aire(2.0), .18)
m.pon(E["sello"], suma(golpe(110, 55, .35, .6), tic(.02, 1800, 6000) * .6), .8)
m.pon(E["mete"] - .05, soplo(E["llega"] - E["mete"] + .25, 250, 5200, .85), .6)
m.pon(E["mete"], crujido(.55, 90), .55)
m.pon(E["llega"], golpe(72, 38, .35, .15), .5)

# ---------- 1. cables a mano ----------
# cada media vuelta de las manos tuerce el papel
for tt in np.arange(E["llega"] + .05, E["nudo1"] - .1, np.pi / 9.5):
    m.pon(tt, papel(.08, 900, 5000), .2, -.15)
m.pon(E["llega"], soplo(E["nudo1"] - E["llega"], 1200, 6000, .5) * .3, .12)
m.pon(E["nudo1"] - .1, estira(.3, 320, 760), .35)
m.pon(E["nudo1"] + .08, suma(tic(.02, 1500, 5000), golpe(150, 80, .12, .4)), .45)
for k in range(3):
    m.pon(L[k] - .02, latigo(.26), .4, .2)
    m.pon(L[k] + .05, soplo(P[k] - L[k], 600, 4200, .6), .16)
    m.pon(P[k], suma(toc(700), golpe(160, 80, .15, .4) * .8, papel(.1) * .6), .55, (-.4, 0, .4)[k])
    m.pon(P[k] + .02, toc(1200 + 60 * k), .16)
for k, t0 in enumerate(E["caen2"]):
    m.pon(t0 - .35, soplo(.35, 600, 4000, .85), .15)
    for j, ti in enumerate(rebotes(t0 - np.sqrt(2 * 1.2 / 30), 1.2, .34)[:3]):
        m.pon(ti, golpe(92 - 6 * j, 44, .34 - j * .08, .25), .7 * .34 ** j, (.2, .5)[k])
for k, ta in enumerate(E["avientan"]):
    m.pon(ta - .04, latigo(.2), .3, (.3, .6)[k % 2])
    m.pon(ta + .36, suma(toc(640 + 40 * k), papel(.08) * .5), .4, (-.4, .4, 0)[[0, 2, 1, 0, 2, 1][k]])
    m.pon(ta + .38, toc(1260 + 50 * k), .12)

# ---------- 2. diez por cien ----------
for k, tf in enumerate(E["filas"]):
    t0 = tf + .35
    m.pon(t0 - .3, soplo(.3, 700, 4500, .85), .1)
    for j, ti in enumerate(rebotes(t0 - np.sqrt(2 * 1.2 / 30), 1.2, .34)[:2]):
        m.pon(ti, golpe(120 + 8 * k, 60, .2, .3), .38 * .34 ** j, (k / 3 - 1) * .7)
for k in range(97):
    m.pon(E["cien"] + .05 + .36 * k / 96, toc(900 + 700 * rng.random()), .06, (rng.random() - .5) * 1.2)
b0, b1 = E["brotan"]
n = int((b1 - b0) * SR)
cres = np.linspace(0, 1, n) ** 1.6
m.pon(b0, (crujido(b1 - b0, 160) * cres + banda(ruido(n), 1000, 6000) * cres * .25), .55)
for k, tt in enumerate(b0 + (b1 - b0) * (np.arange(40) / 39) ** .72):
    m.pon(tt, tic(.01, 3000, 8000), .12)
m.pon(E["mil"], golpe(58, 30, .7, .3), .85)
m.pon(E["mil"], campana((261.6, 392, 523.3), 1.4, (.5, .3, .2)), .16)
m.pon(E["mil"] + .2, crujido(E["anth"] - E["mil"], 22, .5), .28)
m.pon(E["nov"], suma(tic(.02, 1800, 6000), toc(880) * .5), .22)
# tensión y colapso
m.pon(E["anth"], estira(E["jala"] - E["anth"] + .1, 160, 420), .4)
m.pon(E["anth"], crujido(E["jala"] - E["anth"], 60), .35)
m.pon(E["jala"], soplo(E["colapsa"] - E["jala"], 200, 4200, .9), .55)
m.pon(E["jala"], crujido(E["colapsa"] - E["jala"], 180) * np.linspace(.3, 1, int((E["colapsa"] - E["jala"]) * SR) + 1)[: int((E["colapsa"] - E["jala"]) * SR)], .55)
m.pon(E["colapsa"], suma(golpe(52, 28, .9, .5), tic(.02, 1500, 6000) * .6), .9)
m.pon(E["colapsa"] + .02, trinquete(.35, 5), .25)                          # el × gira a +
for k in range(4):
    m.pon(E["colapsa"] + .12 + k * .09, toc(1100 - 120 * k), .14)          # 1,000 rueda a 110
m.pon(E["enchufe"], golpe(80, 40, .5, .05), .75)
m.pon(E["mcpfin"] + .02, suma(clic() * .5, toc(1568) * .3), .4)
m.pon(E["mcpfin"] + .04, campana((523.3, 784), 1.2, (.5, .3)), .16)
m.pon(E["mcpfin"] + .1, lluvia(.5, 60), .16)

# ---------- 3. el enchufe y la pared ----------
m.pon(E["misma"], soplo(.85, 200, 2600, .5), .3)
m.pon(E["mete2"] - .45, soplo(.4, 400, 3000, .7), .12)
m.pon(E["mete2"], enchufe_clic(), .7)
m.pon(E["programa"] - .05, soplo(.9, 200, 2400, .4), .25)
m.pon(E["programa"] - .2, tic(.02, 1500, 5000), .2)                    # la clavija sale
cae_cal = E["programa"] + .45
for j, ti in enumerate(rebotes(cae_cal - np.sqrt(2 * 1.2 / 30), 1.2, .34)[:3]):
    m.pon(ti, golpe(140 - 8 * j, 70, .2, .5), .45 * .34 ** j, -.4)
m.pon(E["ofrece"] + .15, trazo(.55, 300, 600), .12)
for k in range(3):
    m.pon(E["ofrece"] + .25 + k * .32, soplo(.6, 1200, 5000, .8), .08, -.4)
    m.pon(E["ofrece"] + .92 + k * .32, suma(toc(980 + 90 * k), tic(.015, 2000, 6000) * .5), .26, -.4)
m.pon(E["unavez"], trinquete(.3, 6), .35, -.4)
m.pon(E["unavez"] + .3, clic(), .45, -.4)
for k, tc in enumerate((E["formato"], E["formato"] + .14)):
    for j, ti in enumerate(rebotes(tc - np.sqrt(2 * 1.2 / 30), 1.2, .34)[:3]):
        m.pon(ti, golpe(132 - 8 * j, 66, .2, .5), .42 * .34 ** j, (0, .4)[k])
    m.pon(tc + .05, trazo(.3, 300, 600), .08)
m.pon(E["estandar"] + .05, suma(golpe(100, 50, .3, .6), toc(760) * .6), .6)
m.pon(E["estandar"] + .06, suma(toc(1520), toc(1140)) * .5, .2)
for q, (a, b) in enumerate(((E["cualquier"] - .05, E["cualquier"] + .5), (E["cualquier"] + .07, E["cualquier"] + .62))):
    for ti in saltos_t(a, b, 3):
        m.pon(ti, pisada(140 + 20 * q), .3, -.6 + .3 * q)
for k, te in enumerate(E["enchufan"]):
    m.pon(te - .32, latigo(.22), .2, (-.4, 0, .4)[k])
    m.pon(te, enchufe_clic(), .55, (-.4, 0, .4)[k])
    m.pon(te + .03, campana((1318.5, 1975.5), .6, (.4, .15)), .08, (-.4, 0, .4)[k])

# ---------- 4. los rivales ----------
m.pon(E["parecia"] - .05, soplo(.9, 200, 2200, .4), .18)
for k in range(3):
    a = E["parecia"] + .1 + .2 * k
    for ti in saltos_t(a, a + .6, 3):
        m.pon(ti, pisada(170 + 15 * k), .28, .3 + .2 * k)
m.pon(E["sola"], campana((196, 293.7), 1.6, (.4, .2)), .12)
m.pon(E["sola"], trazo(1.0, 200, 300), .08)
for k in range(3):
    m.pon(E["miran"] + .03 * k, boing(240 + 30 * k, .35), .16, .3 + .2 * k)
for k in range(3):
    tt = E["tiran"] + k * .07
    m.pon(tt + .25, suma(golpe(140, 70, .2, .4), crujido(.25, 80) * .8), .5, .3 + .2 * k)
for k, te in enumerate(E["adoptan"]):
    m.pon(te - .32, latigo(.22), .25, .5 - .4 * k)
    m.pon(te, enchufe_clic(), .55, (-.4, 0, .4)[k])
    m.pon(te + .03, campana((1318.5, 1975.5), .6, (.4, .15)), .08)

# ---------- 5. la fundación ----------
m.pon(E["dic"], soplo(1.1, 200, 2200, .5), .25)
m.pon(E["dic"], suma(tic(.02, 1800, 6000), toc(880) * .5), .18)
m.pon(E["dic"] + .6, trinquete(E["dono"] - E["dic"] - .7, 16), .2)          # la placa se desatornilla
m.pon(E["dono"] - .15, suma(pop(), papel(.1) * .6), .3)                      # y se despega de la pared
for k, ta in enumerate(E["arma"]):
    m.pon(ta + .05, carton(), (.6, .45, .45, .25)[k], (0, -.3, .1, .2)[k])
m.pon(E["fundacion"], suma(golpe(150, 70, .22, .9), tic(.02, 1500, 5000) * .5), .55)
for tf in E["firmas"]:
    m.pon(tf, lapiz(.42), .5)

# ---------- 6. la pieza que falta ----------
m.pon(E["hueco"], lapiz(.6), .35, .3)
m.pon(E["hueco"] + .6, suma(toc(300), golpe(200, 120, .15, .3)), .32, .3)
for ti in saltos_t(E["conecta"] + .1, E["conecta"] + .6, 3):
    m.pon(ti, pisada(150), .3, -.5)
m.pon(E["conecta"] + .55, latigo(.22), .18)
m.pon(E["conecta"] + .85, enchufe_clic(), .55, -.2)
for k in range(3):
    m.pon(E["conecta"] + .4 + k * .12, pop(), .22, (-.3, 0, .3)[k])
m.pon(E["herr"], campana((659.3, 987.8, 1318.5), 1.0, (.5, .3, .15)), .12)

# ---------- 7. fiesta y restaurante ----------
m.pon(E["pero"] + .05, suma(tic(.02, 1500, 5000), soplo(.25, 600, 4000, .2) * .6), .35)
for ti in saltos_t(E["pero"] + .25, E["pero"] + 1.65, 4):
    m.pon(ti, pisada(150), .3, .2)
m.pon(E["pero"] + .45, soplo(2.4, 200, 1800, .5), .18)
m.pon(E["fiestas"] - .2, soplo(.45, 900, 5000, .85), .12)
m.pon(E["fiestas"] + .3, suma(pop(), campana((1318.5, 1760), .8, (.5, .3)) * .6), .35)
m.pon(E["fiestas"] + .32, lluvia(.6, 40), .12)
m.pon(E["resta"] - .1, pop(), .38, .5)
m.pon(E["resta"], toc(620), .2, .5)
m.pon(E["topa"] - .5, latigo(.25), .25)
m.pon(E["topa"], boing(170, .6), .5, .4)
m.pon(E["topa"], golpe(160, 90, .15, .2), .35, .4)
m.pon(E["topa"] + .1, toc(520), .15)

# ---------- 8. A2A ----------
m.pon(E["a2a"] - .1, suma(golpe(110, 55, .35, .6), tic(.02, 1800, 6000) * .6), .7)
m.pon(E["abril"], suma(tic(.02, 1800, 6000), toc(880) * .5), .18)
m.pon(E["topa"] + .4, tic(.02, 1500, 5000), .2)                      # guarda la clavija
for k, (tb, pan) in enumerate(((E["idioma"], -.4), (E["idioma"] + .8, .4))):
    m.pon(tb, pop(), .32, pan)
    for j in range(3):
        m.pon(tb + .1 + .2 * j + (.1 if k else 0), toc((523.3, 659.3, 784)[j] * (1 if k == 0 else 1)), .16, pan)
m.pon(E["presenten"], latigo(.3), .3, -.3)
m.pon(E["presenten"] + .05, latigo(.3), .3, .3)
m.pon(E["presenten"] + .6, suma(tic(.015, 2000, 6000), toc(1400) * .5), .3)
m.pon(E["repartan"] - .1, papel(.12), .3)
m.pon(E["repartan"] + .25, rasga(.5), .6)
for k, tc in enumerate((E["trabajo"], E["trabajo"] + .15, E["trabajo"] + .27)):
    m.pon(tc, suma(tic(.015, 2500, 8000), toc(1568 + 200 * k) * .6), .3, (-.4, .3, .5)[k])

# ---------- 8b. el interfón entra a la caja ----------
m.pon(E["agosto"], soplo(1.1, 200, 2400, .5), .25)
m.pon(E["agosto"], suma(tic(.02, 1800, 6000), toc(880) * .5), .18)
m.pon(E["agosto"] - .05, pop(), .3)
m.pon(E["agosto"] + .15, soplo(E["entra"] - E["agosto"] - .1, 500, 4000, .7), .18)
m.pon(E["entra"], suma(golpe(90, 45, .4, .4), clic() * .6), .8)
m.pon(E["entra"] + .03, campana((392, 587.3), 1.2, (.5, .3)), .2)
m.pon(E["entra"] + .2, interfon_bip(), .25)

# ---------- 9. la diferencia ----------
m.pon(E["uno"] - .2, soplo(.5, 300, 3000, .6), .2)
m.pon(E["uno"], pop(), .35, -.2)
for k in range(3):
    m.pon(E["uno"] + .2 + .12 * k, pop(), .18, .5)
    m.pon(E["usar"] + .12 * k, toc(988 + 150 * k), .2, .5)
m.pon(E["otro"], pop(), .35)
m.pon(E["otro"] + .12, pop(), .3, .5)
m.pon(E["otro"] + .3, toc(659.3), .18, -.4)
m.pon(E["otro"] + .7, toc(784), .18, .4)
m.pon(E["colegas"], interfon_bip(), .3)

# ---------- 10. internet: la misma imagen, en orden ----------
m.pon(E["internet"] - .1, soplo(1.0, 200, 2400, .4), .35)
for k in range(100):
    m.pon(E["internet"] + .15 + .45 * (k / 99) ** .8, toc(900 + 700 * rng.random()), .045, (rng.random() - .5) * 1.2)
m.pon(E["internet"] + .35, trazo(.9, 300, 700), .14)
m.pon(E["idioma2"], campana((392, 493.9, 587.3), 1.6, (.4, .3, .2)), .16)
for k in range(10):
    m.pon(E["idioma2"] - .2 + .05 * k, toc(700 + 50 * k), .07, (k / 4.5 - 1) * .7)
for tt in np.arange(E["actuan"] - .3, E["ycomo"], .22):
    m.pon(tt, tic(.012, 2500, 8000), .1, (rng.random() - .5))

# ---------- 11. el enchufe nuevo es una puerta ----------
m.pon(E["ycomo"], soplo(E["tambien"] - E["ycomo"] - .15, 150, 2600, .55), .26)
m.pon(E["puerta"] - .08, suma(tic(.02, 1500, 5000), toc(1500) * .5), .45)       # el pestillo
m.pon(E["ultima"] - .25, rechina(1.0), .34)                                       # la bisagra suena al acabar la frase
m.pon(E["puerta"] + .05, aire(m.dur - E["puerta"] - .1), .32)
m.pon(E["puerta"] + .55, golpe(70, 40, .4, .1), .25)                            # la tapa se asienta
m.pon(E["puerta"] + .6, campana((130.8, 196, 261.6), 2.8, (.8, .4, .2)), .3)

# ---------- música: el drop en «diez»; silencio en el colapso; vuelve con el enchufe ----------
OFF = 16.05 - E["diez"]
m.musica([("a20_enchufe", OFF, 0, E["nov"], .02, .6)])
# desde el enchufe, una sola pasada: el respiro de la pista cae en «faltaba» y el segundo drop en «esto es lo mismo»
P2 = 80.05 - (E["esto"] - .05)                      # posición en la pista = t + P2
m.musica([("a20_enchufe", E["enchufe"] + P2, E["enchufe"], E["ycomo"] + .3, .03, .6)])
m.musica([("a20_enchufe", E["ycomo"] - .3 + P2, E["ycomo"] - .3, m.dur, .6, m.dur - E["ultima"] + .4)], nivel=-29.5)

# Limitador suave del bus de foley y un hueco para la voz (como en el a17).
TECHO = .62
m.fx = TECHO * np.tanh(m.fx * .6 / TECHO)


def hueco_para_la_voz(fx, baja=-10, lo=280, hi=6500):
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
