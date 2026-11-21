"""a16: el equipo. Una bola frente a diez idénticas, puestas como pinos de boliche. Google midió 180
configuraciones: llueven 180 tarjetas, cada una con un acomodo de bolitas. Lo que se puede partir se parte:
la hoja de la fiesta se rasga por sus perforaciones y tres bolas corren por carriles separados por lugar,
pastel y música; la bola protagonista coordina y junta lo que traen. Lo que va paso por paso no: los tres
carriles se funden en uno, el enjambre se amontona en fila, se pasa la misma hoja y se estorba; nueve bolas
jalan un calendario que no avanza. Los errores: una mancha roja que salta de hoja en hoja alrededor de un
corro (17 manchas) y, con la protagonista en el centro, se queda en 4. Después dos letreros enfrentados
(Cognition, Anthropic) y, un año después, parches en el de Cognition. Cierra con un cuchillo de papel que
solo corta por las perforaciones: el pastel, que va paso por paso, se queda entero.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"cuando la tarea se": .3, "tiene lógica": .25, "pero cuando": .45, "como nueve": .2, "y sin coordinador": .6,
          "con coordinador por": .35, "uno se equivoca": .3, "hasta las empresas": .5, "anthropic": .15, "y un año": .25,
          "porque los dos": .3, "no gana": .4, "gana quien sabe": .15, "se puede partir": .35}
m = Mezcla("a16_equipo", pausas=PAUSAS, cola=3.0).exporta_tiempos()
T = m.T
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

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
    """Arranque real del tramo de voz que contiene la palabra."""
    w = m.W[T(f, desde).i]
    c = (w["s"] + w["e"]) / 2
    return min(TR, key=lambda r: abs(r[0] - c))[0]


# ---------- el guion de acciones ----------
E = {}
# 1. Diez contra una. Los pinos caen desde arriba: el primer cuadro ya trae bolas en el aire.
H0, G = 5.0, 30.0
CAEN = [r3(.14 + k * .105) for k in range(10)]           # instante del primer impacto de cada pin
E["caen"] = CAEN
E["caida"] = {"h": H0, "g": G, "rest": .3}
E["uno"] = s("uno?") - .12
E["depende"] = arr("depende")
E["sorprende"] = s("sorprende") + .02
E["dispersa"] = e("sorprende") - .25                       # el enjambre se abre hacia las orillas
# 2. 180 tarjetas: una ola de la orilla cercana a la lejana
c0, dur = s("google") + .05, 2.75
cartas = []
rr = np.random.default_rng(180)
for r in range(15):
    for c in range(12):
        u = (r / 14) * .78 + (abs(c - 5.5) / 5.5) * .22
        cartas.append(r3(c0 + u * dur + rr.uniform(-.04, .04)))
E["cartas"] = cartas
E["google"] = s("google")
E["ciento"] = s("ciento")
E["rafaga"] = arr("cuando la tarea se") - .4
# 3. Lo que se puede partir
E["hoja"] = arr("cuando la tarea se") + .25                # la hoja de la fiesta cae frente a la bola
E["rasga"] = [r3(s("dividir") - .05), r3(s("dividir") + .28)]
E["equipo"] = s("un equipo") - .1
E["coord"] = s("coordinador", T("un equipo").i) + .05
E["ochenta"] = s("ochenta", T("resultado").i)
E["carriles"] = arr("tiene lógica")
E["salen"] = arr("tres agentes") + .05
E["llegan"] = E["salen"] + 1.35
E["lugar"] = r3(min(a for a, _ in TR if a > e("buscando") - .1) - .02)   # Whisper estira "lugar" sobre la coma
E["pastel"] = r3(E["lugar"] + .66)
E["musica"] = r3(E["lugar"] + 1.03)
E["vuelven"] = r3(E["lugar"] + 1.68)                      # "no se estorban"
E["junta"] = [r3(E["vuelven"] + .95 + k * .17) for k in range(3)]
# 4. Paso por paso
E["funde"] = arr("pero cuando") - .05
E["pasos"] = [r3(s("paso", T("iba").i) + k * .24) for k in range(4)]
E["todas"] = s("todas") + .25
E["llegada"] = [r3(E["todas"] + .2 + k * .14) for k in range(10)]       # cada pin choca con el de adelante
E["pases"] = [r3(E["todas"] + 1.1 + k * .26) for k in range(5)]        # la misma hoja va de mano en mano
E["choque"] = s("empeoraron") + .05
E["choques"] = [r3(E["choque"] + k * .085) for k in range(9)]          # la fila se acordeona
E["menos"] = arr("entre")
E["choque2"] = s("setenta") - .05
# 5. Nueve mamás
E["calendario"] = s("como nueve") - .05
E["empujan"] = s("intentando")
E["jala"] = s("bebé") - .1
E["suelta"] = s("mes", T("un bebé").i) + .08
E["tictac"] = [r3(E["suelta"] + .55 + k * .5) for k in range(3)]
# 6. Los errores: sin coordinador 17, con coordinador 4
E["corro"] = arr("y sin coordinador") - .25
a, b = s("los errores") + .05, s("diecisiete") + .1
E["manchas"] = [r3(a + (b - a) * (k / 16) ** .85) for k in range(17)]
E["rebobina"] = arr("con coordinador por") - .02
E["centro"] = E["rebobina"] + .42                          # la protagonista cae al centro del corro
a2, b2 = E["centro"] + .25, s("cuatro") + .02
E["manchas4"] = [r3(a2 + (b2 - a2) * k / 3) for k in range(4)]
E["ataja"] = r3(b2 + .3)                                   # la quinta la detiene la coordinadora
# 7. Uno se equivoca, el otro lo toma como verdad
E["escribe"] = arr("uno se equivoca") - .1
E["equivoca"] = s("equivoca") + .05
E["pasa"] = s("el otro") - .05
E["verdad"] = s("verdad") + .02
E["copia"] = arr("y el error") + .05
E["crece"] = s("crece") + .05
# 8. Las empresas
E["letreros"] = [r3(arr("hasta las empresas") + .05), r3(arr("hasta las empresas") + .3)]
E["choca"] = s("contradijeron") + .1
E["cognition"] = s("cognition")
E["nocons"] = arr("no construyas")
E["anthropic"] = arr("anthropic")
E["asi"] = s("publicó") - .1
E["anio"] = arr("y un año")
E["revisores"] = s("revisores") - .05
E["delegacion"] = s("delegación") - .08
# 9. Los dos tenían razón
E["razon"] = [r3(s("razón") - .1), r3(s("razón") + .14)]
E["distintos"] = arr("en problemas")
# 10. No gana el que tiene más
E["nogana"] = arr("no gana")
E["mas"] = s("más", T("no gana").i)
E["tacha"] = s("agentes", T("no gana").i) + .1
# 11. El cuchillo de papel
E["gana"] = s("gana quien sabe") - .06
E["mira"] = s("qué parte")
E["prueba"] = s("parte", T("gana quien").i) + .15
E["apunta"] = e("trabajo...") + .1
E["corte1"] = arr("se puede partir") - .04
E["corte2"] = s("partir", T("se puede").i) - .02
E["separa"] = E["corte2"] + .35
E["toman"] = E["separa"] + .5
E["fin"] = e("partir", T("se puede").i)
E["remate"] = E["fin"] + .55
(RAIZ / "remotion/src/serie/a16/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def pop():
    return suma(toc(470) * .7, golpe(210, 110, .14, .35) * .5)


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def rasgon(dur=.32):
    """Papel que se rasga por la perforación: crujido de pedazos que se acelera."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    craq = (np.sin(2 * np.pi * (40 + 260 * t / dur) * t) > .1).astype(float)
    return banda(ruido(n), 1200, 9000) * craq * np.sin(np.pi * t / dur) ** .5 * .9


def sello():
    return golpe(150, 70, .22, .9)


def splat():
    n = int(.18 * SR)
    return suma(banda(ruido(n), 200, 2400) * np.exp(-np.arange(n) / SR * 28), golpe(120, 70, .12, .2) * .3)


def boing(f0=170, dur=.6):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .35 * np.exp(-t * 5) * np.sin(t * 38))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .8


def rodar(dur=1.2, f=90):
    """Bola rodando sobre papel: ruido grave con un pulso de vuelta."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.minimum(t / dur, 1)) ** .6 * (1 + .25 * np.sin(2 * np.pi * 7 * t))
    return banda(ruido(n), 60, 600) * env * .7 + np.sin(2 * np.pi * f * t) * env * .12


def grapa():
    return suma(tic(.02, 2500, 9000), golpe(240, 120, .08, .5) * .6)


def hojeo(dur=.9, n=12):
    """Las hojas de un calendario pasando una tras otra."""
    y = np.zeros(int((dur + .3) * SR))
    for k in range(n):
        i = int(k / n * dur * SR)
        p = papel(.12) * (.5 + .5 * rng.random())
        y[i:i + len(p)] += p
    return y


def tictac():
    return suma(toc(1500) * .5, tic(.02, 3000, 8000) * .5)


# ---------- 1. pinos ----------
for t in CAEN:
    for k, ti in enumerate(rebotes(t - np.sqrt(2 * H0 / G), H0, .3, G)[:3]):
        m.pon(ti, golpe(96 - 5 * k, 46, .34 - k * .08, .25), .5 * .3 ** k)
m.pon(0.0, soplo(.5, 600, 4200, .2), .18)
m.pon(E["uno"], toc(660), .3)
m.pon(CAEN[9] + .32 + .25 + .4 * np.sqrt(.32), golpe(120, 60, .16, .3), .3)          # la protagonista da un saltito
for k in range(10):                                                                  # los pinos se miran entre sí
    m.pon(E["uno"] + .28 + (k + 1) * .045 + .25 + .4 * np.sqrt(.2), toc(560 + 35 * k), .09, (k / 4.5 - 1) * .5)
m.pon(E["uno"], soplo(.3, 900, 4000, .4), .12)
m.pon(E["depende"], soplo(.35, 500, 3000, .4), .25)
m.pon(E["depende"] + .05, suma(*(toc(400 + 37 * k) * .12 for k in range(11))), .5)
m.pon(E["sorprende"], golpe(110, 55, .22, .3), .35)
for k in range(11):
    m.pon(E["sorprende"] + .32 + .012 * k, golpe(100, 50, .2, .2), .12)
m.pon(E["dispersa"], rodar(1.1), .45)
# ---------- 2. tarjetas ----------
for k, t in enumerate(cartas):
    m.pon(t, tic(.02, 1800, 7000), .12 + .08 * rng.random(), rng.uniform(-.5, .5))
m.pon(E["ciento"], campana((523.3, 784, 1046.5), 1.2, (.5, .25, .12)), .14)
m.pon(E["rafaga"], soplo(1.4, 250, 2200, .35), .16)
for k in range(14):
    m.pon(E["rafaga"] + .1 + k * .06, papel(.14), .05)
# ---------- 3. se puede partir ----------
m.pon(E["hoja"] - .35, soplo(.45, 900, 3000, .7), .1)
m.pon(E["hoja"], golpe(220, 110, .1, .5), .3)
for t in E["rasga"]:
    m.pon(t, rasgon(.3), .7)
m.pon(E["equipo"], rodar(.8), .4)
m.pon(E["coord"], trazo(.6, 300, 600), .14)
for k in range(3):
    m.pon(E["coord"] + .08 * k, toc(700 + 120 * k), .2)
m.pon(E["ochenta"], sello(), .7)
m.pon(E["ochenta"] + .02, campana((392, 587.3, 784), 1.4, (.5, .3, .15)), .16)
m.pon(E["carriles"], trazo(.9, 260, 760), .2)
for k in range(3):
    m.pon(E["carriles"] + .55 + k * .12, pop(), .3)
m.pon(E["salen"], rodar(1.4), .55)
for k, t in enumerate((E["lugar"], E["pastel"], E["musica"])):
    m.pon(t, pop(), .55, (-.4, 0, .4)[k])
    m.pon(t + .02, toc((660, 784, 988)[k]), .2, (-.4, 0, .4)[k])
m.pon(E["vuelven"], rodar(.95), .5)
for k, t in enumerate(E["junta"]):
    m.pon(t, pop(), .45)
    m.pon(t, toc((523, 659, 784)[k]), .22)
m.pon(E["junta"][-1] + .15, campana((523.3, 659.3, 784), 1.3, (.4, .25, .12)), .14)
# ---------- 4. paso por paso ----------
m.pon(E["funde"], soplo(.9, 200, 1800, .55), .3)
m.pon(E["funde"] + .7, golpe(90, 50, .3, .3), .35)
for k, t in enumerate(E["pasos"]):
    m.pon(t, toc(500 + 90 * k), .3)
m.pon(E["todas"], rodar(1.4, 80), .6)
for k, t in enumerate(E["llegada"]):
    m.pon(t, golpe(130 + 8 * (k % 3), 70, .16, .4), .35)
for t in E["pases"]:
    m.pon(t, papel(.18), .35)
for k, t in enumerate(E["choques"]):
    m.pon(t, golpe(110 - 3 * k, 52, .22, .45), .6 - .03 * k)
m.pon(E["choque"] + .8, boing(150, .5), .22)
m.pon(E["menos"], golpe(58, 32, .7, .05), .5)
for k in range(5):
    m.pon(E["choque2"] + k * .1, golpe(120, 60, .18, .4), .32)
# ---------- 5. nueve mamás (sin música: el chiste va solo) ----------
m.pon(E["calendario"], golpe(150, 80, .2, .5), .45)
m.pon(E["calendario"] + .06, papel(.2), .3)
for k in range(9):
    m.pon(E["empujan"] + k * .09, golpe(150 + 10 * (k % 4), 80, .12, .35), .22)
m.pon(E["jala"], soplo(.5, 900, 5000, .9), .3)
m.pon(E["jala"] + .1, papel(.35), .35)
m.pon(E["suelta"], boing(210, .7), .55)
m.pon(E["suelta"] + .03, golpe(160, 80, .12, .6), .4)
m.pon(E["suelta"] + .25, golpe(90, 45, .3, .2), .4)
for t in E["tictac"]:
    m.pon(t, tictac(), .45)
# ---------- 6. diecisiete y cuatro ----------
m.pon(E["corro"], rodar(1.0), .45)
for k, t in enumerate(E["manchas"]):
    m.pon(t, splat(), .24 + .008 * k, ((k % 10) / 4.5 - 1) * .6)
    m.pon(t, toc(300 + 25 * k), .12)
m.pon(E["rebobina"], soplo(.45, 400, 6000, .8)[::-1], .4)
m.pon(E["centro"] - .3, soplo(.3, 600, 3000, .5), .2)
m.pon(E["centro"], golpe(80, 40, .5, .3), .8)
m.pon(E["centro"] + .05, trazo(.5, 350, 700), .15)
for k, t in enumerate(E["manchas4"]):
    m.pon(t, splat(), .5)
    m.pon(t, toc(300 + 25 * k), .12)
m.pon(E["ataja"], suma(golpe(200, 100, .1, .7), toc(880) * .6), .55)
# ---------- 7. el error crece ----------
m.pon(E["escribe"], trazo(.5, 900, 1200), .1)
m.pon(E["equivoca"], splat(), .7)
m.pon(E["pasa"], papel(.3), .45)
m.pon(E["verdad"], sello(), .75)
m.pon(E["copia"], trazo(.4, 900, 1300), .12)
m.pon(E["copia"] + .35, papel(.22), .35)
m.pon(E["crece"], suma(splat(), splat()[::-1] * .4), .6)
m.pon(E["crece"] + .1, soplo(.8, 120, 900, .2), .35)
# ---------- 8. los letreros ----------
for k, t in enumerate(E["letreros"]):
    m.pon(t - .15, soplo(.3, 400, 2500, .6), .2)
    m.pon(t, golpe(84 - 8 * k, 42, .4, .3), .65)
m.pon(E["choca"], golpe(140, 70, .2, .6), .5)
m.pon(E["choca"] + .12, golpe(150, 70, .18, .6), .35)
m.pon(E["cognition"], trazo(.5, 400, 620), .1)
m.pon(E["nocons"], trazo(1.4, 500, 900), .12)
m.pon(E["anthropic"], trazo(.5, 400, 620), .1)
m.pon(E["asi"], trazo(1.3, 500, 900), .12)
m.pon(E["anio"], banda(hojeo(.85, 12), 300, 2600), .3)
m.pon(E["revisores"], grapa(), .6)
m.pon(E["revisores"] + .12, grapa(), .4)
m.pon(E["delegacion"], grapa(), .6)
m.pon(E["delegacion"] + .12, grapa(), .4)
# ---------- 9. los dos ----------
for t in E["razon"]:
    m.pon(t, sello(), .55)
m.pon(E["distintos"], papel(.35), .4)
m.pon(E["distintos"] + .2, papel(.35), .4)
# ---------- 10. no gana ----------
m.pon(E["nogana"], rodar(1.2, 70), .5)
for k in range(6):
    m.pon(E["nogana"] + .5 + k * .1, golpe(130, 65, .16, .4), .25)
m.pon(E["tacha"], trazo(.25, 900, 1600), .2)
m.pon(E["tacha"], tic(.03, 1800, 6000), .3)
# ---------- 11. el cuchillo ----------
m.pon(E["gana"] - .65, rodar(.9, 75), .45)
m.pon(E["gana"], soplo(.4, 800, 3000, .4), .12)
m.pon(E["gana"] + .3, papel(.25), .35)
m.pon(E["prueba"], boing(260, .45), .4)
m.pon(E["prueba"], toc(900), .25)
m.pon(E["apunta"], trazo(.8, 500, 560), .08)
for t in (E["corte1"], E["corte2"]):
    m.pon(t, rasgon(.34), .85)
    m.pon(t, soplo(.3, 2000, 8000, .3), .25)
m.pon(E["separa"], papel(.4), .4)
m.pon(E["toman"], rodar(1.2), .35)
m.pon(E["remate"], golpe(70, 36, .6, .1), .45)
m.pon(E["remate"], campana((261.6, 392, 523.3), 2.8, (.7, .35, .18)), .3)

# ---------- música: se calla para el chiste y regresa con los errores ----------
calla = E["calendario"] - .02
vuelve = E["suelta"] + .3
cae = E["corte1"] - .12
OFF = 80.45 - (e("trabajo...") + .05)          # el respiro de la pista cae justo en los puntos suspensivos
m.musica([("a16_equipo", 16.0, 0, calla, .02, .35), ("a16_equipo", vuelve + OFF, vuelve, cae + .3, .6, .3),
          ("a16_equipo", 16.05, cae, m.dur, .2, 2.6)])
m.cierra()
print({k: v for k, v in E.items() if k not in ("cartas",)})
