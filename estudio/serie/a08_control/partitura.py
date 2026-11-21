import json
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"y va a invitar": .3, "ahora llámala": .6, "otro resultado": .55, "pasa lo mismo": .6, "se queda ciego": .3, "si contesta": .9,
          "y más no": .7, "por eso diseñar": .3, "cada vez": .2}
ARRANQUE = .24           # la toma trae .31 s de silencio al principio: se recorta para que la voz arranque casi en 0
m = Mezcla("a08_control", pausas=PAUSAS, cola=3.4)
m.voz = m.voz[int(ARRANQUE * SR):]
for w in m.W:
    w["s"] = max(0, w["s"] - ARRANQUE); w["e"] -= ARRANQUE
m.dur -= ARRANQUE
m.N = int(m.dur * SR); m.fx = np.zeros((m.N, 2)); m.mus = np.zeros((m.N, 2))
m.exporta_tiempos()
T = m.T
s, e = (lambda f, d=0: T(f, d).s), (lambda f, d=0: T(f, d).e)

# ---------- la línea de tiempo: la leen el dibujo (eventos.json) y el sonido ----------
ADIV, ADIVF = s("adivinar"), e("adivinar")
KL1 = s("y va a invitar") - .3
KL2 = s("modelo") + .22
SLAM = s("arruinarlo") + .02
ONDA = s("cuarenta") + .02
VE = s("no ve")
TROTE = [e("otro resultado") + .9 + k * .34 for k in range(4)]
KL3 = s("falla") + .12
NEGRO = s("se queda ciego") - .06
TOSTADA = s("ese día") - .18
KL4 = e("sabe qué hacer") + .16
REGLON = s("cada herramienta")
crece = [s("más no") + .02 + k * (s("mesa") + .05 - s("más no")) / 8 for k in range(9)]
RESET = s("por eso diseñar") - .3
ETIQ = [s("diseñar"), e("para un agente") - .04]
MANO = s("es distinto")
SOPLA = s("aprende")
PUL = [s("una vez"), s("una vez") + .28, e("una vez") + .1]
REBOBINA = e("una vez") + .24
LEE = [s("un agente las") + .24, e("primera vez") - .02]
BORRA = e("primera vez") + .1
LAND = e("cada vez") + .03
EV = {
    "H": [.34, .98, 1.54, 2.1], "BIRRETE": 2.68, "SLAM": SLAM, "SALE": e("mala herramienta") + .2,
    "ONDA": ONDA, "SUBE": e("eso le estás dando") + .22, "VE": VE,
    "RAYOS": [VE - .1, e("no ve tus herramientas") + .28],
    "PIES": [VE + .1, VE + .62, VE + 1.14, s("solo lee") - .42],
    "TAG": s("solo lee") + .12, "NOMBRE": s("nombre"), "DESC": s("descripción"),
    "ENCOGE": s("herramienta que") - .1, "ESCRIBE": [s("enviar") - .02, e("enviar")],
    "QUE": s("qué envía"), "QUIEN": s("a quién"), "ORBF": s("tu agente") + .15,
    "DEDOS": [ADIV - .32 + k * .17 for k in range(5)], "J1": ADIVF + .1, "KL1": KL1,
    "LLEGA1": s("mamá") + .04, "ABRE": s("su propia"), "SUSTO": s("sorpresa"), "TACHA": e("sorpresa") + .36, "MIJO": e("sorpresa") + .62,
    "REGRESA": s("ahora llámala") - .3, "PEGA": s("enviar invitación") - .22,
    "L1": [s("enviar invitación"), e("enviar invitación")], "L2": [s("a un contacto"), e("a un contacto")],
    "L3": [s("y explica") + .1, e("cuándo usarla")], "L4": [s("y cuándo no"), e("y cuándo no")],
    "J2": KL2 - .62, "KL2": KL2, "LLEGA2": s("otro resultado"),
    "TROTE": TROTE, "J3": KL3 - .46, "KL3": KL3, "ROJO": s("error"), "NEGRO": NEGRO,
    "BRILLA": s("contesta", T("si contesta").i), "TOSTADA": TOSTADA, "L5": s("ese día"), "L6": s("prueba"),
    "VOLTEA": s("sabe qué") + .02, "KL4": KL4, "CRECE": crece, "DOS": s("y dos"), "PARA": e("confunden") + .1,
    "RESET": RESET, "ETIQ": ETIQ, "MANO": MANO, "SOPLA": SOPLA, "PUL": PUL, "REBOBINA": REBOBINA, "LEE": LEE, "BORRA": BORRA, "LAND": LAND,
}
Path(m.dir.parent.parent / "remotion/src/serie/a08/eventos.json").write_text(json.dumps({k: (round(v, 3) if isinstance(v, float) else [round(x, 3) for x in v] if isinstance(v, list) else v) for k, v in EV.items()}), encoding="utf-8")

# ---------- lo que esta pieza necesita y el kit no trae ----------
def fade(x, a=.008, b=.04):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

def papel(dur=.16):
    n = int(dur * SR); k = np.exp(-np.linspace(0, 6, n))
    return (banda(ruido(n), 4800, 11000) + banda(ruido(n), 260, 1200) * .8) * k

def rasgar(dur, sube=True):
    n = int(dur * SR); y = banda(ruido(n), 1100, 9000)
    pasos_ = int(dur * 62); c = rng.random(pasos_ + 2) ** 3
    env = np.interp(np.linspace(0, pasos_, n), np.arange(pasos_ + 2), c)
    sub = np.linspace(.35, 1, n) if sube else np.ones(n)
    return fade(y * env * sub + banda(ruido(n), 180, 700) * env * .5, .004, .05)

def rayar(dur):
    """Lápiz sobre papel en el mismo tiempo que se escribe."""
    n = int(dur * SR); tt = np.arange(n) / SR
    tr = np.abs(np.sin(2 * np.pi * tt * 6.3)) ** .6 * (.65 + .35 * np.sin(2 * np.pi * tt * 17))
    return fade(banda(ruido(n), 2400, 7800) * tr * .7 + banda(ruido(n), 500, 1400) * tr * .2, .01, min(.2, dur * .3))

def boing(dur=1.1, f0=210):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f0 * (1 + .55 * np.exp(-tt * 3) * np.sin(2 * np.pi * tt * 13))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.2) + .22 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)

def plastico(f=1200, dur=.12):
    """Tecla de hule: un toc hueco y apagado, no metal."""
    tt = np.arange(int(dur * SR)) / SR
    return (np.sin(2 * np.pi * f * tt) * .5 + np.sin(2 * np.pi * f * 1.73 * tt) * .25) * np.exp(-tt * 70) + banda(ruido(len(tt)), 1500, 6000) * np.exp(-tt * 260) * .7

def klunk(g=1.0, grave=1.0):
    """El botón grande: hule que baja y un resorte que lo regresa."""
    x = golpe(96 * grave, 44, .5, .5)
    y = np.zeros(len(x)); z = plastico(520 * grave, .2)
    y[:len(z)] += z * .8
    c = tic(.02, 1500, 5200); y[:len(c)] += c * 1.2
    return (x + y) * g

def chirrido(f0=1000, f1=300, dur=.16):
    n = int(dur * SR); f = np.geomspace(f0, f1, n)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** .5, .005, .03)

def impresora(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    return fade(np.sign(np.sin(2 * np.pi * 96 * tt)) * banda(ruido(n), 700, 3000) * .5 * (.6 + .4 * np.sign(np.sin(2 * np.pi * 11 * tt))), .01, .03)

def aire(dur):
    """Tono de cuarto: el cero digital se oye como corte, no como silencio."""
    n = int(dur * SR); tt = np.arange(n) / SR
    return fade((banda(ruido(n), 90, 800) + banda(ruido(n), 1800, 4600) * .18) * (.8 + .2 * np.sin(2 * np.pi * .23 * tt)), .25, .35)

def trombon(notas=(233.1, 220, 207.7, 196), dur=(.32, .32, .32, 1.0)):
    """Wah-wah triste, de caricatura: una sierra filtrada que cae medio tono cada vez."""
    out = []
    for f, d in zip(notas, dur):
        n = int(d * SR); tt = np.arange(n) / SR
        vib = 1 + (.012 * np.sin(2 * np.pi * 6 * tt) * np.clip(tt / .3, 0, 1) if d > .5 else 0)
        fr = f * vib * (np.geomspace(1, .94, n) if d > .5 else 1)
        ph = np.cumsum(fr) / SR
        saw = 2 * (ph % 1) - 1
        x = banda(saw, 120, 1600 if d < .5 else 1100) * np.sin(np.linspace(0, np.pi, n)) ** .4
        out.append(fade(x, .02, .06))
    return np.concatenate(out)

def zumbido(dur, f=110):
    n = int(dur * SR); tt = np.arange(n) / SR
    return fade(np.sign(np.sin(2 * np.pi * f * tt)) * .3 * banda(np.ones(n), 1, 1) + banda(np.sign(np.sin(2 * np.pi * f * tt)), 80, 900), .01, .06)

def apaga(dur=.9):
    """Se va la luz: un tono que cae hasta el piso y un golpe sordo de relevador."""
    n = int(dur * SR); f = np.geomspace(520, 34, n)
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.linspace(1, 0, n) ** 1.4, .004, .1)

def zap(dur=.5):
    n = int(dur * SR); tt = np.arange(n) / SR
    cr = (rng.random(n) > .985) * rng.standard_normal(n) * 3
    return fade(banda(ruido(n), 2500, 9000) * np.exp(-tt * 6) * .5 + banda(cr, 800, 9000) * np.exp(-tt * 4), .002, .08)

def salto(t, g=.3):
    m.pon(t, golpe(120, 60, .16, .12), g)

def aterriza(t, g=.4, f=900):
    m.pon(t, golpe(110, 58, .2, .2), g)
    m.pon(t, plastico(f, .1), g * .5)

def brinco(ini, fin, g=.2):
    m.pon(ini - .02, soplo(min(fin - ini + .1, 1.2), 600, 4200, .35), g)


# ---------- arranque: libros, birrete y el remoto que cae ----------
for i, h in enumerate(EV["H"]):
    a0 = -.2 if i == 0 else h - .19
    m.pon(max(a0, 0), soplo(h - .02 - max(a0, 0) + .05, 700, 5000, .7), .32, (-1) ** (i + 1) * .5)
    m.pon(h - .03, golpe(78 - i * 4, 40, .36, .5), .62)
    m.pon(h - .03, papel(.14), .5)
    m.pon(h, golpe(130, 64, .14, .2), .32)
m.pon(EV["BIRRETE"] - .32, soplo(.34, 1200, 6000, .9), .12)
m.pon(EV["BIRRETE"], plastico(1700, .1), .42)
m.pon(EV["BIRRETE"] + .02, campana((1318.5, 1975.5, 2637), .9, (.5, .3, .2)), .09)
SL = EV["SLAM"]
m.pon(SL - 1.0, soplo(1.0, 60, 500, .95), .42)
m.pon(SL - .38, soplo(.36, 120, 1400, .95), .3)
m.pon(SL, golpe(40, 20, 1.9, .5), 1.35)
m.pon(SL, golpe(70, 34, .6, .9), .8)
m.pon(SL, plastico(240, .26), .4)
m.pon(SL + .06, cola(golpe(55, 28, .5, .3), 1.4, .45), .35)
m.pon(SL + .02, lluvia(1.1, 70), .18)
m.pon(SL + .03, papel(.5), .3)
m.pon(SL + .04, soplo(.9, 900, 6000, .1), .14)
for k in range(4):
    m.pon(SL + .5 + k * .19, golpe(150, 80, .1, .4), .16 * .8 ** k, (-1) ** k * .6)
m.pon(EV["SALE"] - .02, boing(.5, 260), .16)
m.pon(EV["SALE"], soplo(.3, 500, 3000, .3), .2)
aterriza(EV["SALE"] + .36, .34)

# ---------- el control ----------
m.pon(s("imagina") - .1, soplo(2.9, 200, 2200, .45), .26, -.2)
for f in range(10):
    for c in range(4):
        q = EV["ONDA"] + f * .068 + c * .024
        m.pon(q, plastico(900 + f * 40 + c * 30, .08), .2, -.45 + c * .3)
        m.pon(q, tic(.012, 2400, 6000), .09, -.45 + c * .3)
m.pon(e("eso le estás dando") - .28, soplo(.3, 800, 4000, .5), .12); aterriza(e("eso le estás dando") + .02, .24)
brinco(EV["SUBE"], EV["SUBE"] + .42); aterriza(EV["SUBE"] + .42, .36)
a, b = EV["RAYOS"]
n_ = int((b - a + .5) * SR); tt_ = np.arange(n_) / SR
m.pon(a, fade((np.sin(2 * np.pi * 172 * tt_) + .5 * np.sin(2 * np.pi * 258 * tt_)) * .2 + banda(ruido(n_), 1500, 5000) * .3 * (.5 + .5 * np.sin(2 * np.pi * 3.2 * tt_)), .1, .3), .16)
for f in range(10):
    q = a + (b - a) * np.arccos(1 - 2 * np.clip((6.8 - (3.6 - f)) / 14, 0, 1)) / np.pi
    m.pon(q, toc(1400 + 90 * f), .1, .2)
for k in range(3):
    brinco(EV["PIES"][k], EV["PIES"][k] + .36, .1); aterriza(EV["PIES"][k] + .36, .2, 700 + k * 50)

# ---------- la ficha ----------
m.pon(EV["TAG"], papel(.22), .5); m.pon(EV["TAG"], golpe(160, 80, .1, .5), .22)
m.pon(EV["NOMBRE"] - .1, rayar(.36), .16)
m.pon(EV["DESC"] - .1, rayar(.42), .14)
m.pon(EV["ENCOGE"], trazo(.36, 900, 400), .1); m.pon(EV["ENCOGE"] + .3, papel(.1), .3)
w0, w1 = EV["ESCRIBE"]; m.pon(w0 - .06, rayar((w1 - w0) * .62 + .08), .24)
for q in (EV["QUE"] - .12, EV["QUIEN"] - .1):
    m.pon(q, soplo(.5, 700, 5000, .3), .18)
    m.pon(q + .04, campana((1568, 2093), .6, (.4, .25)), .05)
for k, q in enumerate(EV["DEDOS"]):
    m.pon(q, plastico(1100 + 130 * k, .08), .34, (-.4, .4, -.4, .4, 0)[k])
brinco(EV["J1"], EV["KL1"], .3)
m.pon(EV["KL1"], klunk(1.0), .8)

# ---------- la invitación a mamá ----------
m.pon(EV["KL1"] + .05, soplo(EV["LLEGA1"] - EV["KL1"] + .1, 500, 5200, .25), .15, -.5)
m.pon(EV["KL1"] + .12, papel(.12), .3)
m.pon(EV["LLEGA1"], papel(.2), .5); m.pon(EV["LLEGA1"], golpe(150, 80, .1, .4), .2)
m.pon(EV["ABRE"], rasgar(.32), .4)
m.pon(EV["ABRE"] + .2, soplo(.3, 900, 5000, .4), .14)
m.pon(EV["SUSTO"], boing(.7, 320), .34)
m.pon(EV["SUSTO"] + .02, chirrido(700, 1500, .12), .2)
m.pon(EV["TACHA"], rayar(.3), .42); m.pon(EV["TACHA"], tic(.03, 1200, 4000), .22)
m.pon(EV["MIJO"], papel(.1), .16)
m.pon(EV["TACHA"] + .1, trombon(), .17)
m.pon(EV["REGRESA"] - .1, soplo(.4, 400, 6000, .3), .2, .4)

# ---------- la etiqueta larga ----------
m.pon(EV["PEGA"] - .1, soplo(.2, 1200, 6000, .9), .2)
m.pon(EV["PEGA"], golpe(120, 60, .2, .8), .55); m.pon(EV["PEGA"], papel(.28), .66)
m.pon(EV["PEGA"] + .14, rasgar(.18, False), .22)
for k, fr in (("L1", .62), ("L2", .62), ("L3", .66), ("L4", .7)):
    a, b = EV[k]
    m.pon(a - .06, rayar((b - a) * fr + .08), .2)
brinco(EV["J2"], EV["KL2"], .3)
m.pon(EV["KL2"], klunk(1.0), .95)
m.pon(EV["KL2"] + .05, soplo(EV["LLEGA2"] - EV["KL2"] + .1, 500, 5200, .4), .2, .5)
for i in range(12):
    q = EV["LLEGA2"] + i * .075
    m.pon(q, papel(.08), .22, -.2 + i * .05)
    m.pon(q + .02, chirrido(900 + 60 * i, 1500 + 60 * i, .06), .07, -.2 + i * .05)
m.pon(EV["LLEGA2"] + .1, campana((880, 1108.7, 1318.5), 1.4, (.5, .35, .25)), .12)

# ---------- respuestas ----------
for k, q in enumerate(EV["TROTE"]):
    brinco(q, q + .3, .08); aterriza(q + .3, .18, 800 + 60 * k)
brinco(EV["J3"], EV["KL3"], .2)
m.pon(EV["KL3"], klunk(.8), .8)
m.pon(EV["KL3"] + .02, zap(.6), .5)
for k in range(9):
    m.pon(EV["KL3"] + .1 + k * .2, tic(.015, 3000, 8000) * np.sign(np.sin(np.arange(int(.015 * SR)) * .9)), .12, .3)
m.pon(EV["ROJO"], zumbido(.3, 98), .16)
m.pon(EV["NEGRO"], apaga(1.0), .5)
m.pon(EV["NEGRO"] + .02, golpe(60, 30, .5, .7), .55)
m.pon(EV["NEGRO"] + .1, aire(EV["TOSTADA"] - EV["NEGRO"] + .3), .05)
q = EV["NEGRO"] + .4
while q < EV["TOSTADA"] - .2:
    m.pon(q, tic(.01, 1800, 4000), .03); q += 2 * np.pi / 8.4
m.pon(EV["BRILLA"] - .1, polvo(EV["TOSTADA"] - EV["BRILLA"] + .1), .35)
m.pon(EV["TOSTADA"] - .04, impresora(.36), .2)
m.pon(EV["TOSTADA"] + .32, boing(.5, 420), .16)
m.pon(EV["TOSTADA"] + .32, plastico(1800, .08), .32)
m.pon(EV["TOSTADA"] + .05, campana((587.3, 740, 880), 1.5, (.4, .3, .2)), .08)
m.pon(EV["VOLTEA"], papel(.14), .4); m.pon(EV["VOLTEA"] + .14, tic(.02, 2000, 6000), .3)
brinco(EV["KL4"] - .4, EV["KL4"], .14)
m.pon(EV["KL4"], klunk(.8), .75)
m.pon(EV["KL4"] + .03, campana((587.3, 880, 1174.7), 1.4, (.6, .4, .3)), .14)
m.pon(EV["KL4"] + .6, soplo(.4, 600, 4000, .3), .12)

# ---------- la mesa se llena ----------
for k, q in enumerate(EV["CRECE"]):
    m.pon(q, golpe(82 - k * 2, 40, .3, .7), .5, (0, .5, -.5)[k % 3])
    m.pon(q, plastico(600 - k * 20, .14), .4, (0, .5, -.5)[k % 3])
    for j in range(6):
        m.pon(q + .04 + j * .022, plastico(1000 + 60 * j, .05), .08, (0, .6, -.6)[k % 3])
for k, n_cae in enumerate((5, 4, 7, 8)):
    q = EV["CRECE"][n_cae] + .08
    m.pon(q, soplo(.6, 900, 5000, .2), .2, (-.6, .6, .6, -.6)[k])
    m.pon(q + .45, papel(.12), .08, (-.6, .6, .6, -.6)[k])
m.pon(EV["CRECE"][5] + .5, chirrido(400, 900, .7), .07)
for i in range(2):
    m.pon(EV["DOS"] - .26 + i * .2, golpe(160, 80, .1, .6), .15); m.pon(EV["DOS"] - .26 + i * .2, papel(.16), .2)
brinco(EV["DOS"] - .42, EV["DOS"] + .14, .1); aterriza(EV["DOS"] + .14, .14)
m.pon(EV["DOS"] + .4, toc(880), .07)
# las manos van de un botón al otro: un toc por cada vez que llega, cada vez más seguido
tt_ = np.arange(EV["DOS"] + .14, EV["PARA"] - .25, .001)
u_ = np.clip((tt_ - EV["DOS"] - .14) / (EV["PARA"] - EV["DOS"] - .14), 0, 1)
lado_ = np.sin(tt_ * (3.4 + (11 - 3.4) * u_ ** 2) * 2.6)
for i in range(1, len(tt_) - 1):
    if abs(lado_[i]) > .97 and abs(lado_[i]) >= abs(lado_[i - 1]) and abs(lado_[i]) >= abs(lado_[i + 1]):
        m.pon(tt_[i], plastico(1300 if lado_[i] > 0 else 1150, .06), .12, .5 * np.sign(lado_[i]))
n_ = int((EV["RESET"] - EV["PARA"] + .25) * SR); tt2 = np.arange(n_) / SR
m.pon(EV["PARA"] - .25, fade(banda(ruido(n_), 300, 2400) * (.5 + .5 * np.sign(np.sin(2 * np.pi * 29 * tt2))) * .5, .05, .15), .1)
m.pon(EV["PARA"] - .25, aire(EV["RESET"] - EV["PARA"] + .5), .05)

# ---------- por eso ----------
m.pon(EV["RESET"] - .1, soplo(.45, 300, 5000, .3), .2)
for j in range(14):
    m.pon(EV["RESET"] + j * .025, plastico(900 - j * 25, .05), .08, (-1) ** j * .6)
brinco(EV["RESET"] - .02, EV["RESET"] + .56, .1); aterriza(EV["RESET"] + .56, .16)
for i in range(40):
    q = EV["ETIQ"][0] + (EV["ETIQ"][1] - .1 - EV["ETIQ"][0]) * i / 39
    m.pon(q, papel(.07), .26, -.45 + (i % 4) * .3)
m.pon(EV["MANO"] - .05, soplo(.7, 120, 1400, .5), .34, .5)
for q in EV["PUL"]:
    m.pon(q + .04, klunk(.55, 1.2), .5, .2)
m.pon(EV["SOPLA"] - .05, soplo(.8, 200, 1600, .35), .16)
m.pon(EV["SOPLA"], trazo(.6, 700, 300), .05)
for i in range(10):
    m.pon(EV["REBOBINA"] + i * .04, tic(.012, 2600, 7000), .07, -.3 + i * .06)
m.pon(EV["REBOBINA"], trazo(.45, 400, 900), .05)
d_ = (EV["LEE"][1] - EV["LEE"][0]) / 9
for i in range(9):
    aterriza(EV["LEE"][0] + (i + .9) * d_, .1, 900 + 40 * i)
    m.pon(EV["LEE"][0] + (i + .9) * d_ + .03, tic(.012, 3000, 8000), .1)
m.pon(EV["BORRA"] - .02, rayar(.2), .2)
m.pon(EV["BORRA"] + .02, soplo(s("cada vez") - .1 - EV["BORRA"], 300, 4000, .5), .2)

# ---------- el final ----------
L_ = EV["LAND"]
m.pon(L_, klunk(1.25, .85), 1.05)
m.pon(L_, golpe(44, 24, 1.4, .1), .5)
m.pon(L_ + .005, papel(.3), .6)
m.pon(L_ + .02, campana((146.8, 220, 293.7, 370), 3.4, (.8, .5, .35, .25)), .4)
m.pon(L_ + .13, plastico(1600, .1), .36)

# ---------- música: cortes en seco donde la imagen se corta, y el acorde final de la pista cae con la bola ----------
CORTE1 = SL - .03
FIN_SORPRESA = e("sorpresa") + .12
m.musica([("a08_control", 16.0, 0, CORTE1, .02, .03)], -23)
m.musica([("a08_control", 10.0, s("imagina") - .12, FIN_SORPRESA, .2, .06)], -23)
inicio3 = 48 - (EV["LLEGA2"] - EV["REGRESA"])
m.musica([("a08_control", inicio3, EV["REGRESA"], EV["LLEGA2"], .25, 0)], -25.5)
m.musica([("a08_control", 48.0, EV["LLEGA2"], EV["NEGRO"], 0, .02)], -33)
m.musica([("a08_control", 64.0, EV["TOSTADA"] + .05, EV["PARA"] - .25, .3, .05)], -33)
m.musica([("a08_control", 112 - (L_ - EV["RESET"]), EV["RESET"], m.dur, .25, .4)], -21)

TECHO = .62
m.fx = TECHO * np.tanh(m.fx * .6 / TECHO)

def hueco_para_la_voz(fx, baja=-15, lo=280, hi=6500):
    """Mientras la voz habla, el foley se aparta de SU banda (igual que en a02): la música sigue constante."""
    n = min(len(fx), len(m.voz))
    w = int(.03 * SR)
    pot = np.convolve(m.voz[:n].mean(axis=1) ** 2, np.ones(w) / w, "same")
    activa = np.clip((10 * np.log10(pot + 1e-10) + 44) / 10, 0, 1)
    a, r = 1 - np.exp(-1 / (.006 * SR)), 1 - np.exp(-1 / (.16 * SR))
    env = np.zeros(n); e_ = 0.0
    for i in range(0, n, 48):
        v = activa[i]; e_ += (v - e_) * (1 - (1 - (a if v > e_ else r)) ** 48); env[i:i + 48] = e_
    g = np.ones(len(fx)); g[:n] = db(baja) ** env
    salida = fx.copy()
    for ch in range(2):
        X = np.fft.rfft(fx[:, ch]); f = np.fft.rfftfreq(len(fx), 1 / SR)
        mas = np.clip((f - lo * .7) / (lo * .3), 0, 1) * np.clip((hi * 1.3 - f) / (hi * .3), 0, 1)
        medio = np.fft.irfft(X * mas, len(fx))
        salida[:, ch] = fx[:, ch] - medio + medio * g
    return salida

m.fx = hueco_para_la_voz(m.fx)
if "--picos" in sys.argv:
    S = int(SR)
    pico = lambda x: [20 * np.log10(max(np.abs(x[i:i + S]).max(), 1e-6)) for i in range(0, len(x) - S, S)]
    rms = lambda x: [20 * np.log10(max(np.sqrt((x[i:i + S] ** 2).mean()), 1e-6)) for i in range(0, len(x) - S, S)]
    fx, mu, vo = pico(m.fx * 1.2), rms(m.mus), rms(m.voz)
    print("fx pico >-3 dB:", [(i, round(v, 1)) for i, v in enumerate(fx) if v > -3])
    V_ = int(.2 * SR); vz = m.voz.mean(axis=1); mz = m.mus.mean(axis=1)
    g_ = []
    for i in range(0, min(len(vz), len(mz)) - V_, V_):
        a_ = 20 * np.log10(np.sqrt((vz[i:i + V_] ** 2).mean()) + 1e-9); b_ = 20 * np.log10(np.sqrt((mz[i:i + V_] ** 2).mean()) + 1e-9)
        if a_ > -26 and b_ > -70: g_.append((i / SR, a_ - b_))
    for a0, b0 in ((0, 3.7), (6.5, 28.5), (29.7, 38.6), (38.6, 47.3), (50.6, 61.2), (62.3, 75)):
        v_ = [g for t, g in g_ if a0 <= t < b0]
        if v_: print(f"voz-música {a0:5.1f}-{b0:5.1f}: mediana {np.median(v_):.1f} dB, p10 {np.percentile(v_, 10):.1f}")
    raise SystemExit
m.cierra()
