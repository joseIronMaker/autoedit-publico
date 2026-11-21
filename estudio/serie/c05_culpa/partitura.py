"""Capítulo 5. Imagen y sonido leen lo mismo: esta partitura escribe t.json y red.json, y Pieza.tsx los importa."""
import json
import math
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
sys.path.insert(0, str(Path(__file__).resolve().parent))
from kit_sonido import *
import red as RED

PAUSAS = {"¿de quién": .25, "porque el error": .35, "la solución": .25, "regresar": .6, "empiezas": .2, "estas dos": .2, "a esta otra": .25,
          "y cada una": .25, "capa por capa": .15, "cuando llega": .5, "cada conexión": .15, "a esto le": .95, "por debajo": .2, "uno de sus": .1,
          "cada vez": .35, "nadie la": .2, "nadie le": .15, "solo una": .35, "¿cuánto fue": .3, "aprender": .65}
m = Mezcla("c05_culpa", pausas=PAUSAS, cola=3.0).exporta_tiempos()
T = m.T
if "--tiempos" in sys.argv:
    fr = []
    for w in m.W:
        fr.append(f"{w['w']}@{w['s']:.2f}")
        if w['w'][-1] in ".:?": print(" ".join(fr)); fr = []
    print("DUR", m.dur)
    raise SystemExit

s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
tt = dict(
    equi=s("equivocó"), golpe=1.6, tiene=s("tiene"), mill=s("millones"), una=s("una sola"), mala=s("mala"), finA=e("al final"),
    quien=s("¿de quién"), fue=s("fue la"), culpa=s("culpa"), porque=s("porque el"), error=s("error"), salida=s("salida"),
    las=s("las capas"), medio=s("de en medio"), nunca=s("nunca"), enteran=e("enteran"), durante=s("durante"), anios=s("años"), escond=s("escondidas"), gran=s("gran"), finF=e("problema"),
    sol=s("la solución"), casi=s("casi"), infantil=s("infantil"), finG=e("infantil"), regresar=s("regresar"), donde=s("por donde"), vino=e("vino"),
    empiezas=s("empiezas"), esta=s("esta neurona"), dijo=s("dijo"), quien2=s("¿quién la"), empujo=s("empujó"), estas=s("estas dos"), pesaron=s("pesaron"),
    les=s("les toca"), mas=s("más culpa"), otra=s("a esta otra"), nada=s("casi nada"), cada=s("y cada una"), reparte=s("reparte"), alim=e("alimentaron"),
    capa=s("capa por capa"), hasta=s("hasta el"), principio=e("principio"), cuando=s("cuando llega"), conex=s("cada conexión"), sabe=s("sabe"), exact=s("exactamente"),
    cuanto=s("cuánto debe"), moverse=s("moverse"), moverseF=e("moverse"), aesto=s("a esto"), retro=s("retropropagación"), ingles=s("en inglés"), back=s("backpropagation"),
    debajo=s("por debajo"), regla=s("regla"), cadena=s("cadena"), prepa=s("cálculo"), hizo=s("la hizo"), anio=s("mil novecientos"), uno=s("uno de sus"), geof=s("geoffrey"), gano=s("ganó"), nobel=s("nobel"), veinte=s("dos mil"),
    cadavez=s("cada vez"), pasa=s("pasa esto"), nadie1=s("nadie la"), regana=s("regaña"), nadie2=s("nadie le"), solo=s("solo una"), pregunta=s("pregunta"), viaj=s("viajando"), cuanto2=s("¿cuánto fue"), tuya=s("tuya"), finP=e("tuya"),
    aprender=s("aprender"), repartir=s("repartir"), bien=s("bien la"), culpaF=T("bien la culpa").e, fin=m.W[-1]["e"], dur=m.dur,
)
tt.update(
    corte=tt["finG"] + .32, vuelve=tt["empiezas"] - .16, mueve=tt["moverseF"] - .06,
    fA=tt["les"] - .1, dA=.85, fC=tt["nada"] + .02, dC=.95, f2=tt["reparte"] + .15, d2=tt["alim"] - tt["reparte"] - .25, f1=tt["capa"] - .1, d1=1.05, f0=tt["hasta"] - .1, d0=tt["principio"] - tt["hasta"] + .1,
)
# La bola baja rebotando: t, capa y neurona de cada choque. Los lee la animación.
tt["plinko"] = [dict(t=a, l=b, i=c) for a, b, c in ((.17, 0, 2), (.46, 1, 1), (.74, 2, 1), (1.0, 3, 1), (1.24, 4, 0))]
P = 1.66                                     # tres pulsos de la música: un ciclo adelante-atrás
tt["ciclos"] = [dict(t=tt["aesto"] + .25, d=tt["debajo"] - tt["aesto"] - .55, de=1, a=2),
                dict(t=tt["hizo"] + .6, d=2.2, de=2, a=3), dict(t=tt["uno"] + .3, d=2.2, de=3, a=4)]
ini = tt["cadavez"] + .22
for k, (de, a) in enumerate(((4, 5), (5, 6), (6, 7), (7, 8))):
    tt["ciclos"].append(dict(t=ini + k * P, d=P, de=de, a=a))
tt.update(preg=tt["viaj"] - .1, dPreg=tt["cuanto2"] - tt["viaj"] + .8, ultimo=tt["bien"] + .1)
(RAIZ / "remotion/src/serie/c05/t.json").write_text(json.dumps({k: (round(v, 3) if isinstance(v, float) else v) for k, v in tt.items()}), encoding="utf-8")
Z = RED.construye()
(RAIZ / "remotion/src/serie/c05/red.json").write_text(json.dumps(Z), encoding="utf-8")
if "--datos" in sys.argv:
    print(json.dumps({k: v for k, v in tt.items() if k != "ciclos"}))
    raise SystemExit

# ---------- lo que esta pieza necesita y el kit no trae: cuerdas ----------
# Las conexiones son cuerdas. El rojo las pulsa al pasar: fuerte donde hay mucha culpa, apenas donde no. Sube en la escala
# porque sube en la red, y cuando la red entera se ajusta suenan las sesenta a la vez. La pista está en la menor: pentatónica de la.
_cu = {}
def cuerda(f, dur=1.7, brillo=.55):
    k = round(f, 1)
    if k not in _cu:
        tt_ = np.arange(int(dur * SR)) / SR
        y = sum(brillo ** (h - 1) / h * np.sin(2 * np.pi * h * f * tt_ + h) * np.exp(-tt_ * (2.1 + .85 * h + f / 620)) for h in range(1, 10))
        _cu[k] = y * np.minimum(tt_ / .0016, 1)
    return _cu[k]

def grado(d):
    return 110 * 2 ** ((d // 5) + (0, 3, 5, 7, 10)[d % 5] / 12)

BASE = {3: 6, 2: 8, 1: 10, 0: 12}                  # capa de la conexión → grado de la nota
C0 = Z["pasos"][0]["c"]
def aristas():
    for l in range(4):
        for i in range(len(C0[l])):
            for k in range(len(C0[l][i])):
                yield l, i, k, C0[l][i][k]

def nota_de(l, i):
    return grado(BASE[l] + i)

def pan_de(l, i):
    return (i / max(len(C0[l]) - 1, 1) - .5) * 1.1

def pulsa(l, i, t, q, g=1.0):
    """Una cuerda pulsada: el volumen es la raíz de la culpa, como la vibración que se dibuja."""
    a = g * (.03 + .34 * q ** .5)
    m.pon(t, cuerda(nota_de(l, i)), a, pan_de(l, i))
    m.pon(t, tic(.012, 2400, 6400), a * .16, pan_de(l, i))

def fade(x, a=.01, b=.05):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

def rasgon(d):
    """Papel que se rasga: ruido grueso a tirones."""
    n = int(d * SR)
    e = np.abs(np.sin(np.cumsum(rng.uniform(.0005, .004, n)) * 40)) ** 3
    return fade((banda(ruido(n), 500, 3800) * e + banda(ruido(n), 160, 700) * e * .5), .02, .08)

def rueda(d):
    n = int(d * SR); x = np.arange(n) / SR
    return fade(banda(ruido(n), 70, 420) * (.6 + .4 * np.sin(2 * np.pi * x * 11)) * np.sin(np.linspace(0, np.pi, n)) ** .6, .02, .08)

def clinc(g=.16, pan=0.):
    t = np.arange(int(.32 * SR)) / SR
    s = sum(v * np.sin(2 * np.pi * f * t) * np.exp(-t * d) for f, v, d in ((2130, 1, 22), (3190, .6, 30), (4420, .4, 42), (5870, .22, 60)))
    return s * g

# ---------- apertura: cada choque suena a madera y pulsa las cuerdas de esa neurona ----------
m.pon(0, soplo(.5, 300, 2600, .7), .08)
for h in tt["plinko"]:
    l, i = h["l"], h["i"]
    pan = (Z["xs"][str(RED.CAPAS[l])][i] - 540) / 900
    m.pon(h["t"], toc(380 - l * 36), .3, pan)
    m.pon(h["t"], golpe(136 - l * 12, 72, .12, .3), .22, pan)
    m.pon(h["t"], cuerda(grado(6 + (l * 3) % 7)), .13, pan)
G = tt["golpe"]
m.pon(G, golpe(62, 28, 1.0, .55), .66)
m.pon(G, cola(toc(170), 1.3), .2)
for k, ti in enumerate(rebotes(G - math.sqrt(2 * 1.5 / 30), 1.5, .44, 30)[1:]):
    m.pon(ti, golpe(96, 46, .32, .22), .62 * .46 ** k)
m.pon(G + .02, soplo(.34, 500, 4200, .2), .12, -.4)

# ---------- millones ----------
m.pon(tt["tiene"] - .14, soplo(2.0, 220, 2200, .62), .2)
m.pon(tt["mill"], lluvia(tt["una"] + 1 - tt["mill"], 66) * np.linspace(.15, 1, int((tt["una"] + 1 - tt["mill"]) * SR)), .26)
m.pon(tt["una"] - .1, polvo(1.5), .22)
m.pon(tt["mala"], golpe(70, 34, .6, .25), .46)
m.pon(tt["mala"], cola(toc(240), 1.1), .24)
# La pregunta: tres golpes y el último pesa
for f, g_, a in ((tt["quien"], (78, 38, .4, .4), .5), (tt["fue"], (72, 36, .34, .34), .38), (tt["culpa"], (52, 25, 1.2, .55), .9)):
    m.pon(f - .04, golpe(*g_), a * .8)
m.pon(tt["culpa"] - .04, cola(toc(150), 1.6), .3)
m.pon(tt["culpa"] - .3, soplo(.34, 300, 2600, .92), .3)

# ---------- la salida grita y nadie oye ----------
m.pon(tt["porque"] - .24, soplo(.8, 300, 3400, .2), .4)
m.pon(tt["porque"] + .5, golpe(100, 50, .3, .2), .36)
i_ = 0
while True:
    q = tt["error"] - .1 + i_ * .68
    if q > tt["durante"]: break
    m.pon(q, golpe(58, 32, .34, .0), .24 * max(.4, 1 - i_ * .08))
    m.pon(q, toc(165), .05)
    i_ += 1
# ---------- la hoja, y los años ----------
m.pon(tt["durante"] - .22, soplo(.56, 500, 5200, .36), .24)
m.pon(tt["durante"] + .3, golpe(90, 50, .2, .5), .34)
for k in range(40):
    q = tt["anios"] - .2 + (tt["finF"] - tt["anios"] + .3) * math.acos(1 - 2 * k / 40) / math.pi
    m.pon(q, tic(.03, 1400, 4800), .12 if k % 5 == 4 else .08, rng.uniform(-.25, .25))
    m.pon(q, toc(rng.uniform(600, 760)), .025)
m.pon(tt["gran"], golpe(72, 36, .5, .2), .3)
m.pon(tt["sol"] + .1, rasgon(.85), .06)
m.pon(tt["sol"] + .1, soplo(.85, 300, 2200, .4), .1)
m.pon(tt["casi"], toc(880), .14)

# ---------- el negro ----------
corte, vuelve = tt["corte"], tt["vuelve"]
m.pon(corte, golpe(50, 24, 1.3, .6), 1.25)
q = corte + 1 / 1.5
while q < tt["regresar"]:
    m.pon(q, golpe(54, 30, .3, 0), .5)
    m.pon(q + .17, golpe(48, 30, .26, 0), .3)
    q += 1 / 1.5
sube0, sube1 = tt["regresar"] + .02, tt["vino"] - .05
m.pon(sube0, trazo(sube1 - sube0 + .2, 130, 620), .1)
m.pon(sube0, soplo(sube1 - sube0 + .2, 300, 3000, .9), .05)
for j, l in enumerate((3, 2, 1, 0)):
    q = sube0 + (sube1 - sube0) * ((j + .96) / 4)
    m.pon(q, cuerda(grado(BASE[l] + 1)), .2)
m.pon(sube1 + .02, cola(toc(880), 1.2), .22)

# ---------- empiezas por el final ----------
m.pon(tt["empiezas"] - .05, rueda(.7), .26)
m.pon(tt["empiezas"] + .55, golpe(84, 42, .42, .18), .24)
m.pon(tt["esta"], soplo(.5, 2400, 7000, .5), .035)
ini_c, per = tt["quien2"] - .05, .62
for i in range(3):
    a = C0[3][i][0]
    for n in range(8):
        if ini_c + (n + 1) * per * .62 > tt["les"] + .6: continue
        q = ini_c + per * (1 + n * .62 + i * .13)
        m.pon(q, toc(190 + 50 * i), .05 + .26 * a ** .5, pan_de(3, i))
        if a > .1: m.pon(q, golpe(92, 50, .22, .1), .18)
m.pon(tt["pesaron"] - .12, golpe(60, 30, .6, .2), .36)
# el rojo: la misma cuenta que dibuja
def ini_rojo(l, i):
    return (tt["fC"] if i == 0 else tt["fA"]) if l == 3 else {2: tt["f2"], 1: tt["f1"], 0: tt["f0"]}[l]
def dur_rojo(l, i):
    return (tt["dC"] if i == 0 else tt["dA"]) if l == 3 else {2: tt["d2"], 1: tt["d1"], 0: tt["d0"]}[l]
m.pon(tt["fA"], rueda(tt["dA"] + .1), .16)
m.pon(tt["fA"], soplo(tt["dA"] + .1, 200, 1300, .7), .08)
m.pon(tt["f2"], soplo(tt["d2"] + .1, 180, 1100, .7), .05)
m.pon(tt["f1"], soplo(tt["d1"] + .1, 220, 1300, .7), .06)
m.pon(tt["f0"], soplo(tt["d0"] + .1, 260, 1600, .7), .07)
for l, i, k, q_ in aristas():
    ini, d = ini_rojo(l, i), dur_rojo(l, i)
    pulsa(l, i, ini + d * (.82 + .16 * (i / 4)), q_, {3: 1, 2: .9, 1: .7, 0: .5}[l])
for l in (3, 2, 1, 0):
    fin_c = ini_rojo(l, 1) + dur_rojo(l, 1)
    m.pon(fin_c, golpe(110 + (3 - l) * 26, 56, .24, .12), .14 if l else .07)
m.pon(tt["principio"] + .28, cola(toc(660), 1.6), .1)

# ---------- cada conexión sabe ----------
for k in range(60):
    l = next(x for x, ac in enumerate(np.cumsum([25, 20, 12, 3])) if k < ac)
    q = tt["conex"] - .1 + (Z["ys"][l] - 300) / 1000 * .55 + (k % 7) * .012
    m.pon(q, tic(.018, 3000, 8000), .05, rng.uniform(-.6, .6))
    m.pon(q, toc(rng.uniform(1000, 1500)), .02, rng.uniform(-.6, .6))
m.pon(tt["sabe"] - .08, soplo(.62, 400, 3000, .25), .12)
m.pon(tt["sabe"] + .02, soplo(tt["mueve"] - tt["sabe"], 300, 4200, .96), .07)
m.pon(tt["moverse"] - .14, soplo(.46, 260, 3200, .8), .16)
# Las sesenta a la vez.
M = tt["moverseF"] + .04
for l, i, k, q_ in aristas():
    a = .03 + .24 * q_ ** .5
    m.pon(M + l * .012 + i * .006, cuerda(nota_de(l, i) * (.5 if (i + k) % 2 else 1)), a, pan_de(l, i))
m.pon(M, golpe(50, 24, 1.4, .5), .7)
m.pon(M, cola(toc(220), 1.9), .3)
for k in range(46):
    m.pon(M + rng.uniform(0, .26), tic(.016, 2600, 7000), .17, rng.uniform(-.8, .8))
m.pon(M + .08, rueda(.95), .36, -.25)
m.pon(M + 1.05, toc(300), .18, -.3)

# ---------- la vuelta: adelante cae, atrás sube ----------
def ciclo(c_, g):
    a, d = c_["t"], c_["d"]
    for l in range(4):                       # la señal baja
        m.pon(a + d * .3 * (l + .9) / 4, toc(420 - l * 60), .05 * g)
    for l in (3, 2, 1, 0):                   # la culpa sube
        q0 = a + d * (.32 + (3 - l) * .125 + .15)
        for i in range(len(C0[l])):
            s = sum(Z["pasos"][c_["de"]]["c"][l][i])
            if s * 84 > .4: pulsa(l, i, q0 + i * .012, min(1, s * 2.4), g)
    m.pon(a + d * .86, rueda(d * .14 + .1), .16 * g, -.2)
    m.pon(a + d * .86, tic(.02, 2600, 6000), .12 * g)

m.pon(tt["aesto"] - .45, soplo(.95, 240, 2000, .4), .3)
ciclo(tt["ciclos"][0], .5)
re = tt["retro"]
for k in range(7):
    q = re - .3 + k * .22
    m.pon(q, soplo(.3, 900, 5000, .4), .04, .6 - k * .2)
m.pon(re + .95, toc(330), .22, -.6)
m.pon(tt["back"] - .2, soplo(.8, 700, 3800, .5), .07)
m.pon(tt["debajo"] - .12, soplo(.95, 200, 2600, .4), .22)
for q, g_ in ((.34, .34), (.92, .22), (1.55, .13)):
    ti = tt["debajo"] + .42 + q
    for p in (-.2, 0, .2):
        m.pon(ti + rng.uniform(0, .05), clinc(g_ * .55, p), 1, p)
m.pon(tt["debajo"] + .76, golpe(76, 38, .42, .2), .28)
dur_e = tt["prepa"] - tt["regla"] + .1
for i in range(3):
    q = tt["regla"] - .12 + (i + .7) * dur_e / 3
    m.pon(q, clinc(.14), 1)
    m.pon(q, cuerda(grado(9 + i * 2)), .16)
# ---------- el artículo: máquina de escribir, y solo texto ----------
m.pon(tt["hizo"] - .15, soplo(.9, 200, 2600, .4), .18)
q = tt["hizo"] + .3
for k in range(52):
    m.pon(q + k / 30 + rng.uniform(-.006, .006), tic(.022, 1800, 5200), rng.uniform(.07, .12), rng.uniform(-.18, .18))
    m.pon(q + k / 30, toc(rng.uniform(280, 360)), .035)
m.pon(tt["anio"], golpe(66, 32, .7, .5), .5)
m.pon(tt["anio"], cola(toc(210), 1.1), .14)
m.pon(tt["uno"] + .1, soplo(.9, 400, 2600, .5), .16)
m.pon(tt["geof"], toc(330), .2)
m.pon(tt["nobel"], campana(), .11)
m.pon(tt["veinte"], golpe(80, 40, .42, .3), .32)
# ---------- cada vez ----------
m.pon(tt["cadavez"] - .5, soplo(.66, 240, 3600, .55), .26)
m.pon(tt["cadavez"] + .1, golpe(70, 34, .5, .3), .3)
for j, c_ in enumerate(tt["ciclos"][1:]):
    ciclo(c_, .34 if j < 2 else .6 - (j - 2) * .07)
for k, q in enumerate((.75, 1.5, 2.25)):
    m.pon(tt["cadavez"] + q, toc(392 * (1, 1.2, 1.5)[k]), .1)
# ---------- la pregunta sola ----------
for l in (3, 2, 1, 0):
    q = tt["preg"] + (3 - l) * tt["dPreg"] * .235 + tt["dPreg"] * .3
    for i in range(len(C0[l])):
        s = sum(C0[l][i])
        if s > .03:
            m.pon(q + i * .03, cuerda(nota_de(l, i), 1.7, .2), .07, pan_de(l, i))
m.pon(tt["cuanto2"] - .05, golpe(56, 28, .7, .1), .3)
# ---------- cierre ----------
m.pon(tt["aprender"] - .95, soplo(.95, 240, 1800, .5), .2)
F = tt["culpaF"] + .05
m.pon(tt["ultimo"], soplo(F - tt["ultimo"], 300, 2200, .5), .08, -.3)
for k, ti in enumerate(rebotes(F - math.sqrt(2 * 1.2 / 30), 1.2, .4, 30)[1:]):
    m.pon(ti, golpe(100, 50, .26, .2), .3 * .42 ** k, -.3)
m.pon(tt["bien"] + .1, cola(toc(330), 1.2), .2)
m.pon(F, golpe(90, 44, .42, .16), .34, -.3)
for l, i, k, q_ in aristas():
    m.pon(F + .02 + (3 - l) * .05, cuerda(nota_de(l, i)), .03 + .2 * q_ ** .5, pan_de(l, i))
m.pon(F, campana((329.6, 493.9, 659.3), 2.6, (.8, .4, .2)), .16)

P_M = 48 - (M - vuelve)
m.musica([("c05_culpa", 16 - tt["culpa"], 0, corte, .02, .03),
          ("c05_culpa", P_M, vuelve, tt["solo"] + .3, .3, .8),
          ("c05_culpa", 86, tt["aprender"] - .6, m.dur, .9, 2.7)])
m.fx = np.tanh(m.fx / .85) * .85          # ningún golpe por encima de la voz: si no, loudnorm baja toda la pieza
m.cierra()
