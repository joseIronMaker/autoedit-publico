"""a06c: los hilos. Aquí vive el tiempo de la pieza: cada acción se calcula una vez y sale a `t.json`,
que la animación lee. Dibujo y sonido son los mismos números.

Un solo mundo: la mesa de la bola vista desde el techo. Tres notas que solas no contestan; el mapa de
parecidos que deja fuera la tercera; la mesa que se vuelve tablero de detective con hilos rojos; y la
lupa que busca, encuentra una pista y vuelve a buscar con ella.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

m = Mezcla("a06c_hilos", pausas={
    "tu mamá no come": .3, "el sábado reservamos": .2, "la perla es una": .2, "y la tercera": .7, "para eso hay": .55,
    "no guarda": .2, "así el agente": .35, "microsoft": .55, "pero armar": .2,
    "hay otra salida": .6, "busca sábado": .25, "boris": .45, "mapa hilos": .6, "lo nuevo": .25, "hoy el agente": .45,
}, cola=3.0).exporta_tiempos()
T = m.T

# ---------- inicios reales de la voz (el alineador estira palabras sobre el silencio) ----------
crudo = lee(m.dir / "_voz_larga.wav").mean(axis=1)
v = int(.02 * SR)
nivel = 20 * np.log10(np.sqrt(np.convolve(crudo ** 2, np.ones(v) / v, "same")) + 1e-9)
sil = nivel < -42
TR, ini = [], None
for k in range(0, len(sil), 240):
    if not sil[k] and ini is None:
        ini = k
    if sil[k] and ini is not None:
        j = k
        while j < len(sil) and sil[j] and j - k < int(.1 * SR):
            j += 240
        if j - k >= int(.1 * SR):
            TR.append((ini / SR, k / SR))
            ini = None
if ini is not None:
    TR.append((ini / SR, len(sil) / SR))

if "--tramos" in sys.argv:
    for a, b in TR:
        ws = [w["w"] for w in m.W if a - .05 <= (w["s"] + w["e"]) / 2 <= b + .05]
        print(f"{a:7.2f} {b:7.2f}  {' '.join(ws)}")
    raise SystemExit


def arr(f, desde=0):
    """Inicio real de una frase: el arranque de voz más cercano al centro de su primera palabra."""
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - c))[0]


def fin(f, desde=0):
    """Final real de una frase: el silencio más cercano a donde dice el alineador."""
    x = T(f, desde).e
    return min(TR, key=lambda r: abs(r[1] - x))[1]


s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
i_ = lambda f, d=0: T(f, d).i


def previo(x):
    """Arranque de voz anterior a x: para cuando el alineador corre una palabra sobre la siguiente."""
    return max(r[0] for r in TR if r[0] < x - .08)

# ---------- el guion de acciones ----------
A = {}
# gancho: la pregunta cae en el mapa y el círculo no la contesta
A["cae"] = .42
A["anillo"] = .62
A["contestar"] = s("contestar")
A["revela"] = A["contestar"] + .12
A["preg"] = arr("el restaurante")
A["mamaP"] = s("mamá", i_("el restaurante"))
# tres notas
A["caen"] = [s("tres") - .32, s("tres") + .02, s("notas") + .14]
A["flip"] = [arr("tu mamá no come") - .14, arr("el sábado reservamos") - .14, arr("la perla es una") - .14]
k1, k2, k3 = i_("tu mamá no come"), i_("el sábado reservamos"), i_("la perla es una")
A["marca"] = [s("mamá", k1), s("mariscos", k1), s("sábado", k2), s("la perla", k2), s("la perla", k3), s("marisquería", k3)]
A["ninguna"] = [previo(arr("sola")), arr("sola"), arr("contesta")]
A["entre"] = s("entre")
A["tres"] = s("tres", i_("entre las tres"))
# el mapa de parecidos
A["mapa"] = fin("entre las tres") + .1
A["vuela"] = arr("y la tercera") - .3
A["tercera"] = s("tercera")
A["parece"] = s("parece")
A["buscador"] = arr("un buscador")
A["atrapa"] = s("significado") + .25
A["fuera"] = s("fuera")
# el tablero
A["paraeso"] = arr("para eso")
A["guardar"] = s("guardar")
A["grafo"] = arr("un grafo")
A["paginas"] = arr("no guarda")
A["cosas"] = previo(arr("guarda cosas"))
kc = i_("guarda cosas")
A["conectan"] = s("conectan") - .45
A["nm"] = arr("tu mamá", kc)
A["nocome"] = s("no come", kc)
A["mar1"] = s("mariscos", kc)
A["perla"] = s("la perla", kc)
A["sirve"] = s("sirve", kc)
A["mar2"] = s("mariscos", i_("sirve", kc))
A["sigue"] = arr("así el agente")
A["hilo"] = s("hilo")
A["unacosa"] = s("de una cosa")
A["siguiente"] = s("siguiente")
A["llega"] = arr("llega")
A["cambiar"] = arr("hay que cambiar")
A["restaurante"] = s("restaurante", i_("hay que cambiar"))
A["microsoft"] = arr("microsoft")
A["graphrag"] = arr("graphrag")
A["armar"] = arr("pero armar")
A["cuesta"] = s("cuesta")
A["aldia"] = arr("mantenerlo")
A["tambien"] = s("también", i_("mantenerlo"))
# buscar otra vez
A["salida"] = arr("hay otra salida")
A["masagente"] = s("más de agente")
A["unavez"] = arr("no buscar una vez")
A["otravez"] = arr("buscar otra vez")
A["conlo"] = s("con lo que ya")
A["bs"] = arr("busca sábado")
A["ap1"] = arr("aparece la perla")
A["perla3"] = s("perla", i_("aparece la perla"))
A["ahora"] = arr("ahora busca")
A["bp"] = s("la perla", i_("ahora busca"))
A["ap2"] = arr("aparece marisquería")
A["marisq2"] = s("marisquería", i_("ahora busca"))
A["agentica"] = arr("a eso le llaman")
A["busqueda"] = s("búsqueda")
A["boris"] = arr("boris")
A["creador"] = s("creador")
A["conto"] = arr("contó")
A["codigo"] = s("código")
A["vectorial"] = s("base vectorial")
A["pronto"] = arr("y que pronto")
A["engeneral"] = s("en general")
A["funcionaba"] = arr("funcionaba")
A["solo"] = s("solo")
# tres caminos
A["caminos"] = arr("mapa hilos")
A["hilos"] = arr("hilos")
A["volver"] = arr("o volver")
A["ninguno"] = arr("ninguno")
A["nuevo"] = arr("lo nuevo")
A["quien"] = s("quién elige")
A["antes"] = arr("antes")
A["alguien"] = s("alguien decidía")
A["paginas2"] = s("páginas", i_("alguien decidía"))
A["modelo"] = s("modelo")
A["hoy"] = arr("hoy")
A["decide"] = s("decide")
A["buscar"] = s("qué buscar")
A["cuando"] = arr("y cuándo")
A["encontro"] = s("encontró", i_("y cuándo"))
A["finvoz"] = fin("y cuándo ya encontró")
A["fin"] = m.dur

(Path(m.dir).parents[1] / "remotion/src/serie/a06c/t.json").write_text(json.dumps({k: ([round(x, 3) for x in v] if isinstance(v, list) else round(v, 3)) for k, v in A.items()}), encoding="utf-8")
if "--t" in sys.argv:
    for k, v in A.items():
        print(k, v if not isinstance(v, list) else [round(x, 2) for x in v])
    raise SystemExit


# ---------- foley propio de este capítulo ----------
def pagina(dur=.5):
    """Una hoja que se voltea: aire y un chasquido al caer."""
    y = soplo(dur, 500, 3600, .55)
    x = tic(.04, 1200, 4200)
    y[-len(x) - 200:-200] += x * .8
    return y


def pega(f=170):
    """Papel que se asienta sobre la mesa."""
    g = golpe(f, f * .55, .16, .9)
    x = banda(ruido(int(.05 * SR)), 900, 5200) * np.exp(-np.arange(int(.05 * SR)) / SR * 90)
    g[: len(x)] += x * .8
    return g


def chincheta():
    """La punta entra en el corcho: clic seco y un golpe corto, apagado."""
    g = golpe(210, 120, .08, .2)
    x = tic(.015, 2500, 7000)
    g[: len(x)] += x * 1.2
    y = banda(ruido(int(.06 * SR)), 300, 1200) * np.exp(-np.arange(int(.06 * SR)) / SR * 70)
    g[: len(y)] += y * .6
    return g


def tijera():
    """Un tijeretazo: dos filos que rozan y cierran."""
    n = int(.16 * SR)
    t = np.arange(n) / SR
    y = banda(ruido(n), 3000, 9000) * np.exp(-((t - .05) / .03) ** 2) * .6
    x = tic(.02, 2000, 6000)
    i = int(.11 * SR)
    y[i:i + len(x)] += x[: n - i] * 1.2
    return y


def arruga(dur=.45):
    """Papel que se hace bola: crujidos que se amontonan."""
    n = int(dur * SR)
    y = np.zeros(n)
    k = 0
    while k < n - 2000:
        s_ = tic(rng.uniform(.006, .02), rng.uniform(800, 2500), rng.uniform(4000, 9000)) * rng.uniform(.2, 1)
        y[k:k + len(s_)] += s_[: n - k]
        k += int(rng.uniform(.004, .03) * SR)
    return y * np.sin(np.pi * np.linspace(0, 1, n)) ** .5


def rollo(dur):
    """La hoja grande que se enrolla o se desenrolla: papel grueso rodando."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    r = 1 + .5 * np.sin(2 * np.pi * 21 * t * dur)
    return (banda(ruido(n), 120, 1100) * r + banda(ruido(n), 1500, 5000) * .25) * np.sin(np.pi * t) ** .8


def cuerda(f, dur=1.3):
    """Karplus-Strong: un hilo tenso pulsado, sin samples."""
    n = int(dur * SR)
    p = int(SR / f)
    b_ = rng.uniform(-1, 1, p)
    y = np.zeros(n)
    for i in range(n):
        y[i] = b_[i % p]
        b_[i % p] = .497 * (b_[i % p] + b_[(i + 1) % p])
    return banda(y, 70, 4200)


def tenso(dur=.42, f0=300, f1=900):
    """El hilo que se estira de chincheta a chincheta."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    e = np.sin(np.pi * np.linspace(0, 1, n)) ** .7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e * .25 + banda(ruido(n), 1800, 6000) * e * .2


def cae(dur, f0=1400, f1=300):
    """Algo que se viene abajo: tono que baja."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = f0 * (f1 / f0) ** (t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 3) * .5


def tecla():
    """Una letra de máquina de escribir."""
    g = tic(.012, 1800, 6500)
    y = golpe(260, 160, .05, .3) * .35
    y[: len(g)] += g
    return y


# ---------- gancho: la pregunta cae en el mapa y el círculo no contesta ----------
m.pon(.02, soplo(.42, 300, 2600, .9), .45)
m.pon(A["cae"], golpe(66, 32, .8, .5), 1.0)
m.pon(A["cae"], pega(120), .5)
m.pon(A["anillo"], trazo(2.3, 260, 620), .2)
IDEAS = [(190, 1085), (140, 1215), (300, 1170), (850, 505), (880, 720), (560, 430), (640, 900), (410, 610), (900, 1270), (420, 1300), (770, 1440), (200, 1360), (330, 1440), (210, 450), (150, 680)]
for k_, (x_, y_) in enumerate(IDEAS):
    d_ = np.hypot(x_ - 480, y_ - 790)
    if d_ < 325:
        u = 1 - (1 - d_ / 330) ** (1 / 3)
        m.pon(A["anillo"] + u * (2.9 - A["anillo"]), toc(880 + k_ * 40), .22, np.clip((x_ - 540) / 400, -.8, .8))
for j in range(4):                                         # pulsos de sonar del gancho
    tj = A["anillo"] + j * .75
    if tj < A["contestar"] - .25:
        m.pon(tj, campana((1318.5, 1975.5), .9, (.5, .15)), .07)
m.pon(A["contestar"] + .04, cae(.3, 1300, 600), .12)
m.pon(A["contestar"], toc(240), .55)
m.pon(A["contestar"], golpe(90, 50, .3, .2), .5)
m.pon(A["contestar"] + .05, soplo(.35, 300, 1500, .2), .2)
m.pon(A["revela"], soplo(1.3, 200, 1600, .4), .22)

# ---------- la pregunta y las tres notas ----------
m.pon(A["preg"], soplo(.55, 400, 3200, .5), .3)
m.pon(A["preg"] + .55, pega(150), .7)
m.pon(A["preg"] + .35, rollo(1.05), .28, .4)
for i, x in enumerate(A["caen"]):
    m.pon(x - .45, soplo(.45, 400, 3000, .8), .14, (-.4, .4, 0)[i])
    m.pon(x, pega(160 + i * 25), .6, (-.4, .4, 0)[i])
for i, x in enumerate(A["flip"]):
    m.pon(x, pagina(.45), .28, (-.4, .4, 0)[i])
for x in A["marca"]:
    m.pon(x - .03, trazo(.3, 500, 800), .06)
for i, x in enumerate(A["ninguna"]):
    m.pon(x + .16, toc(300 - i * 30), .45, (-.4, .4, 0)[i])
    m.pon(x + .16, golpe(130, 80, .12, .1), .3)
m.pon(A["entre"] - .1, trazo(.8, 400, 760), .14)
m.pon(A["tres"] - .05, toc(700), .35)
m.pon(A["tres"] - .05, campana((784, 1175), .9, (.4, .2)), .14)

# ---------- el mapa de parecidos ----------
m.pon(A["mapa"] + .05, rollo(.9), .26, -.2)
m.pon(A["vuela"] - .1, soplo(.5, 400, 3000, .5), .25)
for i in range(2):
    m.pon(A["vuela"] + i * .14 + .55, pega(200 + i * 30), .4, -.3 + i * .6)
m.pon(A["tercera"] - .15, soplo(.8, 300, 2400, .5), .3, .4)
m.pon(A["tercera"] + .65, pega(230), .5, .5)
m.pon(A["parece"], trazo(.6, 300, 260), .18, .3)
m.pon(A["buscador"], trazo(A["atrapa"] - A["buscador"] + .1, 300, 700), .2)
m.pon(A["atrapa"], toc(880), .38, -.3)
m.pon(A["atrapa"] + .1, toc(990), .38, .3)
m.pon(A["atrapa"] + .1, campana((659, 988), 1.0, (.4, .2)), .12)
m.pon(A["fuera"] - .05, golpe(52, 30, .9, .05), .55, .5)
m.pon(A["fuera"], soplo(.6, 200, 900, .2), .2, .5)

# ---------- el tablero ----------
m.pon(A["paraeso"] + .25, rollo(.85), .45, -.2)
m.pon(A["paraeso"] + .05, soplo(.65, 400, 3000, .5), .22)
m.pon(A["guardar"] - .35, soplo(.6, 200, 1800, .7), .35, -.6)
m.pon(A["guardar"] + .25, golpe(58, 28, .7, .5), .7)
m.pon(A["guardar"] + .25, pega(90), .5)
for i in range(6):
    m.pon(A["paginas"] + .02 + i * .045, tijera(), .2, (-.4, .4, 0)[i % 3])
for i in range(3):
    m.pon(A["paginas"] + .45 + i * .03, arruga(.38), .28, (-.4, .4, 0)[i])
    m.pon(A["paginas"] + .62 + i * .07, soplo(.5, 300, 2500, .3), .18, (-.6, .6, .1)[i])
ORD = [0, 1, 2, 3, 4.3, 5.3]
for o in ORD:
    t_ = A["cosas"] + .05 + o * .1
    m.pon(t_, soplo(.42, 600, 4000, .5), .12)
    m.pon(t_ + .4, toc(520 + o * 40) if o < 4 else toc(1040), .32 if o < 4 else .2)
    if o < 4:
        m.pon(t_ + .4, pega(190), .4)
for tt, f0 in ((A["conectan"], 330), (A["nocome"] - .08, 392), (A["sirve"] - .08, 440)):
    m.pon(tt, tenso(.45, f0 * .6, f0 * 2), .4)
    m.pon(tt, chincheta(), .6)
    m.pon(tt + .45, chincheta(), .6)
    m.pon(tt + .3, pega(260), .3)
for x in (A["nm"], A["mar1"], A["perla"], A["mar2"]):
    m.pon(x, toc(620), .14)
# sigue el hilo: cada tramo suena como una cuerda, y sube
for x, f0 in ((A["sigue"] + .25, 196), (A["unacosa"] + .05, 247), (A["siguiente"] + .05, 294)):
    m.pon(x, cuerda(f0, 1.2), .5, 0)
m.pon(A["llega"] + .05, cuerda(392, 1.6), .5)
m.pon(A["llega"] + .45, golpe(70, 36, .5, .3), .55)
m.pon(A["cambiar"] + .05, soplo(.3, 400, 3000, .8), .2)
m.pon(A["cambiar"] + .3, pega(140), .6)
m.pon(A["cambiar"] + .3, campana((392, 587, 784), 1.6, (.5, .3, .15)), .16)
m.pon(A["restaurante"] - .1, trazo(.22, 700, 900), .3, .4)
m.pon(A["restaurante"] + .12, trazo(.22, 700, 900), .3, .4)
m.pon(A["microsoft"] + .1, golpe(100, 52, .3, .7), .75)
m.pon(A["graphrag"], toc(660), .2)
for q in range(7):                                          # la luz que recorre el grafo
    tq = A["microsoft"] + .2 + q * 1.5
    if tq > A["armar"] - .4:
        break
    m.pon(tq, toc((523, 587, 659)[q % 3]), .12)
# armarlo cuesta: chinchetas, una tras otra
for i in range(6):
    m.pon(A["armar"] + .12 + i * .26, chincheta(), .34, (-.5, .5)[i % 2])
for x in (A["armar"] + .38, A["armar"] + .78, A["armar"] + 1.18):
    m.pon(x, golpe(110, 60, .2, .05), .2)
m.pon(A["aldia"] - .2, toc(500), .3, .5)
for k_ in range(6):
    m.pon(A["aldia"] + k_ * .2, pagina(.2), .09, .5)
for i in range(3):
    m.pon(A["aldia"] + .3 + i * .25, pega(210 + i * 20), .28, (0, -.5, .5)[i])
for x, pan in ((A["tambien"] - .1, -.3),):
    m.pon(x, tic(.02, 2500, 8000), .5, pan)
    m.pon(x + .02, cuerda(140, .9), .3, pan)
    m.pon(x + .5, chincheta(), .3, pan)
    m.pon(x + .35, pega(260), .3, pan)

# ---------- buscar otra vez ----------
m.pon(A["salida"] - .05, soplo(.75, 200, 2000, .6), .45, -.5)
for i in range(16):
    t_ = A["salida"] + .5 + ((i * 7) % 16) * .05
    m.pon(t_, pega(200 + (i % 5) * 25), .13, .5 * np.sin(i * 2.3))
m.pon(A["masagente"], toc(700), .35)
m.pon(A["masagente"], campana((1046, 1568), .6, (.3, .15)), .1)
m.pon(A["unavez"] + .25, soplo(.6, 500, 3800, .5), .3, .3)
for x in (A["unavez"] + .85, A["otravez"] + .85, A["conlo"] + .7):
    m.pon(x, campana((880,), .7, (.5,)), .1)
for x in (A["otravez"] + .05, A["conlo"] - .05):
    m.pon(x, soplo(.3, 800, 4000, .5), .12)
m.pon(A["bs"] - .1, pega(260), .18)
m.pon(A["bs"] + .05, soplo(1.2, 500, 3800, .5), .13)
m.pon(A["ap1"], campana((659, 988), 1.1, (.45, .22)), .2)
m.pon(A["ap1"], soplo(.5, 300, 2600, .5), .2)
m.pon(A["ap1"] + .5, pega(170), .45)
m.pon(A["perla3"] - .05, trazo(.35, 500, 900), .25)
m.pon(A["ahora"], soplo(.45, 600, 4000, .5), .12)
m.pon(A["ahora"] + .45, pega(280), .2)
m.pon(A["bp"], soplo(1.0, 500, 3800, .5), .13)
m.pon(A["ap2"], campana((784, 1175), 1.1, (.45, .22)), .2)
m.pon(A["ap2"] + .5, pega(170), .45)
m.pon(A["marisq2"] - .05, trazo(.35, 500, 900), .25)
m.pon(A["marisq2"] + .25, trazo(.55, 500, 1000), .16)
m.pon(A["busqueda"], golpe(80, 40, .4, .1), .4)

# ---------- la palabra de Boris Cherny ----------
m.pon(A["boris"] - .2, soplo(.4, 400, 3000, .7), .25)
for k_ in range(12):
    m.pon(A["boris"] - .05 + k_ * .05, tecla(), .32, rng.uniform(-.2, .2))
for k_ in range(22):
    m.pon(A["creador"] - .1 + k_ * .038, tecla(), .26, rng.uniform(-.2, .2))
for k_ in range(6):
    m.pon(A["boris"] + .02 + k_ * .07, pega(200 + k_ * 15), .14, (-.4, 0, .4)[k_ % 3])
for j in range(4):
    m.pon(A["boris"] + .55 + j * .55, toc(620 + j * 80), .16, (-.4, .4, 0, -.4)[j])
    m.pon(A["boris"] + .58 + j * .55, trazo(.2, 600, 900), .05)
m.pon(A["conto"], soplo(.45, 300, 2600, .6), .25, .4)
for k_ in range(3):
    m.pon(A["conto"] + .4 + k_ * .05, pega(180 + k_ * 20), .35, .4)
m.pon(A["vectorial"] - .4, soplo(.6, 200, 1800, .7), .3, -.5)
for j in range(6):
    m.pon(A["vectorial"] + .55 + j * .09, toc(1100 + j * 60), .14, -.4)
for k_, x in enumerate((A["funcionaba"] + .3, A["funcionaba"] + .95, A["funcionaba"] + 1.6)):
    m.pon(x, toc(660 + k_ * 130), .32, .4)
    m.pon(x, tic(.03, 1800, 5000), .2, .4)

# ---------- tres caminos ----------
m.pon(A["caminos"] - .85, soplo(.7, 200, 2200, .5), .35)
m.pon(A["caminos"] - .1, pega(130), .7)
m.pon(A["caminos"] - .1, golpe(70, 36, .4, .3), .5)
for k_, x in enumerate((A["caminos"], A["hilos"], A["volver"])):
    m.pon(x - .1, trazo(.6, 300 + k_ * 60, 600 + k_ * 120), .2, (-.5, 0, .5)[k_])
    m.pon(x + .2, toc(523 + k_ * 130), .28, (-.5, 0, .5)[k_])
for k_ in range(3):
    m.pon(A["ninguno"] + k_ * .38 + .1, toc((523, 659, 784)[k_]), .26, (-.5, 0, .5)[k_])
m.pon(A["nuevo"], soplo(1.0, 250, 1500, .5), .2)
m.pon(A["antes"] - .2, soplo(.7, 150, 900, .5), .3, .6)
m.pon(A["antes"] + .45, toc(260), .3, .3)
for x in (A["alguien"] - .05, A["alguien"] + .45, A["paginas2"] - .05):
    m.pon(x, pega(150), .5, .2)
m.pon(A["hoy"] - .05, soplo(.5, 200, 1500, .3), .35, .6)
m.pon(A["hoy"] + .3, toc(700), .32)
for k_, x in enumerate((A["decide"] - .4, A["decide"] + .05, A["buscar"] - .05)):
    m.pon(x, tic(.03, 1800, 5000), .3, (-.5, 0, .5)[k_])
for x in (A["buscar"] + .52, A["buscar"] + 1.0, A["cuando"] + .5):
    m.pon(x, golpe(96, 48, .3, .2), .55)
    m.pon(x, cuerda(330, .9), .16)
m.pon(A["encontro"] - .1, pagina(.5), .18)
m.pon(A["finvoz"] + .1, golpe(60, 30, .9, .3), .45)
m.pon(A["finvoz"] + .08, trazo(.3, 600, 900), .2)
m.pon(A["finvoz"] + .1, campana((261.6, 392, 523, 784), 2.6, (.6, .35, .2, .1)), .24)
m.pon(A["finvoz"] + .45, golpe(80, 40, .3, .3), .45, .3)
m.pon(A["finvoz"] + .5, campana((130.8, 196, 261.6), 2.6, (.7, .35, .18)), .22)

# El foley se aparta de la voz: bajo cada palabra baja a la mitad y en las pausas pega completo.
_v = np.abs(m.voz[:, 0])
_k = int(.03 * SR)
_e = np.sqrt(np.convolve(_v ** 2, np.ones(_k) / _k, "same"))
_act = np.clip((20 * np.log10(_e + 1e-9) + 42) / 14, 0, 1)
_act = np.convolve(_act, np.ones(int(.14 * SR)) / int(.14 * SR), "same")
_g = np.ones(m.N)
_n = min(m.N, len(_act))
_g[:_n] = 1 - .7 * _act[:_n]
m.fx *= _g[:, None]

# Música: una sola pista. Empieza en su segundo 6 para que el pulso abra cuando aparece el tablero
# y la cola de la pista se apague con el final.
m.musica([("a06c_hilos", 6, 0, m.dur, .04, 2.8)])
m.cierra()
