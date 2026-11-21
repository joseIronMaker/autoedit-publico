"""a03b: la cuenta. Una caja registradora de papel con tres teclas (LEE, ESCRIBE, CACHÉ) junto a la mesa donde
trabaja la bola. Aquí vive el tiempo de la pieza: cada renglón del ticket, cada moneda y cada ficha que vuela
salen de este archivo a `cuenta.json`, y la animación los lee de ahí. Dibujo y sonido son los mismos números.

Regla del ticket (la del bucle real): en la vuelta k la bola relee todo lo anterior. Un renglón es un trozo de
tokens del mismo tamaño. Vuelta 1: lee la petición (1) y escribe (1). Vuelta k: relee 2(k-1) renglones, lee 1
nuevo (lo que encontró) y escribe 1. Monedas: 1 por renglón leído, 5 por renglón escrito (la salida cuesta
cinco veces la entrada en todos los modelos Claude), y con caché el renglón releído cuesta una décima.
Tras 10 vueltas: 110 renglones, 90 de ellos releídos; 100 monedas de lectura contra 50 de escritura.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

m = Mezcla("a03b_cuenta", pausas={
    "ahora mira lo que": .3, "vuelta diez": 1.1, "en un agente casi": .45, "para eso existe": .35,
    "pero tiene trampa": .35, "y se enfría": .6, "si usas una": .45, "yo cuando una": .35,
    "porque en una": .35, "para contestarla": .2,
}, cola=3.4).exporta_tiempos()
T = m.T

# ---------- inicios reales de la voz: Whisper estira las palabras sobre los silencios ----------
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
            TR.append((ini / SR, k / SR)); ini = None
if ini is not None:
    TR.append((ini / SR, len(sil) / SR))


def arr(f, desde=0):
    """Inicio real de la frase: el arranque de voz más cercano al centro de su primera palabra."""
    w = m.W[T(f, desde).i]
    t = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - t))[0]


def fin(f, desde=0):
    t = T(f, desde).e
    return min(TR, key=lambda r: abs(r[1] - t))[1]


s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
A = dict(
    paga=s("se paga"), pagaF=fin("se paga"), pero=arr("pero qué te"), cobran=s("cobran"), exacta=s("exactamente"), exactaF=fin("exactamente"),
    nomin=arr("no minutos"), minutos=s("minutos"), nopreg=arr("no preguntas"), preguntas=s("preguntas"), pregF=fin("no preguntas"),
    tokens=arr("tokens los pedacitos"), pedacitos=s("pedacitos"), texto=s("de texto en"), maquina=s("la máquina corta"), corta=s("corta todo"), todoF=fin("corta todo"),
    tres=arr("y hay tres"), tresP=s("tres precios"), precios=s("precios distintos"), distintos=s("distintos"), distintosF=fin("distintos"),
    primero=arr("el primero"), primeroW=s("primero"), lee=s("lo que lee"), leeF=fin("lo que lee"), entrada=arr("tokens de entrada"), entradaW=s("entrada"), entradaF=fin("tokens de entrada"),
    mensaje=arr("tu mensaje"), instr=s("sus instrucciones"), platicaron=s("todo lo que ya platicaron"), platF=fin("platicaron"),
    segundo=arr("el segundo"), segundoW=s("segundo"), escribe=s("lo que escribe"), escribeF=fin("lo que escribe"), salida=arr("tokens de salida"), salidaW=s("salida"), salidaF=fin("tokens de salida"),
    escribir=arr("y escribir cuesta"), cuesta=s("cuesta más"), masF=fin("y escribir cuesta más"), anthropic=s("anthropic"), cinco=arr("cinco veces más"), veces=s("veces más"), cincoF=fin("cinco veces más"),
    ahora=arr("ahora mira"), bucle=s("bucle"), bucleF=fin("en el bucle"),
    v1=arr("vuelta uno"), v1lee=arr("lee tu petición"), peticion=s("petición"), v1F=fin("lee tu petición"),
    v2=arr("vuelta dos"), relee2=arr("la relee"), encontro=s("más lo que encontró"), encontroW=s("encontró"), v2F=fin("lo que encontró"),
    v10=arr("vuelta diez"), relee10=arr("relee todo"), desde=s("desde el principio"), principio=s("principio"), v10F=fin("desde el principio"),
    enun=arr("en un agente casi"), mas=s("más pagas"), noes=s("no es lo que escribe"), escribe2=s("escribe", T("no es lo que escribe").i), noesF=fin("no es lo que escribe"),
    relee=arr("es lo que relee"), releeW=s("relee", T("es lo que relee").i), releeF=fin("es lo que relee"),
    paraeso=arr("para eso existe"), tercer=s("tercer precio"), cache=s("la caché"), cacheF=fin("la caché"),
    si=arr("si el principio"), identico=s("idéntico al de"), anterior=s("vuelta anterior"), noproc=s("no lo procesa"), otravezF=fin("otra vez"),
    guardado=arr("lo tiene guardado"), cobra=s("te lo cobra"), decima=s("una décima"), omenos=s("o menos"), menosF=fin("o menos"),
    trampa=arr("pero tiene trampa"), trampaW=s("trampa"), trampaF=fin("pero tiene trampa"),
    idem=arr("tiene que ser idéntico"), primer=s("desde el primer token"), tokenW=s("token", T("desde el primer token").i), primerF=fin("el primer token"),
    cambias=arr("cambias algo"), alprin=s("al principio y"), pierde=s("se pierde"), descF=fin("el descuento"),
    enfria=arr("y se enfría"), enfriaW=s("enfría"), enfriaF=fin("y se enfría"), pasan=arr("si pasan"), minutos2=s("unos minutos"), sinusar=s("sin usarse"), borra=s("se borra"), borraF=fin("se borra"),
    susc=arr("si usas una"), suscW=s("suscripción"), nove=s("no ves esta"), cuentaF=fin("no ves esta cuenta"),
    alguien=arr("pero alguien"), lapaga=s("la paga"), salen=s("salen tus"), limites=s("límites"), limitesF=fin("tus límites"),
    yo=arr("yo cuando"), conver=s("conversación"), alarga=s("se alarga"), demasiadoF=fin("demasiado"), abro=arr("abro una nueva"), nueva=s("nueva"), resumen=s("un resumen"), resumenF=fin("con un resumen"),
    porque=arr("porque en una"), ia=s("ia"), caro=arr("lo caro"), pregunta=s("la pregunta"), preguntaW=s("pregunta", T("la pregunta").i), preguntaF=fin("la pregunta"),
    estodo=arr("es todo lo que tiene"), releer=s("releer"), releerF=fin("releer"), para=arr("para contestarla"), finV=fin("para contestarla"),
    dur=m.dur,
)
a = type("A", (), A)

# ---------- el ticket ----------
FILAS = []          # {t: inicio de impresión, d: duración, k: n nuevo | g releído | r escrito | c caché | s corte, v: vuelta}
MONEDAS = []        # {t: sale, p: L lectura | R escritura | C caché}
FICHAS = []         # fichas de papel que vuelan: {t, d, k: in | out, s: texto}
VUELTAS = []        # {v, t}


def fila(t, k, v, d=.08):
    FILAS.append({"t": round(t, 3), "d": round(d, 3), "k": k, "v": v})
    if k in "ng":
        MONEDAS.append({"t": round(t + d * .5, 3), "p": "L"})
    elif k == "r":
        for j in range(5):
            MONEDAS.append({"t": round(t + d * .5 + j * min(.05, d), 3), "p": "R"})
    elif k == "c":
        MONEDAS.append({"t": round(t + d * .5, 3), "p": "C"})


def vuelta(v, t0, t1, rel=None):
    """Imprime la vuelta v entre t0 y t1. rel: el tipo de los renglones releídos (g, o c con caché)."""
    rel = rel or "g"
    VUELTAS.append({"v": v, "t": round(t0, 3)})
    filas = (["n"] if v == 1 else [rel] * (2 * (v - 1)) + ["n"]) + ["r"]
    n = len(filas) + (1 if v > 1 else 0)
    paso = (t1 - t0) / n
    i = 0
    if v > 1:
        fila(t0, "s", v, min(.06, paso)); i = 1
    for k in filas:
        fila(t0 + i * paso, k, v, min(.09, paso * .95)); i += 1


def ficha(t, k, txt, d=None, g=-1):
    FICHAS.append({"t": round(t, 3), "d": round(d or (.42 if k == "in" else .62), 3), "k": k, "s": txt, "g": g})


# Los cortes los hace el tokenizador real (o200k_base, el mismo del epílogo de la serie 1, c13): nada a mano.
import tiktoken
_ENC = tiktoken.get_encoding("o200k_base")


def trozos(txt):
    return [_ENC.decode([x]) for x in _ENC.encode(txt)]


FRASE = trozos("la fiesta de mamá")                     # la tira que corta la cuchilla
CHAROLA = trozos("¿un lugar para")                      # la primera línea guardada en la caché
CHAROLA2 = trozos("¿Un lugar para")                     # la misma, con una letra cambiada
CAMBIA = next(i for i, (x, y) in enumerate(zip(CHAROLA, CHAROLA2)) if x != y)


def tanda(t0, t1, txt, k="in", tope=.2, g=-1):
    """Las fichas de un texto, repartidas entre t0 y t1. Las de un papel (g >= 0) salen en fila por el mismo
    camino y vuelan .34 s: así el paso entre una y otra las mantiene separadas y cada corte se lee."""
    tr = trozos(txt)
    d = .34 if g >= 0 else (.42 if k == "in" else .62)
    paso = min(tope, (t1 - t0 - d) / max(len(tr) - 1, 1))
    for j, w in enumerate(tr):
        ficha(t0 + j * paso, k, w, d, g)
    return tr


# Lo que lee, antes del bucle: fichas sueltas, luego tu mensaje, sus instrucciones y la plática
tanda(a.lee + .02, a.entradaW + .2, "la fiesta de mamá")
tanda(a.mensaje - .18, a.instr + .02, "¿un lugar para la fiesta?", g=0)
tanda(a.instr + .17, a.platicaron - .08, "sé breve. no gastes de más", g=1)
tanda(a.platicaron + .07, a.segundo - .13, "hola! el sábado? sí, a las 8", g=2)
for f in FICHAS:                                         # una moneda por token leído
    MONEDAS.append({"t": round(f["t"] + f["d"], 3), "p": "L"})
# Lo que escribe: fichas rojas, cinco monedas por token escrito
n0 = len(FICHAS)
tanda(a.escribe + .25, a.salidaW + .5, "busco salón cerca", "out", .42)
for f in FICHAS[n0:]:
    f["d"] = .62
    for j in range(5):
        MONEDAS.append({"t": round(f["t"] + .18 + j * .055, 3), "p": "R"})
print("tokens:", FRASE, CHAROLA, "cambia el", CAMBIA, "| entrada", n0, "salida", len(FICHAS) - n0)

# El bucle
ficha(a.v1lee + .05, "in", "¿un lugar para la fiesta?", .5)
fila(a.v1lee + .58, "n", 1, .14)
VUELTAS.append({"v": 1, "t": round(a.v1, 3)})
ficha(a.peticion + .3, "out", "busco salón")
fila(a.peticion + .42, "r", 1, .14)
VUELTAS.append({"v": 2, "t": round(a.v2, 3)})
fila(a.relee2 - .05, "s", 2, .06)
fila(a.relee2 + .32, "g", 2, .16)                    # la relee: la petición
fila(a.relee2 + .5, "g", 2, .16)                     # y lo que escribió
ficha(a.encontro - .02, "in", "Salón Luna: lleno", .5)
fila(a.encontroW + .1, "n", 2, .14)
fila(a.encontroW + .4, "r", 2, .14)
# Del 3 al 9 en el silencio antes de «vuelta diez», cada vez más rápido
t3, t9 = a.encontroW + .58, a.v10 - .3
pesos = np.array([1 / (1 + .16 * k) for k in range(7)]) * np.array([2 * v for v in range(3, 10)]) ** .5
bordes = t3 + np.concatenate([[0], np.cumsum(pesos)]) / pesos.sum() * (t9 - t3)
for j, v in enumerate(range(3, 10)):
    vuelta(v, bordes[j], bordes[j + 1] - .02)
# Vuelta 10: la lectura recorre el ticket desde el principio, y luego imprime
vuelta(10, a.principio - .12, a.v10F + .55)
L10 = len(FILAS)
# Vuelta 11, con caché: los 20 releídos salen de la charola y cuestan una décima
vuelta(11, a.noproc + .05, a.otravezF + .25, rel="c")
L11 = len(FILAS)

# ---------- los demás golpes de la pieza: la animación y el foley leen estos mismos números ----------
fin_v = {}
for f in FILAS:
    fin_v[f["v"]] = max(fin_v.get(f["v"], 0), f["t"] + f["d"])
E = dict(
    cae0=.32, kc0=a.paga + .2,                                         # la moneda de a03 cae; la caja la cobra
    pop=[a.tresP, a.precios, a.distintos],                             # las tres teclas se presentan
    pLee=a.primeroW + .05, pEsc=a.segundoW + .05, pCache=a.tercer + .1,
    rebota1=fin("no minutos") + .06, rebota2=fin("no preguntas") + .06,                     # el reloj y la pregunta no entran
    corte=a.corta + .02, traga=a.tres + .05,
    inclina=a.cuesta + .1, x5=a.cinco + .05,
    barre=a.ahora + .15, barre2=a.paraeso + .05, bucle=a.bucle - .05,
    kc=[round(fin_v[v] + .02, 3) for v in sorted(fin_v)],            # cada vuelta cierra con su campanita
    piso=fin_v[10],
    charola=a.cache - .05, guarda=a.si + .1, encoge=a.decima + .05, encoge2=a.omenos + .05,
    voltea=a.cambias + .38, tira=a.alprin + .62, crece=a.pierde + .05, rellena=a.descF + .2,
    enfria=a.enfria + .05, timer0=a.minutos2 - .05, timer1=a.borra - .08, borra=a.borra + .05,
    cortina=a.susc + .05, medidor=a.alguien + .15, sube=a.yo + .05,
    rompe=a.abro - .2, escribe2=a.nueva - .05, slip=a.resumen + .12,
    carta=a.caro - .15, kcF=a.para + .45,
)
e_ = type("E", (), E)

print({k: round(x, 2) for k, x in A.items()})
lect =sum(1 for x in MONEDAS[:] if x["p"] == "L" and x["t"] > a.ahora)
escr = sum(1 for x in MONEDAS if x["p"] == "R" and x["t"] > a.ahora)
print(f"renglones tras 10 vueltas: {sum(1 for f in FILAS[:L10] if f['k'] != 's')}; releídos {sum(1 for f in FILAS[:L10] if f['k'] == 'g')}")
print(f"monedas del bucle (hasta la 11): lectura {lect}, escritura {escr}, caché {sum(1 for x in MONEDAS if x['p'] == 'C')}")

d = Path(__file__).resolve().parents[2] / "remotion/src/serie/a03b"
(d / "cuenta.json").write_text(json.dumps({
    "A": {k: round(x, 3) for k, x in A.items()}, "filas": FILAS, "monedas": sorted(MONEDAS, key=lambda x: x["t"]),
    "fichas": FICHAS, "vueltas": sorted(VUELTAS, key=lambda x: x["t"]), "L10": L10, "L11": L11,
    "E": {k: (round(x, 3) if not isinstance(x, list) else [round(y, 3) for y in x]) for k, x in E.items()},
    "frase": FRASE, "charola": CHAROLA, "charola2": CHAROLA2, "cambia": CAMBIA,
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

if "--solo-tiempos" in sys.argv:
    for f in m.dir.glob("_*.wav"):
        f.unlink()
    raise SystemExit


# ---------- el foley: cada sonido nace del mismo número que el dibujo ----------
def en_voz(t):
    return any(a0 - .03 <= t <= b0 + .03 for a0, b0 in TR)


def moneda(k=1.0, dur=.34):
    """Metal de verdad: parciales inarmónicos con caídas distintas y un golpe de ruido."""
    t = np.arange(int(dur * SR)) / SR
    rel = np.array([1, 1.51, 2.24, 2.76, 3.38, 4.07, 5.13, 6.02]) * (1 + rng.normal(0, .008, 8))
    am = (.35, .8, .55, .6, .4, .3, .22, .14)
    dc = np.array([22, 30, 38, 46, 56, 70, 90, 120]) * rng.uniform(.9, 1.2, 8)
    s = sum(a_ * np.sin(2 * np.pi * 1960 * k * r * t + rng.random() * 6.28) * np.exp(-t * d_) for a_, r, d_ in zip(am, rel, dc))
    return s * .26 + .42 * banda(ruido(len(t)), 3500, 12000) * np.exp(-t * 160)


def apila(k=1.0):
    t = np.arange(int(.14 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * 55) for f in (1320, 1870, 2640)) * .3 + .4 * banda(ruido(len(t)), 1200, 5200) * np.exp(-t * 180)


def papel(dur=.5):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 1600, 6400) * np.sin(np.pi * t) ** 1.4 * (.6 + .4 * np.sin(t * 90))


def asienta(dur=1.2, k0=1.0):
    """La moneda que gira y se asienta: golpes cada vez más seguidos, y de pronto nada."""
    y = np.zeros(int(dur * SR) + 9000)
    t, paso = 0.0, .15
    while t < dur:
        p = t / dur
        s_ = moneda(k0 + .12 * p, .12) * (.32 + .55 * p)
        i = int(t * SR)
        y[i:i + len(s_)] += s_
        t += paso
        paso = max(.011, paso * .935)
    return y


def kaching(g=1.0):
    """La caja cobra: el resorte del cajón, el timbre y el golpe de metal."""
    n = int(1.3 * SR)
    y = np.zeros(n)
    m_ = golpe(170, 90, .12, .7) * .7
    y[:len(m_)] += m_
    for j, d_ in enumerate((0, .025, .05)):
        x = tic(.025, 1500, 5200) * .5
        i = int(d_ * SR); y[i:i + len(x)] += x
    b = campana((2093, 2637, 3136, 4186), 1.1, (.55, .45, .3, .15))[: n - int(.03 * SR)] * .55
    y[int(.03 * SR):int(.03 * SR) + len(b)] += b
    return y * g


def tecla():
    g_ = golpe(240, 120, .09, .6)
    x = tic(.02, 1500, 5200)
    g_[:len(x)] += x * .8
    return g_


def corte():
    """La cuchilla que parte el texto: seca y aguda."""
    x = tic(.02, 3500, 11000) * 1.2
    g_ = golpe(420, 180, .06, .2) * .5
    g_[:len(x)] += x
    return g_


def zumbido(dur=.28):
    """No entra: un zumbido grave."""
    t = np.arange(int(dur * SR)) / SR
    s_ = np.sign(np.sin(2 * np.pi * 110 * t)) * .5 + np.sign(np.sin(2 * np.pi * 165 * t)) * .3
    return banda(s_, 90, 1600) * np.minimum(t / .01, 1) * np.exp(-t * 5)


def rasga(dur=.42):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    crepita = (rng.random(n) < .02) * rng.uniform(.5, 1, n)
    return (banda(ruido(n), 900, 9000) * .6 + banda(crepita, 1500, 8000) * 3) * np.sin(np.pi * t ** .6) ** .8


def garabato(dur):
    """La pluma sobre el papel."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2500, 9000) * (.4 + .6 * np.abs(np.sin(t * 17 * np.pi))) * np.minimum(t / .05, 1) * np.minimum((dur - t) / .05, 1)


def vapor(dur):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 250, 1400) * (.6 + .4 * np.sin(t * 2.1)) * np.minimum(t / .5, 1) * np.minimum((dur - t) / .5, 1)


def baja(dur=.6, f0=900, f1=260):
    """Algo que se encoge o se enfría: un tono que cae."""
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    e = np.sin(np.linspace(0, np.pi, n)) ** 1.2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e * .5


def apagado(x):
    """Lo que pasa detrás de la cortina."""
    return banda(x, 120, 1300) * 1.6


tVo = lambda t: .62 if en_voz(t) else 1.0           # la voz manda: lo que choca con ella baja

# La moneda de a03 cae, gira y se asienta; la bola da su vuelta; la caja cobra
m.pon(0, soplo(.9, 300, 2600, .18), .14, .3)
for k in range(1, 40):
    tp = k * .033
    th0 = 2.25 + (2 * np.pi - 2.25) * (1 - (1 - min(tp / 1.3, 1)) ** 3)
    if abs(np.sin(th0 * 4)) < .12 and tp < 1.05:
        m.pon(tp, golpe(130, 70, .08, .25), .12)
m.pon(e_.cae0, moneda(.92), .26, .3)
m.pon(e_.cae0, golpe(110, 60, .1, .4), .14, .3)
m.pon(e_.cae0 + .08, asienta(e_.kc0 - e_.cae0 - .15, .95), .13, .3)
m.pon(e_.kc0 - .04, golpe(96, 48, .3, .4), .55)
m.pon(e_.kc0, kaching(), .62)
m.pon(e_.kc0 + .42, apila(1.1), .3)
m.pon(a.cobran - .1, toc(700), .3)
m.pon(a.cobran - .1, tic(.02, 2000, 6000), .3)

# Lo que no entra: un reloj y una pregunta
for tb, lado in ((e_.rebota1, -.4), (e_.rebota2, -.4)):
    m.pon(tb - .8, soplo(.8, 400, 3000, .8), .2, lado)
    m.pon(tb, zumbido(), .2)
    m.pon(tb, golpe(120, 60, .14, .5), .24)
for x in np.arange(e_.rebota1 - .8, e_.rebota1 + .5, .125):
    m.pon(float(x), toc(1900), .06, -.4)

# Tokens: la tira entra, la cuchilla la parte y la caja se la traga
m.pon(a.pedacitos - .55, papel(.6), .2, -.3)
for j in range(1, len(FRASE)):
    m.pon(e_.corte + j * .07, corte(), .42)
m.pon(e_.corte + .35, polvo(.3), .1)
for j in range(len(FRASE)):
    m.pon(e_.traga + j * .06, soplo(.3, 900, 5200, .7), .08, -.3)
    m.pon(e_.traga + j * .06 + .4, tic(.02, 1800, 5000), .2, -.4)

# Las tres teclas se presentan; cada una suena al apretarse
for j, f in enumerate((660, 880, 1100)):
    m.pon(e_.pop[j] - .04, cola(toc(f)), .3)
    m.pon(e_.pop[j] - .04, campana((f * 2,), .5, (.3,)), .1)
for tp in (e_.pLee, e_.pEsc, e_.pCache):
    m.pon(tp - .02, tecla(), .55)

# Fichas que entran y salen; los papeles de la mesa
for f in FICHAS:
    m.pon(f["t"], soplo(.22, 1200, 6000, .3), .05 * tVo(f["t"]), -.4 if f["k"] == "in" else .4)
    if f["k"] == "in":
        m.pon(f["t"] + f["d"] - .02, tic(.02, 1600, 4800), .14, -.45)
for t0 in (a.mensaje, a.instr, a.platicaron):
    m.pon(t0 - .12, papel(.45), .16, -.5)

# Monedas: cada una suena al caer en su pila (las chiquitas de la caché, agudas y leves)
for k, mo in enumerate(MONEDAS):
    tc = mo["t"] + .34
    if mo["p"] == "C":
        m.pon(tc, moneda(1.9, .14), .07, -.3)
        continue
    g = .1 if tc < a.ahora else .08 if tc < a.encontroW + .5 else .03 if tc < a.v10 + .2 else .06
    g *= tVo(tc)
    if a.encontroW + .5 < tc < a.v10 + .2 and k % 2:
        continue
    pan = -.45 if mo["p"] == "L" else .45
    m.pon(tc, moneda(1 + .05 * rng.random() + (.15 if mo["p"] == "L" else 0)), g, pan)
    m.pon(tc, apila(1 + .004 * k), g * .7, pan)

# Escribir: la pluma
m.pon(a.escribe - .05, garabato(a.salidaF - a.escribe + .1), .08, .4)
m.pon(e_.escribe2 + .1, garabato(e_.slip - e_.escribe2 - .15), .08, .4)

# La balanza: sube, se inclina, y las cinco monedas brincan
m.pon(a.escribir - .15, soplo(.5, 300, 2000, .7), .2)
m.pon(a.escribir + .25, golpe(84, 44, .3, .3), .4)
m.pon(e_.inclina + .2, golpe(70, 36, .5, .35), .62)
m.pon(e_.inclina + .2, tic(.03, 800, 2600), .3)
for i in range(5):
    m.pon(e_.x5 + i * .09, moneda(.9 + .04 * i, .2), .16, .4)
m.pon(e_.x5, golpe(92, 46, .3, .4), .5)

# Al empezar el bucle y al llegar la caché, las monedas se caen del mostrador
for tb in (e_.barre, e_.barre2):
    m.pon(tb, soplo(.5, 400, 2600, .3), .2)
    for x in np.linspace(tb + .1, tb + .7, 18):
        m.pon(float(x), moneda(.8 + rng.random() * .4, .18), float(rng.uniform(.03, .08)), float(rng.uniform(-.7, .7)))
m.pon(e_.bucle, trazo(1.1, 260, 620), .2)
m.pon(e_.bucle, soplo(1.2, 300, 2400, .5), .12)

# El bucle: la ventanita cambia, la bola brinca, la impresora corre y cada vuelta cierra con su timbre
for vv in VUELTAS:
    m.pon(vv["t"], toc(760 + 30 * vv["v"]), .22)
    if vv["v"] >= 3:
        m.pon(vv["t"] + .1, golpe(130, 70, .08, .2), .16)
for f in FILAS:
    if f["k"] != "s":
        m.pon(f["t"], tic(.015, 2600, 7000), .08 if f["v"] <= 2 else .025)
for i, tk in enumerate(e_.kc):
    grande = i in (0, 1, len(e_.kc) - 2, len(e_.kc) - 1)
    m.pon(tk, kaching(1 if grande else .45), .42 if grande else .2)
m.pon(a.relee2 - .05, trazo(.4, 400, 900), .16)
m.pon(a.relee10 + .05, trazo(a.principio - a.relee10 - .1, 300, 1200), .22)
m.pon(a.relee10 + .05, soplo(a.principio - a.relee10, 500, 3600, .8), .12)
m.pon(e_.piso, papel(.5), .3)
m.pon(e_.piso, golpe(70, 36, .3, .1), .3)
m.pon(a.noes, toc(520), .3, .45)
m.pon(a.releeW - .05, golpe(74, 38, .4, .3), .55, -.45)
m.pon(a.releeW - .05, campana((440, 660), 1.2, (.6, .3)), .14)

# La caché: la charola sale tibia, se llena, y cobra una décima
m.pon(e_.charola, soplo(.5, 200, 1600, .6), .3, -.3)
m.pon(e_.charola + .4, golpe(150, 80, .12, .5), .35, -.3)
m.pon(e_.guarda, vapor(e_.enfria - e_.guarda), .025, -.3)
for j in range(5):
    m.pon(e_.guarda + j * .28, papel(.3), .12, -.3)
    m.pon(e_.rellena - .05 + j * .1, papel(.25), .1, -.3)
m.pon(a.identico, campana((659, 988), 1, (.5, .25)), .14)
m.pon(e_.encoge, baja(.5, 1200, 420), .32)
m.pon(e_.encoge2, baja(.3, 900, 600), .22)

# La trampa
m.pon(a.trampa, golpe(52, 28, 1.0, .05), .75)
m.pon(a.primer - .05, trazo(a.primerF - a.primer + .05, 500, 900), .16)
m.pon(e_.voltea - .08, tic(.03, 1400, 4000), .45, -.3)
m.pon(e_.voltea, toc(990), .36, -.3)
m.pon(e_.tira - .05, golpe(110, 54, .2, .4), .24, -.4)
for j in range(5):
    m.pon(e_.tira + .1 + j * .09, papel(.4), .07, -.6)
m.pon(e_.tira + .1, lluvia(.6, 30), .1, -.5)
m.pon(e_.crece, baja(.4, 300, 900), .14)
m.pon(e_.crece + .15, moneda(.8, .4), .14)

# Se enfría y se borra
m.pon(e_.enfria, baja(1.0, 1500, 500), .2)
m.pon(e_.enfria + .3, polvo(.6), .14)
for x in np.arange(e_.timer0 + .1, e_.timer1, 1 / 6):
    m.pon(float(x), toc(1800), .1, -.3)
for j in range(4):
    m.pon(e_.timer1 + j * .09, campana((2637,), .4, (.5,)), .14, -.3)
m.pon(e_.borra, polvo(.6), .3, -.3)
m.pon(e_.borra, soplo(.6, 2000, 9000, .4), .12, -.3)

# La cortina: cae, y detrás la cuenta sigue corriendo
m.pon(e_.cortina - .05, soplo(.6, 150, 1500, .8), .4)
m.pon(e_.cortina + .45, golpe(50, 26, .8, .1), .8)
for x in np.arange(a.alguien - .2, e_.sube, .11):
    m.pon(float(x), apagado(moneda(.8 + .3 * rng.random(), .25)), .1, float(rng.uniform(-.5, .5)))
m.pon(e_.medidor, trazo(a.limitesF - e_.medidor, 200, 800), .2)
m.pon(a.limitesF, zumbido(.4), .3)
m.pon(e_.sube, soplo(.7, 200, 2000, .3), .35)
m.pon(e_.sube + .4, papel(1.0), .2)

# Una conversación nueva: rompe el ticket, escribe el resumen
m.pon(e_.rompe - .03, rasga(), .4)
m.pon(e_.rompe + .5, papel(.6), .12)
m.pon(e_.rompe + .55, golpe(80, 40, .3, .1), .16)
m.pon(e_.slip, soplo(.45, 900, 5000, .4), .06)
m.pon(e_.slip + .45, tic(.02, 1600, 4800), .14, -.4)
m.pon(e_.slip + .5, tic(.015, 2600, 7000), .08)

# La pregunta cortita, todo lo que relee y la última moneda
m.pon(e_.carta, papel(.3), .2, .4)
m.pon(e_.carta + .15, toc(880), .2, .4)
m.pon(a.estodo + .1, trazo(a.para - a.estodo - .1, 260, 700), .06)
m.pon(e_.kcF, kaching(), .55)
m.pon(e_.kcF + .38, moneda(.95), .4)
m.pon(e_.kcF + .42, asienta(1.9, .95), .3)
m.pon(e_.kcF + .2, campana((130.8, 196, 261.6), 2.6, (.8, .4, .2)), .3)

# El foley se aparta de la voz: donde hay voz, todo el foley baja 5 dB con ataque y caída suaves.
# Solo el foley: la música nunca se agacha (eso se oye como corte entre temas).
_v = m.voz.mean(axis=1)
_w = int(.01 * SR)
_r = np.sqrt(np.convolve(_v ** 2, np.ones(_w) / _w, "same"))[::_w]
_act = (20 * np.log10(_r + 1e-9) > -40).astype(float)
_env = np.zeros_like(_act)
for i in range(1, len(_act)):
    k = .35 if _act[i] > _env[i - 1] else .04
    _env[i] = _env[i - 1] + k * (_act[i] - _env[i - 1])
_g = 1 - .44 * np.repeat(_env, _w)
_g = np.concatenate([_g, np.ones(max(0, m.N - len(_g)))])[: m.N]
m.fx *= _g[:, None]

# Música: entra con pulso desde el primer cuadro, se corta en la trampa, vuelve quieta y cierra con su final
fin_m = m.dur
m.musica([
    ("a03b_cuenta", 24, 0, a.trampa, .03, .05),
    ("a03b_cuenta", 2, a.idem - .1, e_.cortina - .05, 1.2, .3),
    ("a03b_cuenta", 116.3 - (fin_m - e_.cortina + .05), e_.cortina - .05, fin_m, .25, 2.6),
], nivel=-25)
m.cierra()
