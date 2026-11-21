import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"y te deja": .2, "y se quedaba": .15, "la solución": .3, "partir el": .2, "pero el plan": .7, "llama al": .15, "el sábado": .15,
          "cambia la fecha": .35, "un buen": .35, "que regresa": 1.15, "así la": .1, "planear no": .15, "es saber": .3, "cuando todo": .2}
m = Mezcla("a07_plan", pausas=PAUSAS, cola=3.0)


def ajusta_a_silencios(m, umbral=-46, minimo=.15):
    """Whisper llega tarde (o temprano) a la palabra que sigue a un silencio: «Dos» 0.65 s, «sorpresa» 0.3 s.
    Se ancla al silencio medido en la propia toma. Imprime cada cambio para revisarlo."""
    x = m.voz.mean(axis=1)
    v = int(.02 * SR)
    q = 10 * np.log10(np.convolve(x ** 2, np.ones(v) / v, "same") + 1e-12) < umbral
    sil, i = [], 0
    while i < len(q):
        if q[i]:
            j = i
            while j < len(q) and q[j]: j += 1
            if (j - i) / SR > minimo: sil.append((i / SR, j / SR))
            i = j
        else: i += 1
    W = m.W
    for k in range(1, len(W)):
        w, p = W[k], W[k - 1]
        for a, b in sil:
            if a >= p["s"] and ((a <= w["s"] < b and b < w["e"]) or (w["s"] - .8 < b < w["s"] - .03)):
                if abs(w["s"] - b) > .08: print(f"  {w['w']}: {w['s']:.2f} -> {b:.2f}")
                w["s"] = b; p["e"] = min(p["e"], a)
                break


ajusta_a_silencios(m)
m.exporta_tiempos()
T = m.T


def pop():
    n = int(.16 * SR)
    t = np.arange(n) / SR
    return golpe(240, 90, .16, .9)[:n] + banda(ruido(n), 1200, 7000) * np.exp(-t * 46) * .8


def metal(f=(233, 349, 587), dur=.9):
    return campana(f, dur, (.7, .5, .3))


def papelazo(dur=.5):
    """Mucho papel que cae junto: hojas sueltas sobre un soplido."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 700, 6000) * np.exp(-t * 5) * .5 + lluvia(dur, 170) * 1.4


def rasgar(dur=.7):
    """Papel que se parte: ruido por ráfagas, sin tono."""
    n = int(dur * SR)
    gr = np.repeat(rng.random(n // 300 + 1), 300)[:n]
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 1100, 7500) * (gr ** 2.2) * (1 - t ** 3) * 2.2


def rasgueo(dur=.4):
    """Lápiz: trazos cortos a 14 Hz."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 2200, 7200) * (.5 + .5 * np.sin(2 * np.pi * 14 * t)) ** 2 * np.minimum(t / .02, 1) * np.minimum((dur - t) / .03, 1)


def crujido(dur=.8):
    n = int(dur * SR)
    y = np.zeros(n)
    tt, p = 0, .11
    while tt < dur - .04:
        s = golpe(rng.uniform(170, 300), 90, .05, .9)
        i = int(tt * SR)
        y[i:i + len(s)] += s[: n - i] * rng.uniform(.4, 1)
        tt += p; p = max(.035, p * .86)
    return y


def vidrio():
    n = int(.9 * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 2800, 12000) * np.exp(-t * 11) * .9 + campana((2093, 3136, 4186), .4, (.5, .3, .2))[:n] * np.exp(-t * 4)[:len(campana((2093, 3136, 4186), .4, (.5, .3, .2))[:n])] * .4


def desinfla(dur=.95):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    f = 170 * (.42 ** t) * (1 + .1 * np.sin(2 * np.pi * 21 * t * dur))
    fase = 2 * np.pi * np.cumsum(f) / SR
    return sum(np.sin(fase * k) / k for k in range(1, 8)) * (1 - t ** 3) * .4


def persiana(dur=.7, acelera=False):
    """Una cortina de lamas: clics que se apretujan al final."""
    n = int(dur * SR)
    y = np.zeros(n)
    tt, p = 0, .085
    while tt < dur - .03:
        s = tic(.03, 1000, 3800)
        i = int(tt * SR)
        y[i:i + len(s)] += s[: n - i]
        tt += p
        if acelera: p = max(.018, p * .9)
    return y


def timbre(dur=.34):
    t = np.arange(int(dur * SR)) / SR
    return campana((1318.5, 1760), dur, (.6, .4))[:len(t)] * (.55 + .45 * np.sign(np.sin(2 * np.pi * 22 * t))) * np.minimum((dur - t) / .04, 1)


def zumbido(dur=.3):
    t = np.arange(int(dur * SR)) / SR
    return np.sign(np.sin(2 * np.pi * 118 * t)) * np.exp(-t * 7) * .5


def moneda():
    return campana((3322, 4978), .22, (.55, .3))[:int(.3 * SR)]


# ---------- los mismos instantes que Pieza.tsx ----------
g0 = T("golpe").s
HOOK = [.1, .6, 1.1]
tG, tSlam, tAlud, tRew0, tRew1 = g0 + .06, g0 + .19, T("arruinar").s + .1, 3.6, 4.3
lug, inv, pas, mus, sor = T("lugar").s, T("invitados").s, T("pastel").s, T("música").s, T("sorpresa").s
ST = [x + .62 for x in (lug, inv, pas, mus, sor)]
emp, mitad, llena, llenaW = T("empieza").s, T("a la mitad del trabajo su").s, T("su mesa ya").s, T("está llena").s
med, anth, intent, dem = T("a medias").s, T("anthropic").s, T("intentaba").s, T("demasiado").s
quedaba, tSlam2, sol, ens, part = T("se quedaba").s, T("espacio").s - .02, T("solución").s, T("enseñaron").s, T("partir").s - .26   # PARTE en Pieza.tsx
tM = [ens + .02 + i * .32 for i in range(5)]
antes, escr, lista = T("antes de").s, T("escribe un").s, T("una lista").s
tV = [lista + k * .16 for k in range(6)]
uno, lug2, dos, fec, tres, inv2 = T("uno lugar").s, T("lugar dos").s, T("dos fecha").s, T("fecha tres").s, T("tres invitados").s, T("invitados y hace").s
hace = T("hace uno").s
tToma, tPosa, tPaloma = hace, hace + .72, hace + 1.22
tSale, tRest = tPaloma + .5, tPaloma + .74
pero, es, llama, restW, sab, cerr = T("pero el plan").s, T("es una hipótesis").s, T("llama al").s, T("restaurante el").s, T("el sábado").s, T("cerrado")
tCierra, tCae0 = cerr.s + .06, cerr.e + .2
tCae1, tMesaCae = tCae0 + .52, tCae0 + 1.22
tReac, fec2, cam2 = tCae1 + .24, T("fecha y eso").s, T("cambia a los").s
tDom, tFlip = fec2 + .08, cam2 + .14
buen, vta = T("buen agente").s, T("vuelta y").s
tOrb0, tOrb1 = buen - .1, vta + .36
hay, si, pend2, enorme, pasa, ayud, limpia, regresa, res, asi, desp = T("hay un truco").s, T("si el pendiente").s, T("pendiente es").s, T("enorme").s, T("se lo pasa").s, T("ayudante").s, T("limpia").s, T("regresa").s, T("resultado").s, T("así la").s, T("despejada").s
tHin, tPasa, tLlega, tHel, tObra = pend2 + .05, pasa + .1, pasa + 1.3, ayud - .12, limpia + .5
tSalta, tAterriza, tEntrega, tFuera, tArchiva = regresa - .16, regresa + .99, res + .12, asi - .3, desp + .62
plan, fut, saber, sigue, todo2 = T("planear").s, T("futuro").s, T("es saber").s, T("sigue cuando").s, T("todo cambia")
tRompe, tL0, tAtrapa, FIN = fut + .3, saber - .34, sigue - .02, todo2.e
tDeja, tSello = FIN + .08, FIN + .38

# ---------- el arranque: papel desde el primer cuadro ----------
m.pon(0, lluvia(1.75, 60), .3)
m.pon(0, soplo(1.7, 200, 1600, .9), .14)
for i, g in enumerate(HOOK):
    m.pon(g, golpe(104 - i * 9, 48, .36, .35), .72 + i * .05)
    m.pon(g, papelazo(.3), .3)
m.pon(tG - .28, soplo(.3, 400, 4200, .92), .4)
m.pon(tSlam, golpe(56, 25, 1.1, .8), .92)
m.pon(tSlam, papelazo(.5), .48)
m.pon(tSlam + .02, tic(.04, 700, 3000), .6)
m.pon(tSlam + .24, pop(), .28, -.2)
m.pon(tSlam + .3, pop(), .24, .2)
m.pon(tAlud - .1, crujido(.3), .42)
m.pon(tAlud, soplo(.8, 160, 1500, .2), .3)
m.pon(tAlud, papelazo(.75), .5)
# rebobinado: el soplido al revés y un tono que sube
m.pon(tRew0, soplo(.66, 500, 5200, .95)[::1], .42)
m.pon(tRew0, trazo(.66, 240, 1500), .17)
m.pon(tRew0, lluvia(.66, 130)[::-1], .32)

# ---------- la fiesta: cada tarjeta llega a la mano y pesa más que la anterior ----------
m.pon(T("la fiesta").s - .02, soplo(.3, 900, 4000, .8), .1)
m.pon(T("la fiesta").s + .2, toc(760), .34)
m.pon(T("la fiesta").s + .32, toc(940), .22)
m.pon(T("la fiesta").s + .1, lluvia(.5, 40), .12)
for i, a in enumerate((lug, inv, pas, mus, sor)):
    m.pon(a - .1, soplo(.2, 500, 3600, .8), .17, -.1 + i * .05)
    m.pon(a - .02, pop(), .26)
    m.pon(a + .5, soplo(.28, 600, 3000, .3), .17)
    m.pon(ST[i], golpe(92 - i * 8, 42, .42 + i * .06, .3), .36 + i * .04)
    m.pon(ST[i], papelazo(.25), .14 + i * .02)
m.pon(ST[4] + .12, crujido(.5), .26)
m.pon(ST[4] + .4, trazo(.4, 300, 170), .07)

# ---------- todo a la vez ----------
for d in (-.08, .36, .78, 1.1):
    m.pon(emp + d, soplo(.22, 700, 3800, .6), .15, -.3 if d in (-.08, 1.1) else .3)
    m.pon(emp + d + .2, toc(rng.uniform(420, 620)), .28)
for a, b, s_ in ((emp + .05, .3, -.4), (emp + .5, .3, 0), (emp + .92, .3, .4), (emp + 1.3, .3, -.4), (mitad + .05, .3, 0), (mitad + .5, .3, .4)):
    m.pon(a, rasgueo(b), .3, s_)
m.pon(emp + .92, trazo(.3, 300, 640), .1, .4)
m.pon(mitad + .5, trazo(.3, 360, 760), .1, .4)
m.pon(mitad, lluvia(llenaW + .3 - mitad, 120), .26)
m.pon(mitad, soplo(llenaW + .35 - mitad, 300, 2400, .8), .14)
m.pon(llenaW + .28, golpe(120, 60, .24, .4), .3)
m.pon(med - .24, trazo(.7, 720, 240), .13)

# ---------- Anthropic: la intenta cargar y no cabe ----------
m.pon(anth, trazo(1.7, 180, 330), .06)
m.pon(intent - .3, toc(380), .2)
m.pon(intent - .1, golpe(110, 60, .3, .15), .3)
m.pon(dem - .3, crujido(1.5), .34)
m.pon(dem - .3, trazo(tSlam2 - dem + .3, 90, 240), .17)
m.pon(tSlam2 - .24, soplo(.25, 400, 4400, .95), .44)
m.pon(tSlam2, golpe(50, 22, 1.25, .9), 1)
m.pon(tSlam2, papelazo(.42), .42)
m.pon(tSlam2, tic(.05, 600, 2800), .7)
for k in range(2):
    m.pon(tSlam2 + .05 + k * .34, zumbido(.2), .1)
m.pon(tSlam2 + .1, desinfla(1), .1, .45)
m.pon(tSlam2 + .68, golpe(170, 80, .16, .5), .18, -.45)
m.pon(tSlam2 + .34, pop(), .14, -.15)
m.pon(tSlam2 + .4, pop(), .12, .15)

# ---------- la regla ----------
m.pon(ens - .55, soplo(.45, 400, 2800, .75), .2)
m.pon(ens - .1, golpe(180, 100, .1, .5), .22)
for i, a in enumerate(tM):
    m.pon(a, toc(1020 + i * 90), .34)
    m.pon(a, tic(.03, 2400, 7000), .3)
    m.pon(a + .02, trazo(.2, 900, 500), .08)
m.pon(part - .22, soplo(.24, 600, 5000, .95), .36)
m.pon(part - .02, rasgar(.24), .62)
m.pon(part, golpe(60, 26, .6, .9), .9)
m.pon(part, campana((110, 220, 330), 1.2, (.7, .4, .2)), .12)

# ---------- el plan ----------
m.pon(antes - .2, soplo(.7, 300, 1800, .6), .16)
m.pon(antes + .62, golpe(150, 80, .18, .3), .3)
m.pon(escr - .05, rasgueo(.72), .34)
for k in range(6):
    m.pon(tV[k] - .02, soplo(.5, 500, 3200, .6), .05, -.5 + k * .2)
    m.pon(tV[k] + .08, lluvia(.42, 110), .06, -.5 + k * .2)
    m.pon(tV[k] + .54, golpe(150 + k * 14, 90, .12, .6), .26)
    m.pon(tV[k] + .54, toc(420 + k * 70), .15)
for a, w in ((uno, lug2), (dos, fec), (tres, inv2)):
    m.pon(a, golpe(120, 66, .2, .5), .44)
    m.pon(a, toc(640), .24)
    m.pon(w, rasgueo(.36), .34)
for k in range(3):
    m.pon(inv2 + .52 + k * .14, tic(.03, 1600, 5200), .28)

# Uno a la vez
m.pon(tToma - .02, soplo(.34, 800, 4200, .4), .22)
m.pon(hace + .26, toc(360), .22)
for k in range(5):
    m.pon(hace + .26 + k * .04, tic(.025, 1400, 5000), .14)
m.pon(tPosa, golpe(138, 70, .22, .5), .5)
m.pon(tPaloma - .2, soplo(.2, 600, 2600, .9), .16)
m.pon(tPaloma, golpe(116, 62, .2, .7), .64)
m.pon(tPaloma + .02, campana((659.3, 987.8, 1318.5), 1.4, (.8, .5, .3)), .34)
m.pon(tSale, soplo(.6, 500, 2600, .5), .16)
m.pon(tRest + .06, pop(), .34, .4)
m.pon(tRest + .1, campana((1318, 1760), .5, (.5, .3)), .14, .4)

# ---------- no es un mapa ----------
m.pon(pero - .1, persiana(.72), .26)
m.pon(pero + .62, golpe(190, 110, .1, .5), .28)
m.pon(es - .34, persiana(.24, True), .5)
m.pon(es - .1, golpe(170, 90, .12, .7), .52)
m.pon(es - .08, toc(880), .24)
m.pon(es, soplo(1.5, 300, 2400, .4), .2)
for k in range(4):
    m.pon(es + .2 + k * .3, tic(.03, 1200, 3600), .08, rng.uniform(-.5, .5))

# ---------- la cortina ----------
m.pon(llama - .12, toc(900), .3, -.4)                         # descuelga
m.pon(llama + .05, trazo(.5, 500, 900), .07)
for k, d in enumerate((.42, .9)):                               # suena el teléfono del restaurante
    m.pon(restW + d - .3, timbre(), .2 - k * .03, .45)
m.pon(sab - .45, soplo(.7, 300, 2600, .55), .14, .3)
m.pon(tCierra - .16, persiana(.17, True), .75)
m.pon(tCierra, golpe(52, 24, 1.05, .8), .92)
m.pon(tCierra, metal((146.8, 220, 311), 1.2), .42)
m.pon(tCierra + .02, tic(.05, 800, 3000), .6)
# el sábado se descuelga: un clip, luego el otro, y cae
m.pon(tCae0, tic(.03, 2800, 8000), .66, .35)
m.pon(tCae0, toc(1500), .36, .35)
m.pon(tCae0 + .03, trazo(.46, 300, 520), .1)
m.pon(tCae1, tic(.03, 2800, 8000), .66, -.35)
m.pon(tCae1, toc(1320), .36, -.35)
m.pon(tCae1 + .04, trazo(.66, 820, 190), .17)
m.pon(tCae1 + .04, soplo(.68, 500, 3400, .85), .24)
m.pon(tMesaCae, golpe(88, 42, .5, .7), .7)
m.pon(tMesaCae, tic(.04, 900, 3400), .5)
m.pon(tMesaCae + .05, soplo(.5, 700, 3600, .25), .22, .5)
m.pon(tMesaCae + .4, golpe(150, 80, .14, .3), .13, .8)
# las demás se acomodan solas
for k in range(4):
    a = tReac + k * .035
    m.pon(a, tic(.03, 1800, 5200), .28, .1 * k)
    m.pon(a + .36, toc(560 + k * 70), .24, .1 * k)
m.pon(tDom - .02, soplo(.26, 800, 3400, .85), .16)
m.pon(tDom + .24, pop(), .36)
m.pon(tDom + .14, rasgueo(.34), .26)
m.pon(tFlip, soplo(.56, 600, 3600, .5), .22, .2)
m.pon(tFlip + .27, tic(.03, 1600, 5000), .34, .2)
m.pon(tFlip + .54, toc(700), .3, .2)
m.pon(tCae0 + .28, toc(700), .22, -.4)                          # cuelga

# ---------- cada vuelta ----------
lap = (tOrb1 - tOrb0 - .4) / 3
for k in range(3):
    m.pon(tOrb0 + .3 + k * lap, soplo(lap, 400, 3200, .5), .22, (-1) ** k * .5)
    m.pon(tOrb0 + .3 + k * lap + lap * .48, toc(600 + k * 90), .28)
m.pon(tOrb0 + .78, rasgueo(.3), .28)
m.pon(tOrb0 + 1.6, rasgueo(.3), .28)
for a in (tOrb0 + .78, tOrb0 + 1.6):
    m.pon(a + .46, toc(520), .22)
    m.pon(a + .5, toc(640), .22)

# ---------- el pendiente enorme ----------
m.pon(hay + .02, campana((1046.5, 1568), .5, (.5, .25)), .22)
m.pon(tHin, trazo(.8, 110, 300), .3)
m.pon(tHin + .1, soplo(.72, 200, 1500, .85), .26)
m.pon(tHin + .55, golpe(64, 30, .85, .4), .62)
m.pon(enorme - .2, soplo(1, 300, 2000, .4), .06)
m.pon(tPasa - .04, golpe(96, 50, .26, .4), .3)
m.pon(tPasa, soplo(1.25, 180, 1500, .5), .16)
for k in range(5):
    m.pon(tPasa + .12 + k * .2, golpe(150, 90, .05, .3), .07)
m.pon(tHel, soplo(.34, 500, 3000, .9), .1)
m.pon(tHel + .34, golpe(128, 66, .24, .4), .34)
m.pon(tHel + .34 + .46, golpe(170, 90, .1, .3), .18)
m.pon(tLlega - .02, golpe(70, 34, .6, .5), .8)
m.pon(tLlega, papelazo(.3), .2)
m.pon(limpia - .08, polvo(.7), .46)
m.pon(limpia + .06, campana((2093, 3136, 4186), 1, (.4, .3, .2)), .2)
# trabaja: mucho, rápido y allá, con todo su desorden
m.pon(tObra - .1, rasgar(.3), .52)
m.pon(tObra, golpe(90, 44, .4, .4), .62)
m.pon(tObra, lluvia(1.1, 170), .42)
for k in range(11):
    m.pon(tObra + .05 + k * .092, toc(620 + k * 44), .17 + k * .012, rng.uniform(-.4, .4))
for d in (-.12, .24, .6, .94):
    m.pon(tObra + d + .18, toc(380), .24)
m.pon(tObra + 1.02, pop(), .36)
m.pon(tObra + 1.02, campana((880, 1318, 1760), .8, (.7, .4, .2)), .26)
# de regreso
m.pon(tSalta - .02, trazo(.42, 300, 980), .1)
m.pon(tSalta + .04, soplo(1.1, 400, 3200, .5), .12, .4)
m.pon(tAterriza, golpe(124, 62, .26, .4), .62)
m.pon(tEntrega + .38, golpe(190, 110, .1, .5), .36)
m.pon(tEntrega + .38, toc(620), .24)
m.pon(tFuera, trazo(.3, 420, 900), .1, .5)
m.pon(tFuera + .1, soplo(.6, 500, 3200, .5), .14, .7)

# ---------- despejada ----------
m.pon(asi - .1, soplo(1.5, 300, 1900, .5), .12)
m.pon(desp - .1, polvo(.8), .4)
m.pon(desp + .02, campana((523.3, 784, 1046.5), 2, (.8, .45, .25)), .3)
m.pon(tArchiva, soplo(.5, 700, 3800, .4), .2, -.5)

# ---------- el orbe ----------
m.pon(plan - .1, pop(), .32, .2)
m.pon(plan, campana((392, 587, 880), 1.8, (.6, .4, .2)), .17, .2)
m.pon(plan, trazo(1.5, 460, 720), .08, .2)
m.pon(tRompe - .22, tic(.03, 3000, 9000), .34, .2)
m.pon(tRompe - .12, tic(.03, 3000, 9000), .4, .2)
m.pon(tRompe, vidrio(), .5, .2)
m.pon(tRompe, golpe(72, 34, .5, .4), .56)

# ---------- el cierre: la misma lluvia, la misma mesa ----------
m.pon(tL0, soplo(1, 300, 2600, .85), .08)
m.pon(tL0 + .4, lluvia(tDeja - tL0 - .4, 46), .16)
m.pon(tAtrapa - .4, soplo(.4, 800, 4000, .95), .22, .3)
m.pon(tAtrapa, golpe(160, 90, .14, .7), .56, .2)
m.pon(tAtrapa, toc(740), .3, .2)
m.pon(tDeja - .02, soplo(.26, 500, 2600, .8), .2)
m.pon(tDeja + .24, golpe(64, 30, .85, .6), .74)
m.pon(tSello - .02, golpe(120, 62, .22, .7), .5)
m.pon(tSello, campana((523.3, 784, 1046.5, ), 2.4, (.9, .5, .3)), .32)
m.pon(tSello + .06, campana((130.8, 196, 261.6), 2.4, (.8, .4, .2)), .3)
m.pon(tSello + .08, lluvia(2.2, 26), .1)

# La pista corre como si nunca se hubiera ido: solo se abre y se cierra. Calla en el aplastón, en "a medias", en el
# entierro y antes de cada golpe grande.
K = 16
pi = lambda t: K + t
A07 = "a07_plan"
m.musica([(A07, pi(0), 0, tSlam, .03, .02), (A07, pi(tRew0), tRew0, med - .22, .4, .03), (A07, pi(anth - .3), anth - .3, tSlam2, .8, .02),
          (A07, pi(part), part, tCierra, .3, .03), (A07, pi(T("cambia la fecha").s - .2), T("cambia la fecha").s - .2, plan - .1, .2, .5),
          (A07, pi(saber - .2), saber - .2, tSello + .2, .35, 1.2)])
m.cierra()
