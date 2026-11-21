"""a06: el cuaderno de turnos. Aquí vive el tiempo de la pieza: cada golpe se calcula una vez y sale a
`t.json`, que la animación lee. Dibujo y sonido no se pueden desfasar porque son los mismos números.

Todo se ve desde arriba, como una mesa fotografiada desde el techo: por eso las bolas nuevas caen hacia la
mesa y el foley manda en el arranque. Whisper estira las palabras sobre el silencio previo ("Tu" dura 0.7 s
en el alineado), así que los arranques de frase salen de la voz real, no del alineador.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

m = Mezcla("a06_notas", pausas={
    "un modelo no aprende": .2, "guardó una nota": .25, "tu mamá": .4, "no lo recuerda": .3, "anthropic lo hizo": .35,
    "como turnos": .25, "y esto tiene": .4, "si la nota": .45, "si alguien más": 1.25, "y si guarda": 1.3,
    "así que la memoria": 1.05, "se parece más": .2, "no recuerda quién": .45, "lee lo que": .25, "sobre ti": .55,
}, cola=3.4).exporta_tiempos()
T = m.T

# ---------- inicios reales de la voz ----------
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

# ---------- el guion de acciones ----------
A = {}
A["cae"] = .30
A["borra0"] = s("olvida") - .02
A["borra1"] = A["borra0"] + 1.0
A["hop"] = A["borra0"] + .56
A["preg0"] = A["borra1"] + .03
A["cal"] = arr("cómo puede") + .12
A["rasga"] = [s("trabajar"), s("durante"), s("días"), e("días") - .02, e("días") + .3, e("días") + .62]
A["lunes"] = s("lunes") - .1
A["rasga"].append(A["lunes"])
A["cafe"] = s("terrible") + .16
a = arr("dejándose")
A["notas"] = [a + .02, a + .25, a + .47, a + .68, a + .87]
A["libro0"] = fin("notas") + .22
A["modelo"] = arr("un modelo")
A["golpes"] = [s("no aprende") + .08, s("de platicar") + .1, s("contigo") + .12]
A["gira"] = arr("lo que aprendió") + .02
A["fijo"] = s("fijo") + .02
A["sello"] = s("entrenaron") + .08
A["tel"] = s("aplicación") + .05
A["tel1"] = s("cuando una") + .05
A["tel2"] = s("que te recuerda") + .25
A["lev"] = s("en realidad") + .1
A["guarda"] = arr("guardó")
A["cajon1"] = s("en un archivo") - .1
A["entra"] = s("archivo") + .1
A["slam1"] = fin("archivo") + .12
A["sale"] = arr("y cuando regresas") - .02
A["nueva"] = s("regresas") + .34
A["cajon2"] = arr("la vuelve")
A["plaf"] = fin("sobre la mesa") + .03
A["mama"] = arr("tu mamá")
A["mar"] = s("mariscos")
A["le"] = arr("le gustan")
A["bol"] = s("boleros")
A["norec"] = arr("no lo recuerda")
A["quita"] = A["norec"] + .3
A["lee"] = arr("lo lee")
A["ant"] = arr("anthropic")
A["librot"] = A["ant"] + .34
A["largos"] = s("proyectos largos")
A["cadauno"] = arr("cada uno")
A["sale2"] = A["cadauno"] - .34
A["cae2"] = A["cadauno"] + .12
A["preg"] = s("sin saber nada") + .05
A["prim"] = arr("y lo primero")
A["abre"] = s("que hace es") - .1
A["leer"] = s("leer")
A["avances"] = s("avances")
A["ante"] = arr("para ver")
A["subr"] = s("anterior") - .3
A["escr2"] = fin("anterior") + .05
A["turnos"] = arr("como turnos")
A["pag"] = A["turnos"] - .22
A["hosp"] = s("hospital")
A["cada"] = arr("cada enfermera")
A["exp"] = s("expediente")
A["yesto"] = arr("y esto")
A["cierra"] = s("consecuencias") + .05
A["cerrado"] = A["cierra"] + .5
A["c1"] = arr("si la nota")
A["mal"] = s("está mal")
A["seq"] = arr("se equivoca")
A["charola"] = s("toda seguridad") + .02
A["c2"] = arr("si alguien más")
A["escr3"] = s("escribe") - .05
A["cam"] = arr("cambia lo que")
A["cree"] = s("cree")
A["c3"] = arr("y si guarda")
A["dem"] = s("demasiado")
A["vuelve"] = arr("vuelve a llenar")
A["mesa3"] = s("mesa", T("vuelve a llenar").i)
A["llena"] = fin("mesa", T("vuelve a llenar").i) + .25
A["asi"] = arr("así que")
A["racha"] = A["asi"] - .22
A["memoria"] = s("la memoria")
A["tuya"] = s("tuya")
A["separ"] = arr("se parece más")
A["cuad"] = s("cuaderno")
A["cuadF"] = fin("cuaderno")
A["norecu"] = arr("no recuerda quién")
A["quien"] = s("quién eres")
A["lee2"] = arr("lee lo que")
A["alguien"] = s("alguien", T("lee lo que").i)
A["escribio"] = s("escribió", T("lee lo que").i)
A["sobre"] = arr("sobre ti")
A["ti"] = s("ti.")
A["tiF"] = fin("ti.")
A["cierra3"] = A["tiF"] + .1
A["cerrado3"] = A["cierra3"] + .46
A["fin"] = m.dur

# Los latidos del monitor: cada vez más rápido cuando llega "consecuencias".
b, A["bips"] = A["turnos"] + .2, []
while b < A["yesto"]:
    A["bips"].append(round(b, 3))
    b += .78
b = A["yesto"]
d = .46
while b < A["cierra"]:
    A["bips"].append(round(b, 3))
    d = max(d * .78, .11)
    b += d

# Las hojas que llenan la mesa: cada vez más seguidas, hasta que ya no hay mesa.
n, A["hojas"] = 170, []
for i in range(n):
    u = i / (n - 1)
    A["hojas"].append(round(A["dem"] - .1 + (A["llena"] - A["dem"] + .1) * u ** .62, 3))
A["papeles"] = A["hojas"]
del A["hojas"]

(Path(m.dir).parents[1] / "remotion/src/serie/a06/t.json").write_text(json.dumps({k: (round(x, 3) if isinstance(x, float) else x) for k, x in A.items()}), encoding="utf-8")


# ---------- foley propio de este capítulo ----------
def rasgado(dur=.34):
    """Hoja que se arranca: ruido a tirones que sube y se corta."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    tirones = .35 + .65 * (rng.random(n // 300 + 2)[np.minimum((np.arange(n) / 300).astype(int), n // 300 + 1)] > .35)
    return banda(ruido(n), 1200, 7000) * tirones * np.sin(np.pi * t ** .6) ** .8 + banda(ruido(n), 300, 1400) * np.exp(-t * 6) * .4


def pagina(dur=.5):
    """Una página que pasa: aire y un chasquido al caer."""
    y = soplo(dur, 500, 3600, .55)
    x = tic(.04, 1200, 4200)
    y[-len(x) - 200:-200] += x * .8
    return y


def goma(dur, pasadas=6):
    """Goma contra la mesa: fricción que va y viene."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = np.abs(np.sin(np.pi * pasadas * t / dur)) ** .6
    return (banda(ruido(n), 700, 5000) * .9 + banda(ruido(n), 150, 600) * .6) * env


def lapiz(dur, r=11):
    """Lápiz: ráfagas agudas al ritmo de la mano."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    env = (.5 + .5 * np.sin(2 * np.pi * r * t + 2 * np.sin(2 * np.pi * 3.1 * t))) ** 2
    return banda(ruido(n), 2400, 9000) * env


def pega(f=170):
    """Papel que se estampa contra la mesa."""
    g = golpe(f, f * .55, .16, .9)
    x = banda(ruido(int(.05 * SR)), 900, 5200) * np.exp(-np.arange(int(.05 * SR)) / SR * 90)
    g[: len(x)] += x * .8
    return g


def clic():
    g = golpe(180, 90, .09, .9)
    x = tic(.02, 2000, 6000) * .9
    g[: len(x)] += x
    return g


def cajon(dur=.42):
    """Riel de metal: ruido grave que rueda."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    r = 1 + .6 * np.sin(2 * np.pi * 38 * t * dur)
    return banda(ruido(n), 90, 900) * r * np.sin(np.pi * t) ** .7


def chapoteo():
    n = int(.6 * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 250, 2600) * np.exp(-t * 7) + np.sin(2 * np.pi * np.cumsum(190 + 260 * t) / SR) * np.exp(-t * 11) * .5


def trinquete(dur):
    """Las perillas girando: tics que se aceleran y paran en seco."""
    n = int(dur * SR)
    y = np.zeros(n)
    x, p = 0., .09
    while x < dur - .02:
        s_ = tic(.018, 1500, 5200)
        i = int(x * SR)
        y[i:i + len(s_)] += s_[: n - i]
        x += p
        p = max(p * .93, .022)
    return y


def charola():
    """Charola de metal contra la mesa."""
    t = np.arange(int(1.1 * SR)) / SR
    s_ = sum(v * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, v, d in ((523, .5, 5), (1187, .4, 7), (1873, .3, 9), (2951, .22, 12)))
    return s_ * .6


def bip(f=1046, dur=.1):
    t = np.arange(int(dur * SR)) / SR
    return np.sin(2 * np.pi * f * t) * np.minimum(t / .004, 1) * np.minimum((dur - t) / .012, 1)


def cuerda(f, dur=1.3):
    """Karplus-Strong: una cuerda de nylon, sin samples."""
    n = int(dur * SR)
    p = int(SR / f)
    b_ = rng.uniform(-1, 1, p)
    y = np.zeros(n)
    for i in range(n):
        y[i] = b_[i % p]
        b_[i % p] = .498 * (b_[i % p] + b_[(i + 1) % p])
    return banda(y, 70, 3400)


def rasgueo():
    """Un acorde de bolero (la menor con séptima), arpegiado a mano."""
    y = np.zeros(int(1.5 * SR))
    for i, f in enumerate((110, 164.8, 220, 261.6, 329.6, 392)):
        s_ = cuerda(f) * (1 - i * .05)
        k = int(i * .04 * SR)
        y[k:k + len(s_)] += s_[: len(y) - k]
    return y


def dembow(dur=1.9, bpm=96):
    """El patrón del reguetón: el chiste del capítulo se oye antes de leerse."""
    n = int(dur * SR)
    y = np.zeros(n)
    x16 = 60 / bpm / 4
    k = golpe(92, 42, .22, .3)
    sn = banda(ruido(int(.1 * SR)), 900, 5200) * np.exp(-np.arange(int(.1 * SR)) / SR * 34)
    for paso in range(int(dur / x16)):
        i = int(paso * x16 * SR)
        if paso % 4 == 0:
            y[i:i + len(k)] += k[: n - i] * 1.1
        if paso % 16 in (3, 6, 11, 14):
            y[i:i + len(sn)] += sn[: n - i] * .8
        if paso % 2 == 0:
            s_ = tic(.02, 6000, 12000)
            y[i:i + len(s_)] += s_[: n - i] * .25
    return y


# ---------- gancho: la bola cae, la goma lo borra todo ----------
m.pon(A["cae"], golpe(66, 32, .7, .4), .95)
m.pon(A["cae"], lluvia(1.1, 30), .16)
m.pon(.02, soplo(.3, 200, 1500, .9), .3)
m.pon(A["cae"] + .1, lapiz(A["borra0"] - A["cae"] - .1), .09)
m.pon(A["borra0"] - .12, soplo(.3, 400, 3000, .8), .2)
m.pon(A["borra0"], goma(A["borra1"] - A["borra0"], 7), .2)
m.pon(A["hop"], toc(300), .4)
m.pon(A["borra1"], polvo(.5), .3)
m.pon(A["preg0"] + .05, tic(.03, 1800, 5000), .25)
m.pon(A["cal"], golpe(96, 46, .35, .35), .7)
for i, x in enumerate(A["rasga"][:-1]):
    m.pon(x - .03, rasgado(.26 if i == 5 else .34), .2 if i < 5 else .1, -.4 if i % 2 else .4)
m.pon(A["lunes"] - .03, rasgado(.42), .3)
m.pon(A["lunes"] + .1, golpe(74, 38, .5, .3), .55)
m.pon(A["cafe"], chapoteo(), .5, .3)
for i, x in enumerate(A["notas"]):
    m.pon(x, pega(170 + i * 22), .5, .3 * (-1) ** i)
m.pon(A["libro0"] - .22, soplo(.26, 300, 2200, .9), .3)
m.pon(A["libro0"], golpe(58, 28, .9, .45), 1.0)
m.pon(A["libro0"], campana((110, 165), 1.0, (.5, .3)), .16)

# ---------- el modelo: la plática rebota, las perillas no se mueven ----------
m.pon(A["modelo"], soplo(.6, 300, 1700, .4), .24)
for i, x in enumerate(A["golpes"]):
    m.pon(x, toc(430 + i * 90), .5, (-1) ** i * .3)
    m.pon(x, golpe(120, 70, .16, .4), .3)
m.pon(A["gira"], trinquete(A["fijo"] - A["gira"]), .34)
m.pon(A["fijo"], clic(), .72)
m.pon(A["fijo"], golpe(74, 36, .7, .3), .7)
m.pon(A["sello"], golpe(100, 52, .3, .6), .6)

# ---------- la aplicación y lo que hay detrás ----------
m.pon(A["tel"] - .4, soplo(.5, 300, 2600, .8), .3)
m.pon(A["tel"], golpe(104, 58, .3, .5), .7)
m.pon(A["tel1"], toc(760), .3)
m.pon(A["tel2"], toc(980), .34)
m.pon(A["tel2"], campana((1318, 1975), .7, (.3, .16)), .12)
m.pon(A["lev"], soplo(.8, 240, 2600, .25), .4)
m.pon(A["lev"] + .3, lapiz(A["cajon1"] - A["lev"] - .25), .07)
m.pon(A["cajon1"], cajon(), .6)
m.pon(A["entra"] - .1, soplo(.35, 700, 4000, .7), .22)
m.pon(A["slam1"], cajon(.2), .6)
m.pon(A["slam1"] + .18, golpe(86, 44, .4, .5), .75)
m.pon(A["sale"], soplo(.5, 200, 1200, .5), .22, .5)
m.pon(A["nueva"], golpe(72, 36, .45, .3), .75)
m.pon(A["cajon2"], cajon(), .6)
m.pon(A["plaf"] - .4, soplo(.42, 600, 3800, .8), .24)
m.pon(A["plaf"], pega(120), .8)
m.pon(A["plaf"], golpe(60, 34, .4, .1), .45)

# ---------- la nota ----------
m.pon(A["mar"] + .5, trazo(.22, 700, 900), .2)
m.pon(A["mar"] + .5, tic(.03, 1800, 5000), .24)
m.pon(A["bol"] + .05, rasgueo(), .34)
m.pon(A["quita"], cajon(.3), .5)
m.pon(A["quita"] + .2, polvo(.32), .3)
m.pon(A["quita"] + .34, tic(.03, 1800, 5000), .3)
m.pon(A["lee"], cajon(.3), .4)
m.pon(A["lee"] + .22, pega(140), .5)
m.pon(A["lee"] + .3, campana((659, 988), 1.1, (.5, .25)), .2)

# ---------- los turnos ----------
m.pon(A["ant"], cajon(), .5)
m.pon(A["librot"], golpe(62, 30, .8, .4), .95)
for i in range(8):
    m.pon(A["largos"] + i * .085, pega(210 + i * 14), .16, -.6 + i * .17)
m.pon(A["sale2"], soplo(.5, 200, 1200, .5), .24, .5)
m.pon(A["cae2"], golpe(72, 36, .45, .3), .8)
m.pon(A["preg"], tic(.03, 1800, 5000), .3)
m.pon(A["abre"], pagina(.7), .55)
m.pon(A["abre"] + .66, golpe(80, 40, .3, .3), .5)
m.pon(A["subr"], trazo(.5, 500, 900), .2)
m.pon(A["escr2"], lapiz(.62), .12)
m.pon(A["pag"], pagina(.55), .24)
for x in A["bips"]:
    m.pon(x, bip(1046 if x < A["yesto"] else 1244), .12 if x < A["yesto"] else .17)
m.pon(A["cada"] + .1, soplo(.8, 300, 1500, .5), .1)
m.pon(A["cierra"], pagina(.46), .55)
m.pon(A["cerrado"], golpe(50, 26, 1.1, .4), 1.0)
for i in range(3):
    m.pon(A["cerrado"] + .18 + i * .13, tic(.03, 1400, 4200), .4)

# ---------- consecuencia 1: se borró un "no" ----------
m.pon(A["c1"] - .12, pagina(.46), .24)
m.pon(A["mal"] - .15, goma(.6, 4), .16)
m.pon(A["seq"] - .1, soplo(.5, 300, 2600, .5), .2)
m.pon(A["charola"], charola(), .55)
m.pon(A["charola"], golpe(84, 40, .4, .3), .7)
m.pon(A["charola"] + .55, toc(760), .3)

# ---------- consecuencia 2: alguien más escribe ----------
m.pon(A["c2"] - .3, soplo(.5, 300, 2600, .5), .16)
m.pon(A["c2"] - .1, pagina(.42), .2)
m.pon(A["escr3"] - .1, trazo(.28, 500, 700), .2)
m.pon(A["escr3"] + .22, lapiz(.75, 14), .16)
m.pon(A["cam"] - .3, soplo(.5, 300, 2600, .5), .2)
m.pon(A["cree"], golpe(70, 34, .5, .4), .9)
m.pon(A["cree"], dembow(A["c3"] - A["cree"] - .2), .5)

# ---------- consecuencia 3: otra vez la mesa llena ----------
m.pon(A["c3"] - .32, soplo(.5, 300, 2600, .5), .2)
for i, x in enumerate(A["papeles"]):
    m.pon(x, pega(180 + (i % 5) * 30), .04 + .05 * (i / 170), .5 * np.sin(i * 2.4))
m.pon(A["dem"], soplo(A["llena"] - A["dem"], 500, 3600, .8), .08)
m.pon(A["llena"], golpe(56, 28, .8, .3), .75)
m.pon(A["racha"] - .2, soplo(.9, 260, 3200, .2), .34)
m.pon(A["racha"] - .1, lluvia(.5, 70), .12)

# ---------- no se parece a la tuya: se parece a un cuaderno ----------
m.pon(A["memoria"], trazo(A["tuya"] - A["memoria"], 300, 520), .12)
m.pon(A["separ"] + .2, soplo(.9, 300, 2000, .6), .2)
m.pon(A["cuad"] + .1, golpe(62, 30, .7, .4), .8)

# ---------- final: la lámpara ----------
m.pon(A["norecu"] - .05, clic(), .62)
m.pon(A["norecu"] - .03, golpe(48, 26, 1.0, .05), .4)
m.pon(A["quien"] + .1, golpe(72, 38, .3, .2), .3)
m.pon(A["lee2"] - .3, pagina(.5), .2)
m.pon(A["alguien"], lapiz(A["sobre"] - A["alguien"] - .55, 9), .1)
m.pon(A["tiF"], campana((261.6, 392, 523), 2.2, (.6, .32, .16)), .16)
m.pon(A["cierra3"], pagina(.46), .22)
m.pon(A["cerrado3"], golpe(52, 27, 1.3, .3), .6)
m.pon(A["cerrado3"], campana((130.8, 196, 261.6), 2.4, (.8, .4, .2)), .3)    # cola: el final se apaga, no se corta
for x in (.7, 1.05):
    m.pon(A["cerrado3"] + x, golpe(120, 70, .12, .5), .22)

# El foley se aparta de la voz: bajo cada palabra baja a la mitad y en las pausas pega completo.
# (Solo el foley: la cama de música sigue constante, como pide el canal.)
_v = np.abs(m.voz[:, 0])
_k = int(.03 * SR)
_e = np.sqrt(np.convolve(_v ** 2, np.ones(_k) / _k, "same"))
_act = np.clip((20 * np.log10(_e + 1e-9) + 42) / 14, 0, 1)
_act = np.convolve(_act, np.ones(int(.14 * SR)) / int(.14 * SR), "same")
_g = np.ones(m.N)
_n = min(m.N, len(_act))
_g[:_n] = 1 - .55 * _act[:_n]
m.fx *= _g[:, None]

m.musica([("a06_notas", 2, 0, A["norecu"] - .05, .06, .1), ("a06_notas", 58, A["lee2"] - .1, m.dur - .6, .8, 2.2)])
m.cierra()
