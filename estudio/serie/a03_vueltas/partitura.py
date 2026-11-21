"""a03: la pista. Aquí vive el tiempo de la pieza: la posición de la bola en la pista, cada moneda y cada
sello salen de este archivo a `pista.json`, y la animación los lee de ahí. Dibujo y sonido no se pueden
desfasar porque son los mismos números.

Regla de las monedas: en la vuelta k la bola pisa todo lo escrito en la pista (k marcas) y paga una moneda
por marca. Eso es lo que hace el modelo real: lee otra vez todo lo anterior. Total tras k vueltas: k(k+1)/2.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *
from scipy.interpolate import PchipInterpolator

# La toma del 2-nov (noche) es más rápida: las pausas le devuelven a la imagen el aire que pide cada gesto
# (la bola tiene que correr de una estación a otra entre frase y frase).
m = Mezcla("a03_vueltas", pausas={
    "le pides": .35, "un agente hace otra cosa": .35,
    "ve que está lleno": .4, "piensa": .45, "busca otro": .2, "este sí": .3, "lo ve": .35, "actúa": .3, "revisa qué pasó": .3,
    "en cada una": .25, "y sabes qué es": .75, "en ninguna vuelta": .25, "lo único nuevo": .25,
    "eso mismo es": .3, "un agente no es más": .3, "y una tercera": .2, "y todas las que": .15,
}, cola=3.6).exporta_tiempos()
HOOK0, HOOK_V = 4.23, 2.9          # la carrera del arranque: cruza la meta en HOOK0, una vuelta cada HOOK_V s
T = m.T

# ---------- inicios reales de la voz: Whisper se come los silencios antes de cada frase ----------
crudo = lee(m.dir / "_voz_larga.wav").mean(axis=1)
v = int(.02 * SR)
nivel = 20 * np.log10(np.sqrt(np.convolve(crudo ** 2, np.ones(v) / v, "same")) + 1e-9)
sil = nivel < -42
TR, i = [], 0
ini = None
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
    """Inicio real de la frase: el arranque de voz más cercano a lo que dijo el alineador."""
    w = m.W[T(f, desde).i]                 # el centro de la palabra: Whisper estira su inicio sobre el silencio previo
    t = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - t))[0]


def fin(f, desde=0):
    t = T(f, desde).e
    return min(TR, key=lambda r: abs(r[1] - t))[1]


i2 = T("busca otro").i + 2
# "probar, fallar, ajustar": el alineador las corre medio segundo. Son los tres tramos que siguen a "nosotros".
PFA = [r[0] for r in TR if r[0] > T("a nosotros").e - .05][:3]
A = dict(
    chatbot=T("chatbot").s, agente=T("agente").s, cabe=T("cabe en").s, vuelve=arr("vuelve a intentar"), intentar=T("intentar").s, vuelveF=fin("vuelve a intentar"),
    pides=arr("le pides"), fiesta=T("fiesta").s, ytt=arr("y te da"), lista=T("una lista").s, acaba=arr("ahí se acaba"), acabaF=fin("ahí se acaba"),
    agente2=arr("un agente hace"), cosa=fin("un agente hace otra cosa"),
    busca=arr("busca un restaurante"), pregunta=arr("pregunta"), esta=arr("está lleno"), ve=arr("ve que está"), lleno2=fin("ve que está lleno"), piensa=arr("piensa"), busca2=arr("busca otro"),
    este=arr("este sí"), pero=arr("pero es carísimo"), caro=T("carísimo").s, caroF=fin("pero es carísimo"), love=arr("lo ve"), busca3=arr("busca otro", i2),
    mira=arr("mira"), actua=arr("actúa"), revisa=arr("revisa qué pasó"), revisaF=fin("revisa qué pasó"), yvuelve=arr("y vuelve a empezar"), yvuelveF=fin("y vuelve a empezar"),
    llamamos=arr("a eso le"), bucle=T("bucle agéntico").s, bucleF=fin("bucle agéntico"), noes=arr("un agente no es una"), respuesta=T("una respuesta").s, muchas=arr("son muchas vueltas"), muchasF=fin("son muchas vueltas"),
    cada=arr("y cada vuelta"), paga=T("se paga").s, pagaF=fin("y cada vuelta se paga"), encada=arr("en cada una"), leer=T("vuelve a leer").s, anterior=T("todo lo anterior").s, anteriorF=fin("todo lo anterior"),
    poreso=arr("por eso diez"), diez=T("diez vueltas").s, mucho=T("mucho más").s, veces=T("diez veces una").s, vecesF=fin("diez veces una"),
    sabes=arr("y sabes qué"), sabesF=fin("lo más importante"), ninguna=arr("en ninguna vuelta"), inteligente=T("inteligente").s, inteligenteF=fin("más inteligente"),
    mismo=arr("es el mismo modelo"), primera=T("primera serie").s, adivina=arr("adivinando"), palabraF=fin("la siguiente palabra"),
    unico=arr("lo único nuevo"), por=T("por fin ve").s, resultado=T("resultado").s, hizo=fin("lo que hizo"),
    nos=arr("eso mismo es"), nosotros=T("a nosotros").s, nosF=fin("a nosotros"), probar=PFA[0], fallar=PFA[1], ajustar=PFA[2], ajustarF=min((r[1] for r in TR if r[0] == PFA[2])),
    listo=arr("un agente no es más"), listoF=fin("más listo que un chatbot"), solo=arr("solo tiene"), segunda=T("segunda").s, oportF=fin("segunda oportunidad"),
    tercera=arr("y una tercera"), terceraF=fin("y una tercera"), todas=arr("y todas las"), pagues=T("le pagues").s, paguesF=fin("todas las que le pagues"),
    dur=m.dur,
)
a = type("A", (), A)
LARGO = dict(A)

# ---------- la pista ----------
MARCAS = ["fiesta", "lleno", "carísimo", "sí", "pastel", "globos", "sillas", "música", "hora", "mamá"]
SITIO = [.075, .757, .845, .915, .16, .245, .40, .49, .58, .975]
PUERTA = .3
JUNTO = .052                                                        # la bola sella a un lado: la marca se debe leer
U_FIN = 14.93

K = [
    (a.busca - .6, 0), (a.busca - .02, 0),
    (a.pregunta - .18, PUERTA), (a.ve - .92, PUERTA),                 # toca, le dicen que no
    (a.ve - .04, SITIO[1] - JUNTO), (a.piensa - .62, SITIO[1] - JUNTO),                # lee y sella
    (a.piensa - .03, .955), (a.busca2 - .02, .955),                          # piensa
    (a.este - .02, 1 + PUERTA), (a.caroF + .1, 1 + PUERTA),
    (a.love - .03, 1 + SITIO[2] - JUNTO * 1.25), (a.busca3 - .12, 1 + SITIO[2] - JUNTO * 1.25),
    (a.mira - .02, 2), (a.mira + .22, 2),
    (a.actua - .03, 2 + PUERTA), (a.actua + .3, 2 + PUERTA),
    (a.revisa - .02, 2 + 2 / 3), (a.revisa + .14, 2 + 2 / 3 + .012),
    (a.revisaF - .1, 2 + SITIO[3] - JUNTO * .6), (a.yvuelve - .12, 2 + SITIO[3] - JUNTO * .6),
    (a.yvuelveF, 3.22), (a.llamamos + .3, 3.56), (a.bucleF, 4.2), (a.noes + .2, 4.6), (a.muchas, 5.25), (a.muchasF, 5.74),
    (a.paga, 5.93), (a.encada - .08, 6.0),                             # frena: esta vuelta se ve leer
    (a.anteriorF, 7.0), (a.poreso, 7.34), (a.veces - .25, 9.55), (a.vecesF + .3, 10), (a.vecesF + .45, 10),
    (a.solo + .28, 10), (a.oportF - .05, 11), (a.terceraF - .05, 12), (a.pagues, 13.4), (a.paguesF + .05, 14.3), (a.paguesF + 1.0, U_FIN), (m.dur + .2, U_FIN),
]
tk, uk = zip(*K)
for x, y in zip(tk, tk[1:]):
    if y <= x:
        raise SystemExit(f"Claves de la pista fuera de orden: {x:.2f} → {y:.2f}")
ufun = PchipInterpolator(tk, uk)
DT = 1 / 120
tt = np.arange(0, m.dur + 1, DT)
uu = ufun(np.clip(tt, tk[0], tk[-1]))
uu[tt < tk[0]] = 0


def cruce(u):
    i = int(np.searchsorted(uu, u))
    return float(tt[min(i, len(tt) - 1)])


# Monedas. `t`: cuándo se paga (la bola pisa la marca); `c`: cuándo cae en la torre.
VUELO = .4
monedas = []
for n in range(10):
    for j in range(n + 1):
        monedas.append({"t": round(cruce(n + SITIO[j]), 3), "j": j, "v": n})
for n in range(10, 15):                                              # las últimas ya no se escriben: solo se pagan
    for k in range(n + 1):
        un = n + (k + .5) / (n + 1)
        if un < U_FIN - .02:
            monedas.append({"t": round(cruce(un), 3), "j": -1, "v": n})
monedas.sort(key=lambda x: x["t"])

sellos = [{"j": j, "t": round(cruce(j - 1 + SITIO[j]), 3)} for j in range(1, len(MARCAS))]
# Las tres primeras se sellan con la bola quieta, en el momento en que la voz lo dice.
sellos[0]["t"] = round(a.lleno2 - .22, 3)
sellos[1]["t"] = round(a.love + .16, 3)
sellos[2]["t"] = round(a.revisaF + .02, 3)

pasos = []
N_HOPS = 14
for k in range(1, 15 * N_HOPS):
    tp = cruce(k / N_HOPS)
    pasos.append(round(tp, 3))

d = Path(__file__).resolve().parents[2] / "remotion/src/serie/a03"
(d / "pista.json").write_text(json.dumps({
    "A": {k: round(x, 3) for k, x in A.items()}, "dt": DT, "u": [round(float(x), 4) for x in uu[::2]], "paso": 2 * DT,
    "monedas": monedas, "sellos": sellos, "MARCAS": MARCAS, "SITIO": SITIO, "PUERTA": PUERTA, "U_FIN": U_FIN, "VUELO": VUELO, "HOPS": N_HOPS, "HOOK0": HOOK0, "HOOK_V": HOOK_V,
}, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
print({k: round(x, 2) for k, x in A.items()})
print(f"monedas: {len(monedas)}; 10 vueltas = {sum(1 for x in monedas if x['v'] < 10)}")

if "--solo-tiempos" in sys.argv:
    for f in m.dir.glob("_*.wav"):
        f.unlink()
    raise SystemExit


# ---------- el foley ----------
def en_voz(t):
    return any(a0 - .03 <= t <= b0 + .03 for a0, b0 in TR)


def moneda(k=1.0, dur=.34):
    """Metal de verdad: parciales inarmónicos con caídas distintas y un golpe de ruido. Con pocos senos suena a arcade."""
    t = np.arange(int(dur * SR)) / SR
    rel = np.array([1, 1.51, 2.24, 2.76, 3.38, 4.07, 5.13, 6.02]) * (1 + rng.normal(0, .008, 8))
    am = (.35, .8, .55, .6, .4, .3, .22, .14)
    dc = np.array([22, 30, 38, 46, 56, 70, 90, 120]) * rng.uniform(.9, 1.2, 8)
    s = sum(a * np.sin(2 * np.pi * 1960 * k * r * t + rng.random() * 6.28) * np.exp(-t * d) for a, r, d in zip(am, rel, dc))
    return s * .26 + .42 * banda(ruido(len(t)), 3500, 12000) * np.exp(-t * 160)


def apila(k=1.0):
    """Moneda contra moneda: seco y más grave que el tintineo."""
    t = np.arange(int(.14 * SR)) / SR
    return sum(np.sin(2 * np.pi * f * k * t) * np.exp(-t * 55) for f in (1320, 1870, 2640)) * .3 + .4 * banda(ruido(len(t)), 1200, 5200) * np.exp(-t * 180)


def papel(dur=.5):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 1600, 6400) * np.sin(np.pi * t) ** 1.4 * (.6 + .4 * np.sin(t * 90))


def asienta(dur=2.3):
    """La moneda que gira y se asienta: golpes cada vez más seguidos, y de pronto nada."""
    y = np.zeros(int(dur * SR) + 9000)
    t, paso = 0.0, .15
    while t < dur:
        p = t / dur
        s = moneda(1 + .12 * p, .12) * (.32 + .55 * p)
        i = int(t * SR)
        y[i:i + len(s)] += s
        t += paso
        paso = max(.011, paso * .935)
    return y


# La carrera del arranque
m.pon(0, soplo(.7, 300, 2600, .16), .42, -.2)
m.pon(0, golpe(96, 44, .32, .3), .5)
for tp in np.arange(HOOK0 % (HOOK_V / 9), 3.2, HOOK_V / 9):           # los mismos saltos de uHook en la animación
    m.pon(float(tp), golpe(120, 62, .11, .2), .22)
m.pon(a.chatbot - .3, soplo(.42, 420, 4200, .5), .34, -.4)          # latigazo al chatbot
m.pon(a.agente - .18, soplo(.42, 420, 4200, .5), .34, .4)            # y de regreso
m.pon(a.cabe, trazo(1.5, 240, 480), .1)
m.pon(a.intentar + .02, golpe(92, 46, .44, .3), .62)
m.pon(a.vuelveF + .1, soplo(1.0, 300, 2400, .4), .22)

# El chatbot: una pregunta, una lista y se apaga
m.pon(a.pides, papel(.8), .12, .4)
m.pon(a.ytt - .22, polvo(.28), .3)
for k, x in enumerate((0, .17, .34)):
    m.pon(a.lista + x, tic(.03, 1600, 4200), .3)
m.pon(a.lista + .6, moneda(.9), .16)
m.pon(a.acaba + .12, tic(.03, 1400, 3800), .9)                       # clac: la bola se apaga
m.pon(a.acaba + .12, golpe(150, 70, .1, .3), .5)
m.pon(a.acabaF + .08, golpe(58, 30, .6, .08), .9)                     # y el iris termina de cerrar

# Se abre el mundo: la espiral
espiral = a.agente2 - .62
m.pon(espiral, golpe(120, 60, .12, .25), .46)
m.pon(espiral, trazo(2.2, 180, 900), .16)
m.pon(espiral + .5, soplo(1.8, 300, 3200, .7), .34)
for x in np.linspace(0, 1, 24):
    m.pon(espiral + (a.cosa - espiral) * x ** .8, golpe(130, 70, .08, .2), .16)
m.pon(a.cosa + .05, golpe(74, 38, .5, .22), .55)
for k in range(3):                                                    # las estaciones se levantan
    m.pon(a.cosa - .05 + k * .14, toc(420 + k * 90), .24)

# La marcha: un paso por salto, con la velocidad que lleve
for tp in pasos:
    if tp < a.vecesF + .2 or tp > a.solo:
        m.pon(tp, golpe(142, 78, .07, .14), .07)

# Puertas: cada paso bajo una estación
for n in range(15):
    for f in (0, 1 / 3, 2 / 3):
        ta = cruce(n + f + .0005)
        m.pon(ta, soplo(.3, 700, 3800, .45), .1 * (1.3 if n > 3 else 1), .25 * ((-1) ** n))

# Primera vuelta
m.pon(a.busca, trazo(.8, 320, 640), .12)
for x in (.03, .25):
    m.pon(a.pregunta + x, toc(330), .55)
    m.pon(a.pregunta + x, golpe(150, 90, .08, .3), .3)
m.pon(a.esta + .3, golpe(74, 38, .34, .34), .7)
m.pon(a.esta + .3, tic(.03, 1200, 3600), .5)

# Segunda: mesa y factura
m.pon(a.este + .1, toc(250), .3)
m.pon(a.este + .35, trazo(.5, 500, 900), .12)
m.pon(a.caro, golpe(74, 38, .34, .34), .7)
m.pon(a.caro, moneda(.75), .24)

# Tercera: las tres estaciones, una por palabra
for x, tono in ((a.mira, 660), (a.actua, 880), (a.revisa, 1100)):
    m.pon(x + .02, cola(toc(tono)), .34)
m.pon(a.actua + .1, toc(330), .4)
m.pon(a.revisaF - .28, campana((659, 880, 1318), 1.2, (.6, .4, .2)), .16)

# Sellos en la pista
for s in sellos:
    g = .6 if s["j"] <= 3 else .2
    m.pon(s["t"], golpe(96, 48, .3, .34), g)
    m.pon(s["t"], tic(.03, 1400, 4200), g * .7)

# Bucle agéntico: la grúa sube y el nombre aterriza
m.pon(a.llamamos - .2, soplo(1.5, 240, 1800, .6), .22)
m.pon(a.bucle - .02, campana((329.6, 493.9, 659.3), 1.8, (.8, .4, .2)), .24)
m.pon(a.respuesta, tic(.03, 1600, 4200), .24)

# Monedas: cada una suena al caer, y por eso la cuenta se oye acelerar
for k, mo in enumerate(monedas):
    tc = mo["t"] + VUELO
    if mo["v"] < 10:
        g = .22 if mo["v"] < 7 else .15
    else:
        g = .07
    if en_voz(tc):                                                    # la voz manda: las monedas se apartan
        g *= .62
    m.pon(tc, moneda(1 + .05 * rng.random() + .008 * min(k, 55)), g, float(rng.uniform(-.45, .45)))
    if mo["v"] < 10:
        m.pon(tc, apila(1 + .006 * k), g * .8)

# Y cada vuelta se paga: la moneda grande
m.pon(a.paga - .46, soplo(.5, 900, 4400, .85), .24)
m.pon(a.paga + .02, moneda(.62, .9), .62)
m.pon(a.paga + .02, golpe(88, 44, .4, .3), .65)
for k, tm in enumerate((.17, .29, .38, .45)):
    m.pon(a.paga + .02 + tm, moneda(.66, .2), .28 - k * .05)

# Diez veces una: la pila chica
m.pon(a.veces - .1, lluvia(.9, 14), .3)
m.pon(a.vecesF + .1, golpe(78, 40, .5, .25), .5)

# El giro: se frena todo
m.pon(a.vecesF + .55, golpe(52, 28, 1.2, .05), .9)
m.pon(a.ninguna - .08, soplo(.5, 400, 2400, .5), .16)
tplant = np.linspace(a.ninguna + .22, a.inteligente - .05, 10)
for k, x in enumerate(tplant):
    m.pon(float(x), tic(.03, 2200, 6200), .34)
    m.pon(float(x), toc(760 + k * 14), .14)
m.pon(a.inteligenteF - .08, golpe(92, 50, .36, .24), .7)
m.pon(a.inteligenteF - .08, campana((493.9, 739.9), 1.5, (.7, .3)), .18)
m.pon(a.mismo - .05, papel(.4), .1)
for x in np.linspace(a.adivina, a.palabraF - .25, 5):
    m.pon(float(x), tic(.024, 1800, 5000), .26)
m.pon(a.palabraF - .1, toc(620), .36)

# Lo único nuevo: la flecha que cierra la vuelta
m.pon(a.unico + .3, trazo(a.hizo - a.unico - .3, 260, 620), .22)
m.pon(a.hizo - .12, campana((440, 660, 880), 1.5, (.7, .35, .2)), .3)
m.pon(a.hizo - .12, golpe(96, 50, .28, .22), .5)

# Nosotros: la valla
m.pon(a.probar - .1, soplo(.4, 500, 2800, .5), .2)
m.pon(a.fallar, golpe(84, 42, .4, .4), .76)
m.pon(a.fallar + .03, tic(.03, 1000, 3000), .5)
m.pon(a.fallar + .1, polvo(.2), .2)
m.pon(a.ajustar + .4, soplo(.4, 500, 3200, .5), .22)
m.pon(a.ajustarF + .34, golpe(120, 60, .2, .24), .4)

# Igual de listos
m.pon(a.listo + .9, tic(.03, 2200, 6200), .4)
m.pon(a.listo + 1.3, tic(.03, 2200, 6200), .4)
m.pon(a.listoF - .1, toc(520), .3)

# Oportunidades
m.pon(a.solo - .1, soplo(.5, 500, 3400, .4), .3)
m.pon(a.segunda + .02, golpe(92, 48, .32, .3), .6)
m.pon(a.tercera + .22, golpe(92, 48, .32, .3), .66)
m.pon(a.todas, lluvia(a.paguesF - a.todas + .5, 60), .4)
for x in np.arange(a.todas, a.paguesF + .5, .035):
    m.pon(float(x), moneda(.8 + rng.random() * .3, .2), float(rng.uniform(.03, .08)), float(rng.uniform(-.7, .7)))

# La última moneda se asienta, y el silencio
fin_voz = a.paguesF
m.pon(fin_voz + .32, asienta(2.2), .34)
m.pon(fin_voz + 2.5, golpe(150, 90, .1, .3), .2)

# Música: la subida del tema cae justo en la cuenta. Se corta con el chatbot y con el giro.
corte1 = a.acaba + .12
vuelve_m = a.agente2 - .12
corte2 = a.vecesF + .55
reg = a.nos - .1
m.musica([("a03_vueltas", 49, 0, corte1, .03, .04), ("a03_vueltas", 48 - (a.poreso - vuelve_m), vuelve_m, corte2, .3, .05), ("a03_vueltas", 6, a.mismo - .1, reg + .3, 1.5, .5), ("a03_vueltas", 56, reg, a.paguesF + 2.2, .7, 1.9)], nivel=-24.5)
m.cierra()
