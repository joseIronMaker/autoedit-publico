import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"imagina que": .25, "felicidades": .4, "acabas de ser": .6, "multiplicar sumar": .5, "la inventaron": .25,
          "pero no te": .3, "lo que un": .3, "y los pesos": .45, "salen del": .3, "una sola neurona": .5, "y chatgpt": .25, "solo tiene": .7}
m = Mezcla("c03_neurona", pausas=PAUSAS, cola=3.4).exporta_tiempos()
T = m.T
if "--tiempos" in sys.argv:
    for w in m.W:
        print(f"{w['w']}@{w['s']:.2f}", end=" ")
    print("\nDUR", m.dur)
    raise SystemExit

import math

# ---------- lo que esta pieza necesita y el kit no trae ----------
def fade(x, a=.01, b=.05):
    x = x.copy(); na, nb = int(a * SR), int(b * SR)
    if na: x[:na] *= np.linspace(0, 1, na)
    if nb: x[-nb:] *= np.linspace(1, 0, nb)
    return x

def clics(t0, t1, n, g=.2, pan=0.0, f=4600):
    """Los dientes de una perilla: cada tope es un clic."""
    for k in range(n):
        t = t0 + (t1 - t0) * k / max(n - 1, 1)
        m.pon(t, tic(.016, f, f * 2.6), g, pan)
        m.pon(t, toc(rng.uniform(1250, 1650)), g * .32, pan)

def rodar(d):
    n = int(d * SR); tt = np.arange(n) / SR
    return banda(ruido(n), 70, 430) * (.6 + .4 * np.sin(2 * np.pi * tt * np.linspace(8, 21, n))) * np.sin(np.linspace(0, np.pi, n)) ** .6

def aguacero(d):
    n = int(d * SR)
    return fade(banda(ruido(n), 5200, 12500) * .13 + lluvia(d, 34) * .3, .3, .04)

def papel(dur=.16):
    n = int(dur * SR); e = np.exp(-np.linspace(0, 7, n))
    return (banda(ruido(n), 5400, 11500) + banda(ruido(n), 220, 1100) * .7) * e

def crujido(d, f=190):
    """Madera de la cruz cediendo: clics irregulares con cuerpo grave."""
    n = int(d * SR); y = np.zeros(n)
    t = 0.0
    while t < d - .05:
        s = toc(f * rng.uniform(.8, 1.3)) * rng.uniform(.25, .7); i = int(t * SR)
        y[i:i + len(s)] += s[: n - i]; t += rng.uniform(.02, .11)
    return y

def aleteo(golpes=6, p=.5, g=.3):
    for k in range(golpes):
        m.pon(ini_pajaro + k * p, soplo(.3, 180, 1500, .35), g * .78 ** k, .2 + k * .1)

def resorte(age, f, z):
    if age <= 0: return 0.0
    w = 2 * math.pi * f * .4; wd = w * math.sqrt(max(1 - z * z, .01))
    return 1 - math.exp(-z * w * age) * (math.cos(wd * age) + (z * w / wd) * math.sin(wd * age))

fiel_de = lambda s: .46 * math.tanh(s / 2.2)
def cruce(ti, a, b, f, z):
    """Instante exacto en que el fiel pasa la raya del límite: es el mismo resorte que lo dibuja."""
    for k in range(4000):
        q = ti + k / 1000
        if (fiel_de(a) + (fiel_de(b) - fiel_de(a)) * resorte(q - ti, f, z) - fiel_de(1)) * (fiel_de(a) - fiel_de(1)) < 0:
            return q
    return ti

# ---------- los mismos tiempos que Pieza.tsx ----------
s = lambda f, d=0: T(f, d).s
e = lambda f, d=0: T(f, d).e
pieza, rep, yesa, cabe, linea, secu = s("pieza"), s("repetida"), s("y esa pieza"), s("cabe"), s("línea"), s("secundaria")
imag, un, punto, otro, llov, menos, tres = s("imagina"), s("un punto"), e("un punto"), s("otro punto"), s("está lloviendo"), s("menos tres"), e("menos tres")
pero, igual, lluv, mas, cada, multi, esa, peso = s("pero no todo"), s("igual"), s("la lluvia"), s("más que"), s("cada dato"), s("multiplica"), s("esa importancia"), s("peso")
luego, suma, todo, si, lim, sino, queda = s("luego"), s("suma"), e("suma todo"), s("si pasa"), s("límite"), s("si no pasa"), s("te quedas")
sal = s("sales", T("límite").i)
feli, acabas, neu, mul, sum_, dec, nada = s("felicidades"), s("acabas"), s("una neurona artificial"), s("multiplicar"), s("sumar"), s("decidir"), s("nada más")
inv, mil, papel_t, insp, pero2, parece, avion, pajaro, ylos, peri, habla, nadie, mano, salen = s("la inventaron"), s("mil novecientos"), s("en papel"), s("inspirados"), s("pero no te"), s("se parece"), s("avión"), s("pájaro"), s("y los pesos"), s("perillas"), s("hablamos"), s("nadie"), s("mano"), s("salen")
una, correr, lluviaF, ygpt, solo, much = s("una sola neurona"), e("qué es correr"), e("la lluvia", 80), s("y chatgpt"), s("solo tiene"), s("muchísimas")
a0, a1, a2 = (un - .03, punto + .05), (otro - .03, otro + .55), (tres - .3, tres + .08)
sube0, baja = pero, cada - .12
b0, b1, b2 = (luego + .08, luego + .63), (luego + .4, luego + .95), (suma - .12, todo - .25)
sin_, vuelve, c2 = si + .12, sino + .1, (sino + .3, sino + .82)
hin = multi + .55
ini_pajaro = pajaro - .2

# ---------- apertura: el campo entero haciendo tic, y la caída hasta una sola pieza ----------
m.pon(0, golpe(70, 34, .6, .3), .5)
tt, paso = 0.0, .16
while tt < pieza - .05:
    for _ in range(3):
        m.pon(tt + rng.random() * .05, tic(.02, 5600, 12000), .08 + .1 * tt / pieza, rng.uniform(-.7, .7))
    tt += paso; paso = max(.03, paso * .955)
m.pon(.75, soplo(pieza - .68, 110, 1000, .86), .3)
m.pon(pieza, golpe(66, 30, .9, .45), .9)
m.pon(pieza, cola(toc(240), 1.2), .3)
for k in range(7):                                  # repetida: la pieza se copia
    m.pon(rep - .05 + k * .055, toc(rng.uniform(420, 760)), .3, rng.uniform(-.6, .6))
m.pon(rep - .05, soplo(.5, 160, 1000, .3), .1)
# Las dos rayas la aprietan contra el renglón.
m.pon(cabe - .32, soplo(.44, 140, 1100, .92), .22)
m.pon(cabe + .1, golpe(72, 36, .5, .5), .95)
m.pon(cabe + .1, crujido(.22, 260), .22)
# La pluma escribe.
tt = linea - .12
while tt < secu + .1:
    m.pon(tt, tic(.03, 5000, 11000), .05 + rng.random() * .05, -.2 + (tt - linea) * .3)
    tt += rng.uniform(.03, .1)
m.pon(secu + .42, trazo(.2, 700, 900), .14); m.pon(secu + .6, trazo(.25, 900, 1500), .16)
# La máquina se desdobla.
m.pon(imag - .05, soplo(.5, 150, 1100, .3), .16)
m.pon(imag + .02, golpe(90, 44, .4, .3), .6)
m.pon(imag + .2, crujido(.3), .2)

# ---------- entradas ----------
for ti, pan in ((un, -.55), (otro, -.1)):
    clics(ti - .22, ti + .1, 3, .22, pan)
for (ini, fin), pan in ((a0, -.55), (a1, -.1)):
    m.pon(ini - .06, toc(420), .3, pan)
    m.pon(ini, rodar(fin - ini), .5, pan)
    m.pon(fin, golpe(100, 50, .3, .3), .62, -.5)
    m.pon(fin, toc(230), .34, -.5)
    m.pon(fin + .1, crujido(.35), .2)
m.pon(llov, aguacero(cada + .2 - llov), .3)
clics(menos - .24, menos + .2, 11, .24, .5)
m.pon(menos - .1, trazo(.4, 110, 320), .34, .5)
m.pon(a2[0], rodar(a2[1] - a2[0]), .6, .5)
m.pon(a2[1], golpe(56, 27, .9, .25), .98, .3)
m.pon(a2[1], cola(toc(150), 1.4), .55, .3)
m.pon(a2[1] + .02, crujido(.6, 150), .28, 0)
m.pon(a2[1] + .03, soplo(.3, 160, 1100, .3), .14, -.2)     # el fiel, de un latigazo
m.pon(a2[1] + .12, toc(520), .2, -.5); m.pon(a2[1] + .2, toc(560), .16, -.45)     # los +1 brincan

# ---------- no todo pesa igual ----------
m.pon(sube0, soplo(.55, 160, 1100, .75), .12, -.5)
clics(pero + .1, igual, 7, .18, .5)
m.pon(pero + .1, trazo(igual - pero - .1, 340, 120), .24, .5)
m.pon(igual + .05, toc(330), .26)
clics(lluv + .05, mas, 15, .2, .5)
m.pon(lluv + .05, trazo(mas - lluv, 90, 300), .46, .5)
m.pon(lluv + .3, crujido(mas - lluv - .2, 140), .3, .1)
m.pon(mas, golpe(54, 26, .8, .22), .92, .3)
m.pon(mas, cola(toc(140), 1.2), .45, .3)
m.pon(mas + .1, toc(640), .24, -.5)

# ---------- cada dato por su peso ----------
m.pon(baja, soplo(.6, 150, 1100, .8), .2)
tt = baja
for k in range(9):
    m.pon(tt, tic(.02, 5200, 11000), .09); tt += .06
for i, (dt, pan) in enumerate(((.02, -.55), (.22, -.1), (.42, .55))):
    m.pon(multi + dt, toc(660 + i * 80), .36, pan)
    clics(multi + dt, multi + dt + .1, 3, .16, pan)
m.pon(hin, trazo(.55, 100, 300), .5, .55)
m.pon(hin + .55, golpe(82, 40, .4, .3), .7, .5)
for i, pan in enumerate((-.55, -.1, .55)):
    m.pon(esa + .1 + i * .1, campana((523.3 + i * 130, 784), .8, (.6, .2)), .1, pan)
m.pon(peso - .05, golpe(74, 36, .5, .3), .75)
m.pon(peso - .02, campana((329.6, 493.9, 987.8), 1.7, (.7, .4, .2)), .24)
clics(peso - .05, peso + .1, 4, .18)

# ---------- se suma todo ----------
m.pon(suma - .4, aguacero(sin_ + .36 - suma + .4), .2)
for (ini, fin), pan in ((b0, -.5), (b1, -.2)):
    m.pon(ini, rodar(fin - ini), .46, pan)
    m.pon(fin, golpe(98, 48, .3, .3), .66, -.5)
    m.pon(fin, toc(250), .34, -.5)
m.pon(b2[0], rodar(b2[1] - b2[0]), .6, .5)
m.pon(b2[1], golpe(54, 26, 1.0, .25), 1.02, .3)
m.pon(b2[1], cola(toc(140), 1.6), .6, .3)
m.pon(b2[1] + .02, crujido(.7, 150), .3)
m.pon(b2[1] + .3, toc(1000), .24)

# ---------- decide ----------
m.pon(sin_, trazo(.6, 300, 110), .34, .5)
m.pon(lim - .25, trazo(.32, 640, 1100), .2)
pasa = cruce(sin_ + .45, -1, 2, 1.25, .36)
regresa = cruce(c2[1], 2, -1, 2, .3)
m.pon(sin_ + .45, soplo(.5, 150, 1100, .55), .14, .3)
m.pon(pasa, golpe(120, 62, .22, .35), .5, .2)
m.pon(pasa, campana((659.3, 987.8, 1318.5), 2.1, (1, .55, .3)), .4, .2)
m.pon(sal - .2, toc(880), .22, .4)
m.pon(vuelve, aguacero(feli - vuelve - .01), .22)
m.pon(c2[0], rodar(c2[1] - c2[0]), .6, .5)
m.pon(c2[1], golpe(52, 26, 1.0, .25), 1.0, .3)
m.pon(c2[1] + .02, crujido(.6, 150), .28)
m.pon(regresa, golpe(116, 60, .2, .3), .36, -.3)
m.pon(queda - .14, golpe(64, 32, .6, .25), .72, -.4)

# ---------- el corte: te señala a ti ----------
m.pon(feli, golpe(44, 24, 1.3, .14), 1.0)
m.pon(feli + .05, soplo(.98, 160, 1600, .94), .26)
m.pon(feli + 1, golpe(84, 38, .5, .2), .85)
m.pon(feli + 1, campana((246.9, 493.9, 739.9), 2.6, (.8, .4, .2)), .15)
for k in range(44):                                 # confeti: papelitos, nada de ruido
    m.pon(feli + .3 + rng.random() * 3.6, tic(.03, 1400, 4200), .03 + rng.random() * .04, rng.uniform(-.8, .8))
for i, pan in enumerate((-.6, 0, .6)):
    m.pon(acabas + .1 + i * .08, toc(520), .3, pan)
m.pon(neu, trazo(.6, 400, 800), .12)

# ---------- multiplicar, sumar, decidir ----------
clics(mul + .05, mul + .55, 9, .1)
m.pon(mul + .05, trazo(.5, 110, 280), .36)
m.pon(sum_ + .45, golpe(110, 56, .24, .4), .7)
m.pon(sum_ + .45, toc(740), .34)
m.pon(dec + .15, golpe(120, 60, .2, .3), .55)
m.pon(dec + .15, campana((659.3, 987.8), 1.2, (.8, .4)), .26)
m.pon(nada - .22, soplo(.32, 150, 1100, .9), .16)
m.pon(nada + .14, golpe(72, 36, .5, .5), 1.0)

# ---------- 1943 ----------
m.pon(inv - .08, soplo(.8, 160, 1200, .3), .14)
m.pon(mil - .03, golpe(66, 34, .55, .5), .9)
m.pon(mil, cola(toc(300), 1.2), .24)
m.pon(papel_t - .25, papel(.2), .12)
m.pon(insp - .1, polvo(parece + .6 - insp), .22)
m.pon(insp - .1, trazo(1.1, 300, 700), .1)
d_ = (parece + .45 - pero2 + .05) / 3
for k in range(3):                                  # tres dobleces, tres crujidos de papel
    m.pon(pero2 - .05 + d_ * (k + .15), papel(.14), .2 + k * .03, (-.3, .3, 0)[k])
    m.pon(pero2 - .05 + d_ * (k + .62), papel(.22), .3 + k * .05, (-.3, .3, 0)[k])
    m.pon(pero2 - .05 + d_ * (k + .62), toc(180 + k * 40), .22)
m.pon(avion - .3, soplo(1.5, 170, 1200, .5), .18, -.5)
m.pon(pajaro - .3, trazo(.22, 800, 300), .05)
aleteo()

# ---------- la perilla gigante ----------
m.pon(ylos - .15, soplo(.6, 110, 800, .7), .28)
m.pon(ylos + .25, golpe(58, 30, .7, .35), .95)
clics(peri - .1, peri + .4, 9, .24)
clics(habla, habla + .4, 7, .22)
tt = nadie
while tt < mano - .05:
    m.pon(tt, tic(.03, 5000, 11000), .06 + rng.random() * .06, .3); tt += rng.uniform(.03, .09)
m.pon(mano + .3, soplo(.22, 700, 4200, .25), .2)
for k, q in enumerate((0, .36, .72, 1.08)):         # el error empuja: mismo golpe que en el capítulo 1
    t = salen + q
    m.pon(t - .02, golpe(104, 52, .3, .3), .7 - k * .05)
    m.pon(t, tic(.03, 1800, 5200), .3)
    clics(t, t + .2, 5, .2)

# ---------- una sola ----------
m.pon(una - .28, soplo(1, 150, 1100, .35), .16)
m.pon(correr + .12, polvo(.55), .4); m.pon(lluviaF + .05, polvo(.55), .4)
m.pon(correr + .7, toc(600), .3, -.3); m.pon(lluviaF + .55, toc(600), .3, .3)
tic_t = math.ceil(una / 1.5) * 1.5                 # el fiel va y viene cada 1.5 s: Pieza.tsx/cicloFiel
while tic_t < solo:
    m.pon(tic_t, toc(250), .26); m.pon(tic_t, tic(.02, 1800, 4800), .14)
    tic_t += 1.5

# ---------- muchísimas ----------
fin_z = much + 2.05
tt, paso = solo, .3
while tt < fin_z:
    for _ in range(1 + int(9 * ((tt - solo) / (fin_z - solo)) ** 2)):
        m.pon(tt + rng.random() * .05, tic(.022, 5600, 12500), .05 + .09 * ((tt - solo) / (fin_z - solo)) ** 2, rng.uniform(-.9, .9))
    tt += paso; paso = max(.024, paso * .93)
m.pon(solo, soplo(fin_z - solo, 90, 900, .9), .3)
m.pon(much, golpe(50, 24, 1.4, .3), .9)
m.pon(fin_z + .05, golpe(46, 24, 1.5, .4), 1.02)
m.pon(fin_z + .05, campana((329.6, 493.9, 659.3), 3, (.8, .4, .2)), .3)

musica = [("c03_neurona", 12.75, 0, feli, .02, .03),
          ("c03_neurona", 40, mul, una - .3, .04, .5),
          ("c03_neurona", 3, una - .3, solo, .4, .1),
          ("c03_neurona", 76, solo, m.dur, .12, 2.7)]
m.musica(musica)
# La cola de la última campana llegaría viva al último cuadro: se apaga junto con la música.
n_ = int(1.4 * SR); m.fx[-n_:] *= (np.linspace(1, 0, n_) ** 1.6)[:, None]

# Lo que no sea voz, medido donde vive la voz (1.5-6 kHz): la escucha marcó ruido tapándola.
def banda_vozdb(x):
    F = np.fft.rfft(x * np.hanning(len(x))); f = np.fft.rfftfreq(len(x), 1 / SR)
    return 10 * np.log10((np.abs(F[(f > 1500) & (f < 6000)]) ** 2).sum() + 1e-9)

L = min(len(m.voz), m.N); h = int(.1 * SR); peores = []
resto = m.fx[:L, 0] * 1.2 + m.mus[:L, 0]
ventanas = range(0, L - h, h)
V = [banda_vozdb(m.voz[i:i + h, 0]) for i in ventanas]
umbral = max(V) - 32                                          # solo donde hay voz
for i, v in zip(ventanas, V):
    if v > umbral:
        peores.append((v - banda_vozdb(resto[i:i + h]), i / SR))
peores.sort()
print(f"voz sobre el resto en 1.5-6 kHz: mediana {np.median([p[0] for p in peores]):.1f} dB | {100 * np.mean([p[0] < 6 for p in peores]):.1f}% bajo 6 dB | peores " + ", ".join(f"{t:.1f}s {d:.0f}dB" for d, t in peores[:10]) + f" | {100 * np.mean([p[0] < 0 for p in peores]):.1f}% bajo 0 dB")
m.cierra()
