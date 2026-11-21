"""a30: la AGI, último capítulo de la serie 2.

Un piso de cartulina negra con los años pintados. Los expertos clavan sus banderitas en 2030 y ahí se pinta la meta;
en julio de 2025 la línea se arrastra hacia atrás y la medalla cae al piso. Detrás se levanta un reloj de papel
gigante con su etiqueta de Stanford (principios de 2026): la bola lo leía bien la mitad de las veces. Medalla y reloj en una balanza
pareja que nadie deja quieta. La palabra AGI sobre un listón que cada mano pone a su altura, y le cuelgan precios.
Tres atriles sin caras: cada uno dice su frase y su caja cuelga de esa respuesta (de-pender). ARC-AGI-3: a la bola
se le arma un coche de papel (el arnés de a09) y llega a 99.9%; la nota de sus creadores: no prueba que sea AGI. Una mano que llena páginas y un lazo que no cierra frente al espejo. Vuelve el piso negro: un
carril acotado con palomitas donde la bola corre, y la cámara sube hasta que se ve que alrededor todo está en blanco.
Cierre: la bola de la serie 1 sin manos, el frasco de a01 que revienta, y la fiesta de verdad. La bola apaga la luz
del a01 para que brillen las velas: penumbra cálida y la música resuelve.

Todos los instantes salen de aquí a `eventos.json`: la animación los lee, así dibujo y sonido no se desfasan.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"pasó en julio": .25, "y a principios": .2, "estamos ante": .3, "sam altman": .2, "en la prueba": .2,
          "más del ochenta": .35, "lo que sabemos": .4, "lo que no sabemos": .3, "empezó adivinando": .6,
          "tu fiesta": .25, "yo no sé": .2, "para cambiar": .15}
m = Mezcla("a30_agi", pausas=PAUSAS, cola=3.6).exporta_tiempos()
T = m.T
W = m.W
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
r3 = lambda x: round(float(x), 3)

# ---------- inicios reales de la voz: Whisper estira la palabra anterior sobre el silencio ----------
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
    w = W[T(f, desde).i]
    return max(r[0] for r in TR if r[0] < w["e"] - .04)


iY = T("yo no sé").i
E = {}
# 1. la apuesta y la medalla
E["aterriza"] = .34
E["flechas"] = [r3(arr("los expertos") + .3 + k * .19) for k in range(7)]
E["oro"] = s("oro") - .12
E["olimp"] = s("olimpiada")
E["pinta"] = s("hacia") + .05
E["pasa"] = arr("pasó en julio")
E["suelta"] = s("veinticinco") + .02
# 2. el reloj
E["stanford"] = arr("y a principios")
E["etiqueta"] = s("stanford")
E["salta"] = s("el mejor modelo") - .55
E["lee"] = [r3(s("leía") + .02 + k * (s("mitad") - .1 - s("leía")) / 3) for k in range(4)]
E["mitad"] = s("mitad")
# 3. la balanza
E["balanza"] = arr("las dos cosas") - .36
E["platoM"] = arr("las dos cosas") + .12
E["platoR"] = s("cosas") + .1
E["ciertas"] = s("ciertas")
E["poreso"] = arr("por eso nadie")
E["empujes"] = [r3(E["poreso"] + .22 + k * .38) for k in range(4)]
# 4. AGI
E["agi"] = arr("estamos ante") - .32
E["letras"] = [r3(E["agi"] + .36 + k * .13) for k in range(3)]
E["interroga"] = s("agi", T("estamos").i) - .05
E["termino"] = E["interroga"] + .55
E["barra"] = [r3(arr("depende") + .08), r3(s("quién") + .02), r3(s("defina") + .12)]
E["gane"] = s("gane") - .05
# 5. los atriles
E["altman"] = arr("sam altman") - .32
E["altA"] = [r3(s("ya casi")), r3(s("la palabra")), r3(s("ya ni importa"))]
E["habla"] = [[r3(arr("sam altman")), r3(e("importa"))], [r3(arr("dario")), r3(e("bastante más"))], [r3(arr("yann")), r3(e("tontería"))]]
E["amodei"] = arr("dario") - .3
E["anios"] = s("uno o dos")
E["bastante"] = arr("o bastante")
E["lecun"] = arr("yann") - .3
E["nivel"] = s("llegar a nivel")
E["tonteria"] = s("una tontería")
E["tres"] = arr("los tres") - .1
E["cajas"] = [r3(s("empresas") - .1 + k * .16) for k in range(3)]
E["dependen"] = s("dependen") - .05
# 6. ARC-AGI-3
E["arc"] = arr("en la prueba") - .32
E["nombreArc"] = s("prueba", T("altman").i)
E["modelo"] = s("un modelo con")
E["arnes"] = s("arnés")
E["llega"] = s("llegó")
E["llena"] = e("cien por ciento")
E["nota"] = s("eso no prueba") - .05
# 7. el código y el espejo
E["codigo"] = arr("más del ochenta") - .32
E["ochenta"] = s("ochenta")
E["anthropic"] = s("de anthropic", T("ochenta").i)
E["claude"] = s("claude") - .05
E["espejo"] = arr("y la propia") - .12
E["lazo"] = s("dice que eso")
E["todaviaNo"] = s("todavía", T("propia").i)
E["automejora"] = s("automejora")
# 8. el carril
E["sabemos"] = arr("lo que sabemos") - .32
E["acotadas"] = s("acotadas")
E["verif"] = s("verificables")
E["avanza"] = arr("esto avanza")
E["predijeron"] = s("predijeron")
E["nosabemos"] = arr("lo que no sabemos")
E["sale"] = s("sale de ahí")
# 9. el recorrido de la serie
E["empezo"] = arr("empezó") - .2
E["adivinando"] = s("adivinando")
E["frasco"] = e("adivinando") + .02
E["grieta"] = s("aprendió")
E["actuar"] = s("actuar")
E["rompe"] = s("actuar") + .1
# 10. la fiesta
E["fiesta"] = arr("tu fiesta")
E["organizada"] = s("organizada")
E["yo"] = arr("yo no sé")
E["etiq"] = s("la agi", iY) - .05
E["nadie"] = arr("nadie lo sabe")
E["pero"] = arr("pero ya no")
E["nombre"] = s("nombre")
E["para"] = arr("para cambiar")
E["clic"] = TR[-1][1] + .06
E["dur"] = m.dur
(RAIZ / "remotion/src/serie/a30/eventos.json").write_text(json.dumps({k: (r3(v) if isinstance(v, (float, np.floating)) else v) for k, v in E.items()}), encoding="utf-8")
print("tramos de voz:", " ".join(f"{a:.2f}-{b:.2f}" for a, b in TR))
print({k: v for k, v in E.items()})


# ---------- funciones que repiten la física del dibujo ----------
def ioc(k):
    k = min(max(k, 0), 1)
    return 4 * k ** 3 if k < .5 else 1 - (-2 * k + 2) ** 3 / 2


def prg(t, a, b):
    return min(max((t - a) / max(b - a, 1e-6), 0), 1)


def invierte(f, objetivo, a, b):
    for _ in range(40):
        mid = (a + b) / 2
        if f(mid) < objetivo:
            a = mid
        else:
            b = mid
    return (a + b) / 2


def ybCarril(t):
    a, b = E["avanza"] - .2, E["nosabemos"] - .25
    if t < a:
        return .6 + max(t - E["sabemos"], 0) * .55
    return .6 + (a - E["sabemos"]) * .55 + 34 * ioc(prg(t, a, b))


# ---------- sonidos propios ----------
def suma(*xs):
    y = np.zeros(max(len(x) for x in xs))
    for x in xs:
        y[: len(x)] += x
    return y


def papel(dur=.28):
    return soplo(dur, 1600, 7000, .3) * .8


def swish(dur=.7, lo=300, hi=2600):
    return soplo(dur, lo, hi, .45)


def clic():
    g = golpe(180, 90, .09, .9)
    x = tic(.02, 2000, 6000) * .9
    g[: len(x)] += x
    return g


def vidrio():
    n = int(.9 * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 2800, 12000) * np.exp(-t * 7) * .9 + cola(campana((2093, 3136, 4186), .5, (.5, .3, .2)))[:n] * .5


def metal(f=1180, dur=1.2):
    """Medalla: parciales inarmónicos de un disco de metal."""
    return campana((f, f * 2.32, f * 4.25, f * 6.1), dur, (.6, .4, .25, .12))


def pluma(dur=.3):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2200, 7000) * (np.sin(np.pi * t / dur) ** 2) * (1 + .5 * np.sin(2 * np.pi * 31 * t)) * .45


def ding(f=784.0, dur=1.0):
    return campana((f, f * 1.5, f * 2), dur, (.6, .26, .12))


def zumbido(dur=.38):
    n = int(dur * SR)
    t = np.arange(n) / SR
    x = np.sign(np.sin(2 * np.pi * 98 * t)) * .5 + np.sin(2 * np.pi * 196 * t) * .3
    return banda(x, 70, 1400) * np.minimum(t / .01, 1) * np.exp(-t * 2.5) * .55


def plop(f0=260, f1=820):
    t = np.arange(int(.12 * SR)) / SR
    f = f0 + (f1 - f0) * (t / .12) ** .7
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 26) * .7


def boing(f0=150, dur=.6):
    t = np.arange(int(dur * SR)) / SR
    f = f0 * (1 + .35 * np.exp(-t * 5) * np.sin(t * 38))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 5) * .8


def engrane(dur=.3, hz=22):
    y = np.zeros(int((dur + .1) * SR))
    for k in range(int(dur * hz)):
        i = int(k / hz * SR)
        x = suma(toc(1300 + 90 * (k % 2)) * .4, tic(.012, 3000, 8000) * .5)
        y[i:i + len(x)] += x
    return y


def arrastre(dur=.8):
    """La meta se arrastra hacia atrás: pintura y madera que raspan el piso."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.sin(np.pi * np.minimum(t / dur, 1)) ** .6
    return banda(ruido(n), 160, 2200) * env * (1 + .25 * np.sin(2 * np.pi * 9 * t)) * .7


def brocha(dur=.45):
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 700, 5200) * np.sin(np.pi * t / dur) ** .8 * (1 + .4 * np.sin(2 * np.pi * 18 * t)) * .6


def carton(f=110):
    return suma(golpe(f, f / 2, .35, .5), papel(.22) * .6)


def cuerda(f=196.0, dur=.9):
    """Un hilo que se tensa: pulsación de cuerda."""
    t = np.arange(int(dur * SR)) / SR
    x = sum(np.sin(2 * np.pi * f * k * t) / k for k in (1, 2, 3, 4))
    return x * np.exp(-t * 6) * np.minimum(t / .003, 1) * .6


def rayon(dur=.3):
    """Lápiz que escribe rápido."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2400, 8000) * (.6 + .4 * np.sin(2 * np.pi * 23 * t)) * np.sin(np.pi * t / dur) ** .3 * .4


def matasuegras(dur=.55):
    """Espantasuegras de fiesta: zumbido de papel que sube."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 310 + 120 * np.minimum(t / .18, 1) + 8 * np.sin(2 * np.pi * 7 * t)
    x = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR)) * .5 + np.sin(2 * np.pi * np.cumsum(f) / SR) * .3
    return banda(x, 200, 3200) * np.minimum(t / .02, 1) * np.exp(-np.maximum(t - dur * .7, 0) * 12) * .5


def cinta_adhesiva(dur=.35):
    y = np.zeros(int(dur * SR))
    for _ in range(int(dur * 160)):
        i = int(rng.random() * (len(y) - 600))
        x = tic(.008, 1800, 9000) * rng.uniform(.2, .7)
        y[i:i + len(x)] += x
    return y


_pon = m.pon
m.pon = lambda t, x, g=1.0, pan=0.0: _pon(t, x, g * .64, pan)      # el foley acompaña, no compite con la voz

# ---------- 1. la apuesta y la medalla ----------
m.pon(0.0, swish(.36, 400, 2600), .3)
m.pon(.1, carton(130), .35)                                  # el «2022» se estampa
m.pon(E["aterriza"], golpe(86, 42, .45, .35), .8)
m.pon(E["aterriza"] + .35, toc(300), .12)
for k, tf in enumerate(E["flechas"]):
    m.pon(tf - .2, swish(.22, 1200, 5200), .14, (k - 3) * .15)
    m.pon(tf, suma(toc(560 + 40 * (k % 3)), golpe(150, 90, .12, .5) * .5), .42, (k - 3) * .15)
m.pon(E["oro"] - .3, trazo(.5, 200, 380), .14)
m.pon(E["oro"] - .05, swish(.6, 600, 4000), .2)
m.pon(E["oro"] + .15, metal(1568, 1.6), .2)
m.pon(E["olimp"] + .2, campana((3136, 4186), .5, (.3, .15)), .12)
h0, h1 = E["pinta"] - .55, E["pinta"] + .35
for k in (1, 2, 3):
    m.pon(h0 + (h1 - h0) * k / 3, toc(300 + 20 * k), .25)
m.pon(E["pinta"], brocha(.5), .45)
m.pon(E["pasa"] - .05, swish(.8, 200, 1800), .3)
m.pon(E["pasa"], arrastre(.85), .55)
m.pon(E["pasa"] + .8, golpe(100, 52, .3, .3), .4)
m.pon(E["suelta"], suma(tic(.02, 2500, 7000), soplo(.3, 900, 4000, .2) * .5), .4)
imp = E["suelta"] + float(np.sqrt(2 * (1.34 - .52) / 30))
m.pon(imp, metal(1180, 1.5), .55)
m.pon(imp, golpe(160, 80, .2, .6), .5)
for n in range(1, 12):
    b = (-6 + np.sqrt(36 + 28 * (np.pi / 2 + n * np.pi))) / 14
    a = float(np.exp(-3 * b))
    if a < .06:
        break
    m.pon(imp + b, metal(1500 + 60 * n, .35), .5 * a)
# ---------- 2. el reloj ----------
m.pon(E["stanford"] - .05, swish(.7, 250, 2000), .3)
m.pon(E["stanford"] + .05, papel(.4), .45)
m.pon(E["stanford"] + .42, carton(80), .6)
for s_ in range(12, 23):
    if s_ > E["stanford"] + .5:
        m.pon(s_, tic(.025, 2600, 7000), .22, -.2)
m.pon(E["etiqueta"] - .05, papel(.25), .25, .3)
m.pon(E["salta"], swish(.5, 300, 2400), .25)
m.pon(E["salta"] + .75, golpe(92, 46, .35, .3), .6)
for k, tl in enumerate(E["lee"]):
    if k:
        m.pon(tl - .22, banda(engrane(.26), 300, 5000), .3)
    m.pon(tl - .05, papel(.16), .3, -.4)
    if k in (0, 2):
        m.pon(tl + .3, pluma(.22), .7, -.3)
        m.pon(tl + .4, ding(1046.5, .7), .16, -.3)
    else:
        m.pon(tl + .3, zumbido(.32), .45, -.3)
m.pon(E["mitad"], campana((392.0, 587.3), 1.2, (.5, .25)), .18)
# ---------- 3. la balanza ----------
m.pon(E["balanza"], swish(.5, 250, 2200), .32)
m.pon(E["platoM"], metal(990, 1.0), .45)
m.pon(E["platoM"], golpe(120, 60, .2, .4), .45)
m.pon(E["platoR"], carton(95), .55)
m.pon(E["platoR"] + .02, tic(.02, 2600, 7000), .3)
for k in range(2):
    m.pon(E["ciertas"] + k * .18, pluma(.22), .65, (-.4, .4)[k])
for k, tp in enumerate(E["empujes"]):
    m.pon(tp - .1, swish(.3, 300, 2000), .2, (.5, -.5)[k % 2])
    m.pon(tp, golpe(110, 55, .3, .4), .55, (.4, -.4)[k % 2])
    m.pon(tp + .05, metal(700 + 40 * k, .5), .12)
# ---------- 4. AGI ----------
m.pon(E["agi"], swish(.5, 250, 2200), .32)
for k, tl in enumerate(E["letras"]):
    m.pon(tl, carton(78 - 6 * k), .7, (-.3, 0, .3)[k])
m.pon(E["interroga"], suma(papel(.2), toc(240) * .6), .35, .3)
m.pon(E["termino"], trazo(.7, 380, 760), .12)
for k, tb in enumerate(E["barra"]):
    m.pon(tb - .1, swish(.35, 300, 2200), .22, (-.5, .5, 0)[k])
    m.pon(tb + .12, golpe(140, 70, .2, .7), .5, (-.4, .4, 0)[k])
for k in range(3):
    tg = E["gane"] + k * .12
    m.pon(tg, campana((2637, 3951), .45, (.4, .2)), .2, (-.4, 0, .4)[k])
    m.pon(tg + .02, papel(.18), .25, (-.4, 0, .4)[k])
# ---------- 5. los atriles ----------
m.pon(E["altman"], swish(.5, 300, 2600), .32)
m.pon(E["altman"] + .3, golpe(60, 30, .5, .1), .3)
for tt in (E["altA"][0], E["anios"], E["nivel"]):
    m.pon(tt - .08, suma(papel(.2), toc(330) * .5), .3)
for tt in (E["altA"][1], E["altA"][2], E["bastante"], E["nivel"] + .25, E["tonteria"]):
    m.pon(tt - .05, pluma(.18), .4)
m.pon(E["amodei"], swish(.55, 300, 2200), .25, .3)
m.pon(E["lecun"], swish(.55, 300, 2200), .25, .3)
m.pon(E["tres"], swish(.9, 150, 1200), .25)
for k, tc in enumerate(E["cajas"]):
    m.pon(tc + .3, golpe(72 - 4 * k, 36, .45, .25), .6, (-.4, 0, .4)[k])
    m.pon(tc + .05, swish(.3, 200, 1400), .15, (-.4, 0, .4)[k])
for k in range(3):
    m.pon(E["dependen"] + k * .1 + .25, cuerda(165 + 30 * k, .8), .4, (-.4, 0, .4)[k])
# ---------- 6. ARC-AGI-3 ----------
m.pon(E["arc"], swish(.5, 250, 2200), .3)
m.pon(E["nombreArc"] - .1, tic(.02, 2000, 6000), .3)
# el arnés de papel se arma alrededor de la bola: carrocería y dos ruedas
m.pon(E["arnes"] - .2, swish(.3, 400, 2600), .2, -.3)
m.pon(E["arnes"] + .02, carton(120), .5, -.2)
for k in range(2):
    m.pon(E["arnes"] + .16 + k * .12, suma(golpe(150, 80, .15, .5), toc(380 + 60 * k) * .5), .4, (-.4, .1)[k])
# rueda hasta casi el final: rodar de cartón, no pasos
n_ = int((E["llena"] - E["llega"] + .1) * SR)
tr_ = np.arange(n_) / SR
m.pon(E["llega"], banda(ruido(n_), 70, 520) * (.6 + .4 * np.sin(2 * np.pi * 11 * tr_)) * np.minimum(tr_ / .1, 1) * np.minimum((n_ / SR - tr_) / .15, 1), .3)
m.pon(E["llega"], trazo(E["llena"] - E["llega"], 300, 640), .16)
m.pon(E["llena"] + .05, ding(784, 1.0), .22)
m.pon(E["llena"] + .05, golpe(120, 60, .25, .4), .35)
# brinquitos de calentamiento antes de arrancar y al quedarse en el 62% (mismo periodo que el dibujo: |sin 6.8 t|)
for k in range(int(E["arc"] * 6.8 / np.pi) + 1, int((E["codigo"] - .1) * 6.8 / np.pi) + 1):
    tk = k * np.pi / 6.8
    if E["arc"] + .45 < tk < E["arnes"] - .25:
        m.pon(tk, toc(260), .1)
m.pon(E["nota"], papel(.25), .5)
m.pon(E["nota"] + .06, golpe(170, 90, .1, .8), .3)
# ---------- 7. el código y el espejo ----------
m.pon(E["codigo"], swish(.5, 300, 2600), .3)
t0c, t1c = E["codigo"] + .4, E["anthropic"] + .4
tt = t0c
while tt < t1c:
    m.pon(tt, rayon(.24), .35, -.2 + .4 * rng.random())
    tt += .25
m.pon(E["ochenta"], golpe(96, 48, .3, .3), .5)
m.pon(E["ochenta"] + .02, campana((659.3, 987.8), .8, (.4, .2)), .14)
m.pon(E["claude"], pluma(.2), .3)
m.pon(E["espejo"] - .1, swish(.6, 200, 2000), .3)
m.pon(E["espejo"] + .35, campana((2349, 3520, 4699), 1.0, (.25, .15, .08)), .14)
tt = E["espejo"] + .45
while tt < E["automejora"] + .8:
    m.pon(tt, rayon(.2), .2, -.3)
    tt += .55
m.pon(E["lazo"], trazo(E["todaviaNo"] - E["lazo"], 420, 880), .12)
m.pon(E["todaviaNo"] - .06, golpe(105, 52, .28, .15), .32)              # sello sordo: grave, fuera de la banda de la voz
m.pon(E["automejora"], campana((329.6, 493.9), 1.0, (.4, .2)), .12)
# ---------- 8. el carril ----------
m.pon(E["sabemos"], swish(.5, 250, 2200), .3)
m.pon(E["acotadas"] - .05, suma(golpe(100, 50, .3, .3), soplo(.4, 300, 1800, .3) * .5), .5)
for i in range(14):
    m.pon(E["verif"] + i * .045 + .05, tic(.02, 2600, 8000), .25 * (1 - i / 16), (i % 2 - .5) * .4)
a_, b_ = E["avanza"] - .2, E["nosabemos"] - .25
m.pon(a_, soplo(b_ - a_ + .3, 120, 700, .6), .14)                    # viento grave: no compite con «más rápido…»
tt = a_
while tt < b_:
    m.pon(tt, banda(toc(360), 80, 900), .12)
    tt += np.pi / 15
for i in range(30):
    yc = 3 + i * 2.7
    if ybCarril(a_) < yc < ybCarril(b_ - .01):
        tc = invierte(ybCarril, yc, a_, b_)
        m.pon(tc, ding(1318.5 + 30 * (i % 3), .4), .05, .2)
for (x, yc) in ((-1.95, 14), (1.95, 18.5), (-1.9, 23), (1.95, 27.5), (-1.9, 32)):
    if ybCarril(a_) < yc < ybCarril(b_ - .01):
        m.pon(invierte(ybCarril, yc, a_, b_) - .1, swish(.25, 800, 5000), .1, (-.6 if x < 0 else .6))
m.pon(E["nosabemos"] - .1, soplo(1.8, 200, 1600, .5), .3)
m.pon(E["sale"], toc(280), .2)
# ---------- 9. el recorrido de la serie ----------
m.pon(E["empezo"], swish(.45, 300, 2400)[::-1], .25)
m.pon(E["empezo"] + .1, soplo(.4, 300, 1500, .7), .2)
m.pon(E["empezo"] + .3, lluvia(E["frasco"] - E["empezo"] - .3, 30), .2)
m.pon(E["frasco"] + .25, suma(golpe(110, 60, .2, .3), campana((1318.5, 1975.5), .4, (.3, .15))), .5)
m.pon(E["grieta"] - .05, golpe(84, 40, .3, .3), .5)
m.pon(E["grieta"], suma(tic(.02, 2000, 9000), tic(.02, 3000, 9000)), .45)
m.pon(E["rompe"], vidrio(), .6)
m.pon(E["rompe"], golpe(60, 30, .7, .3), .55)
m.pon(E["rompe"] + .05, soplo(.4, 400, 2400, .3), .2)
# ---------- 10. la fiesta ----------
m.pon(E["fiesta"] - .1, suma(golpe(200, 100, .08, 1.0), tic(.03, 1500, 7000)), .6)
m.pon(E["fiesta"], lluvia(2.6, 70), .25)
m.pon(E["fiesta"] + .15, matasuegras(.6), .14, -.3)
for i in range(4):
    m.pon(E["organizada"] + i * .14, pluma(.16), .4, -.4)
m.pon(E["etiq"], suma(papel(.18), tic(.02, 1500, 5000)), .45, .2)
for i in range(4):
    m.pon(E["nadie"] + i * .12, toc(520 + 40 * i), .1, -.4 + i * .25)
m.pon(E["nombre"] - .25, cinta_adhesiva(.35), .6, .2)
m.pon(E["nombre"] + .3, soplo(1.1, 900, 4000, .3), .14, .2)
va = lambda t: ioc(prg(t, E["nadie"] + .2, E["para"] + .3))
for k in (1, 2, 3):
    m.pon(invierte(va, k / 3 - 1e-3, E["nadie"] + .2, E["para"] + .3), toc(300 + 25 * k), .25, .3)
m.pon(E["clic"], clic(), .7, .35)
m.pon(E["clic"] + .02, golpe(52, 28, 1.2, .03), .5)
m.pon(E["clic"] + .12, campana((130.8, 196.0, 261.6), 3.0, (.7, .35, .18)), .3)
m.pon(E["clic"] + .1, banda(ruido(int(3.4 * SR)), 120, 900) * np.linspace(1, 0, int(3.4 * SR)) ** 2, .02)

# ---------- música: el pulso del intro arranca desde el segundo 0 y salta 8 s atrás (dos frases exactas) para
# que la pista entera caiga con la voz y su bajada final empiece justo en el clic del apagador ----------
# La bajada de la pista (80.05 s) cae en el clic. El tramo 1 arranca casi en 0 y salta un múltiplo exacto de 4 s
# (dos compases) dentro de la parte llena, escondido bajo el latigazo hacia los atriles.
off2 = E["clic"] - 80.05
c1 = off2 % 4
if c1 > .5:
    c1 -= 4
J = E["altman"] + .1                     # el salto (16 s, cuatro vueltas exactas del ciclo de 4 s) cae bajo el latigazo
assert J - off2 > 16.05 and J - c1 > 16.05, "el salto debe quedar dentro de la parte llena de la pista"
print(f"música: tramo 1 desde pista {max(-c1, 0):.2f} (pieza {max(c1, 0):.2f}), salto en {J:.2f} de {J - c1:.2f} a {J - off2:.2f}")
m.musica([("a30_agi", max(-c1, 0), max(c1, 0), J, .02, .03),
          ("a30_agi", J - off2, J, m.dur, .03, m.dur - E["clic"] - .6)])
m.cierra()
