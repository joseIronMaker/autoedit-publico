"""Capítulo 11 de la serie 2: el examen. Una moneda que cae águila, una fiesta que el martes sale sin pastel,
una palabra que arregla un caso y rompe tres, y la máquina que corre veinte fiestas y saca un número.
Todos los instantes (vuelos de la moneda con su bamboleo, sellos, palancas, casillas) salen de aquí a
`eventos.json`; la animación los lee de ahí, así que dibujo y sonido son los mismos números.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"un programa normal": .2, "hoy organiza": .3, "y si cambias": .4, "probarlo una vez": .35, "que caiga águila": .4,
          "por eso existen": 1.15, "una lista de": .25, "veinte fiestas": .35, "y sale un": .3, "ahora sí": .45,
          "es lo mismo que vimos": .5, "sin un error": .2, "solo que aquí": .3, "la diferencia entre": .55, "es que alguien": .2,
          "lo que no mides": .5, "lo adivinas": .55}
m = Mezcla("a11_examen", pausas=PAUSAS, cola=2.8).exporta_tiempos()
T = m.T

G = 3000.0                                          # gravedad del mundo, px/s²


def vuelo(t0, x0, y0, x1, y1, v0, giros, cara, wob, f0=3.0, f1=15.0, d0=.46, a0=0.0):
    """Una moneda lanzada: sube con v0, cae en y1 y se bambolea `wob` segundos con frecuencia creciente."""
    tau = (v0 + np.sqrt(v0 * v0 + 2 * G * (y1 - y0))) / G
    tl = t0 + tau
    a = (f1 - f0) / wob
    ticks = []                                      # cada medio ciclo del bamboleo, el canto toca la mesa
    k = 1
    while True:
        # f0 u + a u²/2 = k/2
        u = (-f0 + np.sqrt(f0 * f0 + a * k)) / a
        if u >= wob:
            break
        ticks.append([round(tl + u, 4), round(float((1 - u / wob) ** 1.6), 3)])
        k += 1
    return dict(t0=round(t0, 4), tl=round(tl, 4), x0=x0, y0=y0, x1=x1, y1=y1, v0=v0, giros=giros, cara=cara,
                wob=wob, f0=f0, f1=f1, d0=d0, a0=a0, ticks=ticks)


def lista(a, b, n, curva=1.0):
    return [round(a + (b - a) * (i / (n - 1)) ** curva, 3) for i in range(n)]


# ---------- A: la moneda del arranque ----------
MANO_A, REPOSO_A = (512, 1010), (690, 1262)
v1 = vuelo(-.08, *MANO_A, *REPOSO_A, 2850, 6, 1, 1.45, a0=-1.45)
sello = T("bien").s - .04
nolo = T("no lo sabes").s - .05

# ---------- B: programa contra agente ----------
panB = T("un programa").s - .42
teclas = [T("programa").s + .05, T("normal").s + .12, T("siempre").s + .2]
igual = T("lo mismo").s + .05
salidas = [T("agente no").s, T("agente no").s + .2, T("agente no").s + .4]
distinto = T("agente no").e - .05

# ---------- C: lunes y martes ----------
panC = T("hoy").s - .3
items = [T("organiza").s, T("organiza").s + .18, T("organiza").s + .36]
pastel = T("fiesta").s
perfecta = T("perfecta").s + .1
arranca = T("mañana").s - .12
vuelven = [T("con el mismo").s + .05, T("con el mismo").s + .23, T("con el mismo").s + .41]
encargo = T("encargo").s
tada = [perfecta + .1, T("encargo").e - .2]
olvida = T("olvida").s - .05
falta = T("pastel").s

# ---------- D: una palabra ----------
zoomD = T("y si cambias").s - .35
tacha = T("cambias").s + .15
escribe = [T("palabra").s + .05, T("instrucciones").e - .1]
cartas = T("puede mejorar").s - .12
mejora = T("mejorar").s + .15
rompe = [T("romperse").s + .08, T("otros").s, T("tres").s + .06]

# ---------- A': la moneda, entendida ----------
panA = T("probarlo").s - .4
recoge = T("una vez").s - .1
lanza2 = T("lanzar").s + .05
v2 = vuelo(lanza2, *MANO_A, *REPOSO_A, 2850, 6, 1, .6)
dice = T("siempre cae").s
golpea = T("cae águila").e - .04                    # la bola le da un manotazo a la mesa
v3 = vuelo(golpea + .04, *REPOSO_A, REPOSO_A[0] - 10, REPOSO_A[1], 1300, 2, -1, .5, a0=float(np.pi / 3))
tachaFrase = v3["tl"] + .14

# ---------- E: la máquina de exámenes ----------
bajaE = T("por eso").s - .2
maquina = T("evals").s - .04
examenes = T("exámenes").s - .2
listaT = T("una lista").s - .05
cartasCaen = lista(listaT + .1, listaT + 1.05, 20)
rubrica = T("una forma").s
iconos = [rubrica + .4, rubrica + .65, rubrica + .9]
palanca = T("correrlos").s - .1
corridas = [palanca + .3, T("muchas").s, T("muchas").s + .38, T("muchas").s + .74, T("muchas").s + 1.08]
candado = T("cambiar nada").e - .3

# ---------- F: veinte fiestas ----------
zoomF = T("veinte fiestas").s - .35
mesitas = lista(T("veinte fiestas").s + .05, T("distintas").e - .1, 20)
preguntas = [T("respetó").s, T("invitó").s, T("avisó").s]
FALLAN = [6, 13, 17]                                # la mesita que reprueba cada casilla
casillas = [[round(q + .16 + i * .042, 3) for i in range(20)] for q in preguntas]
numero = T("y sale").s - .1
pasan = [i for i in range(20) if i not in FALLAN]
cuenta = lista(numero + .45, T("diecisiete").s, 17, .85)
diecisiete = T("diecisiete").s

# ---------- G: cambias y vuelves a medir ----------
abre = T("ahora sí").s + .08
edita = [T("cambias algo").s - .1, T("cambias algo").e + .1]
palanca2 = T("vuelves").s - .05
rueda = [palanca2 + .28, T("es lo mismo").s - .1]

# ---------- H: el eco de la serie 1 ----------
panH = T("es lo mismo").s - .15
traza = [panH + .2, panH + .95]
caeBola = panH + 1.05
bandera = panH + 1.35
barra = [T("primera serie").s, T("primera serie").e + .1]
errorT = T("error medido").s - .05
salta = T("aprende").s - .02
persona = T("solo que aquí").s
mira = T("quien aprende").s + .1
tu = T("eres").s + .12

# ---------- I y J: juguete y producto ----------
panI = T("la diferencia").s - .35
juguete = T("juguete").s - .05
producto = T("producto").s
igual2 = T("modelo").s - .05
alguien = T("alguien").s - .12
escribe2 = [T("escribir").s - .1, T("examen").e]
nomides = T("lo que no mides").s
v4 = vuelo(T("adivinas").s + .02 - 2.0435, 420, 1000, 560, 1440, 2850, 6, 1, 1.75, f1=17.0, a0=-1.45)
fin = T("adivinas").e

ev = dict(G=G, v1=v1, v2=v2, v3=v3, v4=v4, sello=sello, nolo=nolo, panB=panB, teclas=teclas, igual=igual, salidas=salidas,
          distinto=distinto, panC=panC, items=items, pastel=pastel, perfecta=perfecta, arranca=arranca, vuelven=vuelven,
          encargo=encargo, tada=tada, olvida=olvida, falta=falta, zoomD=zoomD, tacha=tacha, escribe=escribe, cartas=cartas,
          mejora=mejora, rompe=rompe, panA=panA, recoge=recoge, dice=dice, golpea=golpea, tachaFrase=tachaFrase,
          bajaE=bajaE, maquina=maquina, examenes=examenes, lista=listaT, cartasCaen=cartasCaen, rubrica=rubrica, iconos=iconos,
          palanca=palanca, corridas=corridas, candado=candado, zoomF=zoomF, mesitas=mesitas, preguntas=preguntas,
          FALLAN=FALLAN, casillas=casillas, numero=numero, pasan=pasan, cuenta=cuenta, diecisiete=diecisiete, abre=abre,
          edita=edita, palanca2=palanca2, rueda=rueda, panH=panH, traza=traza, caeBola=caeBola, bandera=bandera,
          barra=barra, error=errorT, salta=salta, persona=persona, mira=mira, tu=tu, panI=panI, juguete=juguete,
          producto=producto, igual2=igual2, alguien=alguien, escribe2=escribe2, nomides=nomides, fin=fin)


def redondea(x):
    if isinstance(x, float):
        return round(x, 4)
    if isinstance(x, list):
        return [redondea(y) for y in x]
    if isinstance(x, dict):
        return {k: redondea(v) for k, v in x.items()}
    return x


(RAIZ / "remotion/src/serie/a11/eventos.json").write_text(json.dumps(redondea(ev)), encoding="utf-8")


# ---------- foley ----------
def tin(f=2637):
    """Moneda que suena al soltarla: dos parciales metálicos que no son armónicos."""
    c = campana((f, f * 1.47, f * 2.21), .7, (.5, .3, .16))[: int(.7 * SR)]
    c[: int(.09 * SR)] += toc(f * .56)[: int(.09 * SR)] * .5
    return c


def aleteo(dur, giros_s):
    """El zumbido de una moneda que gira en el aire: aire cortado dos veces por vuelta."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / .05, 1) * np.minimum((dur - t) / .08, 1)
    mod = np.abs(np.sin(np.pi * 2 * giros_s * t)) ** 3
    return banda(ruido(n), 1800, 7000) * mod * e * .5 + banda(ruido(n), 400, 1400) * mod * e * .12


def canto(intensidad):
    """El canto de la moneda que golpea la mesa al bambolearse: tic metálico con un poco de anillo."""
    s = tic(.025, 2600, 9000) * 1.1
    r = campana((3100, 4400), .18, (.2, .1))[: int(.18 * SR)]
    out = np.zeros(len(r))
    out[: len(s)] += s
    out += r * .5
    return out * intensidad


def moneda_cae(v, g=1.0, final=True):
    m.pon(v["tl"], golpe(170, 90, .12, .7), .45 * g)
    m.pon(v["tl"], tin(2900), .3 * g)
    for t, a in v["ticks"]:
        m.pon(t, canto(.35 + .65 * a), .32 * g, rng.uniform(-.2, .2))
    if final:
        m.pon(v["tl"] + v["wob"], tin(3300), .14 * g)


def moneda_vuela(v, g=1.0):
    m.pon(max(v["t0"], 0), tin(), .34 * g)
    m.pon(max(v["t0"], 0), soplo(.4, 900, 5000, .2), .16 * g)
    dur = v["tl"] - max(v["t0"], 0)
    m.pon(max(v["t0"], 0) + .05, aleteo(dur - .05, v["giros"] / (v["tl"] - v["t0"])), .1 * g)


def pluma(dur, rapido=1.0):
    n = int(dur * SR)
    t = np.arange(n) / SR
    trazos = np.abs(np.sin(2 * np.pi * (7.5 * rapido) * t + 3 * np.sin(2 * np.pi * 1.3 * t))) ** 1.5
    e = np.minimum(t / .03, 1) * np.minimum((dur - t) / .06, 1)
    return banda(ruido(n), 2400, 7800) * trazos * e * .55 + banda(ruido(n), 700, 1800) * trazos * e * .12


def rasgado(dur=.5):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    cr = (rng.random(n) > .992).astype(float) * rng.uniform(-1, 1, n)
    return (banda(cr, 900, 7000) * 3.2 + banda(ruido(n), 1500, 6000) * .35) * np.sin(np.pi * t ** .7) ** .8


def vibra(dur=.5):
    """Un teléfono que vibra sobre la mesa: el mensaje ya le llegó a mamá."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    pulsos = (np.sin(2 * np.pi * 7 * t) > 0).astype(float)
    pulsos = np.convolve(pulsos, np.ones(200) / 200, "same")
    zum = np.sign(np.sin(2 * np.pi * 148 * t)) * .5 + np.sin(2 * np.pi * 296 * t) * .3
    return banda(zum, 100, 1800) * pulsos * np.minimum((dur - t) / .05, 1)


def matraca(dur, paso=.05, f=(2200, 6000)):
    """Trinquete: clics regulares, una palanca o una cuerda que se da."""
    n = int(dur * SR)
    y = np.zeros(n + 2000)
    t = 0.0
    while t < dur:
        i = int(t * SR)
        s = tic(.02, *f)
        y[i:i + len(s)] += s * (.7 + .3 * rng.random())
        t += paso
    return y[:n]


def motor(dur):
    """El zumbido de la máquina mientras corre: grave, con un temblor de engranes."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    e = np.minimum(t / .25, 1) * np.minimum((dur - t) / .3, 1)
    s = np.sin(2 * np.pi * 62 * t) * .6 + np.sin(2 * np.pi * 124 * t + 1) * .25
    s *= .75 + .25 * np.sin(2 * np.pi * 9 * t)
    return (s + banda(ruido(n), 300, 1200) * .25 * (.6 + .4 * np.sin(2 * np.pi * 13 * t))) * e


def chasquido():
    """El candado que se cierra."""
    s = toc(1800)
    out = np.zeros(len(s) + 3000)
    out[: len(s)] += s * .6
    out[2400: 2400 + len(s)] += toc(2300) * .5
    c = tic(.04, 3000, 9000)
    out[: len(c)] += c
    return out


def wah(f0=420, f1=210, dur=.55):
    """Un tono que se desinfla: la conclusión que no aguantó."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = np.geomspace(f0, f1, n)
    e = np.minimum(t / .02, 1) * (1 - t / dur) ** 1.4
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) + .3 * np.sin(2 * np.pi * np.cumsum(f * 2) / SR)) * e * .6


# A: el arranque
moneda_vuela(v1)
moneda_cae(v1)
m.pon(sello - .32, soplo(.34, 500, 3200, .8), .2)
m.pon(sello, golpe(120, 58, .34, .5), .75)
m.pon(sello + .01, tic(.04, 1500, 5000), .4)
m.pon(sello + .3, soplo(.4, 600, 3000, .3), .1)
m.pon(nolo, soplo(.3, 700, 2600, .5), .12)
m.pon(nolo + .05, toc(420), .2)
m.pon(nolo + .25, toc(380), .16)

# B: programa contra agente
m.pon(panB, soplo(.55, 300, 3200, .35), .22)
for k, t in enumerate(teclas):
    m.pon(t, toc(900), .3)
    m.pon(t + .06, tic(.05, 1500, 5000), .25)
    m.pon(t + .1, soplo(.18, 1500, 6000, .3), .1)
m.pon(igual, toc(660), .22)
m.pon(igual + .12, toc(660), .2)
for k, t in enumerate(salidas):
    m.pon(t, toc([520, 690, 430][k]), .3)
    m.pon(t, soplo(.22, 800, 4000, .3), .1)
m.pon(distinto, golpe(80, 40, .3, .2), .4)

# C: lunes y martes
m.pon(panC, soplo(.55, 300, 3200, .35), .22)
for k, t in enumerate(items):
    m.pon(t, toc(560 + 110 * k), .26, -.4 + .4 * k)
m.pon(items[1], lluvia(.4, 40), .12)
m.pon(pastel + .2, golpe(110, 60, .26, .25), .42)
m.pon(perfecta, campana((784, 1175, 1568), 1.0, (.5, .3, .15)), .2)
m.pon(perfecta + .05, pluma(.25, 2), .12)
m.pon(arranca, rasgado(.45), .55)
m.pon(arranca + .1, soplo(.5, 300, 2000, .3), .14)
for k, t in enumerate(vuelven):
    m.pon(t, toc(560 + 110 * k), .24, -.4 + .4 * k)
m.pon(encargo, tic(.03, 2000, 7000), .3)
m.pon(encargo + .1, tic(.03, 2000, 7000), .2)
m.pon(olvida, trazo(.4, 520, 330), .14)
m.pon(falta, golpe(62, 32, .5, .05), .5)
m.pon(falta + .05, pluma(.45, 1.6), .12)

# D: una palabra
m.pon(zoomD, soplo(.8, 250, 2200, .4), .2)
m.pon(tacha, pluma(.32, 2.4), .2)
m.pon(escribe[0], pluma(escribe[1] - escribe[0], 1.4), .15)
for k in range(4):
    m.pon(cartas + k * .08, golpe(150, 90, .1, .6), .26, -.6 + .4 * k)
m.pon(mejora, campana((880, 1318.5), .8, (.4, .2)), .2)
m.pon(mejora + .02, toc(760), .2)
for k, t in enumerate(rompe):
    m.pon(t, vibra(.42), .32, [-.2, .2, .5][k])
    m.pon(t + .02, golpe(90, 48, .2, .2), .3)

# A': la moneda otra vez
m.pon(panA, soplo(.8, 250, 3600, .3), .26)
m.pon(recoge, tic(.03, 2500, 8000), .3)
m.pon(recoge + .05, soplo(.3, 900, 4000, .4), .12)
m.pon(recoge + .42, tin(2400), .12)
moneda_vuela(v2)
moneda_cae(v2)
m.pon(golpea, golpe(70, 36, .45, .3), .75)
moneda_vuela(v3, .8)
moneda_cae(v3)
m.pon(tachaFrase, pluma(.3, 2.6), .22)
m.pon(tachaFrase + .05, wah(), .2)

# E: la máquina
m.pon(bajaE, soplo(.8, 250, 2000, .5), .2)
m.pon(maquina - .3, soplo(.32, 200, 1600, .9), .3)
m.pon(maquina, golpe(52, 26, .7, .25), 1.0)
m.pon(maquina + .02, golpe(140, 70, .2, .6), .3)
for k in range(5):
    m.pon(maquina + .06 + k * .05, tic(.02, 1500, 5000), .18)
m.pon(examenes + .2, toc(880), .12)
for k, t in enumerate(cartasCaen):
    m.pon(t + .3, tic(.02, 2000 + 60 * k, 7000), .2, rng.uniform(-.3, .3))
m.pon(cartasCaen[0], soplo(1.2, 1500, 6000, .4), .08)
m.pon(rubrica, soplo(.3, 600, 3000, .5), .14)
m.pon(rubrica + .3, golpe(160, 90, .1, .6), .3)
for k, t in enumerate(iconos):
    m.pon(t, toc(620 + 140 * k), .26)
m.pon(palanca - .05, matraca(.28, .045), .35)
m.pon(palanca + .25, golpe(84, 42, .36, .4), .65)
m.pon(palanca + .3, motor(T("cambiar nada").e - palanca - .15), .3)
for t in corridas:
    m.pon(t, toc(1040), .22)
    m.pon(t + .03, tic(.03, 2500, 7000), .2)
m.pon(candado, chasquido(), .4)

# F: veinte fiestas
m.pon(zoomF, soplo(.6, 300, 3000, .4), .18)
for k, t in enumerate(mesitas):
    m.pon(t, toc(480 + 26 * k), .12, -.5 + (k % 4) / 3)
for j, fila in enumerate(casillas):
    for i, t in enumerate(fila):
        if i == FALLAN[j]:
            m.pon(t, golpe(78, 38, .3, .25), .42)
            if j == 2:
                m.pon(t + .02, vibra(.4), .3)
        else:
            m.pon(t, tic(.022, 3000 + 80 * i, 9000), .2, -.5 + (i % 4) / 3)
m.pon(numero, soplo(.6, 300, 2600, .4), .16)
for k, t in enumerate(cuenta):
    m.pon(t, toc(700 + 18 * k), .18)
m.pon(diecisiete, campana((659.3, 987.8, 1318.5), 1.4, (.6, .35, .2)), .26)
m.pon(diecisiete, golpe(110, 56, .3, .2), .35)

# G: cambias y vuelves a medir
m.pon(abre, chasquido(), .3)
m.pon(edita[0], pluma(edita[1] - edita[0], 2.0), .18)
m.pon(palanca2 - .05, matraca(.28, .045), .32)
m.pon(palanca2 + .25, golpe(84, 42, .36, .4), .6)
m.pon(palanca2 + .3, motor(rueda[1] - palanca2 - .2), .26)
m.pon(rueda[0], matraca(rueda[1] - rueda[0], .032, (3000, 8000)), .16)

# H: el eco
m.pon(panH, soplo(.7, 250, 2600, .35), .2)
m.pon(traza[0], trazo(traza[1] - traza[0], 300, 620), .16)
for k, t in enumerate(rebotes(caeBola, 4, .42, 34)):
    m.pon(t, golpe(92, 42, .46 - min(k, 3) * .08, .26), .85 * .42 ** k)
m.pon(bandera, soplo(.3, 600, 3000, .6), .14)
m.pon(bandera + .25, toc(330), .2)
m.pon(barra[0], trazo(barra[1] - barra[0] + .2, 280, 520), .16)
m.pon(errorT, campana((440, 660), 1.4, (.7, .3)), .22)
m.pon(salta, soplo(.5, 500, 3000, .5), .14)
for k, t in enumerate(rebotes(salta + .35, 1.2, .38, 34)[:3]):
    m.pon(t, golpe(100, 50, .3, .24), .55 * .4 ** k)
m.pon(persona, soplo(1.0, 200, 1400, .5), .2)
m.pon(mira, trazo(.6, 380, 700), .1)
# En la toma, "tú" dura 70 ms y se oye cortado: no se le pone nada encima, y se le da una cola de sala
# para que se apague en vez de cortarse. El golpe y la campana entran justo cuando la palabra termina.
def fin_real(a, b, umbral=-38):
    x = m.voz[int(a * SR):int(b * SR)].mean(axis=1)
    n = int(.01 * SR)
    e = [20 * np.log10(np.sqrt((x[i:i + n] ** 2).mean()) + 1e-9) for i in range(0, len(x) - n, n)]
    return a + (max(i for i, v in enumerate(e) if v > umbral) + 1) * .01


fin_tu = fin_real(T("eres").s, T("eres tú").e + .25)
seco = m.voz[int((fin_tu - .14) * SR):int((fin_tu + .02) * SR)].mean(axis=1)
m.pon(fin_tu - .14, cola(seco, 1.3, 1.0), .2)
m.pon(fin_tu + .03, golpe(76, 38, .5, .1), .38)
m.pon(fin_tu + .03, campana((523.3, 784, 1046.5), 1.8, (.6, .35, .2)), .22)
print(f"  'tú' termina en {fin_tu:.2f} s")

# I: juguete y producto
m.pon(panI, soplo(.7, 250, 2600, .35), .2)
m.pon(juguete, matraca(.5, .08, (1500, 5000)), .3)
k = juguete + .6
while k < nomides - .1:                             # el juguete de cuerda: tic, tac
    m.pon(k, toc(1900 if int((k - juguete) * 4) % 2 else 1500), .07)
    k += .25
m.pon(producto, toc(520), .26)
m.pon(igual2, toc(660), .24)
m.pon(igual2 + .12, toc(660), .22)
m.pon(alguien, soplo(.6, 300, 2200, .5), .16)
m.pon(alguien + .45, golpe(140, 80, .12, .6), .26)
m.pon(escribe2[0], pluma(escribe2[1] - escribe2[0], 1.6), .17)

# J: lo adivinas
moneda_vuela(v4)
moneda_cae(v4, 1.15, final=False)
fin_bamboleo = v4["tl"] + v4["wob"]
m.pon(fin_bamboleo, tin(3300), .14)
m.pon(fin_bamboleo - .05, golpe(96, 46, .3, .3), .4)
m.pon(fin_bamboleo + .02, campana((261.6, 392, 523.3), 2.4, (.7, .4, .2)), .26)      # se apaga, no se corta

m.musica([("a11_examen", 14.0, 0, golpea, .05, .04),
          ("a11_examen", 63.9, maquina - .95, panH + .1, .02, .5),
          ("a11_examen", 50.0, panH - .2, panI + .2, .5, .5),
          ("a11_examen", 22.0, panI - .1, T("mides").e, .4, .45),
          ("a11_examen", 97.0, T("adivinas").s - .1, m.dur, .4, 2.6)])
m.cierra()
