"""a19: la carrera. Un estadio de papel visto desde la tribuna. Abre con dos bolas idénticas que se señalan
("ChatGPT", "Claude" en el banderín de la espalda) y una tribuna de fans que grita; llegan cuatro más y el
pleito se vuelve un corro donde todas se señalan. Llueven banderines de fecha que se clavan en el suelo y el
corro se dispersa. Cada carrera es una pista que se desenrolla como un rollo de papel; el tiempo es distancia
(un mes = 105 px). Cada corredor cae junto a su banderín cuando la voz lo nombra y la posta (el testigo rojo)
pasa de mano en mano: un relevo, no un podio. Después del relevo, cada uno regresa a su fecha.
«Entonces, ¿le copió?»: la música se calla, Cowork y ChatGPT Work se señalan con brazos de hule, y la cámara
rebobina la pista 4 hasta Manus, encerrando cada fecha en un círculo rojo. «También va al revés»: dos testigos
cruzan entre las pistas 3 y 2 y sus estelas forman una equis. Vista de todo el estadio: nadie copió todo.
La cámara se aleja hasta que el estadio es el contenido de una ventana de chat; las bolas saltan fuera y se
meten en una computadora de papel. Cierra una mano de hule que sale de la pantalla y cierra la ventana.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"la respuesta corta": .35, "primera carrera": .3, "segunda": .35, "tercera": .35, "y la cuarta": .4,
          "seis meses": .25, "entonces": .6, "y también va": .5, "openai propuso": .2, "nadie copió": .45,
          "mientras discutimos": .5, "la inteligencia artificial": .35, "y entró": .5}
m = Mezcla("a19_carrera", pausas=PAUSAS, cola=3.0).exporta_tiempos()
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


# ---------- geometría compartida (la animación la lee de aquí) ----------
MX, X0 = 105, 300                       # un mes = 105 px; enero de 2024 = 300
LY = [0, 560, 1120, 1720]               # centro de cada pista; la cuarta, "la grande", va más cerca
X = lambda mes: X0 + MX * mes
V = 450                                 # px/s de un corredor que arranca solo

E = {"geo": {"mx": MX, "x0": X0, "ly": LY}}

# ---------- 1. El pleito ----------
E["caeA"], E["caeB"] = .16, .34                                   # las dos bolas aterrizan
E["apuntaA"], E["apuntaB"] = .5, .66
E["jabs"] = [r3(s("chatgpt") + .02), r3(s("copió") + .05), r3(s("claude") - .02)]
E["grito"] = [.08, .9, 1.7, 2.45]                                  # oleadas de la tribuna
E["otros"] = [r3(s("todos") - .55 + k * .13) for k in range(4)]   # aterrizan cuatro más
E["corro"] = r3(s("todos") + .05)                                  # se acomodan en corro
E["copian"] = r3(s("copian") - .05)                               # el corro gira señalándose
E["fechas"] = r3(s("fechas") - .03)
E["clavan"] = [r3(E["fechas"] + .06 + k * .15) for k in range(11)]  # once banderines, uno por salida
E["huyen"] = r3(E["fechas"] + .3)
E["fans"] = r3(s("fans"))

# ---------- 2. Las cuatro carreras ----------
E["rollo"] = [r3(arr("primera carrera") - .05), r3(arr("segunda") - .05), r3(arr("tercera") - .05), r3(s("cuarta") - .1)]
E["grande"] = r3(s("grande") - .03)
E["titulo"] = [r3(s("programador") - .1), r3(s("computadora") - .25), r3(s("usar una pantalla") - .1), r3(s("para todos") - .1)]

h1 = r3(s("llegó"))
cw = r3(arr("claude code en la web"))
h2 = r3(cw + .5)
h3 = r3(s("dos meses"))
h4 = r3(s("enero"))
h5 = r3(s("julio"))
h6 = r3(s("enero del veintiséis"))
h7 = r3(s("chatgpt work") + .12)
dX = lambda a, b: X(b) - X(a)
C = [
    # nombre, sub, pista, mes, fecha, cae, go, fin, fecha dicha, tipo, x donde para (solo el último)
    dict(n="Devin", sub="", p=0, mes=2, f="mar 2024", cae=r3(s("devin") - .02), go=r3(s("marzo") - .1), fin=h1, dice=r3(s("marzo"))),
    dict(n="Codex", sub="OpenAI", p=0, mes=16, f="may 2025", cae=r3(s("codex")), go=h1, fin=h2, dice=r3(s("mayo"))),
    dict(n="Claude Code", sub="en la web", p=0, mes=21, f="oct 2025", cae=r3(cw - .02), go=h2, fin=r3(h2 + 1.7), dice=r3(s("octubre")), para=23.4),
    dict(n="Claude Code", sub="", p=1, mes=13, f="feb 2025", cae=r3(arr("claude code en febrero")), go=r3(h3 - dX(13, 15) / V - .05), fin=h3, dice=r3(s("febrero"))),
    dict(n="Codex CLI", sub="", p=1, mes=15, f="abr 2025", cae=r3(s("codex cli")), go=h3, fin=r3(h3 + 1.5), dice=r3(s("dos meses")), para=16.9),
    dict(n="Anthropic", sub="", p=2, mes=9, f="oct 2024", cae=r3(arr("anthropic en octubre")), go=r3(h4 - dX(9, 12) / V - .05), fin=h4, dice=r3(s("octubre del veinticuatro"))),
    dict(n="OpenAI", sub="Operator", p=2, mes=12, f="ene 2025", cae=r3(arr("openai con operator")), go=h4, fin=r3(h4 + 1.5), dice=h4, para=15.2),
    dict(n="Manus", sub="", p=3, mes=14, f="mar 2025", cae=r3(s("manus")), go=r3(h5 - dX(14, 18) / V - .05), fin=h5, dice=r3(s("marzo del veinticinco", T("manus").i))),
    dict(n="ChatGPT agent", sub="", p=3, mes=18, f="jul 2025", cae=r3(arr("chatgpt agent")), go=h5, fin=h6, dice=h5),
    dict(n="Cowork", sub="Anthropic", p=3, mes=24, f="ene 2026", cae=r3(s("cowork") - .05), go=h6, fin=h7, dice=h6,
         medio=[r3(s("seis meses") - .1), 26.0]),
    dict(n="ChatGPT Work", sub="", p=3, mes=30, f="jul 2026", cae=r3(s("llegó chatgpt work") - .08), go=h7, fin=r3(h7 + 1.6), dice=r3(s("work")), para=32.3),
]
for k, c in enumerate(C):
    c["ultimo"] = "para" in c
    # Quien entrega regresa a su fecha: frena, se voltea y camina de vuelta.
    c["vuelve"] = None if c["ultimo"] else r3(c["fin"] + .95)
E["corredores"] = C
E["pastor"] = r3(s("para quien nunca") - .05)                    # tres fans bajan a la pista 4 y trotan con Cowork

# ---------- 3. ¿Le copió? ----------
E["calla"] = r3(arr("entonces") - .05)
E["sennalan"] = r3(s("copió", T("entonces").i) - .1)             # Cowork y ChatGPT Work se señalan
E["circulos"] = [r3(s("llegó antes") - .15), r3(s("agente general") - .05), r3(s("manus llegó") - .05)]
E["abre"] = r3(s("los dos") + .1)                                 # la cámara abre para ver las tres fechas

# ---------- 4. Al revés ----------
E["reves"] = r3(arr("y también") - .1)
E["skills"] = [r3(s("las skills")), r3(s("y codex") - .05), r3(s("adoptó") + .05)]           # saca, lanza, atrapa
E["agentsmd"] = [r3(s("propuso") - .05), r3(arr("y claude code lo lee") - .05), r3(s("lee") + .05)]

# ---------- 5. Nadie copió todo ----------
E["nadie"] = r3(arr("nadie copió") - .35)
E["todos"] = r3(s("todos copiaron") - .05)
E["discuten"] = r3(arr("mientras discutimos") - .2)
E["paso"] = r3(arr("ya pasó") - .05)
E["importante"] = r3(s("importante"))

# ---------- 6. La ventana y la computadora ----------
E["ventana"] = r3(arr("la inteligencia artificial") - .1)
E["salio"] = r3(s("salió de la ventana") - .05)
SAL = [r3(E["salio"] + k * .11) for k in range(11)]
E["saltan"] = SAL
E["entro"] = r3(arr("y entró") - .05)
E["meten"] = [r3(max(E["entro"] + .25, SAL[k] + 1.15) + k * .045) for k in range(11)]
E["enciende"] = r3(s("computadora", T("y entró").i) - .02)
E["brazo"] = r3(E["enciende"] + .75)                              # una mano de hule sale de la pantalla
E["clic"] = r3(E["brazo"] + .62)                                  # aprieta la equis de la ventana
E["dobla"] = r3(E["clic"] + .08)
E["regresa"] = r3(E["clic"] + .22)
E["fin"] = r3(m.dur)

# ---------- carreras: pasos que comparten dibujo y sonido ----------
PASO = .25
def corre(c):
    """Instantes en que el corredor toca el piso mientras corre."""
    fin = c["fin"] + (.45 if not c["ultimo"] else 0)
    return [r3(t) for t in np.arange(c["go"] + .12, fin, PASO)]


(RAIZ / "remotion/src/serie/a19/eventos.json").write_text(json.dumps(E, ensure_ascii=False), encoding="utf-8")
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


def multitud(dur, fuerza=1.0, dens=60):
    """Una tribuna gritando: ruido de voces con ráfagas, ningún sample."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    am = .55 + .25 * np.sin(2 * np.pi * 1.7 * t + 1) + .2 * np.sin(2 * np.pi * 3.9 * t)
    env = np.minimum(t / .12, 1) * np.minimum((dur - t) / .4, 1)
    y = banda(ruido(n), 280, 2400) * am * .35
    for _ in range(int(dur * dens)):
        i = int(rng.random() * max(n - int(.5 * SR), 1))
        d = rng.uniform(.12, .38)
        k = int(d * SR)
        tt = np.arange(k) / SR
        f0 = rng.uniform(260, 620)
        f = f0 * (1 + .25 * np.sin(np.pi * tt / d)) * (1 + .02 * np.sin(2 * np.pi * 6 * tt))
        voz = np.sin(2 * np.pi * np.cumsum(f) / SR) + .5 * np.sin(4 * np.pi * np.cumsum(f) / SR)
        b = banda(voz + .6 * ruido(k), 350, 2600) * np.sin(np.pi * tt / d) ** 1.5 * rng.uniform(.06, .16)
        y[i:i + k] += b
    return y * np.clip(env, 0, 1) * fuerza


def latigo(dur=.18):
    """El brazo que sale disparado a señalar."""
    return soplo(dur, 900, 5200, .7) * 1.1


def clava():
    """Un banderín que se entierra en el piso: madera y tierra."""
    return suma(golpe(150, 70, .22, .9) * .8, tic(.03, 1500, 5000) * .5)


def rollo(dur=1.1):
    """Un rollo de papel que se desenrolla: grave que rueda y papel que cruje."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e0 = np.minimum(t / .05, 1) * (1 - t / dur) ** 1.4
    crq = (np.sin(2 * np.pi * (34 - 18 * t / dur) * t) > .2).astype(float)
    return banda(ruido(n), 70, 500) * e0 * .7 + banda(ruido(n), 1800, 7500) * crq * e0 * .25


def pisada(f=110):
    return golpe(f, f * .55, .1, .25) * .6


def testigo():
    """El testigo pasa de mano: un clac de madera hueca."""
    return suma(toc(1180) * .8, toc(760) * .5, tic(.015, 2500, 8000) * .5)


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def boing(f0=170, dur=.6):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .35 * np.exp(-t * 5) * np.sin(t * 38))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .8


def sello():
    return golpe(150, 70, .22, .9)


def lapiz(dur):
    """El círculo rojo que se dibuja alrededor de una fecha."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    g = (1 + .5 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / dur) ** .5
    return banda(ruido(n), 2500, 9000) * g * .35


def clic():
    x = np.zeros(int(.12 * SR))
    a = tic(.018, 1800, 8000)
    x[:len(a)] += a
    b = toc(2100)[:int(.05 * SR)] * .35
    x[:len(b)] += b
    return x


def pliegue(dur=.4, n=9):
    """Papel que se dobla y se aplasta."""
    y = np.zeros(int(dur * SR))
    for _ in range(n):
        i = int(rng.random() * (len(y) - 3000))
        s0 = banda(ruido(2400), 1500, 7000) * np.exp(-np.arange(2400) / SR * 120) * rng.uniform(.3, 1)
        y[i:i + 2400] += s0
    return y


def estira(dur=.55, f0=140, f1=420):
    """Brazo de hule que se estira: un tono elástico que sube."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur) * (1 + .05 * np.sin(2 * np.pi * 14 * t))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** .8 * .45


# ---------- 1. pleito ----------
m.pon(0.0, multitud(.9, 1.0, 80), .42)
m.pon(.55, multitud(2.8, 1.0, 60), .2)
for k, t in enumerate((E["caeA"], E["caeB"])):
    for j, ti in enumerate(rebotes(t - np.sqrt(2 * .6 / 30), .6, .35)[:3]):
        m.pon(ti, golpe(96 - 6 * j, 44, .34 - j * .08, .25), .75 * .35 ** j, (-.35, .35)[k])
for k, t in enumerate((E["apuntaA"], E["apuntaB"])):
    m.pon(t - .05, latigo(), .35, (-.3, .3)[k])
for k, t in enumerate(E["jabs"]):
    m.pon(t, latigo(.14), .28, (-.3, .3, -.3)[k])
    m.pon(t + .08, toc(620 + 80 * k), .14)
for t in E["grito"][1:]:
    m.pon(t, multitud(.9, 1.0, 90), .16)
for k, t in enumerate(E["otros"]):
    m.pon(t - .28, soplo(.3, 600, 4000, .8), .12)
    m.pon(t, golpe(100 + 6 * k, 50, .28, .3), .55, (-.6, .6, -.3, .3)[k])
m.pon(E["corro"], suma(*(latigo(.12)[: int(.12 * SR)] for _ in range(1))), .3)
for k in range(6):
    m.pon(E["corro"] + .08 * k, latigo(.12), .16, (k / 2.5 - 1) * .6)
m.pon(E["copian"], soplo(1.2, 400, 3000, .5), .25)
m.pon(E["copian"] + .1, multitud(1.0, .7, 60), .25)
# los banderines: uno por salida; los que caen fuera del cuadro suenan más lejos
for k, t in enumerate(E["clavan"]):
    m.pon(t - .22, soplo(.25, 1200, 6000, .85), .1)
    m.pon(t, clava(), .7 if k < 6 else .32, ((k % 5) / 2 - 1) * .5)
m.pon(E["huyen"], soplo(.6, 300, 2500, .4), .3)
for k in range(6):
    m.pon(E["huyen"] + .1 + k * .07, pisada(140 + 10 * k), .35, (k / 2.5 - 1) * .7)
m.pon(E["fans"], multitud(.7, .6, 50), .2)

# ---------- 2. carreras ----------
for k, t in enumerate(E["rollo"]):
    m.pon(t, rollo(1.25 if k < 3 else 1.6), .8 if k < 3 else 1.0)
    m.pon(t, golpe(70, 38, .4, .1), .4)
m.pon(E["grande"], golpe(58, 30, .8, .1), 1.0)
m.pon(E["grande"], rollo(.8), .5)
for t in E["titulo"]:
    m.pon(t, soplo(.4, 800, 4200, .5), .14)
for c in C:
    # cae junto a su banderín
    for j, ti in enumerate(rebotes(c["cae"] - np.sqrt(2 * 1.2 / 30), 1.2, .32)[:3]):
        m.pon(ti, golpe(92 - 5 * j, 44, .36 - j * .1, .3), .55 * .32 ** j)
    m.pon(c["cae"] - .45, soplo(.45, 500, 3800, .85), .16)
    # la fecha se marca cuando la voz la dice
    m.pon(c["dice"], suma(toc(880) * .6, tic(.02, 2500, 8000) * .4), .32)
    # arranque y pasos
    m.pon(c["go"], soplo(.35, 400, 3000, .2), .22)
    for k, ti in enumerate(corre(c)):
        m.pon(ti, pisada(118 + (k % 2) * 14), .3, .2 * (-1) ** k)
    if not c["ultimo"]:
        m.pon(c["fin"], testigo(), .75)
m.pon(C[7]["cae"] + .25, boing(240, .5), .45)              # Manus sorprende: sale como resorte
m.pon(C[7]["cae"] + .25, pop(), .4)
m.pon(E["pastor"], multitud(1.6, .5, 40), .22)
for k in range(3):
    m.pon(E["pastor"] + .15 + k * .14, pisada(200 + 20 * k), .3)

# ---------- 3. ¿le copió? (sin música) ----------
m.pon(E["calla"] + .3, multitud(1.8, .45, 40), .18)
m.pon(E["sennalan"], estira(.42, 180, 520), .4, -.3)
m.pon(E["sennalan"] + .06, estira(.42, 200, 560), .4, .3)
for k, t in enumerate(E["circulos"]):
    m.pon(t, lapiz(.45), .6)
    m.pon(t + .42, toc(880 - 100 * k), .22)
for t in (E["circulos"][1] - .55, E["circulos"][2] - .5):
    m.pon(t, soplo(.5, 300, 2600, .5)[::-1], .3)            # la cámara rebobina
m.pon(E["abre"], soplo(.8, 300, 2400, .4), .2)

# ---------- 4. al revés ----------
m.pon(E["reves"], soplo(.9, 250, 2600, .5), .3)
for (saca, lanza, atrapa), pan in ((E["skills"], .3), (E["agentsmd"], -.3)):
    m.pon(saca, pop(), .4)
    m.pon(lanza, latigo(.2), .4, -pan)
    m.pon(lanza + .05, soplo(atrapa - lanza, 700, 4800, .5), .3)
    m.pon(atrapa, testigo(), .85, pan)

# ---------- 5. nadie copió todo ----------
m.pon(E["nadie"], soplo(1.0, 200, 2800, .25), .45)
m.pon(E["nadie"] + .55, campana((392, 587.3, 784), 1.6, (.5, .3, .15)), .18)
for k in range(11):
    m.pon(E["todos"] + .05 * k, toc(520 + 40 * k), .1, (k / 5 - 1) * .7)
m.pon(E["todos"] + .2, campana((523.3, 659.3, 784, 1046.5), 1.8, (.5, .35, .25, .12)), .2)
m.pon(E["discuten"], multitud(2.4, 1.0, 80), .26)
m.pon(E["paso"], soplo(.7, 200, 2400, .3), .35)
for k in range(11):
    m.pon(E["importante"] + .03 * k, pisada(150 + 6 * k), .18)

# ---------- 6. ventana y computadora ----------
m.pon(E["ventana"], soplo(1.2, 200, 2600, .35), .4)
m.pon(E["ventana"] + .3, trazo(1.0, 300, 600), .14)
for k, t in enumerate(SAL):
    m.pon(t, pop(), .32, (k / 5 - 1) * .5)
    m.pon(t + .02, toc(500 + 45 * k), .12)
for k, t in enumerate(E["meten"]):
    m.pon(t, toc(1100 - 40 * k), .12, (k / 5 - 1) * .4)
    m.pon(t, golpe(160, 90, .12, .3), .1)
m.pon(E["enciende"], campana((261.6, 392, 523.3), 1.8, (.6, .35, .2)), .18)
m.pon(E["enciende"], golpe(70, 36, .5, .1), .25)
m.pon(E["brazo"], estira(.6, 120, 380), .45)
m.pon(E["clic"], clic(), .7)
m.pon(E["dobla"], pliegue(.45, 10), .7)
m.pon(E["dobla"] + .42, golpe(80, 40, .4, .2), .45)
m.pon(E["regresa"], estira(.35, 380, 160), .3)
m.pon(E["regresa"] + .3, campana((392, 523.3, 659.3, 784), 2.6, (.6, .4, .25, .15)), .3)

# ---------- música: la cuarta pista trae el drop; se calla en «¿le copió?»; vuelve con el revés ----------
OFF = 48.0 - E["grande"]                                  # el drop de la pista cae en «la grande»
corte = E["calla"]
vuelve = s("pero openai")
OFF2 = 96.0 - (arr("nadie copió"))                        # el segundo drop cae en «nadie copió todo»
m.musica([("a19_carrera", OFF, 0, E["grande"], .02, 0)], nivel=-21.6)
m.musica([("a19_carrera", 48.0, E["grande"], corte, 0, .25)], nivel=-26.3)
m.musica([("a19_carrera", OFF2 + vuelve, vuelve, arr("nadie copió"), .6, 0)], nivel=-21.6)
m.musica([("a19_carrera", 96.0, arr("nadie copió"), m.dur, 0, 2.6)], nivel=-26.6)
m.cierra()
