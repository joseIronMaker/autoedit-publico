"""Capítulo 5 de la serie 2: la mesa. Todos los instantes de hojas, pasos, prensa y barrido salen de aquí
a `eventos.json`, y la animación los lee de ahí: dibujo y sonido no se pueden desfasar.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"imagínalo como": .25, "lo único que": .45, "sus instrucciones": .2, "a eso le": .2, "y la mesa tiene": .75,
          "cada mensaje": .1, "cada resultado": .1, "va a buscar": .1, "y aquí pasa": .45, "no falla de": .15,
          "se vuelve torpe": .35, "se le olvida": .45, "cuando ya no": .55, "hay que resumir": .1, "y al resumir": .75,
          "algo se pierde": .3, "por eso un": .9, "hoy casi nadie": .45, "se habla de": .25, "qué entra": .15,
          "qué sale": .25, "y cuándo": .3, "no gana quien": .55, "gana quien le deja": .35, "solo lo que": .75}
m = Mezcla("a05_mesa", pausas=PAUSAS, cola=3.6).exporta_tiempos()
T = m.T


def lista(a, b, n, curva=1.0):
    return [round(a + (b - a) * (i / (n - 1)) ** curva, 3) for i in range(n)]


# ---------- eventos ----------
paso = T("paso").s
F1, F2, F3 = .5, 1.12, 1.72
tTira = paso + .24
tCola1, tCola2 = paso + .52, paso + .86
tPlop = paso + 1.2
tTodo = T("todo").s + .02
tHojeo = lista(T("lo lee").s + .1, T("cero").s + .3, 8)
tQuita = T("imagínalo").s - .25
tPaf1, tPaf2 = T("frente a").s + .22, T("frente a").s + .62
tSh = T("lo único").s - .14
tInstr, tHerr = T("instrucciones").s + .05, T("herramientas").s + .05
tCharla, tNota, tArch, tArch2 = T("lo que ya").s + .05, T("platicaron").s + .15, T("los archivos").s + .05, T("abrió").s - .08
tCtx = T("contexto").s
tTira2, tEsq0 = T("tamaño").s - .1, T("fijo").s + .02
esq = [round(tEsq0 + i * .09, 3) for i in range(4)]
msg = [T("cada mensaje").s + .1 + i * .34 for i in range(3)]
res = [T("cada resultado").s + .1, T("ocupa", T("cada resultado").i).s + .05]
pag = lista(T("veinte").s - .04, T("páginas").e + .12, 20, .9)
tLupa = T("va a buscar").s
tSlip1, tSlip2 = T("se vuelve").s + .12, T("torpe").s + .22
tSello = T("mariscos").s + .28
tPela0, tPela1 = T("porque esa").s + .04, T("abajo").s - .1
tEnt0, tEnt1 = T("cuando ya").s - .55, T("cuando ya").s - .08
ext = lista(T("cuando ya").s + .3, T("cabe nada").e + .25, 9)
tPrensa = T("hay que").s - .3
tBam = T("hay que resumir").e - .02
rapidas = lista(T("empezar brillante").e + .12, T("confundido").e + .1, 22, .85)
tMagica = T("escribir").s + .1
tQuitaM = T("mágicos").e + .2
tEntra, tSale, tCuando = T("qué entra").s + .34, T("qué sale").s + .2, T("y cuándo").e - .1
diluvio = lista(T("no gana").s + .25, T("información").e + .2, 48, .8)
tBarre = T("sobre la").s - .35
tNotaF = T("importa").s + .03
tPasoF = T("importa").e + .55
tPalomita = tPasoF + 1.15

pasos = [(paso, 0), (T("despierta").s - .1, 0), (T("sin recuerdos").s - .06, 0), (T("cada pocos").s - .06, 0),
         (T("a eso").s - .55, 1.7), (T("cada mensaje").s - .24, .55), (T("cada resultado").s - .24, .55),
         (T("va a buscar").s - .24, .7), (T("se llena").e + .42, 1.1), (T("se le olvida").s - .24, .85)]
pasos += [(round(t, 3), .3) for t in np.arange(T("empezar brillante").e + .3, T("confundido").s + .3, .56)]
pasos += [(tPasoF, .75)]

golpes = [(F1, .8), (F2, .8), (F3, 1), (tTodo, 3), (tSh + .4, .9), (tInstr, .45), (tHerr, .45), (tNota, .6), (esq[0], 1.2), (esq[3], 1.6),
          (pag[-1], .7), (tSello, 2), (tBam, 4), (tMagica, .4), (tBarre + .5, 1.6), (tNotaF, .35)]

ev = {"F": [F1, F2, F3], "tira": tTira, "cola": [tCola1, tCola2], "plop": tPlop, "todo": tTodo, "hojeo": tHojeo, "quita": tQuita, "paf": [tPaf1, tPaf2],
      "sh": tSh, "instr": tInstr, "herr": tHerr, "charla": tCharla, "nota": tNota, "arch": [tArch, tArch2], "tira2": tTira2, "esq": esq,
      "msg": msg, "res": res, "pag": pag, "lupa": tLupa, "slip": [tSlip1, tSlip2], "sello": tSello, "pela": [tPela0, tPela1], "entierra": [tEnt0, tEnt1], "ext": ext,
      "prensa": tPrensa, "bam": tBam, "rapidas": rapidas, "magica": tMagica, "quitaM": tQuitaM, "entra": tEntra, "sale": tSale, "cuando": tCuando,
      "diluvio": diluvio, "barre": tBarre, "notaF": tNotaF, "pasoF": tPasoF, "palomita": tPalomita, "pasos": pasos, "golpes": golpes}
(RAIZ / "remotion/src/serie/a05/eventos.json").write_text(json.dumps(ev), encoding="utf-8")


# ---------- foley ----------
def paf(tam=1.0):
    """Una hoja que aterriza: aire aplastado, un cuerpo apenas."""
    n = int(.17 * SR)
    t = np.arange(n) / SR
    return banda(ruido(n), 320 / tam, 2600) * np.exp(-t * 36) * .7 + golpe(130 / tam, 70 / tam, .17, .1)[:n] * .4


def aleteo():
    """El pez contra la mesa: mojado y carnoso."""
    n = int(.12 * SR)
    t = np.arange(n) / SR
    return golpe(210, 120, .12, .9)[:n] * .7 + banda(ruido(n), 900, 5200) * np.exp(-t * 44) * .8


def gotas():
    return lluvia(.3, 60)


def plop():
    n = int(.34 * SR)
    t = np.arange(n) / SR
    f = 260 + 900 * (t / t[-1]) ** .6
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-t * 15) + banda(ruido(n), 700, 4200) * np.exp(-t * 16) * .5


def rele():
    """El paso: un relevador corta la corriente y la devuelve. Otra vez sin recuerdos."""
    n = int(.26 * SR)
    t = np.arange(n) / SR
    x = np.sin(2 * np.pi * 96 * t) * np.exp(-t * 16) * .5
    a = tic(.02, 1900, 6400)
    x[: len(a)] += a * .9
    b = tic(.02, 2600, 8000)
    i = int(.14 * SR)
    x[i:i + len(b)] += b * .55
    return x


def metal(f=(233, 349, 587), dur=.9):
    return campana(f, dur, (.7, .5, .3))


def hidraulica(dur):
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    f = 38 + 40 * t ** 2
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * t ** .6 * .6 + banda(ruido(n), 500, 3600) * t ** 2 * .3


# Gancho: el pez se escapa dos veces y la tercera lo atrapa.
m.pon(0, aleteo(), .3)
for t, g in ((F1, .62), (F2, .62)):
    m.pon(t, aleteo(), g, -.1)
    m.pon(t + .03, gotas(), .2)
    m.pon(t + .01, golpe(120, 66, .2, .5), .34)         # el manotazo que llega tarde
m.pon(F3, golpe(150, 80, .18, .6), .5)
m.pon(F3 + .02, aleteo(), .34)
m.pon(F3 + .2, soplo(.4, 400, 2600, .4), .1)
m.pon(T("pez").s + .1, campana((659, 880), .4, (.4, .2)), .14)
m.pon(paso, rele(), .6)
m.pon(paso + .1, campana((880,), .3, (.3,)), .1)
m.pon(tTira, aleteo(), .4)
m.pon(tCola1, aleteo(), .36, .2)
m.pon(tCola2, aleteo(), .3, .3)
m.pon(tPlop, plop(), .62, .5)
m.pon(tPlop + .03, gotas(), .22, .5)

# La entrega: todo, de un golpe.
m.pon(tTodo - .36, soplo(.38, 500, 4200, .95), .3)
m.pon(tTodo, golpe(62, 30, .85, .6), 1.05)
m.pon(tTodo, paf(1.6), .5)
for k, tt in enumerate(tHojeo):
    m.pon(tt, soplo(.13, 1200, 6000, .3), .12 + .01 * k, -.2 + .4 * (k % 2))
    m.pon(tt + .05, tic(.02, 1500, 5000), .2)
m.pon(T("cero").s + .05, golpe(100, 50, .24, .2), .3)
m.pon(tQuita - .05, soplo(.5, 300, 2200, .4), .22)

# El empleado que despierta.
m.pon(T("empleado").s, toc(420), .22)
m.pon(T("empleado").s + .04, trazo(.3, 300, 500), .05)
m.pon(T("brillante").s + .05, polvo(.5), .3)
m.pon(T("brillante").s + .42, campana((1760, 2637), .5, (.5, .25)), .16)
for tt, _ in pasos[1:4]:
    m.pon(tt, rele(), .55)
m.pon(tPaf1, golpe(110, 62, .2, .2), .34)
m.pon(tPaf2, golpe(100, 56, .2, .2), .3)

# Se cierra el mundo: persianas contra el borde exacto de la mesa.
m.pon(tSh - .05, soplo(.46, 180, 1500, .9), .24)
m.pon(tSh + .4, golpe(56, 30, .9, .5), .85)
m.pon(tSh + .4, metal((110, 165, 277), .7), .1)

# La mesa se sirve.
m.pon(tInstr - .3, soplo(.32, 800, 4000, .9), .1)
m.pon(tInstr, paf(1.2), .75)
m.pon(tHerr - .3, soplo(.32, 800, 4000, .9), .1)
m.pon(tHerr, paf(1.2), .75)
m.pon(tHerr + .08, tic(.03, 1400, 4000), .16)
m.pon(tCharla, paf(), .6)
m.pon(tNota, paf(.9), .85)
m.pon(tNota, toc(880), .16)
m.pon(tArch, paf(), .6)
m.pon(tArch2, paf(), .55)
for tt, l in pasos[4:9]:
    m.pon(tt, rele(), .44)
    m.pon(tt + .2, trazo(l, 300, 460), .05)
m.pon(tCtx, campana((261.6, 392, 523.3), 1.8, (.8, .5, .3)), .28)
m.pon(tCtx + .02, trazo(1, 500, 900), .06)

# El tamaño fijo: estira con todo y no cede; las escuadras caen.
m.pon(tTira2 - .5, soplo(.5, 300, 1800, .6), .1)
tt = tTira2
while tt < tEsq0 - .05:
    m.pon(tt, golpe(90, 70, .1, .1), .13, rng.uniform(-.3, .3))
    tt += .1
m.pon(tTira2 + .4, trazo(max(tEsq0 - tTira2 - .4, .2), 160, 220), .08)
for i, tt in enumerate(esq):
    m.pon(tt, golpe(74, 40, .34, .6), .62 + .1 * i, (-1) ** i * .4)
    m.pon(tt, metal((196 + 30 * i, 311, 523), .5), .24, (-1) ** i * .4)

# Cada mensaje, cada resultado.
for tt in msg:
    m.pon(tt, paf(.8), .62)
for tt in res:
    m.pon(tt, paf(1.15), .8)

# Veinte páginas: el golpeteo se acelera y el último cae pesado.
m.pon(tLupa + .1, soplo(.7, 500, 3800, .4), .14)
m.pon(T("restaurantes").s + .1, soplo(.9, 400, 5200, .6), .16)
for i, tt in enumerate(pag):
    m.pon(tt, paf(1 + .02 * i), .3 + .008 * i, rng.uniform(-.3, .3))
    m.pon(tt, tic(.02, 1500, 4500), .07)
m.pon(pag[-1], golpe(70, 36, .5, .4), .7)

# Torpe: nada truena. Se le resbalan las cosas.
m.pon(T("no falla").s, soplo(.5, 200, 900, .4), .08)
for tt in (tSlip1, tSlip2):
    m.pon(tt, soplo(.32, 700, 3400, .25), .22, .2)
    m.pon(tt + .32, golpe(160, 90, .16, .5), .3)
    m.pon(tt + .38, paf(), .4)
m.pon(pasos[9][0], rele(), .5)

# El sello sobre los mariscos.
m.pon(tSello - .3, soplo(.32, 500, 3400, .9), .22)
m.pon(tSello, golpe(82, 40, .5, .9), 1)
m.pon(tSello, tic(.04, 1200, 3600), .5)

# Bajar por la pila: hojas que pasan junto a la oreja, y cae el silencio sobre la nota.
tt, pasoH = tPela0, .055
while tt < tPela1:
    m.pon(tt, soplo(.09, 900, 6000, .4), .2, rng.uniform(-.5, .5))
    m.pon(tt, tic(.02, 1600, 5200), .15)
    tt += pasoH
    pasoH *= 1.018
m.pon(tPela1 + .05, golpe(60, 32, .8, .1), .55)
m.pon(tPela1 + .1, campana((987.8, 1318.5), 1, (.3, .15)), .1)
for tt in lista(tEnt0, tEnt1, 12):
    m.pon(tt, paf(), .34, rng.uniform(-.4, .4))

# Ya no cabe: las hojas se resbalan al vacío. La prensa.
for tt in ext:
    m.pon(tt, paf(), .36, rng.uniform(-.3, .3))
    m.pon(tt + .34, soplo(.5, 900, 3200, .2), .07, rng.uniform(-.6, .6))
m.pon(tPrensa, hidraulica(tBam - tPrensa), .28)
m.pon(tBam - .24, soplo(.25, 400, 3600, .95), .42)
m.pon(tBam, golpe(50, 26, 1.2, .9), 1.1)
m.pon(tBam, metal((110, 174, 293), 1.4), .26)
m.pon(tBam + .02, banda(ruido(int(.5 * SR)), 300, 4000) * np.exp(-np.arange(int(.5 * SR)) / SR * 9), .35)
m.pon(tBam + .06, lluvia(1.2, 36), .24)
m.pon(tBam + .62, hidraulica(.7)[::-1], .24)

# Lo que se pierde: en silencio, un solo pedazo de papel que cae.
a = T("algo se").s
m.pon(a - .1, soplo(1.8, 900, 3200, .35), .12, .4)
m.pon(a + 1.5, campana((293.7, 440), 1.2, (.5, .22)), .1, .4)

# Del brillo al desorden.
m.pon(T("empezar brillante").s + .35, polvo(.5), .3)
m.pon(T("empezar brillante").s + .7, campana((1760, 2637), .5, (.5, .25)), .16)
for tt in rapidas:
    m.pon(tt, paf(), .32, rng.uniform(-.4, .4))
for tt, _ in pasos[10:-1]:
    m.pon(tt, rele(), .26)
c = T("confundido").s
m.pon(c, trazo(.8, 620, 300), .08)
m.pon(T("el mismo").s, campana((523.3, 784), 1.4, (.6, .3)), .2)

# Lo mágico no hace nada.
m.pon(tMagica - 1.65, campana((2093, 2637, 3136), 1.6, (.3, .25, .2)), .12, -.1)
m.pon(tMagica - 1.2, polvo(1.2), .22)
m.pon(tMagica, paf(), .5)
m.pon(tMagica + .05, campana((2093, 3136), .6, (.4, .2)), .16)
m.pon(T("mágicos").e - .1, trazo(.4, 900, 220), .1)
m.pon(tQuitaM, tic(.03, 1400, 5200), .5)
m.pon(tQuitaM + .02, soplo(.4, 600, 3600, .2), .24)

# Qué entra, qué sale, y cuándo.
m.pon(tEntra, paf(1.1), .75)
m.pon(tSale, soplo(.42, 500, 4400, .3), .34, .3)
m.pon(tSale + .04, paf(), .3, .3)
tt = T("qué sale").e + .1
while tt < tCuando - .1:
    m.pon(tt, toc(1500), .15)
    tt += .25
m.pon(tCuando, paf(1.2), .9)
m.pon(tCuando, golpe(84, 44, .3, .2), .34)

# Más información: diluvio. El barrido se lo lleva todo.
for i, tt in enumerate(diluvio):
    m.pon(tt, paf(1 + .004 * i), .18 + .003 * i, rng.uniform(-.6, .6))
m.pon(diluvio[-1], golpe(62, 32, .6, .3), .5)
m.pon(tBarre - .05, soplo(1.1, 240, 4200, .45), .5)
m.pon(tBarre + .45, soplo(.9, 900, 7000, .4), .24, .6)
for tt in lista(tBarre + .1, tBarre + 1, 24):
    m.pon(tt, paf(), .12, .3)
m.pon(tBarre + 1.1, golpe(70, 36, .5, .1), .14, .7)

# Una sola nota. Despierta sin recuerdos, igual que siempre; ya no le hace falta recordar.
m.pon(tNotaF - .4, soplo(.42, 700, 3000, .9), .1)
m.pon(tNotaF, paf(.9), .9)
m.pon(tNotaF, toc(660), .18)
m.pon(tPasoF, rele(), .28)
m.pon(tPalomita, golpe(280, 180, .1, .5), .24)
m.pon(tPalomita, campana((130.8, 196, 261.6, 392), 2.8, (.8, .5, .3, .2)), .34)

# La pista arranca en su primer tiempo fuerte (16.0 s) y corre como si nunca se hubiera ido: solo se abre y se cierra.
K = 16
pi = lambda t: K + t
A = "a05_mesa"
sil1, sil2 = T("no falla").s, T("se vuelve").s
vuelta = T("por eso").s + .5
fin = tBarre + 1.25
# La pista crece sola (-16.5 LUFS al arranque, -8.5 al final): cada tramo se nivela para quedar unos 9 dB bajo la voz.
m.musica([(A, pi(0), 0, sil1, .02, .35)], nivel=-21.5)
m.musica([(A, pi(sil2), sil2, tBam, .08, .02), (A, pi(vuelta), vuelta, fin, .9, 1.3)], nivel=-28)
m.cierra()
