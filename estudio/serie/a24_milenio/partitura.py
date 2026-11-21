"""a24: el problema del milenio. Una hoja con agua y tinta que gira en remolinos de verdad: cinco vórtices
de núcleo suave que se pasean, ruido de rizo de fondo y paredes que no dejan escapar el agua; miles de
partículas lo siguen y dejan su estela. Sobre el agua flota una medalla de un millón de dólares que la bola
con manos intenta alcanzar y la corriente se lleva.

OpenAI anuncia; la bola se multiplica en unos diez mil agentes alrededor de la hoja, con un reloj de 88 horas
y manos humanas que dirigen desde arriba. "¿Es verdad?": todo se congela. Entra el sello EN REVISIÓN del
Instituto Clay justo cuando entra el golpe de la música, y desde ahí baja despacio sin terminar de caer:
dos hojas que no empatan (versión formal y texto), una mano que empuja el agua (fuerza externa) y que al
irse deja la pregunta abierta, una lupa que no encuentra error. Lo demostrado, en otra parte de la mesa:
la medalla de oro de la olimpiada cae y rebota; la conjetura de Erdős se rompe y nueve firmas se palomean;
diez problemas "resueltos" se voltean y son recortes de libros viejos. Cierra con una pila enorme de pruebas
que crece bajo el sello, y una sola persona con lupa al pie. La música termina sola: el último golpe cae
justo después de "cierta" y su cola es el final.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PISTA = "a24_milenio"
GOLPE_PISTA, FIN_PISTA, DROP, DROP_FIN = 112.2, 116.6, 48.0, 80.0      # medidos sobre la pista, en segundos
PAUSAS = {"es verdad": .25, "el instituto clay": .6, "lo demostrado": .5, "y también hay": .15,
          "producir una prueba": .5, "si es cierta": .35}
m = Mezcla(PISTA, pausas=PAUSAS, cola=3.6).exporta_tiempos()
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
if _ini is not None:
    TR.append((_ini / SR, len(_sil) / SR))


def tramo(f, desde=0):
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs((r[0] + r[1]) / 2 - c) if r[0] - .1 <= c <= r[1] + .1 else 99 + abs(r[0] - c))


arr = lambda f, d=0: tramo(f, d)[0]          # arranque real del tramo que contiene la palabra
fin = lambda f, d=0: tramo(f, d)[1]          # final real

FIN_VOZ = fin("cierta")
OFF = GOLPE_PISTA - (FIN_VOZ + .2)          # la pista termina sola: su último golpe cae justo después de "cierta"

E = {}
# ---------- 1. la hoja, la medalla ----------
E["gota"] = .12                              # una gota de tinta cae al agua en el primer cuadro
E["alcanza"] = r3(arr("acabe de") + .25)     # la bola estira la mano hacia la medalla... y la corriente se la lleva
E["millon"] = s("millón") - .08
E["casi"] = arr("y casi nadie") - .05
E["comprobar"] = s("comprobarlo") - .05
# ---------- 2. el anuncio ----------
E["sept"] = arr("en septiembre") - .05
E["openai"] = s("openai") - .05
E["anuncio"] = s("anunció") - .05
E["ns"] = s("navier-stokes") - .08
E["ecuaciones"] = s("ecuaciones") - .05
E["fluidos"] = s("fluidos") - .05
E["milenio"] = s("problemas del milenio") - .05
E["siete"] = [r3(E["milenio"] + .05 + k * .1) for k in range(7)]
# ---------- 3. cómo dice que lo hizo ----------
E["dice"] = arr("dice que usó") - .05
E["modelo"] = s("modelo interno") - .05
E["diezmil"] = s("diez mil") - .08
E["agentes"] = s("agentes") - .05
E["horas"] = s("ochenta y ocho") - .08
E["horasF"] = r3(e("horas") + .05)
E["humanos"] = s("humanos") - .08
E["verdad"] = arr("es verdad") - .05
E["sabe"] = arr("esto es lo que") - .05
# ---------- 4. el sello que nunca cae ----------
E["sello"] = r3(DROP - OFF)                   # el sello entra con el golpe de la música
E["clay"] = s("instituto clay") - .05
E["premio"] = s("premio") - .05
E["aparente"] = s("aparentemente") - .05
E["resuelto1"] = s("quedó resuelto") - .05
E["prisa"] = s("sin prisa") - .05
E["mates"] = arr("unos matemáticos") - .05
E["formal"] = s("versión formal") - .05
E["texto"] = s("el texto") - .05
E["nodicen"] = s("no dicen") - .05
E["exacto"] = s("exactamente") - .05
E["experto"] = arr("y un experto") - .05
E["fuerza"] = s("fuerza externa") - .1
E["empuja"] = r3(E["fuerza"] + .1)
E["fondo"] = arr("la pregunta de fondo") - .05
E["sinella"] = s("sin ella") - .05
E["abierta"] = s("sigue abierta") - .05
E["hasta"] = arr("hasta hoy") - .05
E["error"] = s("encontrado un error") - .05
E["pero"] = arr("pero tampoco") - .05
E["confirmado"] = s("confirmado") - .05
E["jalon"] = r3(s("confirmado") + .1)        # el sello da un jalón hacia abajo... y se detiene
# ---------- 5. lo demostrado ----------
E["demostrado"] = arr("lo demostrado") - .05
E["paneo"] = r3(fin("confirmado") + .15)
E["modesto"] = s("modesto") - .05
E["brutal"] = s("brutal") - .05
E["finDrop"] = r3(DROP_FIN - OFF)
E["julio"] = arr("en julio") - .05
E["gemini"] = s("gemini") - .05
E["oro"] = s("oro") - .08
E["olimpiada"] = s("olimpiada") - .05
E["mayo"] = arr("en mayo") - .05
E["modeloOAI"] = s("un modelo de openai") - .05
E["refuto"] = s("refutó") - .05
E["erdos"] = s("erdős") - .05
E["nueve"] = s("nueve matemáticos") - .05
a, b = s("verificaron"), e("prueba", T("verificaron").i) - .05
E["firmas"] = [r3(a + (b - a) * k / 8) for k in range(9)]
E["papelones"] = arr("y también hay") - .05
E["presumio"] = s("presumió") - .05
E["gpt5"] = s("gpt-5") - .05
E["diez"] = s("diez problemas") - .05
E["llegan"] = [r3(E["papelones"] + .35 + k * .1) for k in range(10)]
E["sellos10"] = [r3(s("había resuelto") - .05 + k * .075) for k in range(10)]
E["encontrado"] = s("encontrado ya") - .05
E["voltea"] = [r3(s("encontrado ya") + k * .085) for k in range(10)]
E["yaresueltos"] = s("ya resueltos") - .05
# ---------- 6. la pila y la lupa ----------
E["producir"] = arr("producir una prueba") - .05
E["regreso"] = r3(fin("ya resueltos") + .1)
E["dificil1"] = s("lo difícil", T("producir").i) - .05
E["lodificil"] = arr("lo difícil es") - .05
E["alguien"] = s("alguien") - .05
E["decirte"] = s("decirte") - .05
E["cierta"] = arr("si es cierta") - .05
E["finvoz"] = r3(FIN_VOZ)
E["golpeFinal"] = r3(FIN_VOZ + .2)
E["fin"] = r3(m.dur)
E["OFF"] = r3(OFF)
(RAIZ / "remotion/src/serie/a24/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print({k: v for k, v in E.items() if not isinstance(v, list)})

if "--solo-tiempos" in sys.argv:
    raise SystemExit


# =====================================================================================================
# Sonido. Cada golpe nace del mismo instante que el dibujo (eventos.json).
# =====================================================================================================
def azar(seed):
    """El mismo generador que `azar` en kit.ts: así las hojas que vuelan suenan donde aterrizan."""
    st = [seed & 0xFFFFFFFF]

    def imul(a, b):
        return (a * b) & 0xFFFFFFFF

    def r():
        st[0] = (st[0] + 0x6D2B79F5) & 0xFFFFFFFF
        t = st[0]
        t = imul(t ^ (t >> 15), t | 1)
        t ^= (t + imul(t ^ (t >> 7), t | 61)) & 0xFFFFFFFF
        return ((t ^ (t >> 14)) & 0xFFFFFFFF) / 4294967296
    return r


def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def env_lineal(puntos, n):
    """Envolvente por tramos [(t, valor)] muestreada a SR."""
    ts = np.array([p[0] for p in puntos]) * SR
    vs = np.array([p[1] for p in puntos])
    return np.interp(np.arange(n), ts, vs)


def gota():
    """Plip de una gota: chirrido corto que baja, un bloop grave y salpicadura."""
    n = int(.35 * SR)
    t = np.arange(n) / SR
    f = 700 + 1400 * np.exp(-t * 60)
    plip = np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26)
    f2 = 160 + 260 * np.exp(-t * 30)
    bloop = np.sin(2 * np.pi * np.cumsum(f2) / SR) * np.exp(-t * 14)
    return plip * .55 + bloop * .6 + banda(ruido(n), 2500, 9000) * np.exp(-t * 40) * .25


def metal(f0=1180, dur=1.1, brillo=1.0):
    """Moneda grande: parciales inarmónicos que tardan en apagarse."""
    t = np.arange(int(dur * SR)) / SR
    y = sum(a * np.sin(2 * np.pi * f0 * k * t) * np.exp(-t * d) for k, a, d in ((1, .5, 4), (2.76, .35 * brillo, 6), (5.4, .22 * brillo, 9), (8.9, .1 * brillo, 14)))
    return y * np.minimum(t / .002, 1)


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def rasgado(dur=.55):
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = banda(ruido(n), 2000, 8000) * (.55 + .45 * (np.sin(2 * np.pi * 37 * t) > .2)) * np.sin(np.pi * np.minimum(t / dur, 1)) ** .4
    for _ in range(26):
        x = tic(.016, 1500, 7000)
        i = int(rng.random() * (n - len(x)))
        y[i:i + len(x)] += x * rng.uniform(.4, 1)
    return y


def pluma(dur=.2):
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = (.55 + .45 * np.abs(np.sin(2 * np.pi * 9 * t + rng.random()))) * np.sin(np.pi * np.minimum(t / dur, 1)) ** .4
    return banda(ruido(n), 1800, 7500) * e * .6


def sello_golpe():
    return suma(golpe(150, 70, .2, .9), tic(.02, 1500, 5000) * .6)


def crujido(dur=.6):
    """Madera que se queja: tono bajo que tiembla y chasquidos."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 95 + 25 * np.sin(2 * np.pi * 7 * t)
    y = np.sin(2 * np.pi * np.cumsum(f) / SR) * (np.sin(2 * np.pi * 31 * t) > 0) * np.sin(np.pi * t / dur) * .35
    return y + banda(ruido(n), 400, 2500) * np.sin(np.pi * t / dur) ** 2 * .3


def silbato(f0=620, f1=180, dur=.6):
    n = int(dur * SR)
    f = np.geomspace(f0, f1, n)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** .5 * .5


def tictac(f):
    t = np.arange(int(.05 * SR)) / SR
    return suma(np.sin(2 * np.pi * f * t) * np.exp(-t * 120), tic(.012, 3000, 9000) * .7)


def oleaje(dur, lo=150, hi=900):
    """El agua de la hoja: rumor filtrado que respira, con burbujas."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    y = banda(ruido(n), lo, hi) * (.55 + .25 * np.sin(2 * np.pi * .13 * t) + .2 * np.sin(2 * np.pi * .31 * t + 1)) * .6
    y += banda(ruido(n), 1300, 4200) * (.15 + .1 * np.sin(2 * np.pi * .23 * t + 2)) * .25
    for _ in range(int(dur * 3)):
        i = int(rng.random() * (n - 3200))
        tt = np.arange(3000) / SR
        f = rng.uniform(380, 1100)
        y[i:i + 3000] += np.sin(2 * np.pi * np.cumsum(f * (1 + tt * 8)) / SR) * np.exp(-tt * 50) * .3
    return y


def murmullo(dur, dens):
    """Diez mil manitas trabajando: chasquidos finitos, muchos."""
    n = int(dur * SR)
    y = np.zeros(n)
    for _ in range(int(dur * dens)):
        i = int(rng.random() * (n - 900))
        x = tic(.012, 2500, 9000)
        y[i:i + len(x)] += x * rng.uniform(.2, 1)
    return y


q30 = lambda t: round(t * 30) / 30
GOTAS = [.12, q30(E["anuncio"]), q30(E["ns"]), q30(E["milenio"]), q30(E["experto"] + .15), q30(E["hasta"]), q30(E["sello"] + 1.2)]

# ---------- el agua, debajo de todo ----------
N = m.N
ola = oleaje(m.dur)
g_ola = env_lineal([(0, .9), (E["diezmil"], .9), (E["diezmil"] + 1.2, .35), (E["sabe"], .35), (E["sabe"] + 1.5, .8),
                    (E["empuja"] - .2, .8), (E["empuja"] + .4, 1.5), (E["sinella"], 1.2), (E["sinella"] + 1, .8),
                    (E["paneo"] + .5, .8), (E["paneo"] + 3, 0), (E["regreso"], 0), (E["regreso"] + 1.2, .6), (m.dur, .5)], N)
m.pon(0, ola * g_ola, .16)

# ---------- 1. la gota, la medalla ----------
m.pon(0.0, soplo(.16, 900, 5000, .8), .25)
for k, tg in enumerate(GOTAS):
    m.pon(tg, gota(), .62 if k == 0 else .42, ((k % 3) - 1) * .3)
m.pon(.12, golpe(70, 36, .5, .3), .55)
m.pon(E["alcanza"] - .5, soplo(.6, 500, 3200, .6), .2, -.3)
m.pon(E["alcanza"] + .05, tic(.02, 1500, 5000), .35, -.2)
m.pon(E["alcanza"] + .1, oleaje(1.2, 200, 1400) * np.sin(np.linspace(0, np.pi, int(1.2 * SR))), .5)
m.pon(E["millon"] - .02, metal(1180), .42)
m.pon(E["millon"] + .1, polvo(.5), .3)
m.pon(E["casi"], golpe(60, 32, .6, .1), .3)
m.pon(E["comprobar"], soplo(.7, 300, 2400, .4), .16)
# ---------- 2. el anuncio ----------
m.pon(E["openai"], papel(.3), .3)
m.pon(E["ns"] - .02, golpe(55, 30, .9, .15), .5)
for k in range(9):
    m.pon(E["ecuaciones"] + .05 + k * .08, tic(.015, 2000, 7000), .2, -.6 + k * .15)
m.pon(E["ecuaciones"], trazo(.8, 300, 700), .15)
for k, ts in enumerate(E["siete"]):
    m.pon(ts, metal(1400 + 90 * k, .5, .6), .16, -.6 + k * .2)
# ---------- 3. los diez mil ----------
m.pon(E["modelo"], campana((220, 330), 1.0, (.6, .3)), .22)
m.pon(E["modelo"] + .45, campana((220, 330), .8, (.5, .25)), .14)
m.pon(E["diezmil"] - .1, soplo(1.4, 200, 2600, .5), .2)
dens = murmullo(1.5, 900) * np.linspace(1, .3, int(1.5 * SR)) ** .5
m.pon(E["diezmil"], dens, .22)
m.pon(E["diezmil"] + 1.2, murmullo(E["verdad"] - E["diezmil"] - 1.2, 160), .1)
t = E["horas"]
k = 0
while t < E["horasF"]:
    m.pon(t, tictac(2000 if k % 2 == 0 else 1600), .15)
    t += max(.03, .14 - (t - E["horas"]) * .1)
    k += 1
m.pon(E["horasF"], campana((1046.5, 1568), .9, (.5, .25)), .18)
m.pon(E["humanos"] - .15, soplo(.6, 300, 2000, .6), .18)
m.pon(E["humanos"] + .35, golpe(110, 55, .25, .3), .18)
m.pon(E["verdad"], suma(golpe(80, 40, .3, .5), tic(.03, 800, 4000)), .5)
m.pon(E["verdad"] + .05, silbato(500, 140, .45), .22)
# ---------- 4. el sello ----------
m.pon(E["sello"] - .6, soplo(.62, 200, 3000, .9), .55)
m.pon(E["sello"], golpe(48, 26, 1.2, .2), .9)
m.pon(E["sello"] + .03, crujido(.7), .5)
m.pon(E["premio"] + .05, metal(1500, .7, .5), .2)
for k in range(int((E["mates"] - E["prisa"] - .3) / .16)):
    m.pon(E["prisa"] + .1 + k * .16, toc(820 if k % 3 else 640), .16, -.5)
m.pon(E["mates"], papel(.45), .45, -.4)
m.pon(E["mates"] + .1, papel(.45), .45, .4)
m.pon(E["formal"], toc(700), .2, -.3)
m.pon(E["texto"], toc(760), .2, .3)
for k in range(7):
    m.pon(E["nodicen"] - .2 + k * .14, trazo(.2, 500, 900), .14)
m.pon(E["exacto"] - .05, campana((233, 277), 1.0, (.5, .4)), .3)
m.pon(E["exacto"] - .05, golpe(90, 50, .3, .3), .3)
m.pon(E["experto"] - .1, papel(.5), .4)
m.pon(E["fuerza"] - .65, soplo(.7, 250, 1800, .7), .4, .5)
m.pon(E["empuja"], golpe(64, 32, .6, .3), .7, .3)
m.pon(E["empuja"] + .02, oleaje(1.6, 120, 1100) * np.exp(-np.linspace(0, 2.4, int(1.6 * SR))), 1.1, .2)
m.pon(E["sinella"], soplo(.8, 250, 2000, .3), .35, .5)
m.pon(E["abierta"], campana((523.3, 784), 1.6, (.4, .3)), .2)
m.pon(E["hasta"] + .3, trazo(2.4, 900, 1300), .1)
m.pon(E["error"] + .3, toc(560), .25)
m.pon(E["jalon"], golpe(52, 28, .8, .3), .85)
m.pon(E["jalon"] + .02, crujido(.5), .55)
# ---------- 5. lo demostrado ----------
m.pon(E["paneo"] + .2, soplo(3.0, 150, 1600, .5), .3)
m.pon(E["brutal"] - .02, golpe(56, 30, .8, .4), .75)
tc = E["julio"] + .25
m.pon(tc, soplo(.7, 600, 4000, .9), .3)
for k, ti in enumerate(rebotes(tc, 7.5, .42, 30)[:4]):
    g = .42 ** k
    m.pon(ti, golpe(130, 60, .2, .6), .5 * g ** .5)
    m.pon(ti, metal(980, .8, .8), .3 * g ** .6)
m.pon(E["oro"] - .1, soplo(.35, 800, 4000, .5), .25)
m.pon(E["oro"] + .25, campana((1318.5, 1975.5, 2637), 1.6, (.5, .35, .2)), .28)
m.pon(E["mayo"] - 1.05, soplo(1.0, 200, 2000, .5), .3)
m.pon(E["mayo"] + .1, papel(.35), .35)
m.pon(E["refuto"] - .1, rasgado(.6), .36)
m.pon(E["refuto"] + .05, golpe(70, 36, .4, .2), .22)
m.pon(E["nueve"] - .3, papel(.4), .35)
for k, tf in enumerate(E["firmas"]):
    m.pon(tf - .14, pluma(.22), .4, -.5 + (k % 3) * .5)
    m.pon(tf + .1, suma(tic(.03, 1800, 6000), toc(1500 + 60 * k) * .5), .3, -.5 + (k % 3) * .5)
m.pon(E["papelones"] - .45, soplo(1.0, 200, 2000, .5), .3)
for k, tl in enumerate(E["llegan"]):
    m.pon(tl, papel(.22), .3, (-.4, .4)[k % 2])
for k, ts in enumerate(E["sellos10"]):
    m.pon(ts + .05, sello_golpe(), .38, (-.4, .4)[k % 2])
for k, tv in enumerate(E["voltea"]):
    m.pon(tv, papel(.16), .3, (-.4, .4)[k % 2])
m.pon(E["yaresueltos"], silbato(440, 300, .5), .14)
m.pon(E["yaresueltos"] + .45, silbato(380, 220, .7), .14)
# ---------- 6. la pila ----------
m.pon(E["regreso"] - .1, soplo(1.2, 200, 3200, .4), .3)
q = azar(88)
for i in range(120):
    q()
    t0 = E["producir"] - .1 + q() * 3.0
    q(); q()
    m.pon(t0, papel(.12), .022, rng.uniform(-.7, .7))
    m.pon(t0 + .55, suma(golpe(170, 90, .08, .5) * .5, papel(.08)), .045, rng.uniform(-.3, .3))
m.pon(E["producir"], murmullo(E["lodificil"] - E["producir"], 120), .1)
m.pon(E["lodificil"] + .1, golpe(90, 50, .2, .2), .25)
m.pon(E["alguien"], trazo(.6, 700, 1100), .15)
m.pon(E["golpeFinal"] - .02, polvo(.4), .3)
m.pon(E["golpeFinal"] + .3, soplo(2.5, 200, 1500, .2), .12)

# ---------- música: la pista entera, de su groove a su final; el golpe entra con el sello ----------
m.musica([(PISTA, OFF, 0.0, m.dur, .02, 0.0)], nivel=-25.5)
_x = lee(RAIZ / "serie" / "musica" / f"{PISTA}.mp3")
escribe(m.dir / "_pista.wav", _x)
_Lp = lufs(m.dir / "_pista.wav")


def lufs_tramo(a, b):
    escribe(m.dir / "_tramo.wav", _x[int((a + OFF) * SR):int((b + OFF) * SR)])
    return lufs(m.dir / "_tramo.wav") - _Lp - 25.5          # ya con el nivel de m.musica


OBJ = -25.8                                                 # ~9 dB bajo la voz (-16.8)
L_groove, L_drop, L_break = lufs_tramo(1, E["verdad"] - .5), lufs_tramo(E["sello"] + .5, E["finDrop"] - .5), lufs_tramo(E["finDrop"] + .5, E["golpeFinal"] - .5)
print(f"música: groove {L_groove:.1f}, golpe {L_drop:.1f}, cierre {L_break:.1f} LUFS -> {OBJ}")
gd = lambda L, extra=0: 10 ** ((OBJ - L + extra) / 20)
pts = [(0, gd(L_groove)), (E["verdad"] - .1, gd(L_groove)), (E["verdad"] + .25, gd(L_groove, -5)), (E["sello"] - .1, gd(L_groove, -5)),
       (E["sello"], gd(L_drop, 1.2)), (E["sello"] + 1.6, gd(L_drop, 1.2)), (E["clay"] + .6, gd(L_drop)), (E["finDrop"] - .05, gd(L_drop)),
       (E["finDrop"] + .3, gd(L_break)), (m.dur, gd(L_break))]
m.mus *= env_lineal(pts, m.N)[:, None]

# ---------- el foley va debajo de la voz ----------
vz = np.abs(m.voz[:m.N].mean(axis=1))
L = min(len(vz), m.N)


def media(a, n):
    c = np.cumsum(np.concatenate([[0.0], a]))
    y = (c[n:] - c[:-n]) / n
    return np.concatenate([np.full(n // 2, y[0]), y, np.full(len(a) - len(y) - n // 2, y[-1])])


env = media(vz, int(.06 * SR))
env = np.clip(env / (np.percentile(env[env > 1e-4], 85) + 1e-9), 0, 1)
env = media(np.maximum(env, media(env, int(.3 * SR))), int(.12 * SR))
g = np.ones(m.N)
g[:L] = 1 - .48 * np.clip(env[:L] * 1.6, 0, 1)
m.fx *= (.55 * g)[:, None]
m.cierra()
