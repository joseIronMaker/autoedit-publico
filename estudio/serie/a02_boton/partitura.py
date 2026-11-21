import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"tu agente": .4, "no puede llamar": .2, "y se detiene": .55, "afuera hay": .9, "toma el papelito": .3, "regresa con": 1.0,
          "hay mesa a las": .15, "y apenas": .85, "listo encontré": .2, "a esto le": .5, "parece un": .25, "si sabe": .3,
          "y también": .5, "quien decide": .3, "es el mensajero": .3, "ahí está": .3, "y ahí se": .25, "la máquina nunca": 1.1, "solo escribe": .35}
m = Mezcla("a02_boton", pausas=PAUSAS, cola=3.2).exporta_tiempos()
T = m.T
s, e = (lambda f, d=0: T(f, d).s), (lambda f, d=0: T(f, d).e)


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
    """Papel que se rompe: fibras que truenan a saltos, más agudas conforme avanza."""
    n = int(dur * SR); y = banda(ruido(n), 1100, 9000)
    pasos = int(dur * 62); c = rng.random(pasos + 2) ** 3
    env = np.interp(np.linspace(0, pasos, n), np.arange(pasos + 2), c)
    sub = np.linspace(.35, 1, n) if sube else np.ones(n)
    return fade(y * env * sub + banda(ruido(n), 180, 700) * env * .5, .004, .05)

def rayar(dur, g=.3, pan=0.0):
    """Lápiz sobre papel en el mismo tiempo que se escribe."""
    n = int(dur * SR); tt = np.arange(n) / SR
    tr = np.abs(np.sin(2 * np.pi * tt * 6.3)) ** .6 * (.65 + .35 * np.sin(2 * np.pi * tt * 17))
    return fade(banda(ruido(n), 2400, 7800) * tr * .7 + banda(ruido(n), 500, 1400) * tr * .2, .01, min(.2, dur * .3))

def neumatico(dur, sube=False):
    """El tubo: aire que silba con la velocidad del papelito."""
    n = int(dur * SR); f = np.linspace(0, 1, n); e_ = np.sin(f * np.pi) ** .7
    a = banda(ruido(n), 300, 3200) * e_
    b = banda(ruido(n), 2000, 7000) * (f if sube else 1 - f) ** 1.5 * e_
    tono = np.sin(2 * np.pi * np.cumsum(np.geomspace(240, 720, n) if not sube else np.geomspace(720, 240, n)) / SR) * e_ * .07
    return fade(a * .8 + b * .6 + tono, .02, .06)

def boing(dur=1.1, f0=210):
    n = int(dur * SR); tt = np.arange(n) / SR
    f = f0 * (1 + .55 * np.exp(-tt * 3) * np.sin(2 * np.pi * tt * 13))
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 4.2) + .22 * np.sin(4 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 7)

def metal(f=412, dur=.7):
    """Golpe de lámina: parciales que no son múltiplos, se oye a fierro."""
    tt = np.arange(int(dur * SR)) / SR
    return sum(a * np.sin(2 * np.pi * f * r * tt) * np.exp(-tt * d) for r, a, d in ((1, .6, 9), (1.47, .4, 14), (2.31, .3, 20), (3.17, .18, 34)))

def klunk(g=1.0, grave=1.0):
    """El botón real: aquí es donde por fin pasa algo."""
    x = golpe(92 * grave, 40, .55, .5)
    y = np.zeros(len(x)); z = metal(310, .3)
    y[:len(z)] += z * .34
    c = tic(.02, 1500, 5200); y[:len(c)] += c * 1.3
    return (x + y) * g

def timbre(dur=.5):
    tt = np.arange(int(dur * SR)) / SR
    return fade((np.sin(2 * np.pi * 425 * tt) + .7 * np.sin(2 * np.pi * 475 * tt)) * (.6 + .4 * np.sign(np.sin(2 * np.pi * 24 * tt))), .006, .03)

def impresora(dur):
    n = int(dur * SR); tt = np.arange(n) / SR
    return fade(np.sign(np.sin(2 * np.pi * 96 * tt)) * banda(ruido(n), 700, 3000) * .5 * (.6 + .4 * np.sign(np.sin(2 * np.pi * 11 * tt))), .01, .03)

def rechina(dur, f0=230, f1=380):
    n = int(dur * SR); f = np.geomspace(f0, f1, n) * (1 + .03 * np.sin(np.linspace(0, 60, n)))
    return fade(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.sin(np.linspace(0, np.pi, n)) ** .8 * (.7 + .3 * rng.random(n)), .02, .05)

def aire(dur):
    """Tono de cuarto. Donde se quita la música queda esto: el cero digital se oye como corte, no como silencio."""
    n = int(dur * SR); tt = np.arange(n) / SR
    return fade((banda(ruido(n), 90, 800) + banda(ruido(n), 1800, 4600) * .18) * (.8 + .2 * np.sin(2 * np.pi * .23 * tt)), .25, .35)

def pasos(a, b, n, g=.14, f=3000, pan=-.1):
    """Cada diente del mecanismo es un tic: el movimiento a tirones suena a tirones."""
    for k in range(n):
        m.pon(a + (b - a) * k / n, tic(.016, f, f * 2.6), g, pan)
        m.pon(a + (b - a) * k / n, toc(rng.uniform(720, 940)), g * .5, pan)

def salto(t, g=.3):
    m.pon(t, golpe(120, 60, .16, .12), g)

def brota(t):
    m.pon(t, soplo(.24, 900, 5000, .7), .24)
    m.pon(t + .18, papel(.12), .34)


# ---------- los mismos tiempos que Pieza.tsx ----------
H1, H2 = .27, 1.2
jam, nada2, ni1, ni2, msj, mesa1 = s("jamás"), s("nada cuando"), s("ni mandar"), s("ni reservar"), s("mensaje ni"), s("mesa nada")
tu, agente, fiesta, necesita, mesa, no_, llamar, rest, lo = s("tu agente"), s("agente está"), s("la fiesta"), s("necesita"), s("mesa para"), s("no puede"), s("llamar"), s("restaurante"), s("lo único")
restF = e("al restaurante")
asi, y_, det, queda, espF = s("así que"), s("y se detiene"), s("detiene"), s("se queda"), e("queda esperando")
herr, res, per, d12, dia, sab2, sab2F = s("herramienta"), s("reservar personas"), s("personas"), s("doce día"), s("día"), s("sábado y"), e("día sábado")
sin_, mens, como, toma, hace, llam, verd, reg, resp, ochoF = s("sin nada"), s("mensajero toma"), s("como un"), s("toma el"), s("hace la"), s("llamada de"), s("verdad regresa"), s("regresa"), s("respuesta"), e("las ocho")
ape, listo, esto, func, jun, par, es, leng, acc = s("y apenas"), s("listo"), s("a esto"), s("function"), s("junio"), s("parece un"), s("es el momento"), s("lenguaje"), s("acción")
si, puede, cual, sint, tocF, tam, quien, noes, esm, ahi, pue, lla, llaF = s("si sabe"), s("puede manejar"), s("cualquier"), s("sin tocarlo"), e("sin tocarlo"), s("y también"), s("quien"), s("no es la"), s("es el mensajero"), s("ahí está"), s("puerta"), s("llave"), e("la llave")
maq, nun, sol, esc3, fin = s("la máquina nunca"), s("nunca"), s("solo escribe"), s("escribe que"), e("lo apriete")
CLAC, CLAC2, CLAC3, CLAC_D = llam + .16, acc - .03, fin + .62, func + .92
CIERRA, ECHA, TOPE, ABRE = pue + .05, llaF + .32, llaF + .96, maq - .02
POM = (nun - .02, s("aprieta el") + .42)
luz_on = espF + 1.34

# ---------- arranque: el botón de papel ----------
m.pon(0, soplo(H1 + .04, 500, 4200, .9), .5)
for t, g, f in ((H1, .9, 72), (H2, 1.05, 60)):
    m.pon(t, golpe(f, 34, .55, .42), g)
    m.pon(t, papel(.3), .62)
m.pon(H1 + .06, soplo(.5, 400, 2400, .3), .16)
m.pon(H2 - .42, soplo(.42, 500, 3600, .85), .28)
m.pon(H2 + .02, rasgar(jam - H2 - .02), .42)
m.pon(jam, rasgar(.5, False), .95)
m.pon(jam, golpe(50, 26, 1.0, .35), 1.05)
m.pon(jam + .36, golpe(86, 42, .42, .22), .78)
for k, t in enumerate((jam + .72, jam + 1.02, jam + 1.22)):
    m.pon(t, golpe(100, 50, .2, .12), .32 * .6 ** k)
m.pon(jam + .1, lluvia(1.1, 30), .16)

# Ni mensaje ni mesa
for ini, rom in ((ni1, msj + .02), (ni2, mesa1 + .02)):
    brota(ini - .1)
    salto(ini + .24)
    m.pon(rom - .03, golpe(120, 62, .2, .3), .5)
    m.pon(rom, rasgar(.36, False), .72)
    m.pon(rom + .34, papel(.2), .3)
# «Nada»: el aire se lleva todo y se queda el silencio
m.pon(nada2, golpe(50, 26, 1.0, .08), 1.0)
m.pon(nada2 - .02, soplo(.7, 300, 3400, .16), .32)

# El lápiz
a, b = s("cuando parece") + .06, s("lo hizo")
m.pon(a, trazo(b - a, 1500, 620), .1)
m.pon(b, tic(.03, 1800, 5000), .7)
m.pon(b, toc(280), .55)
m.pon(b + .02, boing(.45, 330), .1)
m.pon(s("solo escribió") - .05, tic(.02, 2500, 6000), .3)
m.pon(s("escribió") - .02, rayar(1.0), .46)
m.pon(nada2 + .3, aire(tu + .25 - nada2 - .3), .035)

# ---------- la fiesta ----------
m.pon(tu, soplo(.5, 700, 3800, .3), .2)
m.pon(tu + .05, lluvia(.5, 26), .12)
m.pon(agente + .02, toc(240), .5)
m.pon(agente + .02, papel(.1), .24)
m.pon(tu + .3, golpe(130, 70, .14, .2), .26)
m.pon(tu + .62, golpe(110, 60, .16, .2), .3)
for k in range(3):
    salto(tu + .26 * k + .1, .2)
m.pon(fiesta + .05, campana((659.3, 880, 1318.5), 1.1, (.6, .4, .2)), .07)
brota(necesita - .05)
for k in range(12):
    m.pon(mesa + .08 + k * .054, toc(520 + k * 28), .24, -.3 + k * .05)
m.pon(s("sábado no"), toc(990), .26)
# El teléfono de papel: se levanta y se dobla
brota(no_ - .1)
m.pon(llamar - .08, papel(.14), .34)
m.pon(llamar + .12, trazo(.62, 520, 150), .24)
m.pon(restF + .22, papel(.18), .3)
m.pon(lo - .3, soplo(.3, 500, 2200, .5), .12)

# ---------- el papelito ----------
m.pon(asi - .02, soplo(1.0, 260, 1900, .55), .2)
for ta, tb in ((herr - .04, herr + .62), (res - .04, res + .42), (per - .04, per + .64), (d12 - .04, d12 + .3), (dia - .04, dia + .26), (sab2 - .04, sab2 + .44)):
    m.pon(ta, rayar(tb - ta), .3)
m.pon(sab2F + .32, soplo(.5, 300, 1800, .5), .12)
m.pon(sab2F + .85, papel(.26), .36)
m.pon(y_ - .1, golpe(150, 70, .12, .3), .3)
m.pon(y_, neumatico(espF - .02 - y_ + .1), .14, .5)
m.pon(det + .1, toc(420), .14)
m.pon(espF - .02, cola(neumatico(1.26), 1.1, .3), .4, -.1)
m.pon(y_ - .1, aire(s("afuera") + .2 - y_ + .1), .035)

# ---------- afuera ----------
m.pon(espF + 1.2, tic(.03, 1800, 4800), .5)
m.pon(espF + 1.22, toc(620), .3, -.2)
for k, dt in enumerate((0, .12, .2)):
    m.pon(luz_on + dt, tic(.02, 1200, 3600), .36)
m.pon(luz_on + .2, golpe(92, 50, .3, .2), .5)
# engranes: un trinquete muy bajo que no se calla mientras el muñeco está en cuadro
t = s("afuera")
while t < reg - .3:
    m.pon(t, tic(.012, 2400, 6400), .05, -.2); t += .17
m.pon(sin_ - .02, metal(640, .25), .3)
m.pon(sin_ + .02, boing(1.2), .34, -.2)
m.pon(mens + .24, toc(330), .36)
m.pon(como + .4, metal(520, .22), .24)
pasos(toma, toma + .4, 4); m.pon(toma + .45, tic(.02, 3000, 7000), .44)
pasos(toma + .5, toma + .9, 4); m.pon(toma + .98, papel(.12), .28)
m.pon(toma + 1.24, metal(520, .22), .22)
pasos(hace + .02, CLAC - .24, 6, .18)
m.pon(CLAC, klunk(1.0), .95)
m.pon(CLAC + .05, trazo(.5, 900, 2600), .14, .6)
m.pon(verd + .1, soplo(.42, 500, 4600, .35), .32, .6)
for t, d in ((verd + .34, .5), (verd + .98, .46)):
    m.pon(t, timbre(d), .14, .3)
m.pon(reg - .6, trazo(.35, 2200, 800), .1, .4)
m.pon(reg - .4, soplo(.42, 500, 4600, .35), .32, -.6)
pasos(reg - .42, reg - .1, 4, .12)
m.pon(reg + .1, impresora(resp + .24 - reg - .1), .17, -.1)
pasos(resp - .02, resp + .36, 4); m.pon(resp + .46, tic(.02, 3000, 7000), .4)
pasos(ochoF + .36, ochoF + .74, 4)
m.pon(ochoF + .84, golpe(150, 80, .14, .3), .34)
m.pon(ochoF + .86, neumatico(ape - .06 - ochoF - .86 + .1, True), .5, .1)
m.pon(ape - .06, cola(toc(460), .7, .4), .46)
m.pon(ape - .04, papel(.2), .4)
for k in range(2):
    salto(ape + .35 + k * .44, .34)
m.pon(ape + .36, campana((880, 1318.5), .8, (.5, .3)), .13)
m.pon(listo - .1, soplo(.24, 900, 4200, .7), .2)
m.pon(listo + .04, toc(760), .26)

# ---------- el nombre ----------
m.pon(esto - .1, soplo(.9, 260, 1500, .5), .14)
m.pon(func - .05, neumatico(.78), .16, .1)
m.pon(CLAC_D, klunk(.6), .7)
m.pon(CLAC_D + .3, neumatico(.72, True), .12, .1)
m.pon(jun - .02, golpe(82, 44, .3, .6), .72)
m.pon(jun - .02, tic(.03, 900, 3000), .5)
m.pon(par - .1, trazo(.9, 300, 800), .1)
m.pon(par + .1, papel(.12), .2)
m.pon(es - .1, soplo(.9, 240, 1600, .5), .13)
m.pon(leng - .05, neumatico(acc - .24 - leng + .05), .2, .1)
pasos(CLAC2 - .36, CLAC2 - .1, 4, .2)
m.pon(CLAC2, klunk(1.2, .9), 1.05)
m.pon(CLAC2 + .02, campana((220, 329.6, 659.3), 1.6, (.8, .5, .3)), .11)

# ---------- cualquier programa ----------
a = si
while a < puede - .1:
    m.pon(a, rayar(.26), .14, -.2); a += .3
m.pon(puede - .1, soplo(.9, 320, 2800, .3), .24)
for i in range(7):
    q = cual - .22 + i * .23
    for k in range(4):
        a = q + k * max(.34, .62 - k * .1)
        m.pon(a + .34, toc(420 + 90 * i + 40 * k), .2, -.6 + i * .2)
        m.pon(a + .3, tic(.02, 2600, 7200), .16, -.6 + i * .2)
m.pon(sint, soplo(.3, 500, 3000, .3), .22)
m.pon(sint + .06, toc(880), .2)
for i in range(7):
    m.pon(tam + .1 + i * .08, toc(760 - i * 70), .2, .6 - i * .2)
m.pon(tam + .5, golpe(54, 30, .9, .06), .62)

# ---------- quien decide ----------
m.pon(tocF + .5, neumatico(quien - .3 - tocF - .5), .1)
m.pon(quien - .3, tic(.02, 2000, 5000), .3)
pasos(quien - .1, quien + .34, 4, .15); m.pon(quien + .46, tic(.02, 3000, 7000), .4)
pasos(quien + .46, quien + .96, 5, .13)
for t, ld in ((noes - .05, -.5), (esm - .3, .4)):
    m.pon(t, soplo(.42, 500, 4600, .35), .3, ld)
m.pon(esm + .02, golpe(58, 30, .7, .12), .85)
m.pon(esm + .14, metal(640, .25), .22)
m.pon(esm + .16, boing(1.0), .28)
t = esm
while t < ahi:
    m.pon(t, tic(.012, 2400, 6400), .08, -.2); t += .12

# ---------- la puerta y la llave ----------
m.pon(CIERRA - .02, rechina(.32), .1, .3)
m.pon(CIERRA + .3, golpe(56, 28, .95, .5), 1.05)
m.pon(CIERRA + .3, metal(180, 1.0), .42)
m.pon(lla - .6, trazo(.7, 900, 1900), .1)
m.pon(lla + .1, tic(.02, 2600, 6400), .6)
m.pon(lla + .13, metal(1250, .12), .28)
pasos(llaF - .1, ECHA, 4, .22, 3600, .1)
m.pon(ECHA, golpe(150, 74, .22, .9), .8)
m.pon(ECHA, metal(860, .26), .5)
pasos(TOPE - .42, TOPE, 4, .18)
m.pon(TOPE, metal(240, .6), .62)
m.pon(TOPE, golpe(70, 40, .3, .5), .6)
pasos(TOPE + .18, TOPE + .6, 4, .12)

# ---------- nunca ----------
m.pon(maq, trazo(nun - maq, 500, 220), .12)
for k, q in enumerate(POM):
    m.pon(q, golpe(100, 52, .3, .3), .8 - k * .12)
    m.pon(q, metal(150, .22), .12)
m.pon(sol, rayar(esc3 - sol), .16)
m.pon(esc3 - .1, neumatico(fin + .2 - esc3), .16, .1)
m.pon(ABRE - .16, metal(860, .2), .34)
m.pon(ABRE - .16, tic(.02, 2600, 6400), .5)
m.pon(ABRE, rechina(.34, 340, 220), .12, .3)
m.pon(ABRE, soplo(.5, 300, 2400, .4), .16)
pasos(CLAC3 - .42, CLAC3 - .1, 4, .2)
m.pon(CLAC3, klunk(1.25, .85), 1.15)
m.pon(CLAC3, golpe(44, 24, 1.5, .1), .55)
m.pon(CLAC3 + .02, campana((110, 164.8, 329.6), 2.4, (.8, .5, .3)), .42)

corte = nada2 - .03
sube = s("afuera") - .14
baja = tam + .05
m.musica([("a02_boton", 20, 0, corte, .03, .03)], -26)
m.musica([("a02_boton", 30, tu - .08, y_ + .06, .3, .14)], -26.5)
m.musica([("a02_boton", 48, sube, si, .22, .2), ("a02_boton", 56, si - .2, baja, .2, .1)], -31.5)
m.musica([("a02_boton", 5, tam + .2, maq - .1, .5, .3)], -22.5)
m.musica([("a02_boton", 84, maq - .14, m.dur, .3, 2.6)], -28)
# Limitador suave del bus de foley: los golpes conservan cuerpo y ya no obligan a bajar toda la mezcla.
TECHO = .62
m.fx = TECHO * np.tanh(m.fx * .6 / TECHO)

def hueco_para_la_voz(fx, baja=-12, lo=280, hi=6500):
    """Mientras la voz habla, el foley se aparta de SU banda. Los graves del golpe y el aire de arriba se quedan.

    No es ducking de la cama: la música sigue constante. Sin esto la escucha marcó tres frases tapadas (2-nov-2026).
    """
    n = min(len(fx), len(m.voz))
    w = int(.03 * SR)
    pot = np.convolve(m.voz[:n].mean(axis=1) ** 2, np.ones(w) / w, "same")
    activa = np.clip((10 * np.log10(pot + 1e-10) + 44) / 10, 0, 1)
    # Entra de golpe y suelta despacio: el hueco no debe oírse como bombeo.
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
    def gap(a, b):
        k = [i for i in range(a, b) if vo[i] > -30 and mu[i] > -70]
        return (a, round(float(np.mean([vo[i] - mu[i] for i in k])), 1) if k else None, len(k))
    V = int(.1 * SR)
    F = banda(m.fx.mean(axis=1) * 1.2, 300, 5000)
    vz = m.voz.mean(axis=1)[: len(F)]
    malos = [round(i / SR, 1) for i in range(0, min(len(F), len(vz)) - V, V)
             if np.sqrt((vz[i:i + V] ** 2).mean()) > db(-34) and np.sqrt((F[i:i + V] ** 2).mean()) > db(-7) * np.sqrt((vz[i:i + V] ** 2).mean())]
    tramos_ = []
    for x in malos:
        if tramos_ and x - tramos_[-1][1] < .25: tramos_[-1][1] = x
        else: tramos_.append([x, x])
    print("foley a menos de 7 dB de la voz, en su banda:", [(a_, b_) for a_, b_ in tramos_])
    print("voz-música con voz activa:", [gap(a, b) for a, b in ((1, 8), (15, 30), (37, 48), (56, 66), (67, 72), (76, 85), (87, 90))])
    raise SystemExit
m.cierra()
