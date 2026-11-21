import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"escribes": .2, "elige una": .9, "y vuelve a": 1.7, "palabra por palabra": .15, "tu teléfono": 1.05,
          "esto leyó": .15, "y cómo aprendió": .5, "adivinaba": .4, "medían el error": .25, "repartían la culpa": .2,
          "una cantidad": .2, "por eso se": .2, "y no siempre": .45, "si lo hiciera": .55, "le dejan": .5,
          "por eso la misma": .7, "un poema": .35, "nadie escribió": .4, "salió de apostar": .3, "y cada apuesta": .7, "la más creíble": 1.5}
m = Mezcla("c11_siguiente", pausas=PAUSAS, cola=2.6).exporta_tiempos()
T = m.T
if "--tiempos" in sys.argv:
    for w in m.W:
        print(f"{w['w']}@{w['s']:.2f}", end=" ")
    print("\nDUR", m.dur)
    raise SystemExit

s = lambda f, o=0, d=0: round(T(f, d).s + o, 3)
e = lambda f, o=0, d=0: round(T(f, d).e + o, 3)

# ---------- los tiempos con nombre: los lee Pieza.tsx y el sonido de abajo ----------
# Whisper estira las pausas: los desplazamientos salen de medir la envolvente real de la voz.
i_ve = T("y vuelve").i
K = dict(
    chat=s("chatgpt", -.05), truco=s("truco", -.1), adiv=s("adivinar", -.12), sig=s("siguiente", -.05), fpal=e("palabra", -.3),
    esc=s("escribes", -.19), el=s("el cielo", -.12), cie=s("cielo"), es=s("es", 0, T("cielo").i), pts=s("por dentro", -.72), dentro=s("por dentro"), lista=s("lista"),
    azul=s("azul", -.13), seten=s("setenta", -.12), gris=s("gris", -.14), diez=s("diez", -.08), herm=s("hermoso", -.02), cinco=s("cinco", .04),
    elige=s("elige", -.09), vuelve=s("vuelve", -.13), ahora=s("ahora", -.16), re=s("el cielo", -.1, i_ve), azul2=s("azul", -.1, i_ve), pxp=s("palabra por", -.13),
    cada=s("cada una", -.06), sin=s("sin saber", .23), fin_fr=e("frase", .05, i_ve),
    tel=s("tu teléfono", .28), sug=s("sugiere", -.05), fsug=e("palabras", -.1), dif=s("la diferencia"), escala=s("escala"), leyo=s("esto leyó", -.02), intern=e("internet"),
    como=s("cómo aprendió", -.16), igual=s("igual", -.04), serie=s("serie", -.05),
    tapa=s("tapaban", -.2), tapF=s("palabra", .06, T("tapaban").i), adiv2=s("adivinaba", -.12), medi=s("medían", -.21), err=s("error", -.05, T("medían").i),
    culpa=s("repartían", -.14), fcul=e("culpa", -.2, T("repartían").i), ajus=s("ajustaban", -.18), peri=s("perillas", -.1, T("ajustaban").i), fperi=e("perillas", -.45, T("ajustaban").i),
    abs0=s("una cantidad", -.04), abs1=e("veces", .1), mod=s("modelo", -.05), gran=s("grande"), ing=s("en inglés", .34), L1=s("llm", .17), L2=s("llm", .45), M=s("llm", .72),
    nosi=s("no siempre", -.15), prob=s("más probable", -.1), si=s("si lo hiciera", .04), robot=s("robot"), ledejan=s("le dejan"), azar_=s("azar"), temp=s("temperatura", -.06), ftemp=e("temperatura", -.3),
    misma=s("por eso la misma"), dos=s("dos respuestas", .1), poema=s("poema", -.22), prog=s("programa", -.27), consejo=s("consejo", -.24),
    nadie=s("nadie", -.06), eso=s("eso", .05, T("nadie").i), salio=s("salió", -.02), apostar=s("apostar", .1), una=s("una palabra a", -.04, T("salió").i), yc=s("cada apuesta", -.27), nada=s("nada más", .05),
    la=s("creíble", -.5, T("nada").i), cre=s("creíble", -.2, T("nada").i),
    fin=T("creíble").e, dur=m.dur,
)
K["t1i"], K["t1f"] = K["elige"] + .5, K["vuelve"] - .55
K["vacia"] = K["vuelve"] - .1
K["pxf"] = [K["pxp"] + .3, K["pxp"] + .64, K["pxp"] + .96, K["cada"] + .3]       # porque, la, luz, del
K["arma"] = K["cinco"] + .42
K["caeB"] = K["tel"] - .68
K["ap"] = [round(.02 + i * .17, 3) for i in range(int((K["truco"] - .02) / .17) + 1)]
K["rob"] = [round(K["si"] + i * .5, 3) for i in range(5)]
K["une"] = [K["una"] + .05, K["una"] + .24, K["una"] + .56, K["una"] + .72, K["una"] + .88]
K["cae"] = K["cre"] + .95                                                          # la bola se vuelve el punto final

# [inicio, fin, disco, sector, tipo]  tipo 0 = salto corto, 1 = tirada, 2 = tirada que roza «verdadera»
tir, ant = [], -.14
for i, x in enumerate(K["ap"]):
    tir.append([ant, x, "mil", (i * 7 + 3) % 40, 0]); ant = x
tir.append([K["truco"], K["adiv"] + .1, "mil", 11, 0])
tir.append([K["t1i"], K["t1f"], "cielo", 0, 1])
tir.append([K["vuelve"] + .05, K["pxf"][0], "d2", 0, 1])
tir.append([K["pxf"][0] + .03, K["pxf"][1], "d3", 0, 0])
tir.append([K["pxf"][1] + .03, K["pxf"][2], "d4", 0, 0])
tir.append([K["pxf"][2] + .1, K["pxf"][3], "d5", 0, 0])
tir.append([K["nosi"] - .15, K["prob"] + .32, "cielo", 1, 1])
for i, x in enumerate(K["rob"]):
    tir.append([x - .22, x, "cielo", 0, 0])
for i, (a, g) in enumerate(((.0, 5), (.42, 1), (.9, 8), (1.3, 0), (1.74, 2), (2.2, 0))):
    tir.append([K["ledejan"] + .55 + a - .34, K["ledejan"] + .55 + a, "cielo", g, 0])
for a, g in ((.72, 6), (.98, 9), (1.22, 3)):
    tir.append([K["ftemp"] + a - .24, K["ftemp"] + a, "cielo", g, 0])
for x, g in zip(K["une"], (17, 6, 29, 2, 23)):
    tir.append([x - .15, x, "mil", g, 0])
tir.append([K["nada"] + .1, K["cre"], "cre", 0, 2])
K["tir"] = tir
(Path(__file__).resolve().parents[2] / "remotion/src/serie/c11/t.json").write_text(json.dumps(K, ensure_ascii=False))

# ---------- foley: nace de los mismos tiempos que la imagen ----------
HU = [.66, .78, .87, .94, 1]
def fade(x, a=.01, b=.05):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x
def clics(t0, t1, n, g=.2, pan=0.0, f=4600):
    for k in range(n):
        t = t0 + (t1 - t0) * k / max(n - 1, 1)
        m.pon(t, tic(.016, f, f * 2.6), g, pan)
        m.pon(t, toc(rng.uniform(1250, 1650)), g * .32, pan)
def rodar(d):
    n = int(d * SR); tt = np.arange(n) / SR
    return banda(ruido(n), 70, 430) * (.6 + .4 * np.sin(2 * np.pi * tt * np.linspace(8, 21, n))) * np.sin(np.linspace(0, np.pi, n)) ** .6
def pista(d):
    """La bola corriendo por el borde de metal: el tono baja mientras pierde velocidad."""
    n = int(d * SR)
    r = banda(ruido(n), 900, 3800) * (.5 + .5 * np.sin(2 * np.pi * np.cumsum(np.linspace(23, 7, n)) / SR))
    z = np.sin(2 * np.pi * np.cumsum(np.linspace(1900, 640, n)) / SR) * .06
    return (r + z) * np.sin(np.linspace(0, np.pi, n)) ** .4
def clack(f=None):
    f = f or rng.uniform(1500, 2400)
    y = toc(f) * .55
    q = tic(.02, 1800, 6400) * .8
    y[:len(q)] += q
    return y
def papel(dur=.16):
    n = int(dur * SR); e_ = np.exp(-np.linspace(0, 7, n))
    return (banda(ruido(n), 5400, 11500) + banda(ruido(n), 220, 1100) * .7) * e_
def crujido(d, f=190):
    n = int(d * SR); y = np.zeros(n); t = 0.0
    while t < d - .05:
        s_ = toc(f * rng.uniform(.8, 1.3)) * rng.uniform(.25, .7); i = int(t * SR)
        y[i:i + len(s_)] += s_[: n - i]; t += rng.uniform(.02, .11)
    return y
def tirada(ini, fin, pan=0.0, g=1.0):
    d_ = fin - ini; cae_ = ini + HU[0] * d_
    m.pon(ini, clack(), .3 * g, pan); m.pon(ini, soplo(.3, 500, 2800, .2), .12 * g, pan)
    m.pon(ini + .05, pista(cae_ - ini), .22 * g, pan)
    W_ = (round(d_ * .9) + .5) * 2 * np.pi; th = np.pi / 4
    for q in range(1, int(W_ / th)):
        u = 1 - (q * th / W_) ** (1 / 1.7)
        if .34 < u < HU[0]:
            m.pon(ini + u * d_, tic(.016, 2600, 7400), .13 * g * (1 - u * .5), pan); m.pon(ini + u * d_, toc(rng.uniform(1700, 2600)), .1 * g, pan)
    for i, u in enumerate(HU[:-1]):
        m.pon(ini + u * d_, clack(), (.42 - .06 * i) * g, pan)
    m.pon(fin, golpe(118, 58, .26, .4), .5 * g, pan); m.pon(fin, clack(1300), .46 * g, pan)
def imprime(t, g=.34, pan=0.0):
    m.pon(t, golpe(150, 80, .12, .6), g, pan); m.pon(t, tic(.022, 1600, 5200), g * .7, pan)

K_ = K
# Apertura: la rueda ya va lanzada.
m.pon(0, soplo(.36, 160, 1500, .92), .34)
m.pon(.36, golpe(60, 28, .8, .45), 1.0); m.pon(.36, clack(1200), .5); m.pon(.36, cola(toc(280), .8), .2)
m.pon(.1, rodar(K["truco"] + .6), .34)
m.pon(0, pista(K["truco"]), .1)
for i, x in enumerate(K["ap"]):
    m.pon(x, clack(), .17 + .07 * (i % 2), rng.uniform(-.35, .35))
    m.pon(x + .03, tic(.018, 3000, 8000), .1, -.2)
m.pon(K["chat"], golpe(96, 46, .3, .3), .42)
m.pon(K["truco"], golpe(58, 28, .9, .35), .92); m.pon(K["truco"], cola(toc(240), 1.1), .3); m.pon(K["truco"], clack(1200), .55)
m.pon(K["adiv"] + .1, clack(), .3)
m.pon(K["sig"] - .03, campana((523.3, 784), 1, (.6, .25)), .12)
m.pon(K["fpal"] + .12, soplo(.8, 150, 1500, .75), .24)
# Escribes: una tecla por letra.
for ini, fin, n in ((K["el"], K["el"] + .14, 2), (K["cie"] - .06, K["cie"] + .2, 5), (K["es"] - .08, K["es"] + .1, 2)):
    for j in range(n):
        q = ini + (fin - ini) * j / max(n - 1, 1)
        m.pon(q, tic(.02, 1500, 4800), .2, -.1); m.pon(q, toc(rng.uniform(210, 290)), .2, -.1)
for i in range(3):
    m.pon(K["pts"] + i * .17, toc(980 + i * 120), .24, .3)
# La tapa de la lista.
m.pon(K["dentro"] - .06, crujido(.3), .2); m.pon(K["dentro"], golpe(84, 42, .4, .3), .5); m.pon(K["dentro"] - .1, soplo(.5, 140, 900, .55), .16)
for i, (ini, fin, tn, pan) in enumerate(((K["azul"], K["azul"] + .78, K["seten"], -.1), (K["gris"], K["gris"] + .46, K["diez"], -.1), (K["herm"], K["herm"] + .4, K["cinco"], -.1))):
    m.pon(ini - .38, soplo(.34, 500, 3000, .35), .1, .3)
    m.pon(ini, golpe(112, 54, .3, .3), .6); m.pon(ini, clack(), .3)
    m.pon(ini + .02, rodar(fin - ini), .62, pan)
    m.pon(fin, toc(420), .3, pan); clics(ini + .05, tn, 7 - i * 2, .08, .2, 5200)
    m.pon(tn, toc(1320), .2, .2)
# La barra se enrosca y cierra el anillo.
m.pon(K["arma"], soplo(.5, 160, 1300, .5), .16)
m.pon(K["arma"] + .46, trazo(.8, 180, 560), .2)
m.pon(K["arma"] + .5, crujido(.8, 240), .16)
m.pon(K["elige"] - .1, golpe(66, 32, .6, .35), .78); m.pon(K["elige"] - .1, clack(1100), .44); m.pon(K["elige"] - .1, cola(toc(320), .9), .16)
# Tiradas.
tirada(K["t1i"], K["t1f"])
m.pon(K["t1f"], campana((659.3, 987.8), 1.3, (.7, .3)), .22)
m.pon(K["t1f"] + .02, soplo(.34, 500, 3400, .7), .14)
imprime(K["t1f"] + .34, .5)
m.pon(K["vacia"], trazo(.5, 620, 180), .16); m.pon(K["vacia"] + .05, soplo(.5, 200, 1400, .3), .14)
tirada(K["vuelve"] + .05, K["pxf"][0], 0, .5)
m.pon(K["re"], trazo(K["azul2"] + .28 - K["re"], 340, 760), .12)
m.pon(K["azul2"] + .3, tic(.03, 2000, 6000), .24)
for x in K["pxf"][1:]:
    m.pon(x, clack(), .4); m.pon(x, golpe(120, 62, .2, .3), .34)
for x in K["pxf"]:
    imprime(x + .3, .32)
# Negro: la cinta nace bajo la bola.
m.pon(K["sin"], golpe(46, 24, 1.3, .12), 1.0)
m.pon(K["sin"] + .02, fade(rodar(K["fin_fr"] - K["sin"]), .02, .3), .7)
for a in (.12, .5, .78, 1.26):
    m.pon(K["sin"] + a, tic(.02, 1200, 3200), .06, .1)
n_ = int((K["tel"] - K["sin"]) * SR)
m.pon(K["sin"], fade(banda(ruido(n_), 45, 240), .08, .3), .16)
for k in range(2):
    m.pon(K["fin_fr"] + .25 + k * .5, golpe(52, 32, .3, 0), .34)
m.pon(K["caeB"] - .02, toc(760), .2, .3)
m.pon(K["caeB"], trazo(.55, 900, 130), .24, .3); m.pon(K["caeB"] + .05, soplo(.56, 200, 1800, .9), .24)
# El teléfono.
m.pon(K["tel"] - .18, golpe(90, 44, .3, .3), .3)
for x in (K["tel"] + .3, K["tel"] + .78, K["tel"] + 1.24):
    m.pon(x, golpe(150, 80, .1, .5), .3); m.pon(x, tic(.02, 2200, 7000), .22); m.pon(x, toc(rng.uniform(300, 380)), .24)
for i in range(3):
    m.pon(K["sug"] + i * .09, toc(760 + i * 130), .16)
m.pon(K["fsug"], golpe(130, 66, .16, .5), .3); m.pon(K["fsug"], campana((880,), .5, (.5,)), .14)
# La escala: remolino de texto.
m.pon(K["dif"] - .05, soplo(1.7, 140, 900, .7), .16)
m.pon(K["escala"] - .05, golpe(74, 36, .5, .3), .5)
a_, b_ = K["leyo"] - .3, K["intern"] + .2
m.pon(a_, fade(soplo(b_ - a_, 120, 1500, .82), .4, .3), .3)
tt, paso = a_, .13
while tt < b_:
    for _ in range(1 + int(4 * ((tt - a_) / (b_ - a_)) ** 2)):
        m.pon(tt + rng.random() * .05, papel(.05), .03 + .05 * ((tt - a_) / (b_ - a_)), rng.uniform(-.8, .8))
    tt += paso; paso = max(.035, paso * .97)
m.pon(b_ + .05, golpe(50, 26, 1.1, .3), .86)
# Rebobina: la rueda se empareja.
m.pon(K["como"], trazo(K["igual"] - K["como"], 700, 170), .16)
clics(K["como"], K["igual"] - .1, 13, .12, 0, 3600)
for i in range(4):
    m.pon(K["igual"] + .02 + i * .3, toc(620 + i * 90), .24, -.5 + i * .33)
# Tapar, adivinar, medir, repartir, ajustar.
m.pon(K["tapF"] - .26, soplo(.28, 300, 1800, .9), .2)
m.pon(K["tapF"], golpe(72, 36, .4, .5), .9); m.pon(K["tapF"], crujido(.14, 300), .22)
tirada(K["tapF"] + .06, K["adiv2"] + .5, -.1, .72)
m.pon(K["adiv2"] + .56, toc(240), .22)
m.pon(K["medi"] - .14, soplo(.4, 300, 2200, .4), .16); m.pon(K["medi"] - .3, soplo(.3, 140, 1000, .7), .14)
m.pon(K["err"] - .1, trazo(.46, 130, 420), .34); m.pon(K["err"] + .34, golpe(98, 48, .26, .3), .46)
for i in range(3):
    m.pon(K["culpa"] + i * (K["fcul"] - K["culpa"]) / 3, golpe(90 - i * 8, 44, .26, .3), .46 - i * .06, (-.2, .3, 0)[i])
    m.pon(K["culpa"] + i * (K["fcul"] - K["culpa"]) / 3, tic(.03, 1200, 3400), .14)
m.pon(K["culpa"], soplo(K["fcul"] - K["culpa"] + .3, 140, 1000, .4), .14)
clics(K["ajus"], K["ajus"] + .55, 7, .2, -.3); clics(K["peri"], K["peri"] + .55, 8, .22, .3)
m.pon(K["peri"] + .55, golpe(104, 52, .24, .3), .4)
# Una cantidad absurda: los tics se atropellan, igual que en el capítulo 1.
aa, bb = K["abs0"] + .2, K["abs1"] + .5
for n in range(1, 75):
    x = aa + (bb - aa) * (n / 5 / 15) ** (1 / 2.1)
    m.pon(x, tic(.022, 3000, 8400), .16 + .12 * n / 75, rng.uniform(-.5, .5))
    if n % 5 == 0: m.pon(x, clack(), .2)
m.pon(K["abs0"], soplo(bb - K["abs0"], 90, 800, .85), .2)
# Grande, LLM.
tt, paso = K["mod"], .12
while tt < K["gran"] + .3:
    for _ in range(3): m.pon(tt + rng.random() * .06, tic(.02, 5000, 11000), .05, rng.uniform(-.9, .9))
    tt += paso; paso = max(.04, paso * .95)
m.pon(K["gran"], golpe(54, 26, 1, .3), .8)
for x, f in ((K["L1"], 54), (K["L2"], 58), (K["M"], 46)):
    m.pon(x, golpe(f, 26, .8, .3), .9); m.pon(x, crujido(.22, 220), .16)
m.pon(K["M"], campana((329.6, 493.9, 987.8), 1.7, (.7, .4, .2)), .24)
# Las perillas caen; sube la rueda.
for k in range(30):
    m.pon(K["nosi"] - .7 + rng.random() * .6, clack(), .05 + rng.random() * .06, rng.uniform(-.8, .8))
m.pon(K["nosi"] - .66, golpe(70, 34, .5, .3), .6)
tirada(K["nosi"] - .15, K["prob"] + .32, 0, .78)
m.pon(K["prob"] - .05, trazo(.34, 700, 1100), .08)
# Robot: metrónomo, sin música.
for i, x in enumerate(K["rob"]):
    q = .4 if x < T("robot").e + .1 else 1
    m.pon(x, golpe(160, 90, .1, .7), .6 * q); m.pon(x, clack(1800), .36 * q)
    for j in range(17):
        m.pon(x + j / 44, tic(.012, 2800, 6200), .09 * q, -.2)
# Temperatura.
m.pon(K["ledejan"] - .12, golpe(80, 40, .36, .3), .5); m.pon(K["ledejan"] - .1, soplo(.4, 160, 1100, .7), .14)
clics(K["ledejan"] + .3, K["azar_"] + .2, 15, .16, 0)
m.pon(K["ledejan"] + .3, trazo(K["azar_"] - K["ledejan"], 170, 520), .2)
for a, g in ((.0, 5), (.42, 1), (.9, 8), (1.3, 0), (1.74, 2), (2.2, 0)):
    m.pon(K["ledejan"] + .55 + a, clack(), .26)
m.pon(K["temp"], golpe(66, 32, .6, .3), .62); m.pon(K["temp"], campana((659.3, 987.8, 1318.5), 1.5, (.7, .35, .15)), .2)
clics(K["ftemp"] + .1, K["ftemp"] + .5, 9, .22, -.4); m.pon(K["ftemp"] + .5, golpe(86, 42, .3, .3), .46, -.4)
clics(K["ftemp"] + .78, K["ftemp"] + 1.2, 11, .22, .4)
for a in (.72, .98, 1.22):
    m.pon(K["ftemp"] + a, clack(), .32, .4)
# Dos ruedas, dos respuestas.
m.pon(K["misma"] - .1, soplo(.65, 150, 1100, .6), .16); m.pon(K["misma"] + .5, golpe(92, 46, .3, .3), .32)
for i, (fin, pan) in enumerate(((K["dos"] - .2, -.55), (K["dos"] + .34, .55))):
    tirada(K["misma"] + .3 + i * .1, fin, pan, .55)
    for j in range(5):
        imprime(fin + .1 + j * .3, .2, pan)
# Un poema, un programa, un consejo.
for x in (K["poema"], K["prog"], K["consejo"]):
    m.pon(x - .12, papel(.22), .3); m.pon(x + .1, golpe(104, 52, .2, .4), .3)
for j in range(6):
    m.pon(K["poema"] + .04 + j * .12 + (.04 if j > 2 else 0), tic(.02, 1600, 5200), .12)
for j in range(7):
    m.pon(K["prog"] + .04 + j * .09, tic(.014, 2800, 6800), .14)
for j in range(4):
    m.pon(K["consejo"] + .05 + j * .2, tic(.02, 1600, 5200), .12)
# Se les va la tinta, y llueven bolas.
m.pon(K["nadie"], polvo(K["eso"] - K["nadie"]), .3)
for k in range(13):
    m.pon(K["nadie"] + .1 + k * .06, toc(rng.uniform(800, 1500)), .1, rng.uniform(-.6, .6))
m.pon(K["eso"] + .12, golpe(62, 30, .6, .3), .62)
for k in range(18):
    m.pon(K["eso"] + .28 + rng.random() * .55, clack(), .1 + rng.random() * .1, rng.uniform(-.6, .6))
m.pon(K["apostar"], golpe(60, 28, .6, .35), .6); m.pon(K["apostar"], campana((523.3, 784), 1, (.6, .25)), .14)
m.pon(K["eso"] + .3, rodar(K["une"][-1] - K["eso"]), .26)
for x in K["une"]:
    m.pon(x, clack(), .34); imprime(x + .22, .3)
# La última.
m.pon(K["yc"] - .3, soplo(.9, 200, 1300, .5), .14); m.pon(K["yc"] - .3, trazo(.9, 200, 420), .12)
d_ = K["cre"] - (K["nada"] + .1)
tirada(K["nada"] + .1, K["cre"], 0, .82)
m.pon(K["nada"] + .1 + d_ * .9, toc(300), .3)
m.pon(K["cre"], golpe(70, 34, .6, .3), .7)
m.pon(K["cre"], campana((493.9, 739.9), 1.8, (.7, .3)), .24)
m.pon(K["cre"] + .02, soplo(.26, 500, 3400, .7), .14); imprime(K["cre"] + .24, .46)
m.pon(K["cae"] - .62, clack(900), .4); m.pon(K["cae"] - .6, soplo(.6, 300, 2400, .5), .22)
m.pon(K["cae"], golpe(46, 24, 1.5, .42), 1.05)
m.pon(K["cae"], campana((329.6, 493.9, 659.3), 2.8, (.8, .4, .2)), .3)

c_ = 6
m.musica([("c11_siguiente", c_, 0, K["sin"], .03, .03),
          ("c11_siguiente", c_ + K["tel"], K["tel"] - .1, m.dur, .2, 2.6)])
env_ = np.ones(m.N); a_i, b_i = int((K["si"] - .2) * SR), int((K["ledejan"] + .3) * SR); r_ = int(.14 * SR)
env_[a_i:b_i] = db(-11); env_[a_i - r_:a_i] = np.linspace(1, db(-11), r_); env_[b_i:b_i + r_] = np.linspace(db(-11), 1, r_)
m.mus *= env_[:, None]
n_ = int(1.4 * SR); m.fx[-n_:] *= (np.linspace(1, 0, n_) ** 1.6)[:, None]

# Los clacks viven justo donde vive la voz: su cuerpo grave se queda, su brillo se aparta mientras ella habla.
def aparta_voz(atenua=-13):
    L = m.N; v = np.zeros(L); n = min(L, len(m.voz)); v[:n] = np.abs(m.voz[:n]).mean(axis=1)
    def prom(x, w):
        c_ = np.concatenate([[0.0], np.cumsum(x)]); y = np.zeros(L); i0 = np.clip(np.arange(L) - w // 2, 0, L); i1 = np.clip(np.arange(L) + w // 2, 0, L)
        y = (c_[i1] - c_[i0]) / np.maximum(i1 - i0, 1); return y
    env = prom(v, int(.03 * SR)); env = np.clip(env / np.percentile(env[env > 1e-4], 70), 0, 1)
    env = prom(prom(env, int(.09 * SR)), int(.09 * SR)); env = np.clip(env * 1.7, 0, 1)
    g = 1 - (1 - db(atenua)) * env
    f = np.fft.rfftfreq(L, 1 / SR); mask = np.clip((f - 900) / 700, 0, 1)
    for ch in (0, 1):
        alto = np.fft.irfft(np.fft.rfft(m.fx[:, ch]) * mask, L)
        m.fx[:, ch] += alto * (g - 1)
aparta_voz()

def banda_vozdb(x):
    F = np.fft.rfft(x * np.hanning(len(x))); f = np.fft.rfftfreq(len(x), 1 / SR)
    return 10 * np.log10((np.abs(F[(f > 1500) & (f < 6000)]) ** 2).sum() + 1e-9)
L = min(len(m.voz), m.N); h = int(.1 * SR); peores = []
resto = m.fx[:L, 0] * 1.2 + m.mus[:L, 0]
ventanas = range(0, L - h, h)
V = [banda_vozdb(m.voz[i:i + h, 0]) for i in ventanas]
umbral = max(V) - 32
for i, v in zip(ventanas, V):
    if v > umbral:
        peores.append((v - banda_vozdb(resto[i:i + h]), i / SR))
peores.sort()
print(f"voz sobre el resto en 1.5-6 kHz: mediana {np.median([p[0] for p in peores]):.1f} dB | {100 * np.mean([p[0] < 6 for p in peores]):.1f}% bajo 6 dB | peores " + ", ".join(f"{t:.1f}s {d:.0f}dB" for d, t in peores[:10]) + f" | {100 * np.mean([p[0] < 0 for p in peores]):.1f}% bajo 0 dB")
m.cierra()
