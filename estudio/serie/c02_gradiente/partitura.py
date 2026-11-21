"""Capítulo 2. Imagen y sonido leen los MISMOS tiempos: esta partitura escribe t.json y la pieza lo importa.

Dos mundos separados por un solo corte: de día, papel; de "noche" en adelante, solo existe lo que
ilumina la bola. Por eso el sonido también se parte ahí: la música se corta en seco y queda el viento.
"""
import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

SOLO_TIEMPOS = "--tiempos" in sys.argv

m = Mezcla("c02_gradiente", pausas={
    "mejor imagina": .3, "cada combinación": .3, "y tú estás": .15, "de noche": .25, "en medio": .5,
    "no ves": .25, "pero tus pies": .7, "hacia dónde": .4, "y lo mejor": .2, "das un paso": .22,
    "otro paso": .2, "si son muy largos": .2, "te brincas": .78, "ese tamaño": .45, "a todo esto": .3,
    "y ninguna": .35, "solo sabe": .55,
}, cola=3.0).exporta_tiempos()
T = m.T

# ---------- los tiempos con nombre ----------
pies = T("pies").s
t = dict(
    golpe=.26, chat=T("chatgpt").s, tiene=T("tiene miles").s, miles=T("miles de millones").s, perillas=T("de perillas").s,
    cada=T("cada una").s, poquito=T("poquito").s, responde=T("lo que responde").s, resp_e=T("lo que responde").e,
    como=T("cómo sabe").s, cual=T("cuál mover").s, probar=T("probar").s, acabaria=T("no acabaría").s, jamas=T("jamás").s,
    mejor=T("mejor imagina").s, esto=T("imagina esto").e,
    comb=T("cada combinación").s, lugar=T("un lugar").s, terreno=T("un terreno").s,
    donde1=T("donde el error").s, grande=T("es grande").s, montana=T("hay montaña").s, montana_e=T("hay montaña").e,
    donde2=T("donde es chico").s, valle1=T("hay valle").s, valle1_e=T("hay valle").e,
    tu=T("y tú estás").s, tu2=T("tú estás").s, ahi=T("ahí").s, ahi_e=T("ahí").e, noche=T("de noche").s, noche_e=T("de noche").e,
    niebla=T("en medio").s, niebla2=T("la niebla").s, nover=T("no ves").s, nadie=T("nadie lo ve").s,
    maquina=T("ni la máquina").s, quienes=T("ni quienes").s, constru=T("construyeron").e,
    pero=T("pero tus pies").s, pies=pies, algo=T("sienten algo").s, algo_e=T("sienten algo").e,
    hacia=T("hacia dónde").s, inclina=T("se inclina").s, suelo=T("el suelo").s,
    esa=T("a esa inclinación").s, llamamos=T("le llamamos gradiente").s, gradiente=T("gradiente").s,
    lomejor=T("y lo mejor").s, calculan=T("las matemáticas").s, todas=T("todas las perillas").s, mismo=T("al mismo tiempo").s,
    jalon=T("de un solo jalón").s, jalon2=T("jalón").s, jalon_e=T("jalón").e,
    dasun=T("das un paso").s, abajo1=T("hacia abajo").s, vuelves=T("vuelves a sentir").s, sentir=T("sentir el suelo").s,
    otro=T("otro paso").s, situs=T("si tus pasos").s, cortos=T("muy cortos").s, nunca=T("nunca llegas").s, nunca_e=T("nunca llegas").e,
    largos=T("si son muy largos").s, largos2=T("muy largos").e, brincas=T("te brincas").s, valle2=T("el valle y").s, acabas=T("y acabas").s,
    arriba=T("más arriba").s, antes_e=T("que antes").e,
    tamano=T("ese tamaño").s, tasa=T("tasa de aprendizaje").s, elegirlo=T("y elegirlo").s, arte=T("algo de arte").s, arte_e=T("algo de arte").e,
    todo=T("a todo esto").s, descenso=T("descenso de gradiente").s, asi=T("así se entrenan").s, casi=T("casi todas").s, usas=T("que usas").e,
    ninguna=T("y ninguna").s, mapa=T("el mapa").s, mapa_e=T("el mapa").e, nosabe=T("ninguna sabe").s, va_e=T("a dónde va").e,
    solo=T("solo sabe").s, dondees=T("dónde es", T("solo sabe").i).s, abajo=T("abajo", T("solo sabe").i).s, fin=m.W[-1]["e"], dur=m.dur,
)

# Los saltos de la bola de noche, con su instante. Salen de la voz; las posiciones las calcula la pieza
# con descenso de gradiente de verdad sobre el terreno.
t["hop1"] = [t["abajo1"] - .12, .56]                                   # das un paso hacia abajo
t["hop2"] = [t["otro"] + .02, .5]                                      # otro paso
N = 9
a, b = t["cortos"] + .15, t["largos"] - .25
t["cortos_h"] = [[a + (b - a) * i / N, (b - a) / N * .9] for i in range(N)]
t["salta"] = t["largos2"] - .1                                          # sale al terminar «largos»: vuela mientras dice «te brincas el valle»
t["largo"] = [t["salta"], t["acabas"] - .08 - t["salta"]]
t["snap"] = t["jalon2"] + .24                                           # la voz real acaba aquí: Whisper estira la palabra y el golpe la tapaba
# Paso afinado: arrancan despacio y se aceleran hasta volverse puro ritmo.
s, d, h = t["todo"] + .1, .62, []
while s < t["casi"] + 2.9:
    h.append([round(s, 3), round(d * .82, 3)])
    s += d
    d = max(.155, d * .9)
t["afinados"] = h
t["ultimo"] = [t["abajo"] - .2, .5]
(RAIZ / "remotion/src/serie/c02/t.json").write_text(json.dumps(t), encoding="utf-8")
if SOLO_TIEMPOS:
    for f in Path(m.dir).glob("_*.wav"):
        f.unlink()
    print({k: round(v, 2) for k, v in t.items() if isinstance(v, float)})
    print("saltos afinados", len(h), "dur", m.dur)
    raise SystemExit


# ---------- foley propio de este capítulo ----------
def viento(dur, lo=120, hi=900, lfo=.17):
    """Aire de noche: ruido ancho que respira, sin periodo que se note."""
    n = int(dur * SR)
    tt = np.arange(n) / SR
    e = .55 + .3 * np.sin(2 * np.pi * lfo * tt + 1.1) + .15 * np.sin(2 * np.pi * lfo * 2.63 * tt)
    e = np.minimum(e, 1) * np.minimum(tt / 1.2, 1) * np.minimum((dur - tt) / 1.2, 1)
    return banda(ruido(n), lo, hi) * e + banda(ruido(n), hi, hi * 3) * e ** 3 * .22


def retumbo(dur, f0=38, f1=62):
    """Tierra que se mueve: sub con gravilla."""
    n = int(dur * SR)
    tt = np.linspace(0, 1, n)
    f = f0 + (f1 - f0) * tt
    e = np.sin(tt * np.pi) ** .7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * e + banda(ruido(n), 45, 220) * e * .9


def grava(dur=.14, n_=9):
    """Pisada: unos granos que se asientan."""
    y = np.zeros(int(dur * SR) + 2000)
    for _ in range(n_):
        i = int(rng.random() * dur * SR * .7)
        s = banda(ruido(420), 500, 3200) * np.exp(-np.arange(420) / 70) * rng.uniform(.25, .9)
        y[i:i + 420] += s
    return y * np.exp(-np.arange(len(y)) / SR * 16)


def trinquete(t0, t1, cuantos, g=.16, f=1500):
    """Perilla que avanza: dientes, cada uno un clic seco."""
    if t1 <= t0:
        return
    for i in range(cuantos):
        m.pon(t0 + (t1 - t0) * i / cuantos, tic(.016, f, f * 3.4), g * rng.uniform(.75, 1.1), rng.uniform(-.12, .12))


def pisada(tt, peso=1.0, pan=0.0):
    m.pon(tt, golpe(92, 40, .42, .18), .72 * peso, pan)
    m.pon(tt, grava(), .34 * peso, pan)


def siente(tt):
    """Tap-tap de los pies y el ping que sale de ellos: el mismo gesto siempre."""
    m.pon(tt, golpe(70, 40, .16, .04), .18); m.pon(tt, grava(.08, 5), .2)
    m.pon(tt + .17, golpe(70, 40, .16, .04), .15); m.pon(tt + .17, grava(.08, 5), .18)
    m.pon(tt + .24, cola(np.sin(2 * np.pi * 620 * np.arange(int(.5 * SR)) / SR) * np.exp(-np.arange(int(.5 * SR)) / SR * 9), 1.4, .5), .07)


# ---------- día: el muro de perillas ----------
m.pon(t["golpe"], golpe(96, 42, .55, .34), 1.0)                         # la bola cae en el cuadro 0
m.pon(t["golpe"], cola(toc(420), 1.2, .4), .34)
m.pon(t["golpe"], grava(.2, 14), .3)
trinquete(.34, t["tiene"] + .1, 9, .3, 1100)
m.pon(t["miles"] - .25, soplo(1.5, 180, 2000, .55), .17)
m.pon(t["miles"] - .22, golpe(58, 30, .8, .05), .3)
d_ = t["cada"] - t["miles"]
m.pon(t["miles"] + .1, lluvia(d_, 80) * np.linspace(.3, 1, int(d_ * SR)), .13)
m.pon(t["cada"] - .1, soplo(.7, 300, 2400, .6), .22)
for s, f in ((t["poquito"], 2300), (t["responde"] + .05, 2500)):
    m.pon(s, toc(f / 2), .3); m.pon(s, tic(.03, f, 8000), .32)
n_h = 5
for i in range(n_h):
    s = t["como"] + (t["cual"] + .32 - t["como"]) * i / n_h
    m.pon(s, toc(760 + 120 * i), .2 + .02 * i, -.5 + (i * 7 % 5) / 4)
d_ = t["mejor"] - t["probar"]
g_ = np.linspace(.3, 1.3, int((d_ - .02) * SR))
m.pon(t["probar"], lluvia(d_ - .02, 120) * g_, .2)
m.pon(t["probar"], polvo(d_ - .02) * 1.0, .07)
s, p = t["probar"] + .1, .11
while s < t["mejor"] - .1:
    m.pon(s, tic(.02, 3000, 9000), .14, rng.uniform(-.2, .2))
    s += p
    p = max(.05, p * .96)
# «Mejor»: todo se detiene de un golpe y luego las perillas se caen.
m.pon(t["mejor"], golpe(70, 36, .5, .4), .8)
m.pon(t["mejor"], cola(toc(300), 1.0, .45), .3)
for i in range(46):
    s = t["mejor"] + .22 + rng.random() ** 1.3 * .9
    m.pon(s, toc(rng.uniform(420, 1300)), rng.uniform(.04, .13), rng.uniform(-.7, .7))
# La bola cae al suelo: misma física que en la pieza.
bola_t0 = t["comb"] - .78
for k, s in enumerate(rebotes(bola_t0, 5.2, .42, 26)):
    if k < 5:
        pisada(s, .95 * .42 ** k)
m.pon(t["comb"] + .05, trazo(.5, 300, 520), .06)
trinquete(t["comb"] + .1, t["lugar"] - .1, 12, .15)
trinquete(t["lugar"] + .0, t["donde1"] - .2, 10, .13, 1250)
m.pon(t["lugar"] + .25, toc(660), .22)
# Montaña y valle: la tierra se levanta y se hunde.
m.pon(t["donde1"] + .05, retumbo(t["montana_e"] - t["donde1"] + .2, 34, 74), .2)
m.pon(t["grande"], soplo(1.5, 120, 1400, .7), .16)
m.pon(t["montana"] + .25, golpe(66, 34, .7, .08), .5)
m.pon(t["donde2"] - .05, retumbo(t["valle1_e"] - t["donde2"] + .15, 70, 34), .13)
trinquete(t["donde2"], t["valle1"] + .3, 14, .12, 1300)
m.pon(t["valle1"] + .3, golpe(84, 38, .4, .14), .55)
# Parado ahí.
m.pon(t["tu"] - .02, soplo(.5, 300, 1800, .5), .14)
pisada(t["tu"] + .78, .8)
m.pon(t["tu"] + .78, toc(520), .14)

# ---------- el corte ----------
c = t["noche"]
m.pon(c, golpe(46, 24, 1.8, .03), 1.2)
m.pon(c, soplo(.08, 800, 5000, .1), .1)
fin_n = t["fin"] + 2.6
m.pon(c + .2, viento(fin_n - c - .2), .1)

m.pon(t["niebla"] - .1, soplo(2.4, 140, 900, .5), .26)
for f in ("nover", "nadie", "maquina", "quienes"):
    m.pon(t[f], soplo(1.1, 200, 1100, .5), .08)
    m.pon(t[f] + .44, golpe(100, 54, .2, .1), .18); m.pon(t[f] + .44, grava(.06, 3), .12)
# Se apaga lo que queda.
m.pon(t["constru"] - .3, soplo(1.0, 300, 1200, .2), .1)

# ---------- los pies ----------
m.pon(t["pero"] + .05, retumbo(.9, 36, 44), .12)
m.pon(t["pero"] + .05, trazo(.8, 90, 150), .1)
for s, g in ((t["pies"] + .1, 1), (t["pies"] + .34, .9), (t["algo"] + .2, .75), (t["algo"] + .42, .7)):
    m.pon(s, golpe(70, 40, .16, .04), .2 * g); m.pon(s, grava(.08, 5), .24 * g)
# La tierra se inclina
a = t["inclina"] - .34
m.pon(a, retumbo(1.5, 52, 34), .24)
m.pon(a, golpe(48, 28, 1.0, .1), .5)
m.pon(a, banda(ruido(int(1.3 * SR)), 160, 900) * np.linspace(1, 0, int(1.3 * SR)) ** 1.5, .18)
for i in range(7):                                                      # guijarros que ruedan cuesta abajo
    s = a + .34 + i * .13 + rng.random() * .06
    m.pon(s, toc(rng.uniform(900, 2100)), .14 - i * .012, min(.8, .1 + i * .12))
m.pon(t["esa"] + .2, trazo(.7, 300, 620), .1)
m.pon(t["gradiente"] - .05, campana((440, 660), 1.8, (.7, .3)), .3)
m.pon(t["gradiente"] - .05, golpe(66, 36, .5, .08), .4)

# ---------- de un solo jalón ----------
m.pon(t["lomejor"] - .1, soplo(1.8, 200, 2000, .7), .3)
m.pon(t["todas"] - .1, soplo(.9, 400, 3800, .6), .22)
s = t["mismo"]
while s < t["snap"] - .1:                                            # tensión: temblor que sube
    m.pon(s, tic(.012, 3000, 9000), .08, rng.uniform(-.6, .6))
    s += .05
j = t["snap"]
m.pon(j, golpe(64, 26, 1.5, .5), 1.25)
m.pon(j, banda(ruido(int(.2 * SR)), 900, 7000) * np.exp(-np.arange(int(.2 * SR)) / SR * 22), .7)
for i in range(70):                                                     # miles de perillas, un solo clac
    m.pon(j + rng.random() * .05, toc(rng.uniform(600, 2600)), .14, rng.uniform(-1, 1))
m.pon(j, cola(toc(330), 1.6, .4), .34)
a_ = t["dasun"] - .62
m.pon(a_, soplo(.66, 500, 3400, .86), .5)
m.pon(t["dasun"] - .02, golpe(56, 28, .9, .3), .95)

# ---------- pasos ----------
ping = lambda s: m.pon(s, cola(np.sin(2 * np.pi * 523 * np.arange(int(.6 * SR)) / SR) * np.exp(-np.arange(int(.6 * SR)) / SR * 8), 1.6, .5), .08)
m.pon(t["hop1"][0], soplo(.4, 500, 2600, .5), .16)
pisada(sum(t["hop1"]), 1.1)
ping(sum(t["hop1"]))
siente(t["sentir"] - .1)
m.pon(t["hop2"][0], soplo(.36, 500, 2600, .5), .16)
pisada(sum(t["hop2"]), 1.0)
ping(sum(t["hop2"]))
for s, d in t["cortos_h"]:
    m.pon(s + d, toc(420), .2)
    m.pon(s + d, grava(.05, 3), .1)
# El brinco: se carga, vuela en silencio, y al caer se oye más lejos y más grande.
m.pon(t["largos2"] - .55, trazo(.6, 120, 300), .16)
s0, d = t["largo"]
m.pon(s0, golpe(66, 32, .5, .2), .7)
m.pon(s0, soplo(.9, 170, 1500, .4), .3)
m.pon(s0 + .7, soplo(d - .55, 140, 900, .5), .1)
m.pon(s0 + d * .42, campana((196, 293.7), 2.2, (.6, .3)), .16)       # pasa sobre el valle
aterriza = s0 + d
m.pon(aterriza, golpe(70, 26, 1.1, .34), 1.25)
m.pon(aterriza, grava(.3, 20), .5)
m.pon(aterriza, cola(toc(220), 1.6, .4), .28)

# ---------- la perilla que nadie calcula ----------
trinquete(t["tamano"] + .1, t["tasa"] + .9, 26, .15, 1400)
trinquete(t["elegirlo"] + .1, t["arte"] + .55, 12, .12, 1600)
m.pon(t["tasa"], campana((392, 587.3), 1.4, (.6, .3)), .14)

# ---------- descenso ----------
for i, (s, d) in enumerate(t["afinados"]):
    g = .56 if i < 6 else .3
    m.pon(s + d, golpe(100, 50, .24, .22), g)
    m.pon(s + d, grava(.06, 3), g * .3)
    if i >= 8:
        m.pon(s + d, tic(.02, 3000, 8000), .12, rng.uniform(-.3, .3))
m.pon(t["descenso"], campana((329.6, 493.9), 1.8, (.6, .3)), .18)

# ---------- las linternas ----------
m.pon(t["asi"] - .1, soplo(3.4, 160, 1500, .6), .34)
for i in range(44):
    s = t["casi"] + rng.random() * (t["nosabe"] - t["casi"])
    m.pon(s, campana((rng.choice([659.3, 880, 987.8, 1318.5, 1760]),), .9, (1,)), rng.uniform(.012, .036), rng.uniform(-.8, .8))
# Se apagan una a una.
for i in range(16):
    s = t["nosabe"] + i * (t["solo"] - t["nosabe"] - .3) / 16
    m.pon(s, tic(.02, 900, 2400), .1 - i * .004, rng.uniform(-.7, .7))

# ---------- final ----------
s0, d = t["ultimo"]
m.pon(s0, soplo(.5, 300, 1700, .5), .14)
pisada(s0 + d, 1.05)
m.pon(s0 + d, campana((329.6, 493.9, 659.3), 3.0, (.8, .4, .2)), .3)
m.pon(s0 + d, golpe(60, 28, 1.4, .08), .55)

# ---------- música ----------
corte = t["noche"]
vuelve = t["pero"]
pleno = t["dasun"] - .02
m.musica([("c02_gradiente", 30, 0, corte, .02, .02),
          ("c02_gradiente", 6, vuelve, pleno, 1.2, .1),
          ("c02_gradiente", 48, pleno, m.dur, .02, 2.8)])
m.cierra()
