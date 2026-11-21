import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"el trofeo no cabía en la maleta porque era muy chica": .5, "qué era chica": .35, "atención cada palabra": .3, "cada palabra mira": .2,
          "la palabra chica busca": .25, "mira a maleta": .4, "y se queda": .55, "por eso banco": .55, "mira a sus": .25, "nadie programó": .35,
          "la atención es todo": .3, "una palabra sola": .15, "significa según": .8}
m = Mezcla("c09_atencion", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
if "--tiempos" in sys.argv:
    for w in m.W:
        print(f"{w['w']}@{w['s']:.2f}", end=" ")
    print("\nDUR", m.dur)
    raise SystemExit

import math

# ---------- lo que esta pieza necesita y el kit no trae ----------
_c = {}
def cuerda(f=220.0, dur=1.6, brillo=.55, g=.996):
    """Karplus-Strong por bloques: cada hilo que se tensa suena como lo que es, una cuerda. Grueso = grave."""
    k = (round(f, 1), round(dur, 2), round(brillo, 2), g)
    if k in _c:
        return _c[k]
    p = max(2, int(round(SR / f - .5)))
    n = int(dur * SR)
    y = np.zeros(n + p + 2)
    y[:p + 1] = banda(ruido(p + 1), 60, 1500 + 11000 * brillo)
    y[:p + 1] /= np.abs(y[:p + 1]).max() + 1e-9
    i = p + 1
    while i < len(y):
        j = min(i + p, len(y))
        y[i:j] = g * .5 * (y[i - p:j - p] + y[i - p - 1:j - p - 1])
        i = j
    s = y[p + 1:][:n]
    s = s * np.minimum(np.arange(len(s)) / (.0015 * SR), 1)
    s[-int(.04 * SR):] *= np.linspace(1, 0, int(.04 * SR))
    _c[k] = s
    return s

def clang(f=540, dur=1.1):
    """Metal hueco de la copa: parciales que no son armónicos."""
    t = np.arange(int(dur * SR)) / SR
    s = sum(a * np.sin(2 * np.pi * f * r * t) * np.exp(-t * d) for r, a, d in [(1, 1, 5), (1.51, .7, 6.5), (2.23, .5, 9), (3.14, .3, 12), (4.07, .18, 16)])
    return s / 2 + .5 * banda(ruido(len(t)), 900, 6000) * np.exp(-t * 90)

def papel(dur=.16):
    n = int(dur * SR); e = np.exp(-np.linspace(0, 7, n))
    return (banda(ruido(n), 5400, 11500) + banda(ruido(n), 220, 1100) * .7) * e

def crujido(d, f=190):
    n = int(d * SR); y = np.zeros(n); q = 0.0
    while q < d - .05:
        s = toc(f * rng.uniform(.8, 1.3)) * rng.uniform(.25, .7); i = int(q * SR)
        y[i:i + len(s)] += s[: n - i]; q += rng.uniform(.015, .08)
    return y

def rodar(d):
    n = int(d * SR); tt = np.arange(n) / SR
    return banda(ruido(n), 70, 430) * (.6 + .4 * np.sin(2 * np.pi * tt * np.linspace(8, 21, n))) * np.sin(np.linspace(0, np.pi, n)) ** .6

def clics(t0, t1, n, g=.2, pan=0.0, f=4600):
    for k in range(n):
        q = t0 + (t1 - t0) * k / max(n - 1, 1)
        m.pon(q, tic(.016, f, f * 2.6), g, pan)
        m.pon(q, toc(rng.uniform(1250, 1650)), g * .32, pan)

# Escala de la música (La bemol mayor): los hilos no pelean con ella.
ESC = [103.83, 116.54, 130.81, 155.56, 174.61, 207.65, 233.08, 261.63, 311.13, 349.23, 415.30, 466.16, 523.25, 622.25, 698.46, 830.61]

# ---------- los mismos tiempos que Pieza.tsx ----------
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
i_una = T("una palabra sola").i
mal1, era1, gr1 = s("maleta"), s("era"), s("grande")
q1, gr2, el2, tro2, clar = s("qué era grande"), s("grande", 12), s("el trofeo claro"), s("trofeo claro"), s("claro")
camb, pal, palF = s("cambia"), s("palabra"), e("palabra")
lee, chica, q2, mal2 = s("el trofeo no cabía en la maleta porque era muy chica"), s("chica"), s("qué era chica"), s("maleta tú")
res_, sin, pens, amaq, costo, deca, decaF = s("resolviste"), s("sin pensar"), s("pensar"), s("a una máquina"), s("costó"), s("décadas"), e("décadas")
porq, leia, fin_, ya, prin = s("porque leía"), s("leía"), s("final"), s("ya se le"), s("principio")
truco, aten, cada, mira, dem, preg, imp = s("truco"), s("atención cada"), s("cada palabra mira"), s("mira a todas"), s("demás y"), s("pregunta"), s("importa")
lap, chi, busca, mt, tro, poco, mm, mal, mucho = s("la palabra chica busca"), s("chica busca"), s("busca"), s("mira a trofeo"), s("trofeo poco"), s("poco"), s("mira a maleta"), s("maleta mucho"), s("mucho")
yse, mez, ped, seg, imp2, imp2F = s("y se queda"), s("mezcla"), s("un pedazo"), s("según cuánto"), s("importó"), e("importó")
ban, sen, cob, mue = s("banco no es"), s("senté"), s("cobró"), s("se mueve")
nadie, salen, como, en17, die, inv, tit, ins = s("nadie programó"), s("salen"), s("como todo"), s("en dos mil"), s("diecisiete"), s("investigadores"), s("título"), s("insolente")
la, es_, lo, nec, ten, de_, sale, tt, gptF = s("la atención es todo"), s("es todo"), s("lo que necesitas"), s("necesitas"), s("tenían razón"), s("de ese artículo"), s("sale la t"), s("t de chatgpt"), e("chatgpt")
sola, sig, mira2, miraF = s("sola"), s("significa según"), s("mira", i_una), e("mira", i_una)

H = [.93, mal1 + .16, era1 + .02, gr1 - .02]
M0, M1 = gr1 + .42, q1 - .06
AR = clar - .08
tCae, tSello = pal + .1, chica - .03
TOG = [res_ + .02, res_ + .36, sin + .08, pens + .22]
tLee = lambda k: leia - .02 + (fin_ + .28 - (leia - .02)) * k / 10
tNegro = gptF + .55
tVuelaB, tCaeB = imp2F + .46, ban - .535 + .04
tJal1, tJal2, tVaiv = sen + .02, cob - .05, [mue - .3, mue + .34]
PASOS = [salen + q for q in (0, .3, .6, .9)]
tl = miraF - .1

# ---------- 1. el golpe ----------
m.pon(0, soplo(H[0] + .05, 220, 2400, .92), .34)
for k, h in enumerate(H[:3]):
    m.pon(h, golpe(92 - k * 8, 44, .5, .4), .85)
    m.pon(h, clang(520 + k * 40), .2 + k * .03, -.1 + k * .1)
    m.pon(h, crujido(.2 + k * .06), .14 + k * .05)
m.pon(H[3], golpe(66, 30, 1, .5), .78)
m.pon(H[3], cola(clang(430, .9), 1.6, .3), .24)
m.pon(H[3], crujido(.5, 150), .26)
m.pon(H[3] - .12, soplo(.3, 300, 2000, .75), .3)
m.pon(M0 - .04, soplo(.56, 500, 4200, .45), .3)
m.pon(M1 - .1, golpe(120, 60, .2, .3), .3)

# ---------- 2. el telar ----------
m.pon(q1 + .02, trazo(tro2 - q1, 300, 620), .1)
for k, q in enumerate(np.arange(q1 + .1, el2 + .05, .24)):       # tantea: cuerdas muy cortas, sin amarrarse
    m.pon(float(q), cuerda(ESC[9 + k % 3], .14, .4, .985), .1, -.25)
m.pon(tro2 + .08, cuerda(ESC[0], 1.8, .22, .9968), .55, -.2)
m.pon(tro2 + .08, golpe(84, 44, .34, .16), .55)
for k in range(8):                                                # arpegio: cada hilo que aterriza es una nota
    m.pon(AR + k * .09 + .2, cuerda(ESC[5 + k], 1.2, .4), .2, -.45 + k * .13)
t = camb
while t < tCae:                                                    # la palabra castañea
    m.pon(t, toc(rng.uniform(380, 560)), .08 + .22 * (t - camb) / (tCae - camb), rng.uniform(-.3, 0))
    t += rng.uniform(.04, .09)
for k in range(6):
    m.pon(tCae + (5 - k) * .05 + .34, golpe(150 + k * 14, 70, .2, .4), .5, -.3 + k * .05)
m.pon(tCae, soplo(.5, 200, 1200, .2), .26)
m.pon(tCae + .02, trazo(.9, 420, 90), .24)
m.pon(tCae + .35, cuerda(ESC[0] / 2, .9, .3, .992), .3)
# Se lee otra vez, a pelo: cada palabra un golpecito casi inaudible.
for k in range(10):
    m.pon(m.W[T("el trofeo no cabía en la maleta porque era muy chica").i + k]["s"], toc(300 + k * 18), .13)
m.pon(tSello - .32, soplo(.34, 300, 3600, .92), .34)
m.pon(tSello, golpe(58, 28, 1.1, .6), .78)
m.pon(tSello, cola(toc(220), 1.4, .4), .45)
for k, f in enumerate((ESC[0], ESC[3], ESC[5], ESC[8], ESC[10], ESC[12], ESC[13], ESC[15])):
    m.pon(tSello + k * .014 + .1, cuerda(f, 1.8, .4), .24 - k * .015, -.4 + k * .11)
m.pon(tSello + .02, soplo(.4, 900, 6000, .15), .3)
m.pon(mal2, cuerda(ESC[0], 1.6, .22, .9962), .5)
m.pon(mal2, golpe(80, 42, .34, .16), .4)
for k, g in enumerate(TOG):                                        # sin pensar: va y viene de un pestañeo
    m.pon(g, soplo(.1, 900, 5200, .2), .24, .2 * (-1) ** k)
    m.pon(g + .09, cuerda(ESC[3 if k % 2 else 0], .5, .3, .994), .3)
    m.pon(g, toc(340), .28)
m.pon(amaq, trazo(1.1, 420, 70), .2)
m.pon(amaq, soplo(.9, 200, 1600, .3), .2)
for k in range(6):
    m.pon(amaq + .02 + k * .1, cuerda(ESC[9 - k], .2, .35, .98), .13, .2 - k * .08)
t = amaq
while t < porq - .1:                                               # la regla pasa de largo
    m.pon(t, tic(.012, 2600, 6000), .08 + .1 * rng.random())
    t += .03 + .14 * ((t - amaq) / (porq - amaq)) ** 1.5
m.pon(amaq + .2, rodar(porq - amaq - .2), .34)
m.pon(deca, campana((207.65, 311.13, 415.3), 1.4, (.8, .4, .2)), .08)

# ---------- 3. leía palabra por palabra ----------
m.pon(porq - .05, soplo(.34, 300, 2400, .6), .16)
for k in range(11):
    q = tLee(k)
    m.pon(q, golpe(150, 80, .14, .3), .28)
    m.pon(q, toc(460 + k * 22), .13)
m.pon(ya - .1, polvo(prin + .5 - ya), .34)
m.pon(prin - .25, trazo(.42, 300, 900), .12)
m.pon(prin + .2, cuerda(ESC[6], .24, .15, .96), .32)               # nada que agarrar: cuerda muerta
m.pon(prin + .3, golpe(64, 34, .5, .03), .3)

# ---------- 4. atención ----------
m.pon(truco - .4, soplo(aten - truco + .5, 200, 2200, .8), .14)
m.pon(truco, polvo(aten - truco + .36), .3)
m.pon(aten + .36, campana((415.3, 622.25, 830.61), 2.2, (.9, .5, .3)), .16)
m.pon(aten + .36, golpe(70, 38, .5, .12), .8)
m.pon(aten + .1, toc(780), .2)

# ---------- 5. todas con todas ----------
for k in range(11):
    m.pon(cada - .05 + k * .05, toc(520 + k * 26), .14, -.4 + k * .08)
n = 46
for k in range(n):
    q = mira - .08 + (dem + .2 - mira + .08) * (k + rng.random() * .6) / n
    m.pon(q, cuerda(ESC[int(4 + 11 * k / n + rng.integers(0, 3)) % 16], .9, .4), .06 + .03 * rng.random(), rng.uniform(-.6, .6))
m.pon(mira - .1, soplo(1.5, 500, 5000, .8), .12)
m.pon(preg, polvo(imp - preg), .16)
for k, f in enumerate((ESC[0], ESC[3], ESC[5], ESC[10])):
    m.pon(imp + k * .02, cuerda(f, 1.6, .3, .9965), .3 - k * .05, -.2 + k * .14)
m.pon(imp, golpe(74, 40, .4, .14), .55)

# ---------- 6. chica busca ----------
m.pon(lap, soplo(.8, 300, 1800, .5), .14)
for k in range(9):
    m.pon(busca - .05 + k * .13, cuerda(ESC[10 + k % 5], .16, .5, .985), .11, rng.uniform(-.5, .5))
m.pon(mt + .08, trazo(tro + .26 - mt - .08, 880, 1660), .07)
m.pon(tro + .26, cuerda(1661.2, 1.3, .8, .997), .3, -.3)
m.pon(tro + .3, tic(.02, 4000, 9000), .18, -.3)
m.pon(mm + .1, soplo(mal + .24 - mm - .1, 120, 900, .8), .3)
m.pon(mal + .24, cuerda(ESC[2], 1, .5, .995), .5)
m.pon(mucho - .02, cuerda(ESC[0] * .75, 2.2, .3, .9972), .7)
m.pon(mucho - .02, golpe(62, 30, .9, .3), .85)
m.pon(mucho - .02, cuerda(ESC[0], 1.8, .25, .997), .3)

# ---------- 7. la mezcla ----------
TZ = [(mez - .12, .7), (mez + .16, .7), (ped - .1, 1.1), (yse + .1, .5), (yse + .26, .5)]
for k, (a, d) in enumerate(TZ):
    m.pon(a, papel(.2), .5, -.3 + k * .15)
    m.pon(a + .08, soplo(d, 500, 3200, .55), .1)
    m.pon(a + d, golpe(170, 90, .14, .5), .55)
    m.pon(a + d, papel(.1), .4)
    m.pon(a + d, cuerda([ESC[5], ESC[8], ESC[12], ESC[3], ESC[10]][k], .7, .4), .14)
m.pon(seg, soplo(.34, 800, 4200, .4), .18)
m.pon(seg + .1, cuerda(ESC[5], 1.2, .5), .24)
m.pon(seg + .16, cuerda(ESC[12], 1, .5), .14)
m.pon(imp2F + .06, crujido(.4, 420), .3)
m.pon(imp2F + .06, papel(.3), .4)
m.pon(imp2F + .44, golpe(110, 50, .22, .2), .4)
m.pon(tVuelaB - .1, soplo(.5, 300, 2600, .4), .2)

# ---------- 8. banco ----------
for k, q in enumerate(rebotes(tCaeB, 4.3, .44)):
    m.pon(q, golpe(90, 44, .46 - min(k, 3) * .08, .26), .95 * .44 ** k)
m.pon(tCaeB + .535, soplo(1.1, 300, 2600, .2), .13)
m.pon(tJal1 - .14, trazo(.18, 300, 800), .1)
m.pon(tJal1 + .04, cuerda(ESC[3], 1.2, .3), .36, -.1)
m.pon(tJal1 + .02, rodar(.6), .3)
m.pon(tJal2 - .16, trazo(.18, 300, 800), .1)
m.pon(tJal2 + .02, cuerda(ESC[1], 1.2, .3), .36, .1)
m.pon(tJal2 + .02, rodar(.7), .3)
for k, q in enumerate(tVaiv):
    m.pon(q + .1, cuerda(ESC[3 if k == 0 else 1], .8, .3), .3, -.1 if k == 0 else .1)
    m.pon(q, rodar(.42), .3)

# ---------- 9. nadie, y sale del error ----------
m.pon(nadie, soplo(.5, 300, 2000, .3), .14)
for k in range(4):
    m.pon(nadie + .1 + k * .09 + .22, golpe(160, 80, .12, .35), .4, -.3 + k * .2)
for k, p in enumerate(PASOS):
    clics(p, p + .17, 5, .2, -.2 + k * .14)
    m.pon(p + .05, golpe(104, 52, .28, .24), .36)
    m.pon(p + .05, cuerda(ESC[3 + k * 2], .6, .35), .22)
m.pon(como - .04, campana((311.13, 466.16, 622.25), 2, (.8, .4, .2)), .085)
m.pon(en17 - .3, soplo(.5, 240, 1400, .7), .24)

# ---------- 10. el artículo ----------
caeA = en17 + .55
m.pon(caeA - .24, soplo(.3, 200, 1400, .85), .24)
m.pon(caeA, golpe(56, 28, 1.1, .35), .9)
m.pon(caeA, cola(toc(170), 1.2, .4), .4)
for k in range(8):
    m.pon(inv - .08 + k * .075 + .14, toc(620 + k * 30), .2, -.5 + k * .14)
    m.pon(inv - .08 + k * .075 + .14, golpe(140, 76, .1, .2), .22, -.5 + k * .14)
m.pon(s("artículo con"), rodar(.8), .3)
m.pon(tit, trazo(ins - tit, 500, 1250), .07)
m.pon(ins + .1, cuerda(ESC[12], 1.4, .4, .997), .2, -.3)
m.pon(ins + .14, cuerda(ESC[12] * 1.002, 1.4, .4, .997), .2, .3)
for k, (q, f) in enumerate(((la + .02, ESC[5]), (es_ - .04, ESC[8]), (lo - .04, ESC[10]), (nec - .04, ESC[12]))):
    m.pon(q + .1, cuerda(f, 1.2, .4), .3)
    m.pon(q + .1, golpe(128, 62, .2, .35), .4)
    m.pon(q + .08, papel(.14), .4)
m.pon(ten, soplo(.7, 300, 1800, .4), .14)
m.pon(sale - .2, trazo(tt - sale + .2, 260, 700), .12)
m.pon(de_ - .2, soplo(tt - de_ + .1, 200, 1400, .6), .12)
m.pon(tt, cuerda(ESC[0], 1.3, .25, .996), .5)
m.pon(tt, golpe(76, 38, .5, .3), .75)
m.pon(tt, campana((415.3, 622.25), 1.2, (.7, .3)), .08)

# ---------- 11. sola ----------
m.pon(tNegro, golpe(52, 28, .9, .05), .85)
for k in range(5):
    m.pon(tNegro + k * .012, tic(.02, 1800, 7000), .5, -.5 + k * .25)     # se cortan todos los hilos a la vez
    m.pon(tNegro + k * .012, cuerda(ESC[6 + k], .16, .7, .95), .3, -.5 + k * .25)
m.pon(sola, polvo(1.6), .09)
m.pon(tl - .02, soplo(.26, 300, 3000, .85), .3)
m.pon(tl + .22, cuerda(ESC[0], m.dur - tl - .34, .35, .9991), 1.4)
m.pon(tl + .22, cuerda(ESC[5], m.dur - tl - .34, .35, .9984), .6, -.15)
m.pon(tl + .22, golpe(66, 34, .9, .25), .75)
m.pon(tl + .22, campana((207.65, 311.13, 415.3), m.dur - tl - .3, (.8, .4, .2)), .08)

# Los efectos le dejan a la voz su banda. Medido: sumaban -18.7 dB contra -20.7 de la voz, con picos de 2.0, y al
# reescalar la mezcla el limitador convertía las cuerdas graves en una guitarra saturada que la tapaba.
def aire(x, corte=-8.0):
    F = np.fft.rfft(x, axis=0)
    f = np.fft.rfftfreq(len(x), 1 / SR)
    h = np.clip((f - 450) / 350, 0, 1) * np.clip((4600 - f) / 1100, 0, 1)
    return np.fft.irfft(F * (1 - (1 - db(corte)) * h)[:, None], len(x), axis=0)

m.fx = aire(m.fx) * .62
m.musica([("c09_atencion", 22, 0, tCae + .02, .03, .12),
          ("c09_atencion", 22 + tSello, tSello, tNegro, .03, .02),
          ("c09_atencion", 92, sig + .2, m.dur, 1.1, 2.6)])
m.cierra()
