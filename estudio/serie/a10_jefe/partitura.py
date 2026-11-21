"""Capítulo 10 de la serie 2: la nota en el escritorio. Todos los instantes (títulos que caen, la nota, las
reglas que se clavan, la tinta que se extiende, las cintas) salen de aquí a `eventos.json`; la animación los
lee de ahí, así que dibujo y sonido no se pueden desfasar.
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

PAUSAS = {"imagina que contratas": .3, "el punto medio": .55, "con eso también": .3, "una regla sin razón": .4,
          "a esa nota": .35, "y un buen prompt": .25, "lo demás": .2, "el error común": .4, "yo lo trato": .25,
          "le dice lo que": .45}
m = Mezcla("a10_jefe", pausas=PAUSAS, cola=2.8).exporta_tiempos()
T = m.T


def lista(a, b, n, curva=1.0):
    return [round(a + (b - a) * (i / (n - 1)) ** curva, 3) for i in range(n)]


# ---------- eventos ----------
aterriza = .24                                      # la bola cae desde arriba del cuadro y toca la mesa
saludo = .95
corona = T("mejor").s - .02
medalla = T("experto").s + .04
faja = T("mundo").s - .02
infla = T("mundo").e + .05
caen = T("no sirve de mucho").s - .08               # todo lo que le colgaron se cae
caidas = [caen + .42, caen + .55, caen + .66]
encoge = T("mucho").s
brillo = T("brillante").s - .05
gafete = T("empezó hoy").s
abre = T("imagina").s - .15                         # la cámara se aleja: aparece el escritorio
fiesta = lista(T("organizar").s, T("fiesta").e + .1, 4)
guirnalda = T("fiesta").s - .05
nota0 = T("dejas una nota").s
nota1 = T("nota").s + .12                           # la nota se asienta
bonito = [T("hazlo").s, T("bonito").e + .05]
gira = T("no sabe qué hacer").s - .1
duda = [T("sabe qué").s + .1, T("hacer").s + .1, T("hacer").e + .35]
tacha = T("si escribes una regla").s - .1
renglones = [T("una regla").s, T("pasar").e]
estacas = lista(T("regla").s + .25, T("pasar").e + .3, 13, .78)
rueda = T("se atora").s - .45                       # la bola rueda hacia el hueco
atora = T("atora").s + .06
previste = T("no previste").s
barre = T("el punto medio").s - .05
paraque = T("para qué").s
r1 = [T("es una").s, T("sorpresa").e]
roja = T("sorpresa").s
r2 = [T("así que").s, T("nada de").e]
r3 = [T("mensajes").s, T("mamá").e]
mancha0 = T("mamá").s - .1                          # la tinta roja sale de "sorpresa"
llegaMama = T("con eso").s - .1
camina = T("también sabe").s - .2                   # la bola va hacia redes
llegaRedes = T("redes").s + .05
frena = T("no debe").s - .15
nadie = T("nadie se lo dijo").s
rebobina = T("una regla sin razón").s - .1
estaca = T("razón").s + .05
saluda = T("obedece").s
florece = T("con razón").s
entiende = T("entiende").s
vuelve = T("a esa nota").s - .1
cintas = lista(T("permanente").s - .05, T("permanente").e + .05, 4)
etiqueta = T("prompt de sistema").s - .05
arranca = T("y un buen prompt").s + .05
tres = T("tres cosas").s
c1 = [T("quieres").s - .38, T("lograr").e]
c2 = [T("cómo se ve").s, T("terminado").e]
c3 = [T("y qué no").s, T("preguntarte").e]
blanco = T("lo demás").s
lapiz = T("déjaselo").s
maquina = T("el error común").s - .1
ranura = T("máquina").s - .05
fichas = lista(T("frases").s - .05, T("mágicas").e + .2, 3)
colega = T("yo lo trato").s - .1
mano = T("colega").s - .2
apreton = T("colega").e + .05
todo = [T("un buen prompt no").s, T("todo").e]
rasga = T("le dice lo que").s - .32
corta = T("le dice lo que").s - .05
asiente = T("adivinar").s
fin = T("adivinar").e
toque = fin + .38

ev = {k: v for k, v in dict(
    aterriza=aterriza, saludo=saludo, corona=corona, medalla=medalla, faja=faja, infla=infla, caen=caen, caidas=caidas,
    encoge=encoge, brillo=brillo, gafete=gafete, abre=abre, fiesta=fiesta, guirnalda=guirnalda, nota0=nota0, nota1=nota1,
    bonito=bonito, gira=gira, duda=duda, tacha=tacha, renglones=renglones, estacas=estacas, rueda=rueda, atora=atora,
    previste=previste, barre=barre, paraque=paraque, r1=r1, roja=roja, r2=r2, r3=r3, mancha0=mancha0, llegaMama=llegaMama,
    camina=camina, llegaRedes=llegaRedes, frena=frena, nadie=nadie, rebobina=rebobina, estaca=estaca, saluda=saluda,
    florece=florece, entiende=entiende, vuelve=vuelve, cintas=cintas, etiqueta=etiqueta, arranca=arranca, tres=tres,
    c1=c1, c2=c2, c3=c3, blanco=blanco, lapiz=lapiz, maquina=maquina, ranura=ranura, fichas=fichas, colega=colega,
    mano=mano, apreton=apreton, todo=todo, rasga=rasga, corta=corta, asiente=asiente, fin=fin, toque=toque).items()}
(RAIZ / "remotion/src/serie/a10/eventos.json").write_text(json.dumps(ev), encoding="utf-8")


# ---------- foley ----------
def pluma(dur, rapido=1.0):
    """Punta de pluma sobre papel: rasgueo en ráfagas, una por trazo."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    trazos = np.abs(np.sin(2 * np.pi * (7.5 * rapido) * t + 3 * np.sin(2 * np.pi * 1.3 * t))) ** 1.5
    e = np.minimum(t / .03, 1) * np.minimum((dur - t) / .06, 1)
    return banda(ruido(n), 2400, 7800) * trazos * e * .55 + banda(ruido(n), 700, 1800) * trazos * e * .12


def cinta():
    """Cinta adhesiva: un jalón que sube y el golpe al pegar."""
    n = int(.24 * SR)
    t = np.linspace(0, 1, n)
    s = banda(ruido(n), 1200, 6200) * (np.sin(np.pi * t) ** .6) * (1 + .8 * (rng.random(n) > .985)) * .45
    p = golpe(140, 70, .14, .6)
    out = np.zeros(n + len(p))
    out[:n] += s
    out[n - 600:n - 600 + len(p)] += p * .8
    return out


def rasgado(dur=.5):
    """Papel que se rompe: crujidos sueltos sobre un siseo."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    cr = (rng.random(n) > .992).astype(float) * rng.uniform(-1, 1, n)
    return (banda(cr, 900, 7000) * 3.2 + banda(ruido(n), 1500, 6000) * .35) * np.sin(np.pi * t ** .7) ** .8


def tinta(dur):
    """Tinta que se extiende sobre papel: un oleaje grave y burbujas."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    e = np.sin(np.pi * np.minimum(t * 1.4, 1) / 2) ** 2 * (1 - t ** 3)
    y = banda(ruido(n), 120, 700) * e * .6
    for _ in range(int(dur * 6)):
        i = int(rng.random() * (n - 6000))
        k = np.arange(5000) / SR
        f = rng.uniform(260, 520)
        y[i:i + 5000] += np.sin(2 * np.pi * f * (1 + 6 * k) * k) * np.exp(-k * 50) * .18
    return y


def rechina(dur):
    """Algo atorado que forcejea: un hule que chilla."""
    n = int(dur * SR)
    t = np.arange(n) / SR
    f = 640 + 140 * np.sin(2 * np.pi * 9 * t) + 60 * np.sin(2 * np.pi * 23 * t)
    e = np.abs(np.sin(2 * np.pi * 3.2 * t)) ** .7 * np.minimum(t / .04, 1) * np.minimum((dur - t) / .1, 1)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * .35 + banda(ruido(n), 1500, 4000) * .2) * e


def borra(dur=.95, trazos=4):
    """Goma sobre papel: un frote por renglón."""
    n = int(dur * SR)
    t = np.linspace(0, 1, n)
    e = np.abs(np.sin(np.pi * trazos * t)) ** .8 * np.minimum(t * 20, 1) * np.minimum((1 - t) * 20, 1)
    return (banda(ruido(n), 700, 3200) * .7 + banda(ruido(n), 3200, 7000) * .15) * e


def moneda():
    c = campana((2637, 3520), .5, (.4, .2))[: int(.5 * SR)]
    c[: int(.09 * SR)] += toc(1480) * .6
    return c


def pon_largo(t, s, g, pan=0.0):
    m.pon(t, s, g, pan)


# El arranque: la bola cae y le cuelgan títulos
m.pon(0, soplo(.26, 400, 3000, .8), .3)
for k, ti in enumerate(rebotes(aterriza - np.sqrt(2 * 3.2 / 30), 3.2, .3, 30)[:3]):
    m.pon(ti, golpe(86, 40, .4 - k * .1, .12), .7 * .35 ** k)
m.pon(saludo, soplo(.35, 600, 3000, .5), .1)
for ti in (saludo + .3, T("a un agente").s + .28):
    m.pon(ti, golpe(96, 46, .26, .25), .4)
m.pon(corona, golpe(120, 70, .3, .15), .42)
m.pon(corona, campana((1046.5, 1568), .5, (.4, .2)), .14)
m.pon(medalla, golpe(150, 80, .2, .15), .36)
m.pon(medalla + .02, toc(1320), .26)
m.pon(faja - .25, soplo(.32, 500, 3600, .7), .18)
m.pon(faja, golpe(100, 60, .26, .12), .38)
m.pon(infla, trazo(.5, 300, 700), .12)
m.pon(caen - .02, soplo(.4, 300, 1800, .2), .14)
for k, ti in enumerate(caidas):
    m.pon(ti, golpe(130 - k * 20, 60, .22, .45), .42)
m.pon(encoge, trazo(.45, 520, 260), .1)
m.pon(brillo, campana((1318.5, 1975.5, 2637), 1.1, (.5, .3, .2)), .2)
m.pon(gafete, tic(.03, 2200, 7000), .5)
m.pon(gafete + .03, golpe(160, 90, .12, .5), .35)

# El escritorio
m.pon(abre, soplo(1.0, 250, 2200, .4), .2)
for k, ti in enumerate(fiesta):
    m.pon(ti, toc(520 + 90 * k), .3, -.5 + .25 * k)
m.pon(guirnalda, lluvia(.6, 50), .14)
m.pon(nota0, soplo(.42, 900, 5200, .6), .2)
m.pon(nota1, golpe(150, 90, .1, .7), .3)

# Hazlo bonito: la bola gira sin saber hacia dónde
m.pon(bonito[0], pluma(bonito[1] - bonito[0]), .11)
for k in range(4):
    m.pon(gira + k * .36, soplo(.34, 400, 2600, .5), .12, (-1) ** k * .4)
for ti in duda:
    m.pon(ti, toc(760), .2)

# Una regla para cada cosa: la cerca
m.pon(tacha, pluma(.3, 2.2), .16)
m.pon(renglones[0], pluma(renglones[1] - renglones[0], 1.8), .07)
for k, ti in enumerate(estacas):
    m.pon(ti, golpe(170, 95, .1, .7), .34, -.6 + 1.2 * ((k * 7) % 13) / 12)
m.pon(rueda, soplo(.45, 300, 1600, .6), .14)
m.pon(atora, golpe(70, 36, .5, .12), .6)
m.pon(atora + .05, rechina(1.3), .1)
m.pon(previste, toc(380), .28)

# El punto medio: la cerca se cae y vuelve a la nota
m.pon(barre, soplo(.7, 300, 2600, .3), .22)
for k in range(5):
    m.pon(barre + .05 + k * .07, tic(.02, 1800, 6000), .2)
m.pon(paraque, golpe(96, 50, .3, .2), .5)

# La razón: la tinta se extiende sola
m.pon(r1[0], pluma(r1[1] - r1[0]), .09)
m.pon(r2[0], pluma(r2[1] - r2[0]), .08)
m.pon(r3[0], pluma(r3[1] - r3[0]), .08)
m.pon(mancha0, tinta(llegaMama - mancha0 + .4), .3)
m.pon(llegaMama, golpe(64, 34, .4, .05), .4)
m.pon(camina, soplo(.5, 400, 2200, .5), .1)
m.pon(camina + .3, tinta(llegaRedes - camina + .2), .28)
m.pon(llegaRedes, golpe(60, 32, .5, .05), .5)
m.pon(frena, golpe(110, 60, .18, .4), .32)
m.pon(nadie, campana((659.3, 987.8), .9, (.4, .2)), .14)

# Obedece / entiende
m.pon(rebobina, soplo(.45, 1500, 5000, .8), .2)
m.pon(estaca, golpe(170, 95, .12, .7), .45)
m.pon(saluda, toc(700), .26)
m.pon(florece, tinta(1.4), .3)
m.pon(entiende, campana((523.3, 784, 1046.5), 1.6, (.6, .35, .2)), .22)

# La nota permanente
m.pon(vuelve, soplo(.6, 300, 2000, .4), .2)
for ti in cintas:
    m.pon(ti - .2, cinta(), .24)
m.pon(etiqueta - .3, rasgado(.3), .1)
m.pon(etiqueta, golpe(110, 60, .3, .12), .4)

# Tres cosas
m.pon(arranca + .05, borra(.95), .2)
m.pon(tres, toc(600), .25)
m.pon(tres + .12, toc(680), .25)
m.pon(tres + .24, toc(760), .25)
m.pon(c1[0], pluma(c1[1] - c1[0]), .08)
m.pon(c2[0], pluma(c2[1] - c2[0]), .08)
m.pon(c3[0], pluma(c3[1] - c3[0]), .08)
m.pon(blanco, trazo(.8, 380, 720), .14)
m.pon(lapiz + .15, pluma(1.4, 1.4), .07)

# La máquina de frases mágicas, y el colega
m.pon(blanco + .55, golpe(92, 44, .3, .25), .45)
m.pon(maquina - .3, soplo(.4, 400, 2400, .5), .12)
m.pon(maquina + .3, golpe(84, 40, .36, .3), .55)
m.pon(ranura, tic(.04, 1500, 5000), .4)
for ti in fichas:
    m.pon(ti - .6, soplo(.25, 1200, 5000, .3), .14)
for ti in fichas:
    m.pon(ti, moneda(), .22)
m.pon(fichas[-1] + .25, lluvia(.8, 40), .2)
m.pon(colega, soplo(.4, 600, 3000, .5), .14)
m.pon(mano, soplo(.5, 300, 1600, .6), .12)
m.pon(apreton, golpe(90, 50, .22, .2), .5)
m.pon(apreton + .3, golpe(90, 50, .18, .2), .3)

# No le dice todo: el rollo se rompe y queda la nota más corta
m.pon(todo[0], pluma(todo[1] - todo[0], 2.4), .07)
m.pon(todo[0] + .2, soplo(todo[1] - todo[0], 250, 1400, .7), .14)
m.pon(rasga, rasgado(.42), .55)
m.pon(corta, golpe(140, 80, .12, .6), .3)
m.pon(asiente, toc(560), .2)
m.pon(asiente + .3, toc(560), .16)
m.pon(T("un buen prompt no").s + .7, golpe(84, 40, .34, .25), .5)
m.pon(toque, golpe(96, 46, .3, .3), .55)
m.pon(toque + .02, campana((261.6, 392, 523.3), 2.4, (.7, .4, .2)), .26)      # el final se apaga, no se corta

m.musica([("a10_jefe", 19, 0, atora, .02, .03), ("a10_jefe", 24, barre, m.dur, .35, 2.6)])
m.cierra()
