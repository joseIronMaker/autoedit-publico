"""a25: el laboratorio. Una mesa de laboratorio de papel, con tubitos, frascos y una placa de cultivo a tinta.

Abre con la bola con manos que avienta una tarjeta parada sobre la mesa: un frasco, una flecha y un ojo. El ojo se
infla encima, con una mancha al centro de lo que ve. Una mano humana con pipeta deja caer una gota en la placa y la
lupa muestra células de papel que se comen sus basuritas: funcionó. En células. Al lado, una silueta punteada y vacía:
no en personas, todavía. Barrido a la izquierda: una pila de artículos que se pierde arriba alimenta a tres bolas
(Robin, de FutureHouse): una lee, otra suelta tarjetitas con «?», otra dibuja un experimento. Con un brazo de hule saca
del estante un frasco viejo, el ripasudil, y deja la tarjeta: ripasudil → degeneración macular seca; encima, el ojo con
la mancha y unos lentes. Las manos humanas hacen el experimento y el efecto aparece en la lupa. Más allá, seis bolas
alrededor de una mesa redonda se avientan tarjetas y se tachan (Co-Scientist, Google, Nature); tres tarjetas salen
volando hacia una placa de tres pocillos con mini hígados de papel; una mano los prueba y dos dejan de cicatrizar.
Silencio: «fíjate quién hizo qué». La bola propone (abanico de tarjetas); las manos eligen una, traen materiales y
prueban. Vuelven las cuatro esclusas; la primera, «¿se puede comprobar?», se queda: arriba, software, los barquitos
cruzan en un segundo y el cronómetro gira; abajo, biología, tres compuertas (célula, ratón, persona) y un calendario
que no deja de arrancar hojas. Las ideas se amontonan frente a la primera compuerta. De vuelta a la mesa: una tarjeta
nueva, «¿cura?», y una mano con pipeta que decide. La gota cae: es el laboratorio.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"no en personas": .25, "todavía": .3, "en mayo": .5, "propuso usar": .3, "las personas hicieron": .3,
          "google tiene": .6, "con stanford": .3, "pero fíjate": .6, "la máquina propone": .3, "y aquí vuelven": .5,
          "en biología": .3, "toma meses": .3, "el problema ya": .5, "la inteligencia artificial ya": .4, "es el laboratorio": .35}
m = Mezcla("a25_laboratorio", pausas=PAUSAS, cola=3.4).exporta_tiempos()
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

E = {}
# ---------- 0. la tarjeta, el ojo, la gota ----------
E["slap"] = .3
E["medic"] = s("medicamento") - .05
E["ceguera"] = s("ceguera") - .1
E["lab"] = arr("y en el laboratorio")
E["gota"] = s("funcionó") - .12
E["toca"] = r3(E["gota"] + .3)
E["celulas"] = arr("en células")
E["personas"] = arr("no en personas")
E["todavia"] = arr("todavía")
# ---------- 1. Robin ----------
E["mayo"] = arr("en mayo")
E["fh"] = s("futurehouse") - .05
E["robin"] = s("robin") - .08
E["pops"] = [r3(E["robin"] + k * .16) for k in range(3)]
E["equipo"] = arr("un equipo")
E["lee"] = s("lee") - .05
a, b = E["lee"], fin("artículos") + .3
E["hojas"] = [r3(a + (b - a) * (k / 9) ** .9) for k in range(10)]
E["propone"] = arr("propone hipótesis")
E["hipo"] = s("hipótesis") - .05
E["ideas"] = [r3(E["propone"] + .12 + k * .32) for k in range(4)]
E["disena"] = s("diseña") - .05
E["exper"] = s("experimentos") - .05
E["expF"] = fin("experimentos")
# ---------- 2. el ripasudil ----------
E["propuso"] = arr("propuso usar")
E["estira"] = s("medicamento", T("propuso usar").i) - .1
E["existe"] = s("existe") - .1
E["frasco"] = r3(arr("el ripasudil") - .02)                 # el frasco aterriza en la mesa
E["ripa"] = s("ripasudil") - .05
E["degen"] = arr("contra la degeneración")
E["tarjeta"] = r3(E["degen"] + .05)
E["macular"] = s("macular") - .05
E["causas"] = arr("una de las causas")
E["cegB"] = s("ceguera", T("causas").i) - .05
E["adultos"] = s("adultos") - .08
# ---------- 3. las personas ----------
E["hicieron"] = arr("las personas hicieron")
E["exp2"] = s("experimentos", T("hicieron").i) - .05
E["toca2"] = r3(E["exp2"] + .32)
E["efecto"] = arr("y el efecto")
E["aparecio"] = s("apareció") - .05
# ---------- 4. Co-Scientist ----------
E["google"] = arr("google tiene")
E["cosci"] = arr("co-scientist")
E["nature"] = s("nature") - .05
E["debaten"] = s("debaten") - .05
E["tiros"] = [r3(E["debaten"] + k * .36) for k in range(5)]
E["corrigen"] = arr("y se corrigen")
E["tachas"] = [r3(s("corrigen") - .08), r3(s("corrigen") + .22)]
E["nuevas"] = [r3(E["tachas"][0] + .45), r3(E["tachas"][1] + .45)]
# ---------- 5. Stanford ----------
E["stanford"] = arr("con stanford")
E["medics"] = s("medicamentos") - .05
E["vuelan"] = [r3(E["medics"] + k * .14) for k in range(3)]
E["fibrosis"] = s("fibrosis") - .05
E["probaron"] = arr("los probaron")
E["gotas"] = [r3(E["probaron"] + .25 + k * .42) for k in range(3)]
E["organoides"] = s("organoides") - .05
E["mini"] = arr("mini hígados")
E["frenaron"] = arr("y dos la frenaron")
E["frenan"] = s("frenaron") - .05
# ---------- 6. quién hizo qué ----------
E["fijate"] = arr("pero fíjate")
E["quien"] = s("quién") - .05
E["llega"] = r3(arr("la máquina propone") - .35)
E["maquina"] = arr("la máquina propone")
E["abanico"] = [r3(s("propone", T("la máquina").i) - .1 + k * .14) for k in range(4)]
E["eligen"] = s("eligen") - .08
E["elige"] = r3(s("problema") + .05)
E["consiguen"] = arr("consiguen")
E["trae"] = r3(s("materiales") + .1)
E["prueban"] = s("prueban") - .08
E["toca3"] = r3(E["prueban"] + .28)
# ---------- 7. las esclusas ----------
E["vuelven"] = arr("y aquí vuelven")
E["suben"] = [r3(s("cuatro") - .08 + k * .17) for k in range(4)]
E["software"] = arr("en software")
E["pases"] = [r3(s("corre") - .1), r3(s("sabe") - .15), r3(s("falló") - .35)]
E["segundos"] = s("segundos") - .05
E["biologia"] = arr("en biología")
E["celula"] = s("célula") - .08
E["raton"] = s("ratón") - .08
E["persona"] = s("persona") - .08
E["toma"] = arr("toma meses")
E["meses"] = s("meses") - .05
E["anos"] = s("años") - .05
# ---------- 8. las ideas se amontonan ----------
E["ideas0"] = arr("el problema ya")
a, b = E["ideas0"] + .1, s("ideas", T("el problema ya").i) + .35
E["lluvia"] = [r3(a + (b - a) * (k / 13) ** .8) for k in range(14)]
E["tener"] = s("tener") - .05
E["comprobar"] = arr("es comprobarlas")
E["compF"] = fin("es comprobarlas")
# ---------- 9. el cierre ----------
E["puede"] = arr("la inteligencia artificial ya")
E["proponer"] = s("proponer") - .05
E["nueva"] = r3(s("curas") - .05)                  # la tarjeta nueva aterriza
E["decide"] = arr("quien todavía")
E["funcionan"] = s("funcionan") - .05
E["lab2"] = arr("es el laboratorio")
E["suelta"] = r3(s("laboratorio", T("es el").i) - .12)
E["golpeF"] = r3(E["suelta"] + .3)
E["fin"] = fin("es el laboratorio")
E["dur"] = r3(m.dur)
(RAIZ / "remotion/src/serie/a25/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print({k: v for k, v in E.items() if not isinstance(v, list)})


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def palmada():
    """Tarjeta de cartulina que cae parada en la mesa: golpe seco y papel."""
    return suma(golpe(170, 80, .14, .7) * .7, papel(.12) * .6, tic(.02, 2000, 6000) * .5)


def gota():
    """Gota que cae en el agar: plip con burbuja."""
    t = np.arange(int(.22 * SR)) / SR
    f = 900 + 1400 * (t / .22) ** .5
    return suma(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 22) * .6, tic(.012, 3000, 9000) * .4)


def chupa(dur=.18):
    """La pipeta que aspira: un soplito hacia arriba."""
    return soplo(dur, 600, 3000, .6) * .5


def vidrio(f=2400):
    """Frasco o tubo que choca: tintineo corto."""
    return campana((f, f * 1.51, f * 2.3), .5, (.5, .25, .12)) * .5


def tintineo(n=5):
    y = np.zeros(int(.8 * SR))
    for k in range(n):
        i = int(k * .055 * SR + rng.random() * 600)
        x = vidrio(rng.uniform(2200, 3600)) * rng.uniform(.25, .6)
        y[i:i + len(x)] += x[: len(y) - i]
    return y


def burbujas(dur=.9, n=7):
    y = np.zeros(int((dur + .2) * SR))
    for k in range(n):
        i = int((k / n) * dur * SR + rng.random() * 1200)
        t = np.arange(int(.1 * SR)) / SR
        fr = rng.uniform(300, 520) * (1 + 3 * t / .1)
        x = np.sin(2 * np.pi * np.cumsum(fr) / SR) * np.exp(-t * 34) * rng.uniform(.2, .5)
        y[i:i + len(x)] += x[: len(y) - i]
    return y


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def hojeo(dur=.5):
    """Hojas que pasan: aleteo de papel."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    am = (.5 + .5 * np.abs(np.sin(2 * np.pi * 9 * t))) * np.sin(np.pi * t / dur) ** .6
    return banda(ruido(n), 1200, 7000) * am * .7


def pluma(dur=.5):
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = (.55 + .45 * np.abs(np.sin(2 * np.pi * 5.5 * t + rng.random()))) * np.sin(np.pi * np.minimum(t / dur, 1)) ** .4
    return banda(ruido(n), 1800, 7500) * env * .6


def tachon(dur=.26):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 900, 6000) * np.sin(np.pi * t / dur) ** .3 * 1.1


def estira(dur=.6):
    """Brazo de hule que se alarga."""
    t = np.arange(int(dur * SR)) / SR
    f = 160 * (1 + 1.6 * t / dur) * (1 + .06 * np.sin(t * 60))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** .7 * .35


def compuerta():
    """Compuerta de madera que sube: crujido grave y chorro."""
    n = int(.5 * SR)
    t = np.arange(n) / SR
    f = np.geomspace(95, 140, n)
    tono = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .2
    return suma(banda(tono + ruido(n) * .4, 120, 1400) * np.sin(np.pi * t / .5) ** .5 * .55, golpe(120, 60, .18, .4) * .4)


def agua(dur=.6, lo=180, hi=2600):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    env = np.sin(np.pi * np.minimum(t * 1.4, 1)) ** .6 * (1 - t) ** .5
    return banda(ruido(n), lo, hi) * env * .7


def tictac(f):
    t = np.arange(int(.05 * SR)) / SR
    return suma(np.sin(2 * np.pi * f * t) * np.exp(-t * 120), tic(.012, 3000, 9000) * .7)


def arranca():
    """Hoja de calendario que se arranca."""
    n = int(.16 * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 1500, 8000) * np.exp(-t * 18) * (1 + np.sin(2 * np.pi * 70 * t)) * .5


def chillido():
    """El ratón de papel: un chirrido chiquito y corto."""
    t = np.arange(int(.12 * SR)) / SR
    f = 3200 + 900 * np.sin(np.pi * t / .12)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / .12) * .25


def blip(f=880):
    t = np.arange(int(.14 * SR)) / SR
    return (np.sin(2 * np.pi * f * t) + .4 * np.sin(2 * np.pi * f * 1.5 * t)) * np.exp(-t * 26) * .6


def zumbido(dur=.36):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 98 * t)) * .5 + np.sin(2 * np.pi * 196 * t) * .3
    return banda(x, 70, 1400) * np.minimum(t / .01, 1) * np.exp(-t * 2.5) * .55


def sorbo(dur=.5):
    """Célula que se come una basurita: un glup blando."""
    t = np.arange(int(dur * SR)) / SR
    f = 180 + 120 * np.sin(np.pi * t / dur)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.pi * t / dur) ** 2 * .4


# ---------- 0. apertura ----------
m.pon(0.0, soplo(.32, 500, 4200, .7), .35)
m.pon(E["slap"], palmada(), .9)
m.pon(E["slap"] + .02, golpe(70, 36, .5, .1), .5)
m.pon(E["slap"] + .05, tintineo(6), .4)
m.pon(E["medic"], pluma(.5), .4)
m.pon(E["medic"] + .45, vidrio(2600), .2)
m.pon(E["ceguera"] - .05, soplo(.6, 300, 2200, .5), .32)
m.pon(E["ceguera"] + .3, campana((392, 587.3), 1.4, (.4, .2)), .16)
m.pon(E["lab"], soplo(.5, 400, 2600, .5), .3, .4)
m.pon(E["lab"] + .45, chupa(), .3, .3)
m.pon(E["toca"], gota(), .75)
m.pon(E["toca"] + .1, soplo(.5, 900, 3600, .2), .2)
for k in range(5):
    m.pon(E["toca"] + .45 + k * .28, sorbo(.4), .24, (k - 2) * .2)
m.pon(E["celulas"], toc(880), .22)
m.pon(E["personas"], trazo(1.1, 300, 420), .16)
for k in range(10):
    m.pon(E["personas"] + .05 + k * .1, tic(.012, 2500, 7000), .1)
m.pon(E["todavia"] + .05, campana((293.7, 440), 1.6, (.35, .18)), .14)
# ---------- 1. Robin ----------
m.pon(E["mayo"] - .15, soplo(.7, 250, 3500, .35), .5)
m.pon(E["mayo"] + .3, hojeo(.8), .3, -.5)
for k, t in enumerate(E["pops"]):
    m.pon(t, pop(), .55, (k - 1) * .4)
for k, t in enumerate(E["hojas"]):
    m.pon(t, hojeo(.32), .28, -.5 + .05 * k)
m.pon(E["lee"] - .1, tic(.03, 2000, 6000), .2)
for k, t in enumerate(E["ideas"]):
    m.pon(t, blip((880, 988, 1175, 1318.5)[k]), .26)
m.pon(E["disena"], pluma(1.3), .38, .3)
m.pon(E["exper"] + .5, toc(1320), .2)
# ---------- 2. el ripasudil ----------
m.pon(E["propuso"] - .1, soplo(.6, 300, 2600, .4), .3)
m.pon(E["estira"], estira(.7), .5, -.2)
m.pon(E["existe"], vidrio(1800), .25)
m.pon(E["existe"] + .08, soplo(.25, 1200, 5000, .4), .2)
m.pon(E["frasco"], suma(golpe(150, 75, .2, .5) * .5, vidrio(2100)), .7)
m.pon(E["tarjeta"], palmada(), .7)
m.pon(E["tarjeta"] + .2, pluma(.8), .35)
m.pon(E["degen"] + .35, soplo(.7, 300, 2000, .5), .25)
m.pon(E["cegB"], campana((349.2, 523.3), 1.6, (.3, .15)), .14)
m.pon(E["adultos"], suma(toc(1900) * .5, tic(.02, 3000, 8000)), .35)
# ---------- 3. las personas ----------
m.pon(E["hicieron"] - .15, soplo(.6, 250, 3000, .4), .4)
m.pon(E["hicieron"] + .25, chupa(), .3, .3)
m.pon(E["toca2"], gota(), .7)
for k in range(5):
    m.pon(E["aparecio"] - .1 + k * .2, sorbo(.36), .28, (k - 2) * .25)
m.pon(E["aparecio"] + .6, campana((523.3, 784.0), 1.2, (.4, .2)), .16)
# ---------- 4. Co-Scientist ----------
m.pon(E["google"] - .2, soplo(.9, 220, 3000, .35), .5)
for k in range(5):
    m.pon(E["google"] + .45 + k * .09, pop(), .22, (k / 2 - 1) * .6)
m.pon(E["nature"], papel(.3), .3)
for k, t in enumerate(E["tiros"]):
    m.pon(t, soplo(.4, 900, 4500, .35), .3, (-1) ** k * .5)
    m.pon(t + .34, palmada(), .25, (-1) ** (k + 1) * .5)
    m.pon(t + .05, blip((660, 880, 740, 990, 830)[k]), .14, (-1) ** k * .4)
for t in E["tachas"]:
    m.pon(t, tachon(), .7)
for t in E["nuevas"]:
    m.pon(t, pop(), .35)
# ---------- 5. Stanford ----------
m.pon(E["stanford"] - .15, soplo(.6, 300, 2800, .4), .3)
for k, t in enumerate(E["vuelan"]):
    m.pon(t, soplo(.5, 800, 4200, .35), .25, .3)
    m.pon(t + .75, palmada(), .4, .3)
m.pon(E["fibrosis"], pluma(1.6), .3)
m.pon(E["probaron"], soplo(.5, 400, 2600, .5), .25, .5)
for k, t in enumerate(E["gotas"]):
    m.pon(t, gota(), .55, (k - 1) * .4)
m.pon(E["mini"], burbujas(1.0, 6), .2)
m.pon(E["frenan"], campana((659.3, 987.8), 1.0, (.4, .2)), .2, -.4)
m.pon(E["frenan"] + .22, campana((784.0, 1174.7), 1.0, (.4, .2)), .2, .4)
m.pon(E["frenan"] + .5, zumbido(.3), .22)
# ---------- 6. quién hizo qué ----------
m.pon(E["fijate"] - .1, golpe(52, 28, 1.0, .05), .55)
m.pon(E["fijate"], soplo(1.6, 180, 1600, .5), .28)
for k, t in enumerate(E["abanico"]):
    m.pon(t, palmada(), .4, -.4)
m.pon(E["eligen"] + .1, soplo(.4, 500, 2500, .5), .25, .4)
m.pon(E["elige"], papel(.25), .5, .3)
m.pon(E["consiguen"] + .1, soplo(.5, 300, 2400, .5), .25, .4)
m.pon(E["trae"], suma(golpe(120, 60, .2, .4) * .6, tintineo(4)), .55, .3)
m.pon(E["prueban"], chupa(), .3, .2)
m.pon(E["toca3"], gota(), .7)
# ---------- 7. las esclusas ----------
m.pon(E["vuelven"] - .2, soplo(.9, 200, 3200, .4), .45)
for k, t in enumerate(E["suben"]):
    m.pon(t, compuerta(), .55, (k - 1.5) * .35)
    m.pon(t + .1, agua(.6), .3, (k - 1.5) * .35)
m.pon(E["software"] - .1, soplo(.6, 300, 2600, .4), .3)
for k, t in enumerate(E["pases"]):
    m.pon(t, soplo(.4, 700, 4000, .4), .25)
    m.pon(t + .12, compuerta(), .3)
    m.pon(t + .45, blip(1318.5) if k < 2 else zumbido(.3), .4 if k < 2 else .45)
tt = E["software"] + .4
while tt < E["biologia"]:
    m.pon(tt, tictac(2600), .14)
    tt += .25
m.pon(E["biologia"] - .1, soplo(.8, 200, 2000, .4), .3)
m.pon(E["celula"], compuerta(), .4, -.4)
m.pon(E["celula"] + .2, sorbo(.4), .25, -.4)
m.pon(E["raton"], compuerta(), .4)
m.pon(E["raton"] + .25, chillido(), .3)
m.pon(E["persona"], compuerta(), .4, .4)
tt, k = E["biologia"] + .5, 0
while tt < E["comprobar"] + .6:
    m.pon(tt, tictac(1100 if k % 2 == 0 else 900), .14)
    tt += .85
    k += 1
for k in range(4):
    m.pon(E["meses"] + k * .2, arranca(), .3, .3)
for k in range(10):
    m.pon(E["anos"] + k * .09, arranca(), .25 * (1 - k / 14), .3)
# ---------- 8. las ideas se amontonan ----------
for k, t in enumerate(E["lluvia"]):
    m.pon(t, soplo(.3, 900, 4500, .35), .14, rng.uniform(-.5, .5))
    m.pon(t + .4, suma(agua(.3, 400, 3000) * .6, toc(700 + 30 * k) * .3), .22, rng.uniform(-.5, .5))
m.pon(E["comprobar"], golpe(60, 30, .7, .1), .45)
m.pon(E["comprobar"] + .05, compuerta(), .3)
# ---------- 9. el cierre ----------
m.pon(E["puede"] - .2, soplo(.8, 250, 3200, .4), .4)
m.pon(E["nueva"] - .3, soplo(.35, 900, 4500, .5), .2)
m.pon(E["nueva"], palmada(), .7)
m.pon(E["nueva"] + .03, tintineo(4), .25)
m.pon(E["decide"], soplo(.7, 300, 2200, .5), .3, .4)
m.pon(E["decide"] + .7, chupa(.25), .3, .3)
m.pon(E["funcionan"], trazo(E["suelta"] - E["funcionan"], 380, 560), .1)
m.pon(E["golpeF"], gota(), .9)
m.pon(E["golpeF"] + .02, golpe(64, 32, .9, .05), .45)
m.pon(E["golpeF"] + .1, campana((261.6, 392.0, 523.3, 784.0), 3.2, (.8, .45, .3, .14)), .34)

# ---------- música: se calla con «fíjate quién hizo qué» y vuelve con «la máquina propone»;
# el segundo tramo arranca donde la pista termina sola justo después de «laboratorio» ----------
corte = E["fijate"] - .15
vuelve = E["maquina"] - .05
fin_pista = 104.4                                      # ahí la pista de Lyria se apaga por su cuenta
ini_b = fin_pista - (E["fin"] + 1.2 - vuelve)
m.musica([("a25_laboratorio", 0.0, 0.0, corte + .25, .02, .4)], nivel=-25.0)
m.musica([("a25_laboratorio", ini_b, vuelve, m.dur, .35, 2.4)], nivel=-27.5)

# ---------- el foley va debajo de la voz ----------
vz = np.abs(m.voz[:m.N].mean(axis=1))
L = min(len(vz), m.N)


def media(x, n):
    c = np.cumsum(np.concatenate([[0.0], x]))
    y = (c[n:] - c[:-n]) / n
    return np.concatenate([np.full(n // 2, y[0]), y, np.full(len(x) - len(y) - n // 2, y[-1])])


env = media(vz, int(.06 * SR))
env = np.clip(env / (np.percentile(env[env > 1e-4], 85) + 1e-9), 0, 1)
env = media(np.maximum(env, media(env, int(.3 * SR))), int(.12 * SR))
g = np.ones(m.N)
g[:L] = 1 - .37 * np.clip(env[:L] * 1.6, 0, 1)
m.fx *= (.55 * g)[:, None]
m.cierra()
print("música B desde", round(ini_b, 2))
