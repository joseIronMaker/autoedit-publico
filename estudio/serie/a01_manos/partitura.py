import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
from kit_sonido import *

m = Mezcla("a01_manos", pausas={"eso es un agente": .65, "por eso en esta": .3, "porque la máquina": .35}, cola=3.0).exporta_tiempos()
T = m.T


def vidrio():
    n = int(.9 * SR)
    t = np.linspace(0, 1, n)
    return banda(ruido(n), 2800, 12000) * np.exp(-t * 7) * .9 + cola(campana((2093, 3136, 4186), .5, (.5, .3, .2)))[:n] * .5


def clic():
    g = golpe(180, 90, .09, .9)
    x = tic(.02, 2000, 6000) * .9
    g[: len(x)] += x
    return g


# El frasco: la bola se estrella contra el vidrio
for t, g in ((.34, .72), (1.34, .68), (2.3, .62), (T("pero no puede").s + .12, .6)):
    m.pon(t, golpe(84, 40, .42, .35), g)
    m.pon(t, campana((1318, 1975), .3, (.2, .1)), .16 * g)
m.pon(T("puede explicarte").s + .1, trazo(.7, 420, 720), .08)
m.pon(T("puede escribirte").s + .1, tic(.03, 1800, 5000), .22)
m.pon(T("pero no puede").s + .05, soplo(.6, 300, 1800, .3), .16)
m.pon(T("todo lo que vimos").s + .2, lluvia(T("ahora hazle").s - T("todo lo que vimos").s - .3, 34), .2)
m.pon(T("encerrada en una caja").s + .1, golpe(110, 60, .3, .2), .35)
# Manos: se agrieta y revienta
m.pon(T("dale manos").s - .08, polvo(.5), .3)
m.pon(T("dale manos").e, vidrio(), .6)
m.pon(T("dale manos").e, golpe(60, 30, .7, .3), .6)
for f in ("buscar en internet", "leer un archivo", "mandar un mensaje"):
    m.pon(T(f).s, toc(620), .3)
m.pon(T("déjala ver").s, trazo(.9, 380, 760), .14)
# El interruptor: el golpe seco de todo el capítulo
apaga = T("qué sigue").e - .02
m.pon(apaga, clic(), .62)
m.pon(apaga + .02, golpe(52, 28, 1.1, .03), .6)
enciende = T("no es un modelo nuevo").s - .1
m.pon(enciende, clic(), .5)
m.pon(T("dando vueltas").s, soplo(1.1, 300, 2000, .5), .13)
m.pon(T("con permiso").s, golpe(92, 50, .3, .3), .55)
m.pon(T("ya lo hizo").s, golpe(70, 36, .6, .2), .75)
m.pon(T("ya mandó").s, soplo(.7, 500, 3400, .2), .24, .5)
m.pon(T("ya borró").s, polvo(.45), .32)
m.pon(T("organizar la fiesta").s + .2, lluvia(2.2, 60), .2)
m.pon(T("organizar la fiesta").s + .2, campana((659, 880, 1318), 1.2, (.6, .4, .2)), .22)
final = T("hacer cosas").e + .1
m.pon(final, clic(), .62)
m.pon(final + .02, golpe(52, 28, 1.2, .03), .55)
m.pon(final + .1, campana((130.8, 196, 261.6), 2.4, (.8, .4, .2)), .34)    # cola: el final se apaga, no se corta

corte = apaga
m.musica([("a01_manos", 3, 0, corte, .05, .03), ("a01_manos", 40, enciende, final, .25, .05)])
m.cierra()
